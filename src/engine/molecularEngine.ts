import {
  getSequencesForSpecies,
  RESTRICTION_ENZYMES,
  reverseComplement,
} from '../data/molecularDatabase';
import { getSpeciesById } from '../data/scientificDatabase';
import { CultureVessel, DNAFragmentSample } from '../types/lab';

/**
 * Computes primer length, GC%, and Wallace/salt-adjusted melting temperature (Tm).
 */
export function computePrimerStats(rawSeq: string): {
  cleanSeq: string;
  length: number;
  gcPercent: number;
  tmC: number;
  isValid: boolean;
} {
  const cleanSeq = rawSeq.toUpperCase().replace(/[^ATGC]/g, '');
  const length = cleanSeq.length;
  if (length === 0) {
    return { cleanSeq: '', length: 0, gcPercent: 0, tmC: 0, isValid: false };
  }
  let gc = 0;
  for (const ch of cleanSeq) {
    if (ch === 'G' || ch === 'C') gc++;
  }
  const gcPercent = Number(((gc / length) * 100).toFixed(1));
  // Standard oligonucleotide Tm approximation for 15–30 nt primers in 50 mM salt
  const tmC =
    length < 14
      ? 2 * (length - gc) + 4 * gc
      : Number((64.9 + (41 * (gc - 16.4)) / length).toFixed(1));
  return {
    cleanSeq,
    length,
    gcPercent,
    tmC,
    isValid: length >= 14 && length <= 35,
  };
}

/**
 * Simulates cell harvest by centrifugation + spin-column DNA miniprep extraction.
 */
export function extractDnaFromCulture(params: {
  sourceVessel: CultureVessel;
  rcfXg: number;
  spinMinutes: number;
  includeEthanolWash: boolean;
  pipetteAccuracyFactor?: number;
  heatBlockLysisDone?: boolean;
}): {
  fragments: DNAFragmentSample[];
  pelletEfficiency: number;
  totalYieldNgPerUl: number;
  purityA260_280: number;
  statusNote: string;
} {
  const {
    sourceVessel,
    rcfXg,
    spinMinutes,
    includeEthanolWash,
    pipetteAccuracyFactor = 1.0,
    heatBlockLysisDone = true,
  } = params;
  const totalViable = sourceVessel.populations.reduce((acc, p) => acc + p.viableCount, 0);
  const od = Math.max(sourceVessel.od600, totalViable / 8e8);

  // RCF harvesting efficiency (optimal >= 10,000 xg for >= 2 min)
  const rcfFactor = Math.min(1, rcfXg / 10000);
  const timeFactor = Math.min(1, spinMinutes / 2);
  const lysisFactor = heatBlockLysisDone ? 1.0 : 0.42;
  const pelletEfficiency = Number((rcfFactor * timeFactor).toFixed(2));

  if (od < 0.03 || sourceVessel.populations.length === 0) {
    return {
      fragments: [],
      pelletEfficiency,
      totalYieldNgPerUl: 0,
      purityA260_280: 0,
      statusNote: 'Culture density too low (< 0.03 OD600) — no visible cell pellet recovered.',
    };
  }

  // Ethanol wash removes cellular proteins & guanidine salts (~1.83 vs ~1.36 contaminated)
  const purityA260_280 = includeEthanolWash ? 1.83 : 1.36;
  const baseYield = Math.min(
    340,
    Math.max(8, od * 115 * pelletEfficiency * lysisFactor * Math.max(0.3, pipetteAccuracyFactor))
  );

  const fragments: DNAFragmentSample[] = [];
  const seenSeqIds = new Set<string>();

  for (const pop of sourceVessel.populations) {
    if (pop.viableCount <= 1e5) continue;
    const sp = getSpeciesById(pop.speciesId);
    const seqs = getSequencesForSpecies(pop.speciesId);

    for (const seqRec of seqs) {
      if (seenSeqIds.has(seqRec.id)) continue;
      seenSeqIds.add(seqRec.id);

      const isPlasmid = seqRec.topology === 'circular';
      const fragmentYield = Number(
        (isPlasmid ? baseYield * 0.65 : baseYield * 0.35).toFixed(1)
      );

      fragments.push({
        id: `frag_${seqRec.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sequenceId: seqRec.id,
        name: `${seqRec.shortName} (${sp?.commonLabel ?? 'Extract'})`,
        topology: seqRec.topology,
        lengthBp: seqRec.lengthBp,
        sequence: seqRec.sequence,
        concentrationNgPerUl: fragmentYield,
        purityA260_280,
        sourceSpeciesId: pop.speciesId,
      });
    }
  }

  const totalYieldNgPerUl = Number(
    fragments.reduce((acc, f) => acc + f.concentrationNgPerUl, 0).toFixed(1)
  );

  const statusNote = includeEthanolWash
    ? `Clean spin-column elution complete (${totalYieldNgPerUl} ng/µL, A260/A280 = ${purityA260_280.toFixed(2)}).`
    : `Wash step skipped — protein/salt carryover detected (A260/A280 = ${purityA260_280.toFixed(2)}).`;

  return {
    fragments,
    pelletEfficiency,
    totalYieldNgPerUl,
    purityA260_280,
    statusNote,
  };
}

/**
 * Generates a realistic 230–320 nm NanoDrop UV absorbance spectrum curve.
 */
export function computeNanoDropSpectrum(
  totalConcentrationNgPerUl: number,
  purityA260_280: number
): Array<{ nm: number; absorbance: number }> {
  const a260Peak = totalConcentrationNgPerUl / 50; // 1.0 A260 = 50 ng/µL dsDNA
  const proteinShoulder =
    purityA260_280 > 0 ? Math.max(0, a260Peak / purityA260_280 - a260Peak * 0.52) : 0;

  const points: Array<{ nm: number; absorbance: number }> = [];
  for (let nm = 230; nm <= 320; nm += 2) {
    const dnaGauss = a260Peak * Math.exp(-Math.pow((nm - 260) / 14, 2));
    const protGauss = proteinShoulder * 1.45 * Math.exp(-Math.pow((nm - 280) / 11, 2));
    const salt230 = (purityA260_280 < 1.55 ? a260Peak * 0.95 : a260Peak * 0.35) *
      Math.exp(-Math.pow((nm - 230) / 8, 2));

    points.push({
      nm,
      absorbance: Number(Math.max(0, dnaGauss + protGauss + salt230).toFixed(3)),
    });
  }
  return points;
}

/**
 * Performs genuine sequence-matching PCR simulation across template fragments.
 */
export function runPcrSimulation(params: {
  templateFragments: DNAFragmentSample[];
  forwardSeq: string;
  reverseSeq: string;
  annealTempC: number;
  cycles: number;
  hasPolymerase: boolean;
  hasDntps: boolean;
  enzymeColdFactor?: number;
  pipetteAccuracyFactor?: number;
}): {
  amplicons: DNAFragmentSample[];
  outcome: 'success' | 'non_specific' | 'no_binding' | 'no_match' | 'missing_reagents';
  summary: string;
} {
  const {
    templateFragments,
    forwardSeq,
    reverseSeq,
    annealTempC,
    cycles,
    hasPolymerase,
    hasDntps,
    enzymeColdFactor = 1.0,
    pipetteAccuracyFactor = 1.0,
  } = params;

  if (!hasPolymerase || !hasDntps) {
    return {
      amplicons: [],
      outcome: 'missing_reagents',
      summary: !hasPolymerase
        ? 'PCR failed: Taq DNA Polymerase was omitted from the reaction mix.'
        : 'PCR failed: dNTP nucleotide building blocks were omitted.',
    };
  }

  const fwdStats = computePrimerStats(forwardSeq);
  const revStats = computePrimerStats(reverseSeq);
  if (!fwdStats.isValid || !revStats.isValid) {
    return {
      amplicons: [],
      outcome: 'no_binding',
      summary: 'Invalid primers: forward and reverse primers must each be 14–35 A/T/G/C bases.',
    };
  }

  const minTm = Math.min(fwdStats.tmC, revStats.tmC);

  // If annealing temperature is way above primer Tm, primers cannot anneal
  if (annealTempC > minTm + 4.5) {
    return {
      amplicons: [],
      outcome: 'no_binding',
      summary: `No amplification: Annealing temp (${annealTempC.toFixed(1)} °C) is too high above primer Tm (${minTm.toFixed(1)} °C). Lower annealing temperature.`,
    };
  }

  // Check purity penalty (protein carryover reduces polymerase efficiency)
  const avgPurity =
    templateFragments.length > 0
      ? templateFragments.reduce((a, f) => a + f.purityA260_280, 0) / templateFragments.length
      : 1.8;
  const purityPenalty = avgPurity < 1.5 ? 0.35 : 1.0;

  const revRc = reverseComplement(revStats.cleanSeq);
  const amplicons: DNAFragmentSample[] = [];

  for (const tpl of templateFragments) {
    const seq = tpl.sequence.toUpperCase();
    // Search forward primer binding (match full or 14-nt 3' anchor)
    const fwdAnchor = fwdStats.cleanSeq.slice(-14);
    const revAnchor = revRc.slice(0, 14);

    const fwdIdx = seq.indexOf(fwdAnchor);
    if (fwdIdx === -1) continue;

    const fullFwdStart = Math.max(0, fwdIdx - (fwdStats.length - 14));
    const revIdx = seq.indexOf(revAnchor, fwdIdx + 20);
    if (revIdx === -1) continue;

    const revEnd = Math.min(seq.length, revIdx + revStats.length);
    const ampliconSeq = seq.slice(fullFwdStart, revEnd);
    const lengthBp = ampliconSeq.length;

    // Exponential amplification scaled by cycle count (plateau near 30–35 cycles)
    const cycleFactor = Math.min(1, Math.pow(1.88, Math.min(cycles, 32) - 18) / 1400);
    const annealOptimality = Math.max(
      0.25,
      1 - Math.abs(annealTempC - (minTm - 3)) * 0.05
    );
    const yieldNg = Number(
      Math.max(
        6,
        210 *
          cycleFactor *
          annealOptimality *
          purityPenalty *
          Math.max(0.15, enzymeColdFactor) *
          Math.max(0.25, pipetteAccuracyFactor)
      ).toFixed(1)
    );

    amplicons.push({
      id: `pcr_${tpl.sequenceId}_${Date.now()}`,
      sequenceId: tpl.sequenceId,
      name: `PCR Amplicon (${lengthBp} bp)`,
      topology: 'linear',
      lengthBp,
      sequence: ampliconSeq,
      concentrationNgPerUl: yieldNg,
      purityA260_280: 1.85,
      sourceSpeciesId: tpl.sourceSpeciesId,
    });
  }

  if (amplicons.length === 0) {
    return {
      amplicons: [],
      outcome: 'no_match',
      summary:
        'No matching target sequence found in this template DNA. Check whether the bacterium carries this gene.',
    };
  }

  // If annealing temperature is far below Tm, add non-specific smear/artifact bands!
  if (annealTempC < minTm - 7.5) {
    const offTargetSizes = [340, 1180];
    for (const sz of offTargetSizes) {
      amplicons.push({
        id: `artifact_${sz}_${Date.now()}`,
        sequenceId: 'non_specific',
        name: `Non-specific Artifact (${sz} bp)`,
        topology: 'linear',
        lengthBp: sz,
        sequence: 'ATGC'.repeat(Math.ceil(sz / 4)).slice(0, sz),
        concentrationNgPerUl: 42,
        purityA260_280: 1.8,
        isArtifact: true,
      });
    }
    return {
      amplicons,
      outcome: 'non_specific',
      summary: `Target amplified, but annealing temp (${annealTempC.toFixed(1)} °C) is too low below Tm (${minTm.toFixed(1)} °C), causing extra non-specific bands!`,
    };
  }

  return {
    amplicons,
    outcome: 'success',
    summary: `Specific PCR amplification succeeded: ${amplicons
      .map((a) => `${a.lengthBp} bp (${a.concentrationNgPerUl} ng/µL)`)
      .join(', ')}.`,
  };
}

/**
 * Scans template DNA fragments for palindromic restriction enzyme recognition sites
 * and cleaves circular plasmids or linear fragments into exact bp products.
 */
export function runRestrictionDigest(
  fragments: DNAFragmentSample[],
  enzymeIds: string[],
  enzymeActivityFactor = 1.0
): {
  digestedFragments: DNAFragmentSample[];
  cutCount: number;
  summary: string;
} {
  const enzymes = RESTRICTION_ENZYMES.filter((e) => enzymeIds.includes(e.id));
  if (enzymes.length === 0) {
    return {
      digestedFragments: fragments,
      cutCount: 0,
      summary: 'No restriction enzymes selected.',
    };
  }
  if (enzymeActivityFactor < 0.25) {
    return {
      digestedFragments: fragments.map((f) => ({ ...f })),
      cutCount: 0,
      summary: 'Restriction enzyme heat-denatured on warm bench — DNA remained uncut.',
    };
  }

  const out: DNAFragmentSample[] = [];
  let totalCuts = 0;

  for (const frag of fragments) {
    const seq = frag.sequence.toUpperCase();
    const cutPositions: number[] = [];

    for (const enz of enzymes) {
      let searchFrom = 0;
      while (searchFrom < seq.length) {
        const idx = seq.indexOf(enz.recognitionSeq, searchFrom);
        if (idx === -1) break;
        cutPositions.push(idx + enz.cutOffset);
        searchFrom = idx + enz.recognitionSeq.length;
      }
    }

    const uniqueCuts = Array.from(new Set(cutPositions)).sort((a, b) => a - b);

    if (uniqueCuts.length === 0) {
      out.push({ ...frag });
      continue;
    }

    totalCuts += uniqueCuts.length;

    if (frag.topology === 'circular') {
      // Cutting a circular plasmid at N sites produces N linear fragments
      const pieces: string[] = [];
      for (let i = 0; i < uniqueCuts.length; i++) {
        const start = uniqueCuts[i];
        const end = uniqueCuts[(i + 1) % uniqueCuts.length];
        const pieceSeq =
          end > start ? seq.slice(start, end) : seq.slice(start) + seq.slice(0, end);
        pieces.push(pieceSeq);
      }

      pieces
        .sort((a, b) => b.length - a.length)
        .forEach((pSeq, idx) => {
          out.push({
            id: `dig_${frag.id}_${idx}_${Date.now()}`,
            sequenceId: frag.sequenceId,
            name: `${frag.name} Cut #${idx + 1} (${pSeq.length} bp)`,
            topology: 'linear',
            lengthBp: pSeq.length,
            sequence: pSeq,
            concentrationNgPerUl: Number(
              ((frag.concentrationNgPerUl * pSeq.length) / frag.lengthBp).toFixed(1)
            ),
            purityA260_280: frag.purityA260_280,
            sourceSpeciesId: frag.sourceSpeciesId,
          });
        });
    } else {
      // Cutting a linear fragment at N sites produces N + 1 linear fragments
      const bounds = [0, ...uniqueCuts, seq.length];
      for (let i = 0; i < bounds.length - 1; i++) {
        const pSeq = seq.slice(bounds[i], bounds[i + 1]);
        if (pSeq.length === 0) continue;
        out.push({
          id: `dig_${frag.id}_${i}_${Date.now()}`,
          sequenceId: frag.sequenceId,
          name: `${frag.name} Frag #${i + 1} (${pSeq.length} bp)`,
          topology: 'linear',
          lengthBp: pSeq.length,
          sequence: pSeq,
          concentrationNgPerUl: Number(
            ((frag.concentrationNgPerUl * pSeq.length) / frag.lengthBp).toFixed(1)
          ),
          purityA260_280: frag.purityA260_280,
          sourceSpeciesId: frag.sourceSpeciesId,
        });
      }
    }
  }

  const visibleBands = out.filter((f) => f.lengthBp >= 40);
  return {
    digestedFragments: visibleBands,
    cutCount: totalCuts,
    summary:
      totalCuts > 0
        ? `Digestion cleaved ${totalCuts} site(s) into ${visibleBands.length} visible fragment(s): ${visibleBands
            .map((b) => `${b.lengthBp} bp`)
            .join(', ')}.`
        : 'No recognition sites found in this DNA sample for the selected enzyme(s).',
  };
}

/**
 * Computes normalized migration fraction (0 = well top, 1 = gel bottom) using log10(bp)
 * sieving physics parameterized by agarose percentage (0.8%–2.0%).
 */
export function computeGelMigrationFraction(
  lengthBp: number,
  agarosePercent: number,
  runProgress: number
): number {
  const safeBp = Math.max(50, Math.min(12000, lengthBp));
  // Higher agarose % slows large fragments more steeply
  const logMin = Math.log10(80);
  const logMax = Math.log10(7500);
  const normLog = (Math.log10(safeBp) - logMin) / (logMax - logMin); // 0 = tiny (fast), 1 = huge (slow)
  const sievingBias = 0.85 + (agarosePercent - 1.0) * 0.25;
  const maxTravel = Math.max(0.12, Math.min(0.92, 0.9 - normLog * 0.72 * sievingBias));
  return maxTravel * Math.max(0, Math.min(1, runProgress));
}
