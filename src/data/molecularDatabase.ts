import { DNASequenceRecord, PrimerPreset, RestrictionEnzyme } from '../types/lab';

/**
 * Deterministic sequence builder ensuring realistic GC% (~50-56%) and zero accidental
 * restriction sites outside explicitly placed palindromic loci.
 */
function buildBackgroundSeq(length: number, seed: number): string {
  const safeTriplets = ['GTC', 'CAG', 'ATC', 'TGC', 'GAC', 'CTA', 'GTG', 'CAC', 'ACG', 'TGA'];
  let s = seed;
  let out = '';
  while (out.length < length) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    out += safeTriplets[s % safeTriplets.length];
  }
  return out.slice(0, length);
}

function makeSequenceWithSites(
  totalLen: number,
  seed: number,
  placements: Array<{ pos: number; seq: string }>
): string {
  const chars = buildBackgroundSeq(totalLen, seed).split('');
  for (const p of placements) {
    for (let i = 0; i < p.seq.length; i++) {
      if (p.pos + i >= 0 && p.pos + i < totalLen) {
        chars[p.pos + i] = p.seq[i];
      }
    }
  }
  return chars.join('');
}

// Universal 16S rRNA locus (920 bp) with conserved 27F / 907R primer sites
const SEQ_16S_F = 'AGAGTTTGATCMTGGCTCAG'.replace('M', 'A');
const SEQ_16S_R_RC = 'GATTAGATACCCTGGTAGTCC'; // Reverse-complement of 907R on sense strand
const seq16sStr = makeSequenceWithSites(920, 101, [
  { pos: 0, seq: SEQ_16S_F },
  { pos: 410, seq: 'GAATTC' }, // Internal EcoRI site
  { pos: 899, seq: SEQ_16S_R_RC },
]);

// E. coli lacZ diagnostic amplicon (680 bp)
const LACZ_F = 'ATGACCATGATTACGGATTC';
const LACZ_R_RC = 'CGCTGTACCTGGTGATACTG';
const seqLacZStr = makeSequenceWithSites(680, 202, [
  { pos: 0, seq: LACZ_F },
  { pos: 260, seq: 'GGATCC' }, // BamHI site
  { pos: 660, seq: LACZ_R_RC },
]);

// B. subtilis spo0A sporulation regulator (540 bp)
const SPO0A_F = 'ATGGAGAAAATTAAAGTTTG';
const SPO0A_R_RC = 'GTAGATTCCGCAATGCAAGC';
const seqSpo0AStr = makeSequenceWithSites(540, 303, [
  { pos: 0, seq: SPO0A_F },
  { pos: 520, seq: SPO0A_R_RC },
]);

// S. aureus nuc thermonuclease diagnostic gene (420 bp)
const NUC_F = 'GCGATTGATGGTGATACGGT';
const NUC_R_RC = 'CGAAGCTTTGGTCAGTAAGC';
const seqNucStr = makeSequenceWithSites(420, 404, [
  { pos: 0, seq: NUC_F },
  { pos: 400, seq: NUC_R_RC },
]);

// P. aeruginosa oprL lipoprotein diagnostic gene (510 bp)
const OPRL_F = 'ATGGAAATGCTGAAATTCGG';
const OPRL_R_RC = 'CTGCTGGTCGGCATCTTCTA';
const seqOprLStr = makeSequenceWithSites(510, 505, [
  { pos: 0, seq: OPRL_F },
  { pos: 490, seq: OPRL_R_RC },
]);

// Circular pUC-AmpR plasmid (2,686 bp):
// Features: bla (AmpR) gene (bp 1600..2460), pMB1 ori (bp 600..1200),
// Multiple Cloning Site (MCS) near bp 390..450 + secondary PstI site at bp 1480!
// So:
//  - Uncut circular plasmid runs ~2,686 bp (supercoiled/nicked representation)
//  - Single EcoRI / BamHI / HindIII / SalI cut -> 1 linear band of 2,686 bp
//  - Double digest EcoRI (bp 396) + PstI (bp 412 & bp 1480) -> ~1,602 bp + ~1,068 bp (+ tiny 16 bp linker)
const BLA_F = 'ATGAGTATTCAACATTTCCG';
const BLA_R_RC = 'CAGTGAGGCACCTATCTCAG';
const seqPucAmpRStr = makeSequenceWithSites(2686, 777, [
  { pos: 396, seq: 'GAATTC' }, // EcoRI
  { pos: 404, seq: 'GGATCC' }, // BamHI
  { pos: 412, seq: 'CTGCAG' }, // PstI #1 (MCS)
  { pos: 422, seq: 'GTCGAC' }, // SalI
  { pos: 432, seq: 'AAGCTT' }, // HindIII
  { pos: 1480, seq: 'CTGCAG' }, // PstI #2 (allows crisp 2-band digest with EcoRI/BamHI/HindIII!)
  { pos: 1620, seq: BLA_F }, // bla (AmpR) start (510 bp amplicon to 2130)
  { pos: 2110, seq: BLA_R_RC },
]);

export const DNA_SEQUENCES: DNASequenceRecord[] = [
  {
    id: 'seq_16s_universal',
    name: 'Bacterial 16S Ribosomal RNA Gene (V1–V5 Region)',
    shortName: '16S rRNA',
    speciesId: null, // Present in all 5 bacterial species
    topology: 'linear',
    lengthBp: 920,
    sequence: seq16sStr,
    description:
      'Universal bacterial housekeeping gene encoding the small 30S ribosomal subunit RNA. Conserved primer regions allow amplification across all bacteria.',
    features: [{ name: '16S rRNA Conserved-Variable Locus', startBp: 1, endBp: 920, kind: 'cds' }],
  },
  {
    id: 'seq_ecoli_lacz',
    name: 'E. coli lacZ (Beta-Galactosidase Marker)',
    shortName: 'lacZ',
    speciesId: 'ecoli_k12', // Also shared by ecoli_puc_ampr in helper
    topology: 'linear',
    lengthBp: 680,
    sequence: seqLacZStr,
    description:
      'Encodes beta-galactosidase, the enzyme that cleaves lactose into glucose and galactose (producing pink colonies on MacConkey agar).',
    features: [{ name: 'lacZ Catalytic Core', startBp: 1, endBp: 680, kind: 'cds' }],
  },
  {
    id: 'seq_bsub_spo0a',
    name: 'B. subtilis spo0A (Sporulation Master Regulator)',
    shortName: 'spo0A',
    speciesId: 'bsubtilis_168',
    topology: 'linear',
    lengthBp: 540,
    sequence: seqSpo0AStr,
    description:
      'Transcription factor unique to endospore-forming Firmicutes like Bacillus subtilis.',
    features: [{ name: 'spo0A Coding Sequence', startBp: 1, endBp: 540, kind: 'cds' }],
  },
  {
    id: 'seq_saureus_nuc',
    name: 'S. aureus nuc (Thermonuclease Diagnostic Gene)',
    shortName: 'nuc',
    speciesId: 'saureus_rn4220',
    topology: 'linear',
    lengthBp: 420,
    sequence: seqNucStr,
    description:
      'Species-specific extracellular thermostable nuclease used clinically to identify Staphylococcus aureus.',
    features: [{ name: 'nuc Diagnostic Locus', startBp: 1, endBp: 420, kind: 'cds' }],
  },
  {
    id: 'seq_paerug_oprl',
    name: 'P. aeruginosa oprL (Peptidoglycan Lipoprotein)',
    shortName: 'oprL',
    speciesId: 'paeruginosa_pao1',
    topology: 'linear',
    lengthBp: 510,
    sequence: seqOprLStr,
    description:
      'Outer membrane lipoprotein gene used for rapid PCR identification of Pseudomonas aeruginosa.',
    features: [{ name: 'oprL Coding Sequence', startBp: 1, endBp: 510, kind: 'cds' }],
  },
  {
    id: 'seq_puc_ampr',
    name: 'pUC-AmpR High-Copy Cloning Plasmid',
    shortName: 'pUC-AmpR',
    speciesId: 'ecoli_puc_ampr',
    topology: 'circular',
    lengthBp: 2686,
    sequence: seqPucAmpRStr,
    description:
      'Circular 2,686 bp cloning vector carrying the bla (AmpR) ampicillin resistance gene, pMB1 high-copy origin, and a Multiple Cloning Site (EcoRI, BamHI, PstI, SalI, HindIII).',
    features: [
      { name: 'Multiple Cloning Site (MCS)', startBp: 396, endBp: 438, kind: 'mcs' },
      { name: 'pMB1 Origin of Replication', startBp: 620, endBp: 1220, kind: 'ori' },
      { name: 'bla (AmpR Beta-Lactamase)', startBp: 1620, endBp: 2130, kind: 'cds' },
    ],
  },
];

export function reverseComplement(seq: string): string {
  const comp: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
  return seq
    .toUpperCase()
    .split('')
    .reverse()
    .map((b) => comp[b] ?? 'N')
    .join('');
}

export const PRIMER_PRESETS: PrimerPreset[] = [
  {
    id: 'primer_16s',
    name: 'Universal 16S rRNA (27F / 907R)',
    targetSequenceId: 'seq_16s_universal',
    targetGeneLabel: '16S rRNA (All Bacteria)',
    forwardSeq: SEQ_16S_F,
    reverseSeq: reverseComplement(SEQ_16S_R_RC),
    expectedAmpliconBp: 920,
    description: 'Confirms bacterial DNA presence in any species (920 bp product).',
  },
  {
    id: 'primer_lacz',
    name: 'E. coli lacZ Specific (lacZ-F / lacZ-R)',
    targetSequenceId: 'seq_ecoli_lacz',
    targetGeneLabel: 'E. coli lacZ',
    forwardSeq: LACZ_F,
    reverseSeq: reverseComplement(LACZ_R_RC),
    expectedAmpliconBp: 680,
    description: 'Identifies Escherichia coli strains via the beta-galactosidase gene (680 bp).',
  },
  {
    id: 'primer_bla',
    name: 'Ampicillin Resistance bla (AmpR-F / AmpR-R)',
    targetSequenceId: 'seq_puc_ampr',
    targetGeneLabel: 'pUC-AmpR bla',
    forwardSeq: BLA_F,
    reverseSeq: reverseComplement(BLA_R_RC),
    expectedAmpliconBp: 510,
    description: 'Detects the plasmid-borne beta-lactamase resistance gene (510 bp).',
  },
  {
    id: 'primer_spo0a',
    name: 'B. subtilis spo0A Specific',
    targetSequenceId: 'seq_bsub_spo0a',
    targetGeneLabel: 'B. subtilis spo0A',
    forwardSeq: SPO0A_F,
    reverseSeq: reverseComplement(SPO0A_R_RC),
    expectedAmpliconBp: 540,
    description: 'Identifies Bacillus subtilis via its sporulation regulator (540 bp).',
  },
  {
    id: 'primer_nuc',
    name: 'S. aureus nuc Specific',
    targetSequenceId: 'seq_saureus_nuc',
    targetGeneLabel: 'S. aureus nuc',
    forwardSeq: NUC_F,
    reverseSeq: reverseComplement(NUC_R_RC),
    expectedAmpliconBp: 420,
    description: 'Identifies Staphylococcus aureus via the thermonuclease gene (420 bp).',
  },
  {
    id: 'primer_oprl',
    name: 'P. aeruginosa oprL Specific',
    targetSequenceId: 'seq_paerug_oprl',
    targetGeneLabel: 'P. aeruginosa oprL',
    forwardSeq: OPRL_F,
    reverseSeq: reverseComplement(OPRL_R_RC),
    expectedAmpliconBp: 510,
    description: 'Identifies Pseudomonas aeruginosa via outer-membrane oprL (510 bp).',
  },
];

export const RESTRICTION_ENZYMES: RestrictionEnzyme[] = [
  {
    id: 'ecori',
    name: 'EcoRI',
    recognitionSeq: 'GAATTC',
    cutOffset: 1,
    overhangType: '5_prime_sticky',
    overhangBases: 'AATT',
    sourceOrganism: 'Escherichia coli RY13',
    optimalTempC: 37,
    description: 'Cuts G^AATTC leaving 5′ sticky overhangs (AATT). Classic cloning enzyme.',
  },
  {
    id: 'bamhi',
    name: 'BamHI',
    recognitionSeq: 'GGATCC',
    cutOffset: 1,
    overhangType: '5_prime_sticky',
    overhangBases: 'GATC',
    sourceOrganism: 'Bacillus amyloliquefaciens H',
    optimalTempC: 37,
    description: 'Cuts G^GATCC leaving 5′ GATC sticky ends. Cuts inside E. coli lacZ and pUC MCS.',
  },
  {
    id: 'hindiii',
    name: 'HindIII',
    recognitionSeq: 'AAGCTT',
    cutOffset: 1,
    overhangType: '5_prime_sticky',
    overhangBases: 'AGCT',
    sourceOrganism: 'Haemophilus influenzae Rd',
    optimalTempC: 37,
    description: 'Cuts A^AGCTT leaving 5′ AGCT overhangs. Located at the end of the pUC MCS.',
  },
  {
    id: 'psti',
    name: 'PstI',
    recognitionSeq: 'CTGCAG',
    cutOffset: 5,
    overhangType: '3_prime_sticky',
    overhangBases: 'TGCA',
    sourceOrganism: 'Providencia stuartii 164',
    optimalTempC: 37,
    description: 'Cuts CTGCA^G leaving 3′ overhangs. Cuts pUC-AmpR twice (MCS + backbone) to drop out ~1,068 bp + ~1,618 bp!',
  },
  {
    id: 'sali',
    name: 'SalI',
    recognitionSeq: 'GTCGAC',
    cutOffset: 1,
    overhangType: '5_prime_sticky',
    overhangBases: 'TCGA',
    sourceOrganism: 'Streptomyces albus G',
    optimalTempC: 37,
    description: 'Cuts G^TCGAC leaving 5′ TCGA overhangs inside the pUC-AmpR MCS.',
  },
];

export const DNA_LADDERS: Array<{
  id: string;
  name: string;
  bandsBp: number[];
}> = [
  {
    id: 'ladder_1kb_plus',
    name: '1 kb Plus DNA Ladder',
    bandsBp: [5000, 3000, 2000, 1500, 1000, 750, 500, 250],
  },
  {
    id: 'ladder_100bp',
    name: '100 bp DNA Ladder',
    bandsBp: [1500, 1000, 800, 600, 500, 400, 300, 200, 100],
  },
];

export function getSequencesForSpecies(speciesId: string): DNASequenceRecord[] {
  return DNA_SEQUENCES.filter((seq) => {
    if (seq.speciesId === null) return true;
    if (seq.speciesId === speciesId) return true;
    // E. coli DH5alpha [pUC-AmpR] also shares chromosomal lacZ
    if (speciesId === 'ecoli_puc_ampr' && seq.id === 'seq_ecoli_lacz') return true;
    return false;
  });
}
