import {
  getAntibioticById,
  getMediaById,
  getNutrientSupplementById,
  getSpeciesById,
} from '../data/scientificDatabase';
import {
  BacterialSpecies,
  CultureVessel,
  ManualActualParams,
  MediaRecipe,
  PopulationState,
  ShakingIncubatorConfig,
  StaticIncubatorConfig,
  StationId,
  ThermalEnvironment,
  VesselType,
} from '../types/lab';

const AMBIENT_LAB_TEMP_C = 22.0;
const MONOD_KS = 0.12;

/**
 * Computes realistic thermal time constant (tau, in simulated seconds) scaled by
 * liquid volume (surface-area-to-volume ratio) and heat-transfer environment.
 * - 1.5 mL microtube in still air: tau ≈ 300s (~8–10 min equilibration)
 * - 100 mL flask in still air: tau ≈ 4589s (~35–50 min half-equilibration)
 */
export function getThermalTau(
  vessel: Pick<CultureVessel, 'volumeMl' | 'vesselType'>,
  env: ThermalEnvironment
): number {
  const effectiveVol =
    vessel.vesselType === 'agar_plate' ? 18 : Math.max(0.5, vessel.volumeMl ?? 50);
  const baseAirTau = 230 * Math.pow(effectiveVol, 0.65);
  const envMultiplier =
    env === 'fridge'
      ? 0.75
      : env === 'incubator'
      ? 0.45
      : env === 'conduction'
      ? 0.12
      : 1.0;
  return baseAirTau * envMultiplier;
}

/**
 * Exact frame-rate-independent exponential thermal equilibration step.
 */
export function stepThermalEquilibration(
  currentTempC: number,
  targetTempC: number,
  tauSec: number,
  dtSimSeconds: number
): number {
  if (dtSimSeconds <= 0) return currentTempC;
  const alpha = 1 - Math.exp(-dtSimSeconds / Math.max(1, tauSec));
  return currentTempC + (targetTempC - currentTempC) * alpha;
}

/**
 * Computes the cardinal temperature growth multiplier (0..1) using a smooth
 * Rosso cardinal temperature model (Tmin, Topt, Tmax) and continuous thermal death above Tmax.
 */
export function computeTemperatureResponse(
  tempC: number,
  species: BacterialSpecies
): {
  growthFactor: number;
  thermalKillRatePerMin: number;
} {
  if (tempC <= species.tempMinC) {
    return { growthFactor: 0, thermalKillRatePerMin: 0 };
  }
  if (tempC >= species.tempMaxC) {
    const excessC = tempC - species.tempMaxC;
    // Continuous Arrhenius-like denaturation ramp starting smoothly past Tmax
    const thermalKillRatePerMin = 0.012 * (Math.pow(1.22, Math.min(35, excessC)) - 0.85);
    return { growthFactor: 0, thermalKillRatePerMin: Math.max(0.001, thermalKillRatePerMin) };
  }

  const t = tempC;
  const tMin = species.tempMinC;
  const tOpt = species.tempOptC;
  const tMax = species.tempMaxC;

  const num = (t - tMax) * Math.pow(t - tMin, 2);
  const den =
    (tOpt - tMin) *
    ((tOpt - tMin) * (t - tOpt) - (tOpt - tMax) * (tOpt + tMin - 2 * t));

  if (den === 0) return { growthFactor: 0, thermalKillRatePerMin: 0 };
  const ratio = Math.max(0, Math.min(1, num / den));
  return { growthFactor: ratio, thermalKillRatePerMin: 0 };
}

/**
 * Computes continuous cardinal pH response (0..1) using Rosso's cardinal pH equation
 * plus smooth acid/alkaline membrane stress kill outside [phMin, phMax].
 */
export function computePhResponse(
  pH: number,
  species: BacterialSpecies
): {
  phGrowthFactor: number;
  phKillRatePerMin: number;
} {
  if (pH <= species.phMin) {
    const excess = species.phMin - pH;
    // Smooth acid stress curve (gentle near boundary, steeper below pH 4)
    const phKillRatePerMin = 0.0035 * Math.pow(excess, 1.55);
    return { phGrowthFactor: 0, phKillRatePerMin };
  }
  if (pH >= species.phMax) {
    const excess = pH - species.phMax;
    const phKillRatePerMin = 0.004 * Math.pow(excess, 1.6);
    return { phGrowthFactor: 0, phKillRatePerMin };
  }

  const num = (pH - species.phMin) * (pH - species.phMax);
  const den = num - Math.pow(pH - species.phOpt, 2);
  if (den === 0) return { phGrowthFactor: 0, phKillRatePerMin: 0 };

  const phGrowthFactor = Math.max(0, Math.min(1, num / den));
  return { phGrowthFactor, phKillRatePerMin: 0 };
}

/**
 * Computes equilibrium & continuous dissolved oxygen availability and agitation mixing
 * for broth vs. agar vessels.
 * Accounts for fill-volume surface-to-volume ratio (flasks & tubes), shaking RPM kLa,
 * Henry's Law warm-water solubility reduction, and cellular respiration drawdown.
 */
export function computeOxygenDynamics(
  vessel: CultureVessel,
  shakingRpm: number,
  inShakingIncubator: boolean,
  totalViableCfuPerMl: number
): {
  equilibriumDo2Percent: number;
  kLaTransferPerMin: number;
  agitationFactor: number;
} {
  if (vessel.vesselType === 'agar_plate') {
    return { equilibriumDo2Percent: 100, kLaTransferPerMin: 1.0, agitationFactor: 1.0 };
  }
  if (
    vessel.vesselType === 'glycerol_stock' ||
    vessel.vesselType === 'microtube_1_5ml' ||
    vessel.vesselType === 'pcr_tube'
  ) {
    return {
      equilibriumDo2Percent: vessel.dissolvedO2Percent,
      kLaTransferPerMin: 0.02,
      agitationFactor: 0,
    };
  }

  // Henry's Law: warm water holds slightly less dissolved O2 (100% ref at 20 °C -> ~82% equiv at 37 °C)
  const tempSolubilityCap = Math.max(
    68,
    Math.min(100, 100 / (1 + 0.011 * Math.max(0, vessel.temperatureC - 20)))
  );

  // Surface-to-volume aeration scales smoothly with fill volume for BOTH flasks and tubes
  const volumeRatio =
    vessel.vesselType === 'flask_250ml'
      ? Math.max(0.55, Math.min(1.75, Math.pow(50 / Math.max(10, vessel.volumeMl), 0.48)))
      : Math.max(0.4, Math.min(1.45, Math.pow(5 / Math.max(1.5, vessel.volumeMl), 0.52) * 0.72));

  const baseTransfer = (vessel.vesselType === 'flask_250ml' ? 0.14 : 0.055) * volumeRatio;
  const rpmTransfer = inShakingIncubator
    ? Math.pow(Math.max(0, shakingRpm) / 220, 1.1) * 0.8 * volumeRatio
    : 0;
  const kLa = Math.max(0.025, baseTransfer + rpmTransfer);

  // Boundary-layer mixing efficiency: static broth (0 RPM) settles slightly, orbital shaking mixes nutrients & cells
  const agitationFactor = inShakingIncubator
    ? 0.78 + 0.22 * (1 - Math.exp(-Math.max(0, shakingRpm) / 85))
    : 0.78;

  // Respiration demand rises smoothly with viable cell density
  const biomassDemand = (totalViableCfuPerMl / 1.8e9) * (vessel.temperatureC > 12 ? 0.55 : 0.02);
  const equilibriumDo2Percent = Math.max(
    4,
    Math.min(100, (tempSolubilityCap * kLa) / (kLa + biomassDemand))
  );

  return {
    equilibriumDo2Percent,
    kLaTransferPerMin: Math.min(0.9, kLa),
    agitationFactor,
  };
}

export function computeSpeciesOxygenFactor(
  do2Percent: number,
  vessel: CultureVessel,
  species: BacterialSpecies
): number {
  if (vessel.vesselType === 'agar_plate') {
    return species.oxygenRequirement === 'obligate_anaerobe' ? 0.05 : 1.0;
  }
  if (vessel.vesselType === 'glycerol_stock') return 0;

  const monodO2 = do2Percent / (species.oxygenKmPercent + Math.max(0, do2Percent));
  if (species.oxygenRequirement === 'aerobe') {
    // Strictly aerobic species stall sharply under hypoxia
    return 0.06 + 0.94 * monodO2;
  }
  if (species.oxygenRequirement === 'facultative_anaerobe') {
    // Facultative anaerobes switch smoothly to slower fermentative ATP yield
    return 0.44 + 0.56 * monodO2;
  }
  return Math.max(0.05, 1 - monodO2);
}

/**
 * Evaluates antibiotic net inhibitory and killing pressure on a species.
 * Continuously couples MIC Hill kinetics, pH & oxygen uptake effects (for aminoglycosides),
 * and cell-division activity (for beta-lactams) with zero hard cliffs.
 */
export function computeAntibioticEffect(
  vessel: CultureVessel,
  species: BacterialSpecies,
  preDrugGrowthRatePerMin: number
): {
  growthInhibitionFactor: number;
  killRatePerMin: number;
} {
  let growthInhibitionFactor = 1.0;
  let totalKillRate = 0;

  // Normalized division vigor (0..1) relative to E. coli optimal speed
  const divisionVigor = Math.min(1, preDrugGrowthRatePerMin / 0.025);

  for (const compoundId in vessel.antibioticsUgPerMl) {
    if (!Object.prototype.hasOwnProperty.call(vessel.antibioticsUgPerMl, compoundId)) continue;
    const conc = vessel.antibioticsUgPerMl[compoundId];
    if (conc <= 0) continue;
    const compound = getAntibioticById(compoundId);
    if (!compound) continue;

    // Continuous pH & O2 modulation of drug potency (real microbiology: aminoglycosides need PMF)
    let potencyModifier = 1.0;
    const [optLow, optHigh] = compound.optimalPhRange;
    if (vessel.pH < optLow) {
      const acidDrop = Math.min(2.5, optLow - vessel.pH);
      potencyModifier *= Math.max(0.25, 1 - compound.acidicPenaltyFactor * (acidDrop / 1.5));
    } else if (vessel.pH > optHigh) {
      const alkRise = Math.min(2.0, vessel.pH - optHigh);
      potencyModifier *= Math.max(0.55, 1 - 0.12 * alkRise);
    }
    if (compoundId === 'kanamycin') {
      // Aminoglycoside import requires aerobic proton motive force
      potencyModifier *= 0.45 + 0.55 * (vessel.dissolvedO2Percent / (20 + vessel.dissolvedO2Percent));
    }

    const effectiveConc = conc * potencyModifier;
    const mic = species.micUgPerMl[compoundId] ?? 16;
    const ratio = effectiveConc / mic;

    // Smooth Hill inhibition curve across the entire dose spectrum
    const hill = Math.pow(ratio, 2.2) / (1 + Math.pow(ratio, 2.2));
    growthInhibitionFactor *= Math.max(0, 1 - hill * 0.996);

    if (compound.mode === 'bactericidal') {
      // Smooth logistic ramp around 0.8x MIC instead of a discontinuous jump
      const micGate = 1 / (1 + Math.exp(-6.5 * (ratio - 0.8)));
      const divisionDependency =
        compoundId === 'ampicillin'
          ? 0.08 + 0.92 * divisionVigor
          : 0.35 + 0.55 * divisionVigor;
      const killStrength =
        micGate * Math.min(1.6, Math.log2(1 + ratio)) * 0.024 * divisionDependency;
      totalKillRate += killStrength;
    }
  }

  return { growthInhibitionFactor, killRatePerMin: totalKillRate };
}

/**
 * Computes Beer-Lambert-calibrated OD600 from total broth cell concentration (viable + intact dead cells).
 */
export function computeOd600(vessel: CultureVessel): number {
  if (
    vessel.vesselType === 'agar_plate' ||
    vessel.vesselType === 'glycerol_stock' ||
    vessel.vesselType === 'microtube_1_5ml' ||
    vessel.vesselType === 'pcr_tube'
  ) {
    return 0;
  }
  let effectiveCellsPerMl = 0;
  for (const pop of vessel.populations) {
    const sp = getSpeciesById(pop.speciesId);
    const sizeScatterFactor = sp ? (sp.lengthUm * sp.widthUm) / (2.0 * 0.8) : 1.0;
    const clampedScatter = Math.max(0.65, Math.min(1.6, sizeScatterFactor));
    effectiveCellsPerMl += (pop.viableCount + pop.deadCount * 0.45) * clampedScatter;
  }

  const rawOd = effectiveCellsPerMl / 8.0e8;
  const saturatedOd = rawOd < 1.0 ? rawOd : 1.0 + (1 - Math.exp(-(rawOd - 1.0) * 0.65)) * 1.8;
  return Number(Math.max(0, saturatedOd).toFixed(4));
}

export interface VesselPhysiologySnapshot {
  tempFactor: number;
  phFactor: number;
  oxygenFactor: number;
  mediaFactor: number;
  agitationFactor: number;
  monodFactor: number;
  antibioticGrowthFactor: number;
  netRatePerMin: number;
  effectiveDoublingTimeMin: number | null;
  equilibriumDo2Percent: number;
}

/**
 * Pure diagnostic snapshot computing the exact instantaneous continuous multipliers
 * for a vessel given current temperature, pH, DO2%, volume, RPM, and medium.
 */
export function computeVesselPhysiologySnapshot(
  vessel: CultureVessel,
  shakingIncubator: ShakingIncubatorConfig,
  staticIncubator: StaticIncubatorConfig
): VesselPhysiologySnapshot | null {
  const pop = vessel.populations[0];
  const species = pop ? getSpeciesById(pop.speciesId) : undefined;
  if (!pop || !species) return null;

  const media = getMediaById(vessel.mediaId);
  const env = getVesselTargetEnvironment(vessel, shakingIncubator, staticIncubator);
  const totalViable = vessel.populations.reduce((acc, p) => acc + p.viableCount, 0);

  const { growthFactor: tempFactor, thermalKillRatePerMin } = computeTemperatureResponse(
    vessel.temperatureC,
    species
  );
  const { phGrowthFactor: phFactor, phKillRatePerMin } = computePhResponse(vessel.pH, species);
  const { equilibriumDo2Percent, agitationFactor } = computeOxygenDynamics(
    vessel,
    env.shakingRpm,
    env.inShakingIncubator,
    totalViable
  );
  const oxygenFactor = computeSpeciesOxygenFactor(vessel.dissolvedO2Percent, vessel, species);
  const mediaFactor = media
    ? media.isMinimal
      ? species.minimalMediaFactor
      : media.richnessFactor
    : 1.0;
  const monodFactor =
    vessel.nutrientRemaining > 0.0002
      ? vessel.nutrientRemaining / (MONOD_KS + vessel.nutrientRemaining)
      : 0;

  const baseMaxRate =
    (Math.LN2 / species.minDoublingTimeMin) *
    tempFactor *
    phFactor *
    oxygenFactor *
    mediaFactor *
    agitationFactor *
    monodFactor;

  const { growthInhibitionFactor: antibioticGrowthFactor, killRatePerMin } =
    computeAntibioticEffect(vessel, species, baseMaxRate);

  const actualGrowth = baseMaxRate * antibioticGrowthFactor;
  const starvationWeight = Math.max(0, 1 - vessel.nutrientRemaining / 0.05);
  const starvationDeathRate = 0.0009 * starvationWeight * Math.max(0.08, tempFactor);
  const netRatePerMin =
    actualGrowth - (thermalKillRatePerMin + phKillRatePerMin + killRatePerMin + starvationDeathRate);

  return {
    tempFactor,
    phFactor,
    oxygenFactor,
    mediaFactor,
    agitationFactor,
    monodFactor,
    antibioticGrowthFactor,
    netRatePerMin,
    effectiveDoublingTimeMin:
      netRatePerMin > 0.00015 ? Math.LN2 / netRatePerMin : null,
    equilibriumDo2Percent,
  };
}

function getVesselTargetEnvironment(
  vessel: CultureVessel,
  shakingIncubator: ShakingIncubatorConfig,
  staticIncubator: StaticIncubatorConfig
): {
  targetTempC: number;
  inShakingIncubator: boolean;
  shakingRpm: number;
  thermalEnv: ThermalEnvironment;
} {
  if (vessel.location.zone === 'equipment') {
    const st: StationId = vessel.location.stationId;
    if (st === 'shaking_incubator' && shakingIncubator.powerOn) {
      return {
        targetTempC: shakingIncubator.targetTempC,
        inShakingIncubator: true,
        shakingRpm: shakingIncubator.rpm,
        thermalEnv: 'incubator',
      };
    }
    if (st === 'static_incubator' && staticIncubator.powerOn) {
      return {
        targetTempC: staticIncubator.targetTempC,
        inShakingIncubator: false,
        shakingRpm: 0,
        thermalEnv: 'incubator',
      };
    }
    if (st === 'cold_storage') {
      return {
        targetTempC: vessel.vesselType === 'glycerol_stock' ? -80 : 4,
        inShakingIncubator: false,
        shakingRpm: 0,
        thermalEnv: 'fridge',
      };
    }
    if (st === 'pcr_cycler' || st === 'restriction_bench') {
      return {
        targetTempC: AMBIENT_LAB_TEMP_C,
        inShakingIncubator: false,
        shakingRpm: 0,
        thermalEnv: 'conduction',
      };
    }
  }
  return {
    targetTempC: AMBIENT_LAB_TEMP_C,
    inShakingIncubator: false,
    shakingRpm: 0,
    thermalEnv: 'still_air',
  };
}

/**
 * Advances all biological vessels forward by `dtSimMin` simulated minutes.
 * Lightweight closed-form continuous physiology engine verified stable at 1x–100x speeds.
 */
export function stepVesselsSimulation(
  vessels: CultureVessel[],
  dtSimMin: number,
  newSimMinutes: number,
  shakingIncubator: ShakingIncubatorConfig,
  staticIncubator: StaticIncubatorConfig
): CultureVessel[] {
  if (dtSimMin <= 0) return vessels;

  const maxStepMin = dtSimMin > 4 ? 1.5 : dtSimMin > 1.5 ? 0.8 : 0.5;
  const steps = Math.max(1, Math.ceil(dtSimMin / maxStepMin));
  const subDt = dtSimMin / steps;

  return vessels.map((originalVessel) => {
    const env = getVesselTargetEnvironment(originalVessel, shakingIncubator, staticIncubator);

    if (
      originalVessel.vesselType === 'glycerol_stock' ||
      originalVessel.vesselType === 'microtube_1_5ml' ||
      originalVessel.vesselType === 'pcr_tube'
    ) {
      let hasAntibiotics = false;
      for (const abId in originalVessel.antibioticsUgPerMl) {
        if (
          Object.prototype.hasOwnProperty.call(originalVessel.antibioticsUgPerMl, abId) &&
          originalVessel.antibioticsUgPerMl[abId] > 0
        ) {
          hasAntibiotics = true;
          break;
        }
      }
      let allDormant = true;
      for (let i = 0; i < originalVessel.populations.length; i++) {
        if (originalVessel.populations[i].phase !== 'dormant') {
          allDormant = false;
          break;
        }
      }
      if (
        allDormant &&
        !hasAntibiotics &&
        Math.abs(originalVessel.temperatureC - env.targetTempC) < 0.01
      ) {
        return originalVessel;
      }
    }

    const media: MediaRecipe | undefined = getMediaById(originalVessel.mediaId);
    const vessel: CultureVessel = {
      ...originalVessel,
      pH: typeof originalVessel.pH === 'number' ? originalVessel.pH : media?.pH ?? 7.0,
      initialPh: typeof originalVessel.initialPh === 'number' ? originalVessel.initialPh : media?.pH ?? 7.0,
      bufferCapacity:
        typeof originalVessel.bufferCapacity === 'number'
          ? originalVessel.bufferCapacity
          : media?.bufferCapacity ?? 0.42,
      dissolvedO2Percent:
        typeof originalVessel.dissolvedO2Percent === 'number'
          ? originalVessel.dissolvedO2Percent
          : originalVessel.vesselType === 'agar_plate'
          ? 100
          : 82,
      antibioticsUgPerMl: { ...originalVessel.antibioticsUgPerMl },
      populations: originalVessel.populations.map((p) => ({ ...p })),
      history: originalVessel.history,
    };

    for (let s = 0; s < steps; s++) {
      // 1. Volume- and environment-coupled exponential thermal inertia
      const tauSec = getThermalTau(vessel, env.thermalEnv);
      vessel.temperatureC = stepThermalEquilibration(
        vessel.temperatureC,
        env.targetTempC,
        tauSec,
        subDt * 60
      );

      // 2. Continuous temperature + pH coupled antibiotic hydrolysis decay
      if (vessel.temperatureC > 8) {
        const phStressRatio = Math.pow(Math.abs(vessel.pH - 7.0), 1.45);
        for (const abId in vessel.antibioticsUgPerMl) {
          if (!Object.prototype.hasOwnProperty.call(vessel.antibioticsUgPerMl, abId)) continue;
          const conc = vessel.antibioticsUgPerMl[abId];
          if (conc <= 0) continue;
          const ab = getAntibioticById(abId);
          if (!ab) continue;
          const baseHalfLifeMin = ab.halfLife37CHours * 60;
          const tempAcceleration = Math.pow(1.055, vessel.temperatureC - 37);
          const phHydrolysisAccel = abId === 'ampicillin' ? 1 + 0.42 * phStressRatio : 1 + 0.08 * phStressRatio;
          const effectiveHalfLifeMin = Math.max(30, baseHalfLifeMin / (tempAcceleration * phHydrolysisAccel));
          const decay = Math.exp((-Math.LN2 * subDt) / effectiveHalfLifeMin);
          vessel.antibioticsUgPerMl[abId] = conc * decay;
        }
      }

      // 3. Frozen glycerol stocks & inert nucleic acid tubes remain chemically/biologically preserved
      if (
        vessel.vesselType === 'glycerol_stock' ||
        vessel.vesselType === 'microtube_1_5ml' ||
        vessel.vesselType === 'pcr_tube'
      ) {
        for (const pop of vessel.populations) {
          pop.phase = 'dormant';
        }
        continue;
      }

      // 4. Continuous dissolved oxygen & mixing equilibration
      let totalViableInVessel = 0;
      for (const pop of vessel.populations) {
        totalViableInVessel += pop.viableCount;
      }

      const { equilibriumDo2Percent, kLaTransferPerMin, agitationFactor } = computeOxygenDynamics(
        vessel,
        env.shakingRpm,
        env.inShakingIncubator,
        totalViableInVessel
      );
      vessel.dissolvedO2Percent +=
        (equilibriumDo2Percent - vessel.dissolvedO2Percent) *
        (1 - Math.exp(-Math.max(0.08, kLaTransferPerMin) * subDt));

      // 5. Advance each microbial population continuously
      let netAcidEquivDelta = 0;

      for (const pop of vessel.populations) {
        const species = getSpeciesById(pop.speciesId);
        if (!species || pop.viableCount <= 0.05) {
          pop.phase = 'death';
          continue;
        }

        // Media selectivity (e.g., MacConkey bile salts & crystal violet target Gram-positive walls)
        if (media?.isMacConkey && !species.growsOnMacConkey) {
          const tempMobility = vessel.temperatureC > 8 ? Math.min(1, vessel.temperatureC / 37) : 0.08;
          pop.phase = vessel.temperatureC <= 8 ? 'dormant' : 'death';
          const bileKill = Math.min(pop.viableCount, pop.viableCount * 0.012 * tempMobility * subDt);
          pop.viableCount = Math.max(0, pop.viableCount - bileKill);
          pop.deadCount += bileKill;
          continue;
        }

        const { growthFactor: tempFactor, thermalKillRatePerMin } = computeTemperatureResponse(
          vessel.temperatureC,
          species
        );
        const { phGrowthFactor, phKillRatePerMin } = computePhResponse(vessel.pH, species);
        const oxygenFactor = computeSpeciesOxygenFactor(vessel.dissolvedO2Percent, vessel, species);
        const mediaFactor = media
          ? media.isMinimal
            ? species.minimalMediaFactor
            : media.richnessFactor
          : 1.0;

        const monodFactor =
          vessel.nutrientRemaining > 0.0002
            ? vessel.nutrientRemaining / (MONOD_KS + vessel.nutrientRemaining)
            : 0;

        // Smooth growth rate modulated by pure Monod substrate saturation and environment
        const effectiveMaxRatePerMin =
          (Math.LN2 / species.minDoublingTimeMin) *
          tempFactor *
          phGrowthFactor *
          oxygenFactor *
          mediaFactor *
          agitationFactor *
          monodFactor;

        const preDrugActiveRate = pop.lagProgress >= 1 ? effectiveMaxRatePerMin : 0;
        const { growthInhibitionFactor, killRatePerMin } = computeAntibioticEffect(
          vessel,
          species,
          preDrugActiveRate
        );

        // Smooth lag phase adaptation modulated continuously by temp, pH, media, agitation, and inhibition
        if (pop.lagProgress < 1) {
          const lagStep =
            (tempFactor * phGrowthFactor * mediaFactor * agitationFactor * growthInhibitionFactor * subDt) / 35;
          pop.lagProgress = Math.min(1, pop.lagProgress + lagStep);
        }

        const carryingCap =
          vessel.vesselType === 'agar_plate'
            ? 5e10
            : species.carryingCapacityCfuPerMl *
              ((media?.nutrientCapacityMultiplier ?? 1) + (vessel.fedBatchCapacityBoost ?? 0));

        const actualGrowthRate =
          pop.lagProgress >= 1
            ? effectiveMaxRatePerMin * growthInhibitionFactor
            : 0;

        // Basal cellular maintenance burn over multi-hour to 1-week horizons
        if (tempFactor > 0.02 && vessel.nutrientRemaining > 0) {
          const maintenanceDraw =
            (pop.viableCount / carryingCap) * 0.00048 * (0.1 + 0.9 * tempFactor) * subDt;
          vessel.nutrientRemaining = Math.max(0, vessel.nutrientRemaining - maintenanceDraw);
        }

        // Smooth nutrient exhaustion starvation ramp (governs long 1-day / 1-week decline)
        const starvationWeight = Math.max(0, 1 - vessel.nutrientRemaining / 0.05);
        const starvationDeathRate = 0.0009 * starvationWeight * Math.max(0.08, tempFactor);

        const totalDeathRate = thermalKillRatePerMin + phKillRatePerMin + killRatePerMin;
        const netRate = actualGrowthRate - totalDeathRate - starvationDeathRate;

        const prevViable = pop.viableCount;
        const rawNextViable = Math.max(0, prevViable * Math.exp(netRate * subDt));
        const maxBiomassFromSubstrate =
          netRate > 0 ? Math.max(0, vessel.nutrientRemaining * carryingCap * 1.05) : Infinity;
        const nextViable =
          rawNextViable > prevViable
            ? prevViable + Math.min(rawNextViable - prevViable, maxBiomassFromSubstrate)
            : rawNextViable;
        const newlyDead = Math.max(0, prevViable - nextViable);

        pop.viableCount = nextViable;
        pop.deadCount += newlyDead;

        if (actualGrowthRate > 0.00005 && nextViable > prevViable) {
          const biomassDelta = Math.max(0, nextViable - prevViable);
          const nutrientDraw = biomassDelta / (carryingCap * 1.05);
          vessel.nutrientRemaining = Math.max(0, vessel.nutrientRemaining - nutrientDraw);

          // Continuous metabolic pH drift:
          // - Early/carbohydrate growth & fermentation generate organic acids (lowers pH)
          // - In low-sugar complex tryptone media (LB/Nutrient) during late phase, amino acid deamination slightly raises pH
          const sugarFactor = media?.fermentableSugarFactor ?? 0.25;
          const fermentativeAcidRatio = Math.min(
            1,
            sugarFactor * (0.45 + 0.55 * vessel.nutrientRemaining) +
              (vessel.dissolvedO2Percent < 35 && species.oxygenRequirement === 'facultative_anaerobe'
                ? 0.45
                : 0)
          );
          const acidDrive = species.acidificationDrive * fermentativeAcidRatio;
          const deaminationBase =
            !media?.isMinimal && vessel.nutrientRemaining < 0.45
              ? 0.28 * (1 - vessel.nutrientRemaining / 0.45)
              : 0;
          netAcidEquivDelta += (deaminationBase - acidDrive) * (biomassDelta / carryingCap);
        }

        // Smooth physiological phase classification (stationary emerges naturally from Monod exhaustion)
        if (tempFactor <= 0 && thermalKillRatePerMin === 0) {
          pop.phase = 'dormant';
        } else if (totalDeathRate + starvationDeathRate > actualGrowthRate + 0.0002 && nextViable < prevViable) {
          pop.phase = 'death';
          pop.stressLevel = Math.min(1, pop.stressLevel + 0.04 * subDt);
        } else if (pop.lagProgress < 1) {
          pop.phase = pop.lagProgress < 0.12 ? 'inoculated' : 'lag';
        } else if (vessel.nutrientRemaining < 0.06 || monodFactor < 0.34) {
          pop.phase = 'stationary';
        } else if (actualGrowthRate > 0.0004) {
          pop.phase = 'exponential';
          pop.stressLevel = Math.max(0, pop.stressLevel - 0.02 * subDt);
        } else {
          pop.phase = 'stationary';
        }
      }

      // 6. Apply continuous buffered metabolic pH shift
      if (netAcidEquivDelta !== 0) {
        const bufferRes = Math.max(0.2, vessel.bufferCapacity);
        const phDelta = (netAcidEquivDelta * 1.6) / bufferRes;
        vessel.pH = Math.max(4.1, Math.min(9.2, vessel.pH + phDelta));
      }
    }

    // 7. Update physical observables (OD600 for broth, colony diameter for agar plates)
    vessel.od600 = computeOd600(vessel);

    if (vessel.vesselType === 'agar_plate') {
      let totalCfu = 0;
      let weightedMaxDiam = 0;
      for (const pop of vessel.populations) {
        totalCfu += pop.viableCount;
        const sp = getSpeciesById(pop.speciesId);
        if (sp) weightedMaxDiam = Math.max(weightedMaxDiam, sp.colonyProfile.maxDiameterMm);
      }
      if (vessel.colonyCount === 0 && totalCfu > 0) {
        vessel.colonyCount = Math.min(240, Math.max(1, Math.round(totalCfu)));
      }
      const cellsPerColony = vessel.colonyCount > 0 ? totalCfu / vessel.colonyCount : 0;
      if (cellsPerColony >= 1e5) {
        const logExpansion = Math.max(0, Math.log10(cellsPerColony) - 5) / 4.2;
        vessel.colonyDiameterMm = Number(
          Math.min(weightedMaxDiam || 3.2, Math.max(0.25, logExpansion * (weightedMaxDiam || 3.2))).toFixed(2)
        );
      }
    }

    // 8. Log time-series point and compactly preserve multi-day / 1-week trajectories
    const ageMin = newSimMinutes - vessel.createdAtSimMin;
    const sampleCadenceMin = ageMin > 2880 ? 60 : ageMin > 720 ? 30 : 10;
    if (
      vessel.vesselType !== 'glycerol_stock' &&
      vessel.vesselType !== 'microtube_1_5ml' &&
      vessel.vesselType !== 'pcr_tube' &&
      (vessel.history.length === 0 || newSimMinutes - vessel.lastLoggedSimMin >= sampleCadenceMin)
    ) {
      let totalViable = 0;
      for (const p of vessel.populations) totalViable += p.viableCount;

      let updatedHistory = [
        ...vessel.history,
        {
          simMinutes: Number(newSimMinutes.toFixed(1)),
          od600: vessel.od600,
          viableCount: totalViable,
          tempC: Number(vessel.temperatureC.toFixed(1)),
          nutrientRemaining: Number(vessel.nutrientRemaining.toFixed(3)),
          pH: Number(vessel.pH.toFixed(2)),
          dissolvedO2Percent: Number(vessel.dissolvedO2Percent.toFixed(1)),
        },
      ];

      // When exceeding 240 points, decimate odd entries in the older middle segment
      // so t=0 origin AND multi-day / 1-week horizons remain intact in localStorage.
      vessel.history = compactVesselHistory(updatedHistory);
      vessel.lastLoggedSimMin = newSimMinutes;
    }

    return vessel;
  });
}

export function compactVesselHistory(
  history: CultureVessel['history']
): CultureVessel['history'] {
  if (history.length <= 240) return history;
  let result = history;
  while (result.length > 240) {
    const head = result.slice(0, 1);
    const olderMid = result.slice(1, 141).filter((_, i) => i % 2 === 0);
    const recentTail = result.slice(141);
    result = [...head, ...olderMid, ...recentTail];
  }
  return result;
}

export function getMaxSafeVolumeMl(vesselType: CultureVessel['vesselType']): number {
  if (vesselType === 'flask_250ml') return 150;
  if (vesselType === 'culture_tube') return 12;
  return 25;
}

/**
 * Applies a realistic fed-batch sterile nutrient bolus or fresh broth top-up to an existing
 * liquid culture vessel: conserves biomass via V_old/V_new dilution, blends temperature & pH,
 * boosts buffer capacity, restores nutrientRemaining, and records a trajectory point.
 */
export function applyNutrientFeedToVessel(
  vessel: CultureVessel,
  supplementId: string,
  requestedFeedMl: number,
  simMinutes: number
): {
  updatedVessel: CultureVessel;
  actualFeedMl: number;
  summary: string;
} {
  const supplement = getNutrientSupplementById(supplementId);
  if (
    !supplement ||
    (vessel.vesselType !== 'flask_250ml' && vessel.vesselType !== 'culture_tube')
  ) {
    return {
      updatedVessel: vessel,
      actualFeedMl: 0,
      summary: 'Nutrient feeding applies only to liquid broth cultures.',
    };
  }

  const maxVol = getMaxSafeVolumeMl(vessel.vesselType);
  const oldVol = Math.max(1, vessel.volumeMl);
  const headroom = Math.max(0, maxVol - oldVol);
  const actualFeedMl = Number(Math.max(0, Math.min(headroom, requestedFeedMl)).toFixed(2));
  if (actualFeedMl <= 0.01) {
    return {
      updatedVessel: vessel,
      actualFeedMl: 0,
      summary: `${vessel.label} is already at safe headspace capacity (${maxVol} mL).`,
    };
  }

  const newVol = Number((oldVol + actualFeedMl).toFixed(2));
  const dilutionRatio = oldVol / newVol;
  const volumeScale = 50 / oldVol;

  const nutrientGain =
    supplement.category === 'broth'
      ? Math.max(0, (1.0 - vessel.nutrientRemaining) * (actualFeedMl / newVol) * 1.6) +
        supplement.nutrientGainPerMlRef50 * actualFeedMl * volumeScale
      : supplement.nutrientGainPerMlRef50 * actualFeedMl * volumeScale;

  const nextNutrient = Number(
    Math.min(1.0, Math.max(vessel.nutrientRemaining * dilutionRatio, vessel.nutrientRemaining * dilutionRatio + nutrientGain)).toFixed(3)
  );

  const doseFactor = actualFeedMl / Math.max(0.5, supplement.defaultDoseMl);
  const nextCapBoost = Math.min(
    0.75,
    Number(((vessel.fedBatchCapacityBoost ?? 0) + supplement.capacityBoostPerDose * doseFactor).toFixed(3))
  );

  const nextTemp = Number(
    ((oldVol * vessel.temperatureC + actualFeedMl * AMBIENT_LAB_TEMP_C) / newVol).toFixed(2)
  );

  const oldBuffer = Math.max(0.2, vessel.bufferCapacity || 0.42);
  const phWeightFeed = supplement.bufferStrength * (actualFeedMl / newVol) * 3.2;
  const phBlendFactor = phWeightFeed / (oldBuffer + phWeightFeed);
  const nextPh = Number(
    Math.max(
      4.3,
      Math.min(9.0, vessel.pH + (supplement.targetPh - vessel.pH) * phBlendFactor)
    ).toFixed(3)
  );
  const nextBufferCapacity = Number(
    Math.min(1.0, oldBuffer + supplement.bufferBoost * Math.min(1.5, doseFactor)).toFixed(3)
  );

  const dilutedAntibiotics: Record<string, number> = {};
  for (const [abId, conc] of Object.entries(vessel.antibioticsUgPerMl)) {
    const nextC = conc * dilutionRatio;
    if (nextC > 0.005) dilutedAntibiotics[abId] = Number(nextC.toFixed(3));
  }

  const nextPops = vessel.populations.map((pop) => {
    const scaledViable = pop.viableCount * dilutionRatio;
    const scaledDead = pop.deadCount * dilutionRatio;
    const canRecover =
      scaledViable > 10 &&
      (nextNutrient > vessel.nutrientRemaining + 0.05 ||
        Math.abs(nextPh - 7.0) < Math.abs(vessel.pH - 7.0) - 0.15 ||
        dilutionRatio < 0.88);

    return {
      ...pop,
      viableCount: scaledViable,
      deadCount: scaledDead,
      phase:
        canRecover && (pop.phase === 'stationary' || pop.phase === 'death')
          ? ('lag' as const)
          : pop.phase,
      lagProgress:
        canRecover && (pop.phase === 'stationary' || pop.phase === 'death')
          ? Math.max(0.45, pop.lagProgress * 0.65)
          : pop.lagProgress,
      stressLevel: Math.max(0, pop.stressLevel * (canRecover ? 0.55 : 0.9)),
    };
  });

  const updatedVessel: CultureVessel = {
    ...vessel,
    volumeMl: newVol,
    nutrientRemaining: nextNutrient,
    fedBatchCapacityBoost: nextCapBoost,
    temperatureC: nextTemp,
    pH: nextPh,
    bufferCapacity: nextBufferCapacity,
    antibioticsUgPerMl: dilutedAntibiotics,
    populations: nextPops,
  };
  updatedVessel.od600 = computeOd600(updatedVessel);

  const totalViable = updatedVessel.populations.reduce((acc, p) => acc + p.viableCount, 0);
  updatedVessel.history = compactVesselHistory([
    ...vessel.history,
    {
      simMinutes: Number(simMinutes.toFixed(1)),
      od600: updatedVessel.od600,
      viableCount: totalViable,
      tempC: Number(updatedVessel.temperatureC.toFixed(1)),
      nutrientRemaining: updatedVessel.nutrientRemaining,
      pH: Number(updatedVessel.pH.toFixed(2)),
      dissolvedO2Percent: Number(updatedVessel.dissolvedO2Percent.toFixed(1)),
    },
  ]);
  updatedVessel.lastLoggedSimMin = simMinutes;

  return {
    updatedVessel,
    actualFeedMl,
    summary: `Fed ${actualFeedMl} mL ${supplement.shortName} to ${vessel.label} (Nutrients ${(nextNutrient * 100).toFixed(0)}% · pH ${nextPh.toFixed(2)} · Vol ${newVol} mL).`,
  };
}

export function formatSimTime(simMinutes: number): string {
  const totalMins = Math.floor(simMinutes);
  const days = Math.floor(totalMins / 1440) + 1;
  const rem = totalMins % 1440;
  const hours = Math.floor(rem / 60);
  const mins = rem % 60;
  return `Day ${days} · ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatScientificCount(val: number): string {
  if (val <= 0) return '0';
  if (val < 1000) return Math.round(val).toString();
  const exp = Math.floor(Math.log10(val));
  const mantissa = val / Math.pow(10, exp);
  return `${mantissa.toFixed(2)}×10^${exp}`;
}

function computePlateColonySeedInternal(
  viableCfuPerMl: number,
  inoculumUl: number,
  dilutionExponent = 0
): number {
  const inoculumMl = inoculumUl / 1000;
  const dilutionFactor = Math.pow(10, -Math.max(0, dilutionExponent));
  const expectedCfu = viableCfuPerMl * inoculumMl * dilutionFactor;
  if (expectedCfu < 0.4) return 0;
  return Math.max(1, Math.min(300, Math.round(expectedCfu)));
}

/**
 * Single simulation source of truth for creating/formulating a culture vessel
 * from either Automate Mode (nominal inputs) or Manual Mode (measured actualParams).
 */
export function createFormulatedVessel(params: {
  id: string;
  label: string;
  vesselType: VesselType;
  mediaId: string;
  volumeMl: number;
  initialPh?: number;
  antibioticsUgPerMl: Record<string, number>;
  sourceVessel?: CultureVessel;
  inoculumUl: number;
  dilutionExponent?: number;
  beltSlot: number;
  simMinutes: number;
  actualParams?: ManualActualParams;
}): { vessel: CultureVessel; contaminated: boolean; crossContaminated: boolean } {
  const actual = params.actualParams ?? {};
  const mediaRecipe = getMediaById(params.mediaId);
  const startVol = Math.max(1, actual.actualVolumeMl ?? params.volumeMl);
  const startPh =
    typeof actual.actualPh === 'number'
      ? actual.actualPh
      : typeof params.initialPh === 'number'
      ? params.initialPh
      : mediaRecipe?.pH ?? 7.0;
  const startNutrients =
    typeof actual.actualNutrients === 'number'
      ? Math.max(0.05, Math.min(1.25, actual.actualNutrients))
      : 1.0;
  const abPotency =
    typeof actual.antibioticPotency === 'number'
      ? Math.max(0.05, Math.min(1, actual.antibioticPotency))
      : 1.0;

  const inoculumMl = params.inoculumUl / 1000;
  const totalLiquidVol =
    params.vesselType === 'agar_plate' ? startVol : startVol + inoculumMl;

  const blendedAntibiotics: Record<string, number> = {};
  for (const [abId, conc] of Object.entries(params.antibioticsUgPerMl)) {
    if (conc > 0) {
      blendedAntibiotics[abId] = Number((conc * abPotency).toFixed(3));
    }
  }

  const populations: PopulationState[] = [];
  let startTempC = 22.0;

  if (params.sourceVessel) {
    const resuspensionFactor = actual.vortexResuspended === false ? 0.35 : 1.0;

    if (params.vesselType !== 'agar_plate') {
      startTempC = Number(
        (
          (22.0 * startVol + params.sourceVessel.temperatureC * inoculumMl) /
          totalLiquidVol
        ).toFixed(2)
      );
      for (const [abId, srcConc] of Object.entries(params.sourceVessel.antibioticsUgPerMl)) {
        if (srcConc <= 0) continue;
        const carryover = (srcConc * inoculumMl) / totalLiquidVol;
        if (carryover > 0.005) {
          blendedAntibiotics[abId] = (blendedAntibiotics[abId] ?? 0) + carryover;
        }
      }
    }

    const isActiveLiquidSource =
      params.sourceVessel.vesselType === 'flask_250ml' ||
      params.sourceVessel.vesselType === 'culture_tube';
    const phMatch = Math.max(0, 1 - Math.abs(params.sourceVessel.pH - startPh) / 1.5);
    const inocBoost = Math.min(0.2, (params.inoculumUl / 500) * 0.2);

    for (const pop of params.sourceVessel.populations) {
      if (pop.viableCount <= 0) continue;
      const sampledViable = pop.viableCount * resuspensionFactor;
      const initialConcentration =
        params.vesselType === 'agar_plate'
          ? computePlateColonySeedInternal(
              sampledViable,
              params.inoculumUl,
              params.dilutionExponent ?? 0
            )
          : (sampledViable * inoculumMl) / totalLiquidVol;

      const initialDead =
        params.vesselType === 'agar_plate'
          ? 0
          : (pop.deadCount * inoculumMl) / totalLiquidVol;

      const inheritedLag =
        isActiveLiquidSource && pop.phase === 'exponential'
          ? Math.min(0.75, 0.35 * phMatch + inocBoost)
          : isActiveLiquidSource && pop.phase === 'lag'
          ? Math.min(0.4, pop.lagProgress * 0.45 * phMatch + inocBoost * 0.5)
          : 0;

      populations.push({
        speciesId: pop.speciesId,
        viableCount: initialConcentration,
        deadCount: initialDead,
        phase: inheritedLag >= 0.15 ? 'lag' : 'inoculated',
        lagProgress: inheritedLag,
        stressLevel: pop.stressLevel * 0.25,
      });
    }
  }

  let contaminated = false;
  const risk = actual.contaminationRisk ?? 0;
  if (risk > 0 && Math.random() < risk) {
    contaminated = true;
    const wildContamId =
      params.vesselType === 'agar_plate' ? 'saureus_rn4220' : 'bsubtilis_168';
    if (!populations.some((p) => p.speciesId === wildContamId)) {
      populations.push({
        speciesId: wildContamId,
        viableCount: params.vesselType === 'agar_plate' ? 8 : 1.8e4,
        deadCount: 0,
        phase: 'inoculated',
        lagProgress: 0,
        stressLevel: 0,
      });
    }
  }

  let crossContaminated = false;
  if (
    actual.crossStrainId &&
    !populations.some((p) => p.speciesId === actual.crossStrainId)
  ) {
    crossContaminated = true;
    populations.push({
      speciesId: actual.crossStrainId,
      viableCount: params.vesselType === 'agar_plate' ? 12 : 4.5e4,
      deadCount: 0,
      phase: 'inoculated',
      lagProgress: 0,
      stressLevel: 0,
    });
  }

  const startDo2 = params.vesselType === 'agar_plate' ? 100 : 88;
  const vessel: CultureVessel = {
    id: params.id,
    label: params.label,
    vesselType: params.vesselType,
    mediaId: params.mediaId,
    volumeMl: Number(startVol.toFixed(2)),
    nutrientRemaining: Number(Math.min(1.0, startNutrients).toFixed(3)),
    fedBatchCapacityBoost:
      startNutrients > 1.0 ? Number(Math.min(0.4, startNutrients - 1.0).toFixed(3)) : undefined,
    antibioticsUgPerMl: blendedAntibiotics,
    temperatureC: startTempC,
    pH: Number(startPh.toFixed(2)),
    initialPh: Number(startPh.toFixed(2)),
    bufferCapacity:
      typeof actual.actualBufferCapacity === 'number'
        ? Math.max(0.15, Math.min(1.0, actual.actualBufferCapacity))
        : mediaRecipe?.bufferCapacity ?? 0.42,
    dissolvedO2Percent: startDo2,
    populations,
    od600: 0,
    colonyCount:
      params.vesselType === 'agar_plate' && populations.length > 0
        ? Math.min(300, Math.max(0, Math.round(populations[0].viableCount)))
        : 0,
    colonyDiameterMm: 0,
    createdAtSimMin: params.simMinutes,
    lastLoggedSimMin: params.simMinutes,
    history: [],
    location: { zone: 'belt', slotIndex: params.beltSlot },
  };
  vessel.od600 = computeOd600(vessel);

  if (params.vesselType !== 'glycerol_stock') {
    const totalViable = vessel.populations.reduce((acc, p) => acc + p.viableCount, 0);
    vessel.history.push({
      simMinutes: Number(params.simMinutes.toFixed(1)),
      od600: vessel.od600,
      viableCount: totalViable,
      tempC: vessel.temperatureC,
      nutrientRemaining: vessel.nutrientRemaining,
      pH: vessel.pH,
      dissolvedO2Percent: startDo2,
    });
  }

  return { vessel, contaminated, crossContaminated };
}

/**
 * Single simulation source of truth for inoculating an existing vessel
 * with optional Manual Mode actualParams (resuspension, tip cross-strain, airborne risk).
 */
export function inoculateExistingVessel(params: {
  targetVessel: CultureVessel;
  sourceVessel: CultureVessel;
  inoculumUl: number;
  dilutionExponent?: number;
  actualParams?: ManualActualParams;
}): { updatedVessel: CultureVessel; contaminated: boolean; crossContaminated: boolean } {
  const { targetVessel, sourceVessel, inoculumUl, dilutionExponent = 0, actualParams } = params;
  const actual = actualParams ?? {};
  const resuspensionFactor = actual.vortexResuspended === false ? 0.35 : 1.0;
  const inoculumMl = inoculumUl / 1000;
  const targetVol = Math.max(1, targetVessel.volumeMl);
  const totalLiquidVol =
    targetVessel.vesselType === 'agar_plate' ? targetVol : targetVol + inoculumMl;

  const addedPops: PopulationState[] = sourceVessel.populations
    .filter((p) => p.viableCount > 0)
    .map((p) => {
      const sampledViable = p.viableCount * resuspensionFactor;
      return {
        speciesId: p.speciesId,
        viableCount:
          targetVessel.vesselType === 'agar_plate'
            ? computePlateColonySeedInternal(sampledViable, inoculumUl, dilutionExponent)
            : (sampledViable * inoculumMl) / totalLiquidVol,
        deadCount:
          targetVessel.vesselType === 'agar_plate'
            ? 0
            : (p.deadCount * inoculumMl) / totalLiquidVol,
        phase: 'inoculated',
        lagProgress: 0,
        stressLevel: 0,
      };
    });

  let contaminated = false;
  if ((actual.contaminationRisk ?? 0) > 0 && Math.random() < (actual.contaminationRisk ?? 0)) {
    contaminated = true;
    addedPops.push({
      speciesId: 'saureus_rn4220',
      viableCount: targetVessel.vesselType === 'agar_plate' ? 8 : 1.5e4,
      deadCount: 0,
      phase: 'inoculated',
      lagProgress: 0,
      stressLevel: 0,
    });
  }

  let crossContaminated = false;
  if (
    actual.crossStrainId &&
    !addedPops.some((p) => p.speciesId === actual.crossStrainId) &&
    !targetVessel.populations.some((p) => p.speciesId === actual.crossStrainId)
  ) {
    crossContaminated = true;
    addedPops.push({
      speciesId: actual.crossStrainId,
      viableCount: targetVessel.vesselType === 'agar_plate' ? 12 : 4.2e4,
      deadCount: 0,
      phase: 'inoculated',
      lagProgress: 0,
      stressLevel: 0,
    });
  }

  const updated: CultureVessel = {
    ...targetVessel,
    populations: [...targetVessel.populations, ...addedPops],
    colonyCount:
      targetVessel.vesselType === 'agar_plate' && addedPops.length > 0
        ? Math.min(300, Math.max(0, Math.round(addedPops[0].viableCount)))
        : targetVessel.colonyCount,
  };
  updated.od600 = computeOd600(updated);

  return { updatedVessel: updated, contaminated, crossContaminated };
}
