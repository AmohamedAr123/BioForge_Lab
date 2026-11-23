import { getMediaById, MEDIA_RECIPES } from '../data/scientificDatabase';
import { CultureVessel } from '../types/lab';
import { computeOd600 } from './simulation';

export type BenchSlotId = 'A' | 'B' | 'C';
export type DeskContainerKind = 'beaker' | 'flask' | 'tube' | 'plate';

export interface BenchSlotVessel {
  slotId: BenchSlotId;
  containerKind: DeskContainerKind | null;
  existingVesselId: string | null;
  volumeMl: number;
  /** Dissolved/suspended solute totals inside this slot */
  naohMmoles: number;
  hclMmoles: number;
  bufferMmoles: number;
  tryptoneG: number;
  glucoseG: number;
  saltsG: number;
  agarG: number;
  macconkeyUnits: number;
  /** Dissolved antibiotics in total micrograms (µg), so adding water dilutes µg/mL naturally */
  antibioticsUg: Record<string, number>;
  heatDegradedAbIds: string[];
  tempC: number;
  /** 0..1 dissolution / homogenization progress driven by Stirrer ON or Heating >= 60 °C */
  stirProgress: number;
  agarMelted: boolean;
  sterilityLevel: 'raw' | 'pasteurized' | 'autoclaved';
  /** Inoculation tracking */
  stagedSourceId: string | null;
  stagedInoculumUl: number;
  stagedMethod: 'pipette' | 'loop' | null;
  inoculumKilledByHeat: boolean;
  crossContamStrainId: string | null;
  vortexResuspended: boolean;
  /** Null whenever solution changes; only populated when player dips Digital pH Probe */
  lastProbedPh: number | null;
}

export interface PipetteCargo {
  volumeMl: number;
  naohMmoles: number;
  hclMmoles: number;
  bufferMmoles: number;
  tryptoneG: number;
  glucoseG: number;
  saltsG: number;
  agarG: number;
  macconkeyUnits: number;
  antibioticsUg: Record<string, number>;
  tempC: number;
  sourceLabel: string;
  /** Biological strain if suctioned from bacteria tube or inoculated slot */
  sourceVesselId: string | null;
  speciesId: string | null;
  vortexResuspended: boolean;
  /** Origin category to detect cross-contamination when tip is reused without ejecting */
  originSignature: string;
}

export interface FormulaMatchScore {
  mediaId: string;
  shortName: string;
  score: number; // 0..1
  normalizedWeight: number; // 0..1
  richnessEffect: number;
  capacityEffect: number;
  weightedContribution: number; // score * capacityEffect
}

export interface MediaMatchEvaluation {
  scores: FormulaMatchScore[];
  closestMediaId: string;
  closestName: string;
  topScore: number;
  blendedNutrientYield: number; // 0.05..1.25
  blendedBufferCapacity: number; // 0.18..1.0
  osmolarityFactor: number; // 0..1 (penalizes undiluted 10x PBS or massive salt overdose)
  osmolarityWarning: string | null;
  isSolidAgarReady: boolean;
  liquidColorHex: string;
}

export function getMaxSlotVolumeMl(kind: DeskContainerKind | null): number {
  if (kind === 'beaker' || kind === 'flask') return 250;
  if (kind === 'plate') return 40;
  if (kind === 'tube') return 15;
  return 250;
}

export function createEmptySlot(
  slotId: BenchSlotId,
  containerKind: DeskContainerKind | null
): BenchSlotVessel {
  return {
    slotId,
    containerKind,
    existingVesselId: null,
    volumeMl: 0,
    naohMmoles: 0,
    hclMmoles: 0,
    bufferMmoles: 0,
    tryptoneG: 0,
    glucoseG: 0,
    saltsG: 0,
    agarG: 0,
    macconkeyUnits: 0,
    antibioticsUg: {},
    heatDegradedAbIds: [],
    tempC: 22,
    stirProgress: 1,
    agarMelted: false,
    sterilityLevel: 'raw',
    stagedSourceId: null,
    stagedInoculumUl: 0,
    stagedMethod: null,
    inoculumKilledByHeat: false,
    crossContamStrainId: null,
    vortexResuspended: true,
    lastProbedPh: null,
  };
}

/**
 * Computes genuine aqueous pH from strong acid/base equivalents (HCl / NaOH),
 * phosphate buffer equilibrium (pKa = 7.20), and amino-acid peptone buffering.
 */
export function computeSlotTruePh(slot: BenchSlotVessel): number {
  const volL = Math.max(0.0005, slot.volumeMl / 1000);
  // Phosphate buffer capacity (millimoles per liter) centered around pH 7.20
  const phosphateM = slot.bufferMmoles / Math.max(0.5, slot.volumeMl); // mol/L (since mmol / mL = M)
  // Peptone/tryptone weak zwitterion buffering (~3 mmol/g capacity around pH 7.0)
  const peptoneBufferMmoles = slot.tryptoneG * 3.0;
  const totalBufferMmoles = slot.bufferMmoles * 1.15 + peptoneBufferMmoles;

  const netStrongMmoles = slot.naohMmoles - slot.hclMmoles; // + = alkaline, - = acidic

  // Resting pH shifts slightly from 7.00 -> 7.20 as phosphate buffer dominates
  const basePh = phosphateM > 0.005 ? 7.2 : 7.0;

  // Buffer resistance scales continuously with buffer millimoles
  // Minimal unbuffered water shoots rapidly to pH < 1 or > 13 on 10M additions
  const effectiveCapacityMmoles = 0.02 + totalBufferMmoles * 0.55;
  const ratio = netStrongMmoles / effectiveCapacityMmoles;

  let pH = basePh;
  if (Math.abs(netStrongMmoles) > 0.0001) {
    if (Math.abs(ratio) <= 1.2) {
      pH = basePh + 1.45 * Math.atan(ratio * 1.35);
    } else {
      const excessMmoles = Math.abs(netStrongMmoles) - effectiveCapacityMmoles * 0.9;
      const excessM = Math.max(1e-5, excessMmoles / (volL * 1000));
      if (netStrongMmoles > 0) {
        const strongPh = 14 + Math.log10(excessM);
        pH = Math.max(basePh + 1.3, Math.min(14.0, strongPh));
      } else {
        const strongPh = -Math.log10(excessM);
        pH = Math.min(basePh - 1.3, Math.max(-0.85, strongPh));
      }
    }
  }

  // Genuine strong acid range [-0.85, 14.0] (supports concentrated azeotropic HCl ~6.08 M -> pH -0.78)
  return Number(Math.max(-0.85, Math.min(14.0, pH)).toFixed(2));
}

/**
 * Models realistic boiling evaporation including HCl–H2O azeotropic behavior (~20.2% w/w = ~6.08 M HCl).
 * - Below 6.08 M: water evaporates much faster than HCl, so remaining [HCl] concentrates upward and pH drops.
 * - Above 6.08 M: volatile HCl gas escapes faster than water, so acidity drops back toward the 6.08 M azeotrope.
 */
export const HCL_AZEOTROPE_MOLARITY = 6.08;

export function boilEvaporateSlot(
  slot: BenchSlotVessel,
  evapMlRequested: number
): BenchSlotVessel {
  if (slot.volumeMl <= 0.5 || evapMlRequested <= 0) return slot;
  const maxEvap = Math.max(0, slot.volumeMl - 0.5);
  const evapMl = Math.min(maxEvap, evapMlRequested);
  if (evapMl <= 0.0001) return slot;

  const netHclMmoles = Math.max(0, slot.hclMmoles - slot.naohMmoles);
  const currentHclM = netHclMmoles / Math.max(0.1, slot.volumeMl);

  let vaporHclM = 0;
  if (currentHclM > 0.001) {
    if (currentHclM <= HCL_AZEOTROPE_MOLARITY) {
      const frac = currentHclM / HCL_AZEOTROPE_MOLARITY;
      // Dilute HCl loses negligible HCl gas until approaching 20.2% azeotrope
      vaporHclM = HCL_AZEOTROPE_MOLARITY * Math.pow(frac, 3.2);
    } else {
      // Above azeotrope (~20.2%), HCl escapes faster than water -> concentrates back down toward 6.08 M
      vaporHclM = HCL_AZEOTROPE_MOLARITY + (currentHclM - HCL_AZEOTROPE_MOLARITY) * 3.8;
    }
  }

  const lostHclMmoles = Math.min(netHclMmoles, vaporHclM * evapMl);
  const nextVol = Number(Math.max(0.5, slot.volumeMl - evapMl).toFixed(2));
  const nextHclMmoles = Math.max(0, slot.hclMmoles - lostHclMmoles);

  const heatKill = slot.inoculumKilledByHeat || (Boolean(slot.stagedSourceId) && slot.tempC > 50);
  const hasAmp = (slot.antibioticsUg['ampicillin'] ?? 0) > 0;
  let nextAntibiotics = slot.antibioticsUg;
  if (hasAmp) {
    nextAntibiotics = { ...slot.antibioticsUg };
    const degradedAmp = nextAntibiotics['ampicillin'] * Math.max(0.15, 1 - evapMl * 0.08);
    if (decayedBelowThreshold(degradedAmp)) {
      delete nextAntibiotics['ampicillin'];
    } else {
      nextAntibiotics['ampicillin'] = Number(degradedAmp.toFixed(3));
    }
  }
  const nextDegraded =
    hasAmp && !slot.heatDegradedAbIds.includes('ampicillin')
      ? [...slot.heatDegradedAbIds, 'ampicillin']
      : slot.heatDegradedAbIds;

  return {
    ...slot,
    volumeMl: nextVol,
    hclMmoles: nextHclMmoles,
    antibioticsUg: nextAntibiotics,
    heatDegradedAbIds: nextDegraded,
    inoculumKilledByHeat: heatKill,
    lastProbedPh: null,
  };
}

function decayedBelowThreshold(val: number): boolean {
  return val < 0.01;
}

export function boilEvaporateExistingVessel(
  ev: CultureVessel,
  evapMlRequested: number
): CultureVessel {
  if (ev.vesselType === 'agar_plate' || ev.volumeMl <= 1.0 || evapMlRequested <= 0) return ev;
  const maxEvap = Math.max(0, ev.volumeMl - 1.0);
  const evapMl = Math.min(maxEvap, evapMlRequested);
  if (evapMl <= 0.0001) return ev;

  const oldVol = ev.volumeMl;
  const nextVol = Number(Math.max(1.0, oldVol - evapMl).toFixed(2));
  const concFactor = oldVol / nextVol;

  let nextPh = ev.pH;
  if (ev.pH < 6.8) {
    // Acidic solution concentrates toward azeotrope (~pH -0.78) unless >20.2% (pH < -0.78)
    const approxHclM = Math.pow(10, -ev.pH);
    if (approxHclM <= HCL_AZEOTROPE_MOLARITY) {
      const nextM = Math.min(HCL_AZEOTROPE_MOLARITY, approxHclM * concFactor);
      nextPh = Number(Math.max(-0.78, -Math.log10(Math.max(1e-7, nextM))).toFixed(2));
    }
  } else if (ev.pH > 7.2) {
    const approxOhM = Math.pow(10, ev.pH - 14);
    const nextOhM = Math.min(1.0, approxOhM * concFactor);
    nextPh = Number(Math.min(14.0, 14 + Math.log10(Math.max(1e-7, nextOhM))).toFixed(2));
  }

  return {
    ...ev,
    volumeMl: nextVol,
    pH: nextPh,
  };
}

/**
 * Computes exact liquid transfer / dilution from a source slot or cargo into target slot,
 * preserving mass balance, stoichiometry, thermal mass, and antibiotic µg conservation.
 */
export function transferLiquidBetweenSlots(
  source: BenchSlotVessel,
  target: BenchSlotVessel,
  requestedMl: number
): { nextSource: BenchSlotVessel; nextTarget: BenchSlotVessel; movedMl: number } {
  const targetMax = getMaxSlotVolumeMl(target.containerKind);
  const headroom = Math.max(0, targetMax - target.volumeMl);
  const movedMl = Number(Math.max(0, Math.min(source.volumeMl, requestedMl, headroom)).toFixed(2));
  if (movedMl <= 0.001 || source.volumeMl <= 0) {
    return { nextSource: source, nextTarget: target, movedMl: 0 };
  }

  const frac = Math.min(1, movedMl / source.volumeMl);
  const nextAbs: Record<string, number> = { ...target.antibioticsUg };
  const remAbs: Record<string, number> = {};

  for (const [abId, ug] of Object.entries(source.antibioticsUg)) {
    const movedUg = ug * frac;
    const stayUg = ug - movedUg;
    if (movedUg > 0.01) nextAbs[abId] = (nextAbs[abId] ?? 0) + movedUg;
    if (stayUg > 0.01) remAbs[abId] = stayUg;
  }

  const totalNextVol = Number((target.volumeMl + movedMl).toFixed(2));
  const blendedTemp =
    totalNextVol > 0
      ? Number(((target.volumeMl * target.tempC + movedMl * source.tempC) / totalNextVol).toFixed(1))
      : source.tempC;

  const nextSource: BenchSlotVessel = {
    ...source,
    volumeMl: Number(Math.max(0, source.volumeMl - movedMl).toFixed(2)),
    naohMmoles: source.naohMmoles * (1 - frac),
    hclMmoles: source.hclMmoles * (1 - frac),
    bufferMmoles: source.bufferMmoles * (1 - frac),
    tryptoneG: source.tryptoneG * (1 - frac),
    glucoseG: source.glucoseG * (1 - frac),
    saltsG: source.saltsG * (1 - frac),
    agarG: source.agarG * (1 - frac),
    macconkeyUnits: source.macconkeyUnits * (1 - frac),
    antibioticsUg: remAbs,
  };

  const isPureLiquidTransfer =
    source.stirProgress >= 0.99 && target.stirProgress >= 0.99;

  const mergedDeg = Array.from(new Set([...target.heatDegradedAbIds, ...source.heatDegradedAbIds]));
  const nextTarget: BenchSlotVessel = {
    ...target,
    volumeMl: totalNextVol,
    naohMmoles: target.naohMmoles + source.naohMmoles * frac,
    hclMmoles: target.hclMmoles + source.hclMmoles * frac,
    bufferMmoles: target.bufferMmoles + source.bufferMmoles * frac,
    tryptoneG: target.tryptoneG + source.tryptoneG * frac,
    glucoseG: target.glucoseG + source.glucoseG * frac,
    saltsG: target.saltsG + source.saltsG * frac,
    agarG: target.agarG + source.agarG * frac,
    macconkeyUnits: target.macconkeyUnits + source.macconkeyUnits * frac,
    antibioticsUg: nextAbs,
    heatDegradedAbIds: mergedDeg,
    tempC: blendedTemp,
    stirProgress: isPureLiquidTransfer
      ? 1
      : Number(Math.min(target.stirProgress, source.stirProgress).toFixed(2)),
    agarMelted: target.agarMelted || source.agarMelted,
    sterilityLevel:
      target.sterilityLevel === 'autoclaved' && source.sterilityLevel === 'autoclaved'
        ? 'autoclaved'
        : target.sterilityLevel === 'raw' || source.sterilityLevel === 'raw'
        ? 'raw'
        : 'pasteurized',
    stagedSourceId: target.stagedSourceId ?? source.stagedSourceId,
    stagedInoculumUl: target.stagedInoculumUl + (source.stagedSourceId ? source.stagedInoculumUl * frac : 0),
    stagedMethod: target.stagedMethod ?? source.stagedMethod,
    lastProbedPh: null,
  };

  return { nextSource, nextTarget, movedMl };
}

export function dispenseCargoIntoSlot(
  cargo: PipetteCargo,
  target: BenchSlotVessel
): { nextTarget: BenchSlotVessel; dispensedMl: number } {
  const targetMax = getMaxSlotVolumeMl(target.containerKind);
  const headroom = Math.max(0, targetMax - target.volumeMl);
  const dispensedMl = Number(Math.max(0, Math.min(cargo.volumeMl, headroom)).toFixed(2));
  if (dispensedMl <= 0.001) {
    return { nextTarget: target, dispensedMl: 0 };
  }

  const frac = dispensedMl / cargo.volumeMl;
  const nextAbs: Record<string, number> = { ...target.antibioticsUg };
  for (const [abId, ug] of Object.entries(cargo.antibioticsUg)) {
    const addUg = ug * frac;
    if (addUg > 0.01) nextAbs[abId] = (nextAbs[abId] ?? 0) + addUg;
  }

  const totalNextVol = Number((target.volumeMl + dispensedMl).toFixed(2));
  const blendedTemp =
    totalNextVol > 0
      ? Number(((target.volumeMl * target.tempC + dispensedMl * cargo.tempC) / totalNextVol).toFixed(1))
      : cargo.tempC;

  const isHeatKilledInoculum = Boolean(cargo.sourceVesselId && target.tempC > 48);

  const nextTarget: BenchSlotVessel = {
    ...target,
    volumeMl: totalNextVol,
    naohMmoles: target.naohMmoles + cargo.naohMmoles * frac,
    hclMmoles: target.hclMmoles + cargo.hclMmoles * frac,
    bufferMmoles: target.bufferMmoles + cargo.bufferMmoles * frac,
    tryptoneG: target.tryptoneG + cargo.tryptoneG * frac,
    glucoseG: target.glucoseG + cargo.glucoseG * frac,
    saltsG: target.saltsG + cargo.saltsG * frac,
    agarG: target.agarG + cargo.agarG * frac,
    macconkeyUnits: target.macconkeyUnits + cargo.macconkeyUnits * frac,
    antibioticsUg: nextAbs,
    tempC: blendedTemp,
    // Aqueous liquid cargo mixes immediately without making a dissolved solution "unmixed"
    stirProgress: target.stirProgress,
    stagedSourceId: cargo.sourceVesselId ?? target.stagedSourceId,
    stagedInoculumUl: target.stagedInoculumUl + (cargo.sourceVesselId ? dispensedMl * 1000 : 0),
    stagedMethod: cargo.sourceVesselId ? 'pipette' : target.stagedMethod,
    inoculumKilledByHeat: target.inoculumKilledByHeat || isHeatKilledInoculum,
    vortexResuspended: cargo.sourceVesselId ? cargo.vortexResuspended : target.vortexResuspended,
    lastProbedPh: null,
  };

  return { nextTarget, dispensedMl };
}

/**
 * Pours out excess liquid from a slot (e.g. into the Lab Sink), preserving solute concentrations
 * while reducing total liquid volume cleanly.
 */
export function pourVolumeOutOfSlot(
  slot: BenchSlotVessel,
  pourMl: number
): { nextSlot: BenchSlotVessel; pouredMl: number } {
  if (slot.volumeMl <= 0) return { nextSlot: slot, pouredMl: 0 };
  const pouredMl = Number(Math.max(0, Math.min(slot.volumeMl, pourMl)).toFixed(2));
  const keepRatio = Math.max(0, (slot.volumeMl - pouredMl) / slot.volumeMl);

  if (keepRatio <= 0.005) {
    return {
      nextSlot: createEmptySlot(slot.slotId, slot.containerKind),
      pouredMl: slot.volumeMl,
    };
  }

  const nextAbs: Record<string, number> = {};
  for (const [abId, ug] of Object.entries(slot.antibioticsUg)) {
    const rem = ug * keepRatio;
    if (rem > 0.01) nextAbs[abId] = rem;
  }

  return {
    pouredMl,
    nextSlot: {
      ...slot,
      volumeMl: Number((slot.volumeMl - pouredMl).toFixed(2)),
      naohMmoles: slot.naohMmoles * keepRatio,
      hclMmoles: slot.hclMmoles * keepRatio,
      bufferMmoles: slot.bufferMmoles * keepRatio,
      tryptoneG: slot.tryptoneG * keepRatio,
      glucoseG: slot.glucoseG * keepRatio,
      saltsG: slot.saltsG * keepRatio,
      agarG: slot.agarG * keepRatio,
      macconkeyUnits: slot.macconkeyUnits * keepRatio,
      antibioticsUg: nextAbs,
      lastProbedPh: null,
    },
  };
}

interface TargetProfile {
  mediaId: string;
  tryptoneGPerL: number;
  glucoseGPerL: number;
  saltsGPerL: number;
  bufferMm: number;
  agarGPerL: number;
  macUnitsPerMl: number;
}

const CANONICAL_PROFILES: TargetProfile[] = [
  {
    mediaId: 'lb_broth',
    tryptoneGPerL: 15,
    glucoseGPerL: 0,
    saltsGPerL: 10,
    bufferMm: 5,
    agarGPerL: 0,
    macUnitsPerMl: 0,
  },
  {
    mediaId: 'nutrient_broth',
    tryptoneGPerL: 8,
    glucoseGPerL: 0,
    saltsGPerL: 1.5,
    bufferMm: 0,
    agarGPerL: 0,
    macUnitsPerMl: 0,
  },
  {
    mediaId: 'm9_minimal',
    tryptoneGPerL: 0,
    glucoseGPerL: 4,
    saltsGPerL: 4,
    bufferMm: 75,
    agarGPerL: 0,
    macUnitsPerMl: 0,
  },
  {
    mediaId: 'lb_agar',
    tryptoneGPerL: 15,
    glucoseGPerL: 0,
    saltsGPerL: 10,
    bufferMm: 5,
    agarGPerL: 15,
    macUnitsPerMl: 0,
  },
  {
    mediaId: 'macconkey_agar',
    tryptoneGPerL: 17,
    glucoseGPerL: 0,
    saltsGPerL: 5,
    bufferMm: 0,
    agarGPerL: 13.5,
    macUnitsPerMl: 0.04,
  },
];

function gaussianMatch(actual: number, target: number, scale: number): number {
  const diff = (actual - target) / Math.max(0.001, scale);
  return Math.exp(-0.5 * diff * diff);
}

/**
 * Evaluates a formulated BenchSlotVessel against all real microbiology formulas
 * WITHOUT any dropdown selector. Computes similarity scores (0.00..1.00) for each
 * formula and multiplies each score by that formula's growth/buffer effect.
 */
export function evaluateMediaFormulaMatch(slot: BenchSlotVessel): MediaMatchEvaluation {
  const volL = Math.max(0.001, slot.volumeMl / 1000);
  const volMl = Math.max(1, slot.volumeMl);

  const tryptoneGPerL = slot.tryptoneG / volL;
  const glucoseGPerL = slot.glucoseG / volL;
  const saltsGPerL = slot.saltsG / volL;
  const bufferMm = (slot.bufferMmoles / volMl) * 1000; // mM
  const agarGPerL = slot.agarG / volL;
  const macUnitsPerMl = slot.macconkeyUnits / volMl;

  const hasAnyIngredients =
    slot.tryptoneG > 0.005 ||
    slot.glucoseG > 0.005 ||
    slot.saltsG > 0.005 ||
    slot.bufferMmoles > 0.05 ||
    slot.agarG > 0.005 ||
    slot.macconkeyUnits > 0.01;

  // Osmotic shock check: >180 mM phosphate (~1.8x PBS) or >30 g/L salts hyper-concentrates media
  const totalSaltOsmRatio = bufferMm / 100 + saltsGPerL / 10;
  let osmolarityFactor = 1.0;
  let osmolarityWarning: string | null = null;
  if (totalSaltOsmRatio > 2.6 && slot.volumeMl > 0) {
    osmolarityFactor = Math.max(0.25, 1 - (totalSaltOsmRatio - 2.6) * 0.25);
    osmolarityWarning =
      'Hyper-osmotic concentrate! Dilute 10× PBS or salts with ddH₂O to avoid osmotic growth inhibition.';
  }

  const rawScores = CANONICAL_PROFILES.map((prof) => {
    const recipe = getMediaById(prof.mediaId) ?? MEDIA_RECIPES[0];
    if (!hasAnyIngredients || slot.volumeMl <= 0) {
      return {
        mediaId: prof.mediaId,
        shortName: recipe.shortName,
        score: 0,
        richnessEffect: recipe.richnessFactor,
        capacityEffect: recipe.nutrientCapacityMultiplier,
      };
    }

    const sTryp = gaussianMatch(tryptoneGPerL, prof.tryptoneGPerL, prof.tryptoneGPerL > 0 ? prof.tryptoneGPerL * 0.65 : 6);
    const sGluc = gaussianMatch(glucoseGPerL, prof.glucoseGPerL, prof.glucoseGPerL > 0 ? 3.5 : 4.5);
    const sSalt = gaussianMatch(saltsGPerL, prof.saltsGPerL, 7.0);
    const sBuf = gaussianMatch(bufferMm, prof.bufferMm, prof.bufferMm > 20 ? 55 : 45);
    const sAgar = gaussianMatch(agarGPerL, prof.agarGPerL, prof.agarGPerL > 0 ? 8.0 : 4.5);
    const sMac = gaussianMatch(macUnitsPerMl, prof.macUnitsPerMl, 0.025);

    const score = Number(
      Math.max(
        0,
        Math.min(
          1,
          0.32 * sTryp + 0.18 * sGluc + 0.14 * sSalt + 0.14 * sBuf + 0.14 * sAgar + 0.08 * sMac
        )
      ).toFixed(2)
    );

    return {
      mediaId: prof.mediaId,
      shortName: recipe.shortName,
      score,
      richnessEffect: recipe.richnessFactor,
      capacityEffect: recipe.nutrientCapacityMultiplier,
    };
  });

  const sortedRaw = [...rawScores].sort((a, b) => b.score - a.score);
  const sumScores = sortedRaw.reduce((acc, r) => acc + r.score, 0);

  const scores: FormulaMatchScore[] = sortedRaw.map((r) => {
    const norm = sumScores > 0 ? r.score / sumScores : 0;
    return {
      ...r,
      normalizedWeight: Number(norm.toFixed(2)),
      weightedContribution: Number((r.score * r.capacityEffect).toFixed(2)),
    };
  });

  const top = scores[0];
  const isSolidAgarReady = agarGPerL >= 6 && slot.agarMelted;

  // Multiply each score by each formula's physiological effect (normalized + completeness scaled)
  const organicRichness =
    Math.min(1.25, tryptoneGPerL / 15 + glucoseGPerL / 8 + (saltsGPerL > 0.5 ? 0.1 : 0));

  let blendedEffect = 0.05;
  let blendedBuf = 0.22;
  if (hasAnyIngredients && sumScores > 0) {
    const weightedCapacity = scores.reduce(
      (acc, s) => acc + s.normalizedWeight * s.capacityEffect,
      0
    );
    const weightedBuffer = scores.reduce((acc, s) => {
      const rec = getMediaById(s.mediaId);
      return acc + s.normalizedWeight * (rec?.bufferCapacity ?? 0.42);
    }, 0);

    // Completeness scales between partial nutrients and full recipe + glucose/tryptone boost
    const completeness = Math.max(top.score, Math.min(1.2, organicRichness));
    // Dissolution multiplier: unstirred/cold solids only yield 60% bioavailable nutrients
    const dissolveMultiplier = 0.6 + 0.4 * slot.stirProgress;
    blendedEffect = Number(
      Math.max(
        0.05,
        Math.min(1.25, weightedCapacity * completeness * dissolveMultiplier * osmolarityFactor)
      ).toFixed(2)
    );
    blendedBuf = Number(
      Math.min(1.0, Math.max(weightedBuffer, 0.2 + Math.min(0.8, bufferMm / 100))).toFixed(2)
    );
  }

  let liquidColorHex = '#1E293B';
  if (slot.volumeMl > 0) {
    if (!hasAnyIngredients) {
      liquidColorHex = '#38BDF8'; // pure ddH2O
    } else if (macUnitsPerMl > 0.015) {
      liquidColorHex = '#BE4B5B'; // MacConkey red
    } else if (tryptoneGPerL >= 3) {
      liquidColorHex = '#D4B475'; // rich amber LB / Nutrient broth
    } else if (glucoseGPerL >= 1 || bufferMm >= 20) {
      liquidColorHex = '#BAE6FD'; // clear pale M9/PBS solution
    } else {
      liquidColorHex = '#7DD3FC';
    }
  }

  return {
    scores,
    closestMediaId: hasAnyIngredients ? top.mediaId : slot.containerKind === 'plate' ? 'lb_agar' : 'lb_broth',
    closestName: hasAnyIngredients ? top.shortName : 'Pure ddH₂O (No Nutrients)',
    topScore: top.score,
    blendedNutrientYield: blendedEffect,
    blendedBufferCapacity: blendedBuf,
    osmolarityFactor,
    osmolarityWarning,
    isSolidAgarReady,
    liquidColorHex,
  };
}

// === Target pH Titration Calculator ===

export interface TitrationCalculationResult {
  reagent: 'hcl' | 'naoh' | 'none';
  volumeMl: number;
  volumeUl: number;
  mmolesNeeded: number;
  currentPh: number;
  projectedPh: number;
  reachable: boolean;
  note: string;
}

export function calculateTitrationForTargetPh(
  slot: BenchSlotVessel,
  existingVessel: CultureVessel | null,
  targetPhRaw: number,
  stockMolarity = 10
): TitrationCalculationResult {
  const targetPh = Math.max(-0.5, Math.min(13.8, targetPhRaw));
  const molar = Math.max(0.01, stockMolarity);
  const currentPh = existingVessel ? existingVessel.pH : computeSlotTruePh(slot);
  const currentVol = existingVessel ? existingVessel.volumeMl : slot.volumeMl;

  if (currentVol <= 0.05) {
    return {
      reagent: 'none',
      volumeMl: 0,
      volumeUl: 0,
      mmolesNeeded: 0,
      currentPh,
      projectedPh: currentPh,
      reachable: false,
      note: 'Add ddH₂O or solution to the vessel first.',
    };
  }

  if (Math.abs(targetPh - currentPh) <= 0.015) {
    return {
      reagent: 'none',
      volumeMl: 0,
      volumeUl: 0,
      mmolesNeeded: 0,
      currentPh,
      projectedPh: currentPh,
      reachable: true,
      note: 'Already at target pH.',
    };
  }

  const isAcid = targetPh < currentPh;
  const maxAddMl = existingVessel
    ? Math.max(0, 250 - existingVessel.volumeMl)
    : Math.max(0, getMaxSlotVolumeMl(slot.containerKind) - slot.volumeMl);

  const evalPhAtAdd = (addMl: number): number => {
    if (existingVessel) {
      const nextVol = existingVessel.volumeMl + addMl;
      const deltaMmoles = isAcid ? -(addMl * molar) : addMl * molar;
      return applyStrongAcidBaseDelta(
        existingVessel.pH,
        existingVessel.bufferCapacity,
        nextVol,
        deltaMmoles
      );
    }
    const simulated: BenchSlotVessel = {
      ...slot,
      volumeMl: slot.volumeMl + addMl,
      hclMmoles: isAcid ? slot.hclMmoles + addMl * molar : slot.hclMmoles,
      naohMmoles: !isAcid ? slot.naohMmoles + addMl * molar : slot.naohMmoles,
    };
    return computeSlotTruePh(simulated);
  };

  let lo = 0;
  let hi = Math.max(0.001, Math.min(200, maxAddMl || 100));
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) * 0.5;
    const midPh = evalPhAtAdd(mid);
    if (isAcid) {
      if (midPh > targetPh) lo = mid;
      else hi = mid;
    } else {
      if (midPh < targetPh) lo = mid;
      else hi = mid;
    }
  }

  const solMl = Number(((lo + hi) * 0.5).toFixed(4));
  const projectedPh = evalPhAtAdd(solMl);
  const reachable = Math.abs(projectedPh - targetPh) <= 0.15;

  return {
    reagent: isAcid ? 'hcl' : 'naoh',
    volumeMl: solMl,
    volumeUl: Number((solMl * 1000).toFixed(1)),
    mmolesNeeded: Number((solMl * molar).toFixed(3)),
    currentPh,
    projectedPh,
    reachable,
    note: reachable
      ? `Add ${solMl >= 1 ? `${solMl.toFixed(3)} mL` : `${(solMl * 1000).toFixed(1)} µL`} of ${molar}M ${isAcid ? 'HCl' : 'NaOH'} to reach pH ${projectedPh.toFixed(2)}.`
      : `Best achievable within vessel capacity using ${molar}M ${isAcid ? 'HCl' : 'NaOH'} is pH ${projectedPh.toFixed(2)} (consider diluting or larger vessel).`,
  };
}

// === Manual Bench State Persistence ===

const MANUAL_BENCH_STORAGE_KEY = 'bioforge_manual_media_bench_v32';

export type ManualToolCategory =
  | 'my_step'
  | 'all'
  | 'slots'
  | 'media'
  | 'ph_conc'
  | 'torch_rx'
  | 'strains';

export interface ManualCustomStep {
  id: string;
  name: string;
  items: string[];
}

export const DEFAULT_CUSTOM_STEPS: ManualCustomStep[] = [
  {
    id: 'step_1',
    name: '1. Formulate & Buffer',
    items: ['pipette_p1000', 'scoop_tryptone', 'scoop_salts', 'pbs_conc'],
  },
  {
    id: 'step_2',
    name: '2. Titrate pH & Calculate',
    items: ['ph_calculator', 'ph_meter', 'hcl_conc', 'naoh_conc', 'pipette_p1000'],
  },
  {
    id: 'step_3',
    name: '3. Heat, Sterilize & Seed',
    items: ['heating_stand', 'autoclave_chamber', 'ice_bucket', 'ab_ampicillin', 'loop_nichrome'],
  },
];

export interface PersistedManualBenchState {
  slots: Record<BenchSlotId, BenchSlotVessel>;
  activeSlotId: BenchSlotId;
  customLabel: string;
  waterJarContaminated: boolean;
  stirrerOn: boolean;
  standSlotId: BenchSlotId | null;
  burnerStandOn: boolean;
  autoclaveSlotId: BenchSlotId | null;
  autoclaveProgress: number;
  iceBucketSlotId: BenchSlotId | null;
  tipCount: number;
  hasFreshTip: boolean;
  tipDirtyOrigin: string | null;
  tipLoadedStrainId: string | null;
  crossContamStrainId: string | null;
  pipetteVolMl: number;
  pipetteCargo: PipetteCargo | null;
  pourAmountMl: number | 'all';
  sourceVesselId: string;
  dilutionExponent: number;
  loopState: 'unsterile' | 'hot' | 'cool_sterile' | 'loaded';
  loopCoolSec: number;
  loopKilledInoculum: boolean;
  resuspendedIds: string[];
  toolCategory: ManualToolCategory;
  customSteps: ManualCustomStep[];
  activeCustomStepId: string;
  calcTargetPh: number;
  calcStockMolarity: number;
}

function sanitizeSlot(id: BenchSlotId, raw: unknown, fallbackKind: DeskContainerKind): BenchSlotVessel {
  const base = createEmptySlot(id, fallbackKind);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<BenchSlotVessel>;
  return {
    ...base,
    ...r,
    slotId: id,
    containerKind: r.containerKind === null || r.containerKind === 'beaker' || r.containerKind === 'flask' || r.containerKind === 'tube' || r.containerKind === 'plate'
      ? r.containerKind
      : fallbackKind,
    antibioticsUg: r.antibioticsUg && typeof r.antibioticsUg === 'object' ? r.antibioticsUg : {},
    heatDegradedAbIds: Array.isArray(r.heatDegradedAbIds) ? r.heatDegradedAbIds : [],
  };
}

export function loadManualBenchState(): PersistedManualBenchState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      window.localStorage.getItem(MANUAL_BENCH_STORAGE_KEY) ??
      window.localStorage.getItem('bioforge_manual_media_bench_v31');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedManualBenchState & { bunsenLit?: boolean }>;
    if (!parsed || typeof parsed !== 'object' || !parsed.slots) return null;

    const validSlotOrNull = (v: unknown): BenchSlotId | null =>
      v === 'A' || v === 'B' || v === 'C' ? v : null;

    const steps =
      Array.isArray(parsed.customSteps) && parsed.customSteps.length > 0
        ? parsed.customSteps.filter(
            (st): st is ManualCustomStep =>
              Boolean(st && typeof st.id === 'string' && typeof st.name === 'string' && Array.isArray(st.items))
          )
        : DEFAULT_CUSTOM_STEPS;

    return {
      slots: {
        A: sanitizeSlot('A', parsed.slots.A, 'flask'),
        B: sanitizeSlot('B', parsed.slots.B, 'beaker'),
        C: sanitizeSlot('C', parsed.slots.C, 'tube'),
      },
      activeSlotId: parsed.activeSlotId === 'A' || parsed.activeSlotId === 'B' || parsed.activeSlotId === 'C' ? parsed.activeSlotId : 'B',
      customLabel: typeof parsed.customLabel === 'string' ? parsed.customLabel : '',
      waterJarContaminated: Boolean(parsed.waterJarContaminated),
      stirrerOn: Boolean(parsed.stirrerOn),
      standSlotId: validSlotOrNull(parsed.standSlotId),
      burnerStandOn: typeof parsed.burnerStandOn === 'boolean' ? parsed.burnerStandOn : Boolean(parsed.bunsenLit),
      autoclaveSlotId: validSlotOrNull(parsed.autoclaveSlotId),
      autoclaveProgress: typeof parsed.autoclaveProgress === 'number' ? parsed.autoclaveProgress : 0,
      iceBucketSlotId: validSlotOrNull(parsed.iceBucketSlotId),
      tipCount: typeof parsed.tipCount === 'number' ? parsed.tipCount : 24,
      hasFreshTip: Boolean(parsed.hasFreshTip),
      tipDirtyOrigin: typeof parsed.tipDirtyOrigin === 'string' ? parsed.tipDirtyOrigin : null,
      tipLoadedStrainId: typeof parsed.tipLoadedStrainId === 'string' ? parsed.tipLoadedStrainId : null,
      crossContamStrainId: typeof parsed.crossContamStrainId === 'string' ? parsed.crossContamStrainId : null,
      pipetteVolMl: typeof parsed.pipetteVolMl === 'number' && parsed.pipetteVolMl > 0 ? parsed.pipetteVolMl : 5,
      pipetteCargo: parsed.pipetteCargo && typeof parsed.pipetteCargo === 'object' ? parsed.pipetteCargo : null,
      pourAmountMl: parsed.pourAmountMl === 'all' || typeof parsed.pourAmountMl === 'number' ? parsed.pourAmountMl : 25,
      sourceVesselId: typeof parsed.sourceVesselId === 'string' ? parsed.sourceVesselId : '',
      dilutionExponent: typeof parsed.dilutionExponent === 'number' ? parsed.dilutionExponent : 4,
      loopState:
        parsed.loopState === 'hot'
          ? 'cool_sterile'
          : parsed.loopState === 'cool_sterile' || parsed.loopState === 'loaded'
          ? parsed.loopState
          : 'unsterile',
      loopCoolSec: 0,
      loopKilledInoculum: Boolean(parsed.loopKilledInoculum),
      resuspendedIds: Array.isArray(parsed.resuspendedIds) ? parsed.resuspendedIds : [],
      toolCategory:
        parsed.toolCategory === 'my_step' ||
        parsed.toolCategory === 'slots' ||
        parsed.toolCategory === 'media' ||
        parsed.toolCategory === 'ph_conc' ||
        parsed.toolCategory === 'torch_rx' ||
        parsed.toolCategory === 'strains'
          ? parsed.toolCategory
          : 'all',
      customSteps: steps.length > 0 ? steps : DEFAULT_CUSTOM_STEPS,
      activeCustomStepId:
        typeof parsed.activeCustomStepId === 'string' && steps.some((s) => s.id === parsed.activeCustomStepId)
          ? parsed.activeCustomStepId
          : steps[0]?.id ?? 'step_1',
      calcTargetPh: typeof parsed.calcTargetPh === 'number' ? parsed.calcTargetPh : 1.7,
      calcStockMolarity: typeof parsed.calcStockMolarity === 'number' && parsed.calcStockMolarity > 0 ? parsed.calcStockMolarity : 10,
    };
  } catch {
    return null;
  }
}

export function saveManualBenchState(state: PersistedManualBenchState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MANUAL_BENCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearManualBenchState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MANUAL_BENCH_STORAGE_KEY);
    window.localStorage.removeItem('bioforge_manual_media_bench_v31');
  } catch {
    // Ignore
  }
}

// === Existing CultureVessel Bench Manipulation Helpers ===

function applyStrongAcidBaseDelta(
  currentPh: number,
  bufferCapacity: number,
  volumeMl: number,
  netStrongMmoles: number
): number {
  if (Math.abs(netStrongMmoles) < 1e-5) return currentPh;
  const volSafe = Math.max(0.5, volumeMl);
  // Buffer millimoles scale with volume and vessel bufferCapacity
  const capMmoles = Math.max(0.03, volSafe * (0.008 + bufferCapacity * 0.14));
  const nextPhRaw = currentPh + 2.1 * Math.atan((netStrongMmoles / capMmoles) * 2.1);
  // If adding strong excess beyond buffer, blend toward true molarity pH
  if (netStrongMmoles < -capMmoles * 1.4) {
    const excessM = Math.max(1e-4, (-netStrongMmoles - capMmoles) / volSafe);
    const strongPh = -Math.log10(excessM);
    return Number(Math.max(-0.85, Math.min(nextPhRaw, strongPh)).toFixed(2));
  }
  if (netStrongMmoles > capMmoles * 1.4) {
    const excessM = Math.max(1e-4, (netStrongMmoles - capMmoles) / volSafe);
    const strongPh = 14 + Math.log10(excessM);
    return Number(Math.min(14.0, Math.max(nextPhRaw, strongPh)).toFixed(2));
  }
  return Number(Math.max(-0.85, Math.min(14.0, nextPhRaw)).toFixed(2));
}

export function applyReagentDropToExistingVessel(
  ev: CultureVessel,
  kind: 'naoh_conc' | 'hcl_conc' | 'pbs_conc' | 'water',
  reqMl: number,
  maxSafeVolMl: number
): { updated: CultureVessel; actualMl: number } {
  const headroom = Math.max(0, maxSafeVolMl - ev.volumeMl);
  const actualMl = Number(Math.max(0, Math.min(headroom, reqMl)).toFixed(2));
  if (actualMl <= 0.001) return { updated: ev, actualMl: 0 };

  const oldVol = Math.max(0.5, ev.volumeMl);
  const newVol = Number((oldVol + actualMl).toFixed(2));
  const dilRatio = ev.vesselType === 'agar_plate' ? 1 : oldVol / newVol;

  let nextPh = ev.pH;
  let nextBuf = ev.bufferCapacity;

  if (kind === 'naoh_conc') {
    nextPh = applyStrongAcidBaseDelta(ev.pH, ev.bufferCapacity, newVol, actualMl * 10);
  } else if (kind === 'hcl_conc') {
    nextPh = applyStrongAcidBaseDelta(ev.pH, ev.bufferCapacity, newVol, -actualMl * 10);
  } else if (kind === 'pbs_conc') {
    const shift = Math.min(0.85, (actualMl * 10) / Math.max(2, newVol));
    nextPh = Number((ev.pH + (7.2 - ev.pH) * shift).toFixed(2));
    nextBuf = Number(Math.min(1.0, ev.bufferCapacity + shift * 0.45).toFixed(2));
  }

  const dilutedAbs: Record<string, number> = {};
  for (const [abId, ugMl] of Object.entries(ev.antibioticsUgPerMl)) {
    const nextC = ugMl * dilRatio;
    if (nextC > 0.01) dilutedAbs[abId] = Number(nextC.toFixed(3));
  }

  const nextPops = ev.populations.map((p) => ({
    ...p,
    viableCount: ev.vesselType === 'agar_plate' ? p.viableCount : p.viableCount * dilRatio,
    deadCount: ev.vesselType === 'agar_plate' ? p.deadCount : p.deadCount * dilRatio,
  }));

  const updated: CultureVessel = {
    ...ev,
    volumeMl: newVol,
    pH: nextPh,
    bufferCapacity: nextBuf,
    nutrientRemaining: Number(Math.max(0, ev.nutrientRemaining * dilRatio).toFixed(3)),
    antibioticsUgPerMl: dilutedAbs,
    populations: nextPops,
  };
  updated.od600 = computeOd600(updated);
  return { updated, actualMl };
}

export function applyAntibioticDropToExistingVessel(
  ev: CultureVessel,
  abId: string,
  workingConcUgPerMl: number,
  reqMl: number,
  maxSafeVolMl: number
): { updated: CultureVessel; actualMl: number; heatDegraded: boolean } {
  const headroom = Math.max(0, maxSafeVolMl - ev.volumeMl);
  const actualMl = Number(Math.max(0, Math.min(headroom, reqMl)).toFixed(2));
  if (actualMl <= 0.001) return { updated: ev, actualMl: 0, heatDegraded: false };

  const oldVol = Math.max(0.5, ev.volumeMl);
  const newVol = Number((oldVol + actualMl).toFixed(2));
  const dilRatio = ev.vesselType === 'agar_plate' ? 1 : oldVol / newVol;
  const heatDegraded = abId === 'ampicillin' && ev.temperatureC > 55;
  const potency = heatDegraded ? 0.25 : 1.0;

  const dilutedAbs: Record<string, number> = {};
  for (const [id, ugMl] of Object.entries(ev.antibioticsUgPerMl)) {
    const nextC = ugMl * dilRatio;
    if (nextC > 0.01) dilutedAbs[id] = Number(nextC.toFixed(3));
  }
  const addUg = workingConcUgPerMl * Math.max(15, newVol) * potency;
  dilutedAbs[abId] = Number(((dilutedAbs[abId] ?? 0) + addUg / Math.max(1, newVol)).toFixed(2));

  const nextPops = ev.populations.map((p) => ({
    ...p,
    viableCount: ev.vesselType === 'agar_plate' ? p.viableCount : p.viableCount * dilRatio,
    deadCount: ev.vesselType === 'agar_plate' ? p.deadCount : p.deadCount * dilRatio,
  }));

  const updated: CultureVessel = {
    ...ev,
    volumeMl: newVol,
    antibioticsUgPerMl: dilutedAbs,
    populations: nextPops,
  };
  updated.od600 = computeOd600(updated);
  return { updated, actualMl, heatDegraded };
}

export function applyCargoToExistingVessel(
  ev: CultureVessel,
  cargo: PipetteCargo,
  maxSafeVolMl: number
): { updated: CultureVessel; dispensedMl: number; heatKilledInoculum: boolean } {
  const headroom = Math.max(0, maxSafeVolMl - ev.volumeMl);
  const dispensedMl = Number(Math.max(0, Math.min(cargo.volumeMl, headroom)).toFixed(2));
  if (dispensedMl <= 0.001) return { updated: ev, dispensedMl: 0, heatKilledInoculum: false };

  const frac = dispensedMl / Math.max(0.001, cargo.volumeMl);
  const oldVol = Math.max(0.5, ev.volumeMl);
  const newVol = Number((oldVol + dispensedMl).toFixed(2));
  const dilRatio = ev.vesselType === 'agar_plate' ? 1 : oldVol / newVol;

  const netStrongMmoles = (cargo.naohMmoles - cargo.hclMmoles) * frac;
  const addedBufferMmoles = cargo.bufferMmoles * frac;
  const addedTrypG = cargo.tryptoneG * frac;
  const addedGlucG = cargo.glucoseG * frac;

  let nextPh = applyStrongAcidBaseDelta(ev.pH, ev.bufferCapacity, newVol, netStrongMmoles);
  let nextBuf = ev.bufferCapacity;
  if (addedBufferMmoles > 0.02) {
    const shift = Math.min(0.85, (addedBufferMmoles * 10) / Math.max(2, newVol));
    nextPh = Number((nextPh + (7.2 - nextPh) * shift).toFixed(2));
    nextBuf = Number(Math.min(1.0, ev.bufferCapacity + shift * 0.45).toFixed(2));
  }

  // Nutrients gained relative to a 50 mL rich broth reference (LB ~15 g/L tryptone)
  const organicMassG = addedTrypG + addedGlucG * 1.4;
  const refMassAtNewVol = Math.max(0.05, (newVol / 1000) * 15);
  const addedNutrientFrac = Math.min(0.8, organicMassG / refMassAtNewVol);
  const nextNutrient = Number(
    Math.min(1.0, Math.max(0, ev.nutrientRemaining * dilRatio + addedNutrientFrac)).toFixed(3)
  );

  const nextAbs: Record<string, number> = {};
  for (const [abId, ugMl] of Object.entries(ev.antibioticsUgPerMl)) {
    const c = ugMl * dilRatio;
    if (c > 0.01) nextAbs[abId] = Number(c.toFixed(3));
  }
  for (const [abId, ug] of Object.entries(cargo.antibioticsUg)) {
    const addConc = (ug * frac) / Math.max(1, newVol);
    if (addConc > 0.01) nextAbs[abId] = Number(((nextAbs[abId] ?? 0) + addConc).toFixed(3));
  }

  const nextTemp =
    ev.vesselType === 'agar_plate'
      ? ev.temperatureC
      : Number(((oldVol * ev.temperatureC + dispensedMl * cargo.tempC) / newVol).toFixed(1));

  const nextPops = ev.populations.map((p) => ({
    ...p,
    viableCount: ev.vesselType === 'agar_plate' ? p.viableCount : p.viableCount * dilRatio,
    deadCount: ev.vesselType === 'agar_plate' ? p.deadCount : p.deadCount * dilRatio,
  }));

  const updated: CultureVessel = {
    ...ev,
    volumeMl: newVol,
    pH: nextPh,
    bufferCapacity: nextBuf,
    nutrientRemaining: nextNutrient,
    temperatureC: nextTemp,
    antibioticsUgPerMl: nextAbs,
    populations: nextPops,
  };
  updated.od600 = computeOd600(updated);
  return {
    updated,
    dispensedMl,
    heatKilledInoculum: Boolean(cargo.sourceVesselId && ev.temperatureC > 48),
  };
}

export function applySlotPourToExistingVessel(
  source: BenchSlotVessel,
  ev: CultureVessel,
  requestedMl: number,
  maxSafeVolMl: number
): { nextSource: BenchSlotVessel; nextVessel: CultureVessel; movedMl: number } {
  if (source.volumeMl <= 0) return { nextSource: source, nextVessel: ev, movedMl: 0 };
  const headroom = Math.max(0, maxSafeVolMl - ev.volumeMl);
  const movedMl = Number(Math.max(0, Math.min(source.volumeMl, requestedMl, headroom)).toFixed(2));
  if (movedMl <= 0.001) return { nextSource: source, nextVessel: ev, movedMl: 0 };

  const frac = Math.min(1, movedMl / source.volumeMl);
  const cargo: PipetteCargo = {
    volumeMl: movedMl,
    naohMmoles: source.naohMmoles * frac,
    hclMmoles: source.hclMmoles * frac,
    bufferMmoles: source.bufferMmoles * frac,
    tryptoneG: source.tryptoneG * frac,
    glucoseG: source.glucoseG * frac,
    saltsG: source.saltsG * frac,
    agarG: source.agarG * frac,
    macconkeyUnits: source.macconkeyUnits * frac,
    antibioticsUg: Object.fromEntries(
      Object.entries(source.antibioticsUg).map(([k, v]) => [k, v * frac])
    ),
    tempC: source.tempC,
    sourceLabel: `Slot ${source.slotId}`,
    sourceVesselId: source.stagedSourceId,
    speciesId: null,
    vortexResuspended: source.vortexResuspended,
    originSignature: `slot_${source.slotId}`,
  };

  const { updated } = applyCargoToExistingVessel(ev, cargo, maxSafeVolMl);
  const { nextSlot: nextSource } = pourVolumeOutOfSlot(source, movedMl);
  return { nextSource, nextVessel: updated, movedMl };
}

export function suctionCargoFromExistingVessel(
  ev: CultureVessel,
  requestedMl: number
): { nextVessel: CultureVessel; cargo: PipetteCargo; drawnMl: number } {
  // Keep at least 0.5 mL liquid unless vessel holds <= 0.5 mL, allow full requested suction up to available
  const drawnMl = Number(Math.max(0, Math.min(ev.volumeMl, requestedMl)).toFixed(2));
  if (drawnMl <= 0.001) {
    return {
      nextVessel: ev,
      drawnMl: 0,
      cargo: {
        volumeMl: 0,
        naohMmoles: 0,
        hclMmoles: 0,
        bufferMmoles: 0,
        tryptoneG: 0,
        glucoseG: 0,
        saltsG: 0,
        agarG: 0,
        macconkeyUnits: 0,
        antibioticsUg: {},
        tempC: ev.temperatureC,
        sourceLabel: ev.label,
        sourceVesselId: null,
        speciesId: null,
        vortexResuspended: true,
        originSignature: `ev_${ev.id}`,
      },
    };
  }

  const antibioticsUg: Record<string, number> = {};
  for (const [abId, ugPerMl] of Object.entries(ev.antibioticsUgPerMl)) {
    const tot = ugPerMl * drawnMl;
    if (tot > 0.01) antibioticsUg[abId] = tot;
  }

  const volL = drawnMl / 1000;
  const media = getMediaById(ev.mediaId);
  const hasRichNutrient = (media?.richnessFactor ?? 0.5) * ev.nutrientRemaining;
  const activePop = ev.populations.find((p) => p.viableCount > 0) ?? null;

  const cargo: PipetteCargo = {
    volumeMl: drawnMl,
    naohMmoles: ev.pH > 7.4 ? (ev.pH - 7.0) * drawnMl * 0.05 : 0,
    hclMmoles: ev.pH < 6.6 ? (7.0 - ev.pH) * drawnMl * 0.05 : 0,
    bufferMmoles: ev.bufferCapacity * drawnMl * 0.1,
    tryptoneG: media && !media.isMinimal ? hasRichNutrient * 15 * volL : 0,
    glucoseG: media?.isMinimal ? hasRichNutrient * 4 * volL : 0,
    saltsG: hasRichNutrient * 5 * volL,
    agarG: 0,
    macconkeyUnits: 0,
    antibioticsUg,
    tempC: ev.temperatureC,
    sourceLabel: ev.label,
    sourceVesselId: activePop ? ev.id : null,
    speciesId: activePop?.speciesId ?? null,
    vortexResuspended: true,
    originSignature: activePop ? `strain_${activePop.speciesId}` : `ev_${ev.id}`,
  };

  const nextVessel: CultureVessel = {
    ...ev,
    volumeMl: Number(Math.max(0, ev.volumeMl - drawnMl).toFixed(2)),
  };

  return { nextVessel, cargo, drawnMl };
}

export function pourOutExistingVessel(
  ev: CultureVessel,
  pourMl: number
): { nextVessel: CultureVessel; pouredMl: number } {
  const maxRemovable = Math.max(0, ev.volumeMl - 0.5);
  const pouredMl = Number(Math.max(0, Math.min(maxRemovable, pourMl)).toFixed(2));
  if (pouredMl <= 0.001) return { nextVessel: ev, pouredMl: 0 };
  return {
    pouredMl,
    nextVessel: {
      ...ev,
      volumeMl: Number((ev.volumeMl - pouredMl).toFixed(2)),
    },
  };
}

