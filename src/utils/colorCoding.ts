import { getAntibioticById } from '../data/scientificDatabase';
import { BacterialSpecies, GrowthPhase, VesselType } from '../types/lab';

export type SemanticTone = 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate';

export interface SemanticStatusBadge {
  tone: SemanticTone;
  label: string;
  textClass: string;
  surfaceClass: string;
}

const TONE_STYLES: Record<SemanticTone, { textClass: string; surfaceClass: string }> = {
  emerald: {
    textClass: 'text-emerald-300',
    surfaceClass: 'bg-emerald-950/35 border-emerald-500/40 text-emerald-200',
  },
  cyan: {
    textClass: 'text-cyan-300',
    surfaceClass: 'bg-cyan-950/35 border-cyan-500/40 text-cyan-200',
  },
  amber: {
    textClass: 'text-amber-300',
    surfaceClass: 'bg-amber-950/35 border-amber-500/40 text-amber-200',
  },
  rose: {
    textClass: 'text-rose-300',
    surfaceClass: 'bg-rose-950/35 border-rose-500/40 text-rose-200',
  },
  slate: {
    textClass: 'text-slate-300',
    surfaceClass: 'bg-slate-900/70 border-slate-700 text-slate-300',
  },
};

function makeStatus(tone: SemanticTone, label: string): SemanticStatusBadge {
  return {
    tone,
    label,
    ...TONE_STYLES[tone],
  };
}

export function getTemperatureStatus(
  tempC: number,
  vesselType: VesselType,
  species?: BacterialSpecies
): SemanticStatusBadge {
  if (vesselType === 'glycerol_stock' || vesselType === 'microtube_1_5ml' || vesselType === 'pcr_tube') {
    if (tempC <= 8) return makeStatus('cyan', 'Cold Preserved');
    if (tempC <= 30) return makeStatus('slate', 'Ambient');
    return makeStatus('amber', 'Warm Reaction');
  }

  if (tempC <= 8) {
    return makeStatus('cyan', 'Refrigerated / Dormant');
  }

  if (species) {
    if (tempC >= species.tempMaxC) {
      return makeStatus('rose', 'Heat Shock / Lysis');
    }
    if (tempC < species.tempMinC) {
      return makeStatus('cyan', 'Below Tmin (Dormant)');
    }
    const diff = Math.abs(tempC - species.tempOptC);
    if (diff <= 1.8) {
      return makeStatus('emerald', 'Optimal Temp');
    }
    return makeStatus('amber', tempC < species.tempOptC ? 'Cool Sub-Optimal' : 'Warm Sub-Optimal');
  }

  if (tempC >= 33 && tempC <= 39) return makeStatus('emerald', 'Incubation Range');
  if (tempC >= 43) return makeStatus('rose', 'High Temp');
  return makeStatus('amber', 'Room / Sub-Optimal');
}

export function getPhStatus(pH: number, species?: BacterialSpecies): SemanticStatusBadge {
  if (species) {
    if (pH < species.phMin) {
      return makeStatus('rose', 'Acid Stress (< pHmin)');
    }
    if (pH > species.phMax) {
      return makeStatus('rose', 'Alkali Stress (> pHmax)');
    }
    const diff = Math.abs(pH - species.phOpt);
    if (diff <= 0.45) {
      return makeStatus('emerald', 'Optimal pH');
    }
    return makeStatus('amber', pH < species.phOpt ? 'Acidic Shift' : 'Alkaline Shift');
  }

  if (pH >= 6.5 && pH <= 7.6) return makeStatus('emerald', 'Neutral pH');
  if (pH < 5.5) return makeStatus('rose', 'Strongly Acidic');
  if (pH > 8.5) return makeStatus('rose', 'Strongly Alkaline');
  return makeStatus('amber', pH < 6.5 ? 'Mildly Acidic' : 'Mildly Alkaline');
}

export function getOxygenStatus(
  do2Percent: number,
  vesselType: VesselType,
  species?: BacterialSpecies
): SemanticStatusBadge {
  if (vesselType === 'agar_plate') {
    return makeStatus('emerald', 'Surface Air (100%)');
  }
  if (vesselType === 'glycerol_stock' || vesselType === 'microtube_1_5ml' || vesselType === 'pcr_tube') {
    return makeStatus('slate', 'N/A');
  }

  if (do2Percent >= 60) {
    return makeStatus('emerald', 'Well Aerated');
  }
  if (do2Percent >= 25) {
    return makeStatus('amber', 'Moderate O₂');
  }
  if (species?.oxygenRequirement === 'aerobe') {
    return makeStatus('rose', 'Hypoxic (Needs RPM)');
  }
  return makeStatus('amber', 'Low O₂ (Fermentative)');
}

export function getNutrientStatus(nutrientRemaining: number): SemanticStatusBadge {
  if (nutrientRemaining >= 0.5) return makeStatus('emerald', 'Rich');
  if (nutrientRemaining >= 0.15) return makeStatus('amber', 'Depleting');
  return makeStatus('rose', 'Exhausted');
}

export function getGrowthPhaseStatus(phase: GrowthPhase): SemanticStatusBadge {
  switch (phase) {
    case 'exponential':
      return makeStatus('emerald', 'Exponential');
    case 'lag':
      return makeStatus('cyan', 'Lag Adaptation');
    case 'inoculated':
      return makeStatus('cyan', 'Freshly Inoculated');
    case 'stationary':
      return makeStatus('amber', 'Stationary');
    case 'dormant':
      return makeStatus('cyan', 'Cold Dormant');
    case 'death':
      return makeStatus('rose', 'Death / Lysis');
    default:
      return makeStatus('slate', String(phase));
  }
}

export function getDnaPurityStatus(a260_280: number): SemanticStatusBadge {
  if (a260_280 >= 1.75) return makeStatus('emerald', 'Pure dsDNA');
  if (a260_280 >= 1.55) return makeStatus('amber', 'Minor Carryover');
  return makeStatus('rose', 'Protein Contaminated');
}

export interface AntibioticDecisionResult {
  code:
    | 'kills_strain'
    | 'arrests_strain'
    | 'selective_plasmid'
    | 'intrinsic_resistant'
    | 'sub_inhibitory'
    | 'no_drug';
  tone: SemanticTone;
  label: string;
  textClass: string;
  surfaceClass: string;
  ratioToMic: number;
  explanation: string;
}

export function evaluateAntibioticDecision(
  species: BacterialSpecies,
  compoundId: string,
  concUgPerMl: number
): AntibioticDecisionResult {
  const compound = getAntibioticById(compoundId);
  if (!compound || concUgPerMl <= 0) {
    return {
      code: 'no_drug',
      tone: 'slate',
      label: 'No Antibiotic',
      ...TONE_STYLES.slate,
      ratioToMic: 0,
      explanation: 'No inhibitory drug selected.',
    };
  }

  const mic = species.micUgPerMl[compoundId] ?? 16;
  const ratio = concUgPerMl / mic;
  const profile = species.realLifeDossier.antibioticProfiles[compoundId];

  if (ratio < 0.75) {
    if (profile?.verdict === 'resistant_plasmid') {
      return {
        code: 'selective_plasmid',
        tone: 'emerald',
        label: 'Selective Survival (Plasmid Protected)',
        ...TONE_STYLES.emerald,
        ratioToMic: ratio,
        explanation: `${species.commonLabel} survives up to ${mic} µg/mL via plasmid resistance (${profile.mechanism}). Safe for selecting this engineered strain.`,
      };
    }
    if (profile?.verdict === 'resistant_intrinsic') {
      return {
        code: 'intrinsic_resistant',
        tone: 'amber',
        label: 'Intrinsically Resistant (Spared)',
        ...TONE_STYLES.amber,
        ratioToMic: ratio,
        explanation: `Do NOT rely on ${compound.name} to stop ${species.commonLabel}: MIC is ${mic} µg/mL (${profile.mechanism}).`,
      };
    }
    return {
      code: 'sub_inhibitory',
      tone: 'amber',
      label: 'Sub-Inhibitory (< MIC)',
      ...TONE_STYLES.amber,
      ratioToMic: ratio,
      explanation: `Dose (${concUgPerMl} µg/mL) is below this strain's MIC (${mic} µg/mL), so cells will still grow with mild stress.`,
    };
  }

  if (compound.mode === 'bacteriostatic') {
    return {
      code: 'arrests_strain',
      tone: 'rose',
      label: 'Stops Growth (Bacteriostatic)',
      ...TONE_STYLES.rose,
      ratioToMic: ratio,
      explanation: `${concUgPerMl} µg/mL exceeds MIC (${mic} µg/mL). Halts protein synthesis and freezes division without lysing cells.`,
    };
  }

  return {
    code: 'kills_strain',
    tone: 'rose',
    label: 'Kills Strain (Bactericidal)',
    ...TONE_STYLES.rose,
    ratioToMic: ratio,
    explanation: `${concUgPerMl} µg/mL is ${(ratio).toFixed(1)}× above MIC (${mic} µg/mL). Actively kills ${species.commonLabel} (${profile?.mechanism ?? compound.targetMechanism}).`,
  };
}
