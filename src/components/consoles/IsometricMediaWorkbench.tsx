import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Calculator,
  Check,
  Droplets,
  Flame,
  ListChecks,
  Pin,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  ANTIBIOTIC_COMPOUNDS,
  BACTERIAL_SPECIES,
  getMediaById,
  getSpeciesById,
} from '../../data/scientificDatabase';
import { labAudio } from '../../engine/audio';
import {
  applyAntibioticDropToExistingVessel,
  applyCargoToExistingVessel,
  applyReagentDropToExistingVessel,
  applySlotPourToExistingVessel,
  BenchSlotId,
  BenchSlotVessel,
  boilEvaporateExistingVessel,
  boilEvaporateSlot,
  calculateTitrationForTargetPh,
  clearManualBenchState,
  computeSlotTruePh,
  createEmptySlot,
  DEFAULT_CUSTOM_STEPS,
  DeskContainerKind,
  dispenseCargoIntoSlot,
  evaluateMediaFormulaMatch,
  getMaxSlotVolumeMl,
  loadManualBenchState,
  ManualCustomStep,
  ManualToolCategory,
  PipetteCargo,
  pourOutExistingVessel,
  pourVolumeOutOfSlot,
  saveManualBenchState,
  suctionCargoFromExistingVessel,
  transferLiquidBetweenSlots,
} from '../../engine/manualBenchChemistry';
import { getMaxSafeVolumeMl } from '../../engine/simulation';
import {
  CultureVessel,
  LabMode,
  ManualActualParams,
  VesselType,
} from '../../types/lab';
import {
  HeldToolCursor,
  PixelSprite64Id,
  PixelToolSprite64,
} from '../tools';

export interface IsometricMediaWorkbenchProps {
  sessionMode?: LabMode;
  onSwitchSessionMode?: (mode: LabMode) => void;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  beltCapacity: number;
  onCreateVessel: (params: {
    label: string;
    vesselType: VesselType;
    mediaId: string;
    volumeMl: number;
    initialPh: number;
    antibioticsUgPerMl: Record<string, number>;
    sourceVesselId: string | null;
    inoculumUl: number;
    dilutionExponent?: number;
    actualParams?: ManualActualParams;
  }) => void;
  onInoculateExisting: (
    targetVesselId: string,
    sourceVesselId: string,
    inoculumUl: number,
    dilutionExponent?: number,
    actualParams?: ManualActualParams
  ) => void;
  onFeedCulture: (
    vesselId: string,
    supplementId: string,
    feedMl: number
  ) => void;
  onUpdateExistingVessel?: (
    vesselId: string,
    updater: (v: CultureVessel) => CultureVessel
  ) => void;
  onClose: () => void;
}

type HeldToolId =
  | 'pipette_p1000'
  | 'ph_meter'
  | 'scoop_tryptone'
  | 'scoop_salts'
  | 'scoop_agar'
  | 'scoop_macconkey'
  | 'glucose_vial'
  | 'tryptone_bottle'
  | 'naoh_conc'
  | 'hcl_conc'
  | 'pbs_conc'
  | 'ab_ampicillin'
  | 'ab_kanamycin'
  | 'ab_chloramphenicol'
  | 'ab_ciprofloxacin'
  | 'loop_nichrome'
  | 'source_tube'
  | 'pour_slot_A'
  | 'pour_slot_B'
  | 'pour_slot_C';

interface DeskParticle {
  id: number;
  slotId: BenchSlotId | 'ice_bucket' | 'water_jar' | 'heating_stand' | 'autoclave';
  direction: 'down' | 'up';
  color: string;
}

const PIPETTE_VOLUME_PRESETS_ML = [
  { label: '100 µL', ml: 0.1 },
  { label: '250 µL', ml: 0.25 },
  { label: '500 µL', ml: 0.5 },
  { label: '1 mL', ml: 1 },
  { label: '5 mL', ml: 5 },
  { label: '10 mL', ml: 10 },
  { label: '25 mL', ml: 25 },
];

const HELD_TOOL_SPRITE_MAP: Record<HeldToolId, PixelSprite64Id> = {
  pipette_p1000: 'pipette_p1000',
  ph_meter: 'ph_meter',
  scoop_tryptone: 'scoop_spatula',
  scoop_salts: 'scoop_spatula',
  scoop_agar: 'scoop_spatula',
  scoop_macconkey: 'scoop_spatula',
  glucose_vial: 'glucose_vial',
  tryptone_bottle: 'tryptone_bottle',
  naoh_conc: 'naoh_conc',
  hcl_conc: 'hcl_conc',
  pbs_conc: 'pbs_conc',
  ab_ampicillin: 'ab_ampicillin',
  ab_kanamycin: 'ab_kanamycin',
  ab_chloramphenicol: 'ab_chloramphenicol',
  ab_ciprofloxacin: 'ab_ciprofloxacin',
  loop_nichrome: 'loop_nichrome',
  source_tube: 'bacterial_stock',
  pour_slot_A: 'flask_250',
  pour_slot_B: 'beaker_250',
  pour_slot_C: 'tube_15',
};

const HELD_TOOL_LABELS: Record<HeldToolId, string> = {
  pipette_p1000: 'P1000 Pipette (Suction / Dispense)',
  ph_meter: 'Digital pH Probe (Dip in Slot)',
  scoop_tryptone: 'Scoop: Tryptone + Yeast Extract',
  scoop_salts: 'Scoop: NaCl + M9 Basal Salts',
  scoop_agar: 'Scoop: Bacteriological Agar',
  scoop_macconkey: 'Scoop: MacConkey Selective Mix',
  glucose_vial: '20% D-Glucose (+1.5 mL / Click)',
  tryptone_bottle: '5× Tryptone/YE (+2 mL / Click)',
  naoh_conc: '10M NaOH Conc. (+0.5 mL / Click)',
  hcl_conc: '10M HCl Conc. (+0.5 mL / Click)',
  pbs_conc: '10× PBS Conc. (+2.5 mL / Click)',
  ab_ampicillin: 'Ampicillin Stock (+0.5 mL / Click)',
  ab_kanamycin: 'Kanamycin Stock (+0.5 mL / Click)',
  ab_chloramphenicol: 'Chloramphenicol (+0.5 mL / Click)',
  ab_ciprofloxacin: 'Ciprofloxacin (+0.5 mL / Click)',
  loop_nichrome: 'Nichrome Inoculation Loop',
  source_tube: 'Source Tube (Click Vortex Mixer)',
  pour_slot_A: 'Holding Slot A (Click Target Slot, Stand, Autoclave, or Ice)',
  pour_slot_B: 'Holding Slot B (Click Target Slot, Stand, Autoclave, or Ice)',
  pour_slot_C: 'Holding Slot C (Click Target Slot, Stand, Autoclave, or Ice)',
};

const CUSTOM_STEP_ITEM_CATALOG: { id: string; label: string; group: string }[] = [
  { id: 'ph_calculator', label: 'pH Titration Calculator', group: 'pH & Conc.' },
  { id: 'ph_meter', label: 'Digital pH Probe', group: 'pH & Conc.' },
  { id: 'hcl_conc', label: '10M HCl Concentrate', group: 'pH & Conc.' },
  { id: 'naoh_conc', label: '10M NaOH Concentrate', group: 'pH & Conc.' },
  { id: 'pbs_conc', label: '10× PBS Buffer Conc.', group: 'pH & Conc.' },
  { id: 'pipette_p1000', label: 'P1000 Pipette & Presets', group: 'Transfer' },
  { id: 'scoop_tryptone', label: 'Scoop: Tryptone + YE', group: 'Media' },
  { id: 'scoop_salts', label: 'Scoop: NaCl & M9 Salts', group: 'Media' },
  { id: 'scoop_agar', label: 'Scoop: Agar Powder', group: 'Media' },
  { id: 'scoop_macconkey', label: 'Scoop: MacConkey Mix', group: 'Media' },
  { id: 'glucose_vial', label: '20% D-Glucose Vial', group: 'Media' },
  { id: 'tryptone_bottle', label: '5× Liquid Tryptone', group: 'Media' },
  { id: 'heating_stand', label: 'Heating Burner Stand Control', group: 'Thermal' },
  { id: 'autoclave_chamber', label: 'Autoclave Chamber (121°C)', group: 'Thermal' },
  { id: 'ice_bucket', label: 'Ice Bucket Cold Bath (2°C)', group: 'Thermal' },
  { id: 'ab_ampicillin', label: 'Ampicillin Stock', group: 'Antibiotics' },
  { id: 'ab_kanamycin', label: 'Kanamycin Stock', group: 'Antibiotics' },
  { id: 'ab_chloramphenicol', label: 'Chloramphenicol Stock', group: 'Antibiotics' },
  { id: 'ab_ciprofloxacin', label: 'Ciprofloxacin Stock', group: 'Antibiotics' },
  { id: 'loop_nichrome', label: 'Nichrome Loop & Strain Source', group: 'Cells' },
];

function createDefaultSlots(): Record<BenchSlotId, BenchSlotVessel> {
  return {
    A: createEmptySlot('A', 'flask'),
    B: createEmptySlot('B', 'beaker'),
    C: createEmptySlot('C', 'tube'),
  };
}

function mapVesselTypeToContainerKind(vesselType: VesselType): DeskContainerKind {
  if (vesselType === 'agar_plate') return 'plate';
  if (vesselType === 'culture_tube') return 'tube';
  return 'flask';
}

export const IsometricMediaWorkbench: React.FC<IsometricMediaWorkbenchProps> = ({
  sessionMode = 'manual',
  onSwitchSessionMode,
  beltVessels,
  allVessels,
  beltCapacity,
  onCreateVessel,
  onInoculateExisting,
  onFeedCulture,
  onUpdateExistingVessel,
  onClose,
}) => {
  // Hydrate persisted workbench session so progress survives closing/switching stations
  const [initialSnap] = useState(() => loadManualBenchState());

  // 3 Independent Isometric Bench Slots (A = Left Prep Flask, B = Center Stir Beaker, C = Right Tube)
  const [slots, setSlots] = useState<Record<BenchSlotId, BenchSlotVessel>>(
    () => initialSnap?.slots ?? createDefaultSlots()
  );
  const [activeSlotId, setActiveSlotId] = useState<BenchSlotId>(
    () => initialSnap?.activeSlotId ?? 'B'
  );
  const [customLabel, setCustomLabel] = useState<string>(
    () => initialSnap?.customLabel ?? ''
  );

  // Benchtop Hardware Placement & State
  const [waterJarContaminated, setWaterJarContaminated] = useState<boolean>(
    () => initialSnap?.waterJarContaminated ?? false
  );
  const [stirrerOn, setStirrerOn] = useState<boolean>(
    () => initialSnap?.stirrerOn ?? false
  );
  const [standSlotId, setStandSlotId] = useState<BenchSlotId | null>(
    () => initialSnap?.standSlotId ?? null
  );
  const [burnerStandOn, setBurnerStandOn] = useState<boolean>(
    () => initialSnap?.burnerStandOn ?? false
  );
  const [autoclaveSlotId, setAutoclaveSlotId] = useState<BenchSlotId | null>(
    () => initialSnap?.autoclaveSlotId ?? null
  );
  const [autoclaveProgress, setAutoclaveProgress] = useState<number>(
    () => initialSnap?.autoclaveProgress ?? 0
  );
  const [iceBucketSlotId, setIceBucketSlotId] = useState<BenchSlotId | null>(
    () => initialSnap?.iceBucketSlotId ?? null
  );
  const [vortexPulsing, setVortexPulsing] = useState<boolean>(false);

  // Tip Box & P1000 Pipette Suction State
  const [tipCount, setTipCount] = useState<number>(
    () => initialSnap?.tipCount ?? 24
  );
  const [hasFreshTip, setHasFreshTip] = useState<boolean>(
    () => initialSnap?.hasFreshTip ?? false
  );
  const [tipDirtyOrigin, setTipDirtyOrigin] = useState<string | null>(
    () => initialSnap?.tipDirtyOrigin ?? null
  );
  const [tipLoadedStrainId, setTipLoadedStrainId] = useState<string | null>(
    () => initialSnap?.tipLoadedStrainId ?? null
  );
  const [crossContamStrainId, setCrossContamStrainId] = useState<string | null>(
    () => initialSnap?.crossContamStrainId ?? null
  );
  const [pipetteVolMl, setPipetteVolMl] = useState<number>(
    () => initialSnap?.pipetteVolMl ?? 5
  );
  const [pipetteCargo, setPipetteCargo] = useState<PipetteCargo | null>(
    () => initialSnap?.pipetteCargo ?? null
  );

  // Pour Mode Quantity (for pouring from a held Slot A/B/C into another Slot)
  const [pourAmountMl, setPourAmountMl] = useState<number | 'all'>(
    () => initialSnap?.pourAmountMl ?? 25
  );

  // pH Calculator & Custom Workflow Steps
  const [calcTargetPh, setCalcTargetPh] = useState<number>(
    () => initialSnap?.calcTargetPh ?? 1.7
  );
  const [calcStockMolarity, setCalcStockMolarity] = useState<number>(
    () => initialSnap?.calcStockMolarity ?? 10
  );
  const [customSteps, setCustomSteps] = useState<ManualCustomStep[]>(
    () => initialSnap?.customSteps ?? DEFAULT_CUSTOM_STEPS
  );
  const [activeCustomStepId, setActiveCustomStepId] = useState<string>(
    () => initialSnap?.activeCustomStepId ?? (initialSnap?.customSteps?.[0]?.id ?? 'step_1')
  );
  const [editingStepTools, setEditingStepTools] = useState<boolean>(false);
  const [newStepName, setNewStepName] = useState<string>('');

  // Inoculation Sources & Existing Workbench Vessels
  const availableSources = useMemo(
    () =>
      allVessels.filter(
        (v) =>
          (v.location.zone === 'belt' || v.id.startsWith('stock_')) &&
          v.populations.some((p) => p.viableCount > 0)
      ),
    [allVessels]
  );
  const existingWorkbenchVessels = useMemo(
    () =>
      allVessels.filter(
        (v) =>
          !v.id.startsWith('stock_') &&
          (v.vesselType === 'flask_250ml' ||
            v.vesselType === 'culture_tube' ||
            v.vesselType === 'agar_plate')
      ),
    [allVessels]
  );

  const [sourceVesselId, setSourceVesselId] = useState<string>(() => {
    if (
      initialSnap?.sourceVesselId &&
      availableSources.some((s) => s.id === initialSnap.sourceVesselId)
    ) {
      return initialSnap.sourceVesselId;
    }
    return (
      availableSources.find((s) => s.populations[0]?.speciesId === 'ecoli_k12')?.id ??
      availableSources[0]?.id ??
      ''
    );
  });
  const [dilutionExponent, setDilutionExponent] = useState<number>(
    () => initialSnap?.dilutionExponent ?? 4
  );
  const [loopState, setLoopState] = useState<'unsterile' | 'hot' | 'cool_sterile' | 'loaded'>(
    () => initialSnap?.loopState ?? 'unsterile'
  );
  const [loopCoolSec, setLoopCoolSec] = useState<number>(
    () => initialSnap?.loopCoolSec ?? 0
  );
  const [loopKilledInoculum, setLoopKilledInoculum] = useState<boolean>(
    () => initialSnap?.loopKilledInoculum ?? false
  );
  const [resuspendedIds, setResuspendedIds] = useState<string[]>(
    () => initialSnap?.resuspendedIds ?? []
  );

  // Active Held Tool & Drawer Filter
  const [heldTool, setHeldTool] = useState<HeldToolId | null>(null);
  const [toolCategory, setToolCategory] = useState<ManualToolCategory>(
    () => initialSnap?.toolCategory ?? 'all'
  );
  const [probeReadout, setProbeReadout] = useState<{
    slotId: BenchSlotId;
    pH: number;
    unmixedWarning: boolean;
  } | null>(null);
  const [benchAlert, setBenchAlert] = useState<string>(
    initialSnap
      ? 'Restored your Manual Bench session. Progress is saved until you click Reset Bench.'
      : 'Select ddH₂O, formulate in Slots A/B/C, place vessels on Heating Stand, Autoclave, or Ice Bath.'
  );
  const [particles, setParticles] = useState<DeskParticle[]>([]);
  const particleIdRef = useRef<number>(1);

  // Refs for persistent 60 FPS / 100 ms continuous thermal & physics loops
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const standSlotIdRef = useRef(standSlotId);
  standSlotIdRef.current = standSlotId;
  const burnerStandOnRef = useRef(burnerStandOn);
  burnerStandOnRef.current = burnerStandOn;
  const autoclaveSlotIdRef = useRef(autoclaveSlotId);
  autoclaveSlotIdRef.current = autoclaveSlotId;
  const iceBucketSlotIdRef = useRef(iceBucketSlotId);
  iceBucketSlotIdRef.current = iceBucketSlotId;
  const autoclaveProgressRef = useRef(autoclaveProgress);
  autoclaveProgressRef.current = autoclaveProgress;
  const existingVesselsRef = useRef(existingWorkbenchVessels);
  existingVesselsRef.current = existingWorkbenchVessels;
  const onUpdateExistingRef = useRef(onUpdateExistingVessel);
  onUpdateExistingRef.current = onUpdateExistingVessel;

  // Persist manual bench progress automatically
  useEffect(() => {
    saveManualBenchState({
      slots,
      activeSlotId,
      customLabel,
      waterJarContaminated,
      stirrerOn,
      standSlotId,
      burnerStandOn,
      autoclaveSlotId,
      autoclaveProgress,
      iceBucketSlotId,
      tipCount,
      hasFreshTip,
      tipDirtyOrigin,
      tipLoadedStrainId,
      crossContamStrainId,
      pipetteVolMl,
      pipetteCargo,
      pourAmountMl,
      sourceVesselId,
      dilutionExponent,
      loopState,
      loopCoolSec,
      loopKilledInoculum,
      resuspendedIds,
      toolCategory,
      customSteps,
      activeCustomStepId,
      calcTargetPh,
      calcStockMolarity,
    });
  }, [
    slots,
    activeSlotId,
    customLabel,
    waterJarContaminated,
    stirrerOn,
    standSlotId,
    burnerStandOn,
    autoclaveSlotId,
    autoclaveProgress,
    iceBucketSlotId,
    tipCount,
    hasFreshTip,
    tipDirtyOrigin,
    tipLoadedStrainId,
    crossContamStrainId,
    pipetteVolMl,
    pipetteCargo,
    pourAmountMl,
    sourceVesselId,
    dilutionExponent,
    loopState,
    loopCoolSec,
    loopKilledInoculum,
    resuspendedIds,
    toolCategory,
    customSteps,
    activeCustomStepId,
    calcTargetPh,
    calcStockMolarity,
  ]);

  // Clear stale existingVesselId if a mounted tray vessel was autoclaved/disposed outside
  useEffect(() => {
    setSlots((prev) => {
      let changed = false;
      const next = { ...prev };
      (['A', 'B', 'C'] as BenchSlotId[]).forEach((sid) => {
        const eid = prev[sid].existingVesselId;
        if (eid && !existingWorkbenchVessels.some((v) => v.id === eid)) {
          next[sid] = { ...prev[sid], existingVesselId: null };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [existingWorkbenchVessels]);

  const getSlotExistingVessel = (slot: BenchSlotVessel): CultureVessel | null => {
    if (!slot.existingVesselId) return null;
    return existingWorkbenchVessels.find((v) => v.id === slot.existingVesselId) ?? null;
  };

  const activeSlot = slots[activeSlotId];
  const selectedExistingVessel = getSlotExistingVessel(activeSlot);
  const selectedSource = availableSources.find((v) => v.id === sourceVesselId) ?? null;
  const selectedSourceSpecies = selectedSource?.populations[0]
    ? getSpeciesById(selectedSource.populations[0].speciesId)
    : undefined;

  const activeFormulaEval = useMemo(
    () => evaluateMediaFormulaMatch(activeSlot),
    [activeSlot]
  );

  const titrationResult = useMemo(
    () =>
      calculateTitrationForTargetPh(
        activeSlot,
        selectedExistingVessel,
        calcTargetPh,
        calcStockMolarity
      ),
    [activeSlot, selectedExistingVessel, calcTargetPh, calcStockMolarity]
  );

  const activeCustomStep = useMemo(
    () => customSteps.find((s) => s.id === activeCustomStepId) ?? customSteps[0],
    [customSteps, activeCustomStepId]
  );

  const effectiveContainerKind: DeskContainerKind | null = selectedExistingVessel
    ? mapVesselTypeToContainerKind(selectedExistingVessel.vesselType)
    : activeSlot.containerKind;
  const effectiveVolumeMl = selectedExistingVessel
    ? selectedExistingVessel.volumeMl
    : activeSlot.volumeMl;
  const effectiveMaxVolMl = selectedExistingVessel
    ? getMaxSafeVolumeMl(selectedExistingVessel.vesselType)
    : getMaxSlotVolumeMl(activeSlot.containerKind);
  const effectiveTempC = selectedExistingVessel
    ? selectedExistingVessel.temperatureC
    : activeSlot.tempC;
  const activeExistingMedia = selectedExistingVessel
    ? getMediaById(selectedExistingVessel.mediaId)
    : undefined;
  const effectiveLiquidColor = selectedExistingVessel
    ? (selectedExistingVessel.od600 > 0.15
        ? activeExistingMedia?.turbidColorHex
        : activeExistingMedia?.baseColorHex) ?? '#D4B475'
    : activeFormulaEval.liquidColorHex;

  // Predicted Plate Colonies preview
  const platePreviewSource = useMemo(() => {
    if (effectiveContainerKind !== 'plate') return null;
    if (pipetteCargo?.sourceVesselId) {
      const v = allVessels.find((x) => x.id === pipetteCargo.sourceVesselId);
      if (v) {
        return {
          viable: v.populations.reduce((a, p) => a + p.viableCount, 0),
          volMl: pipetteCargo.volumeMl,
        };
      }
    }
    if (activeSlot.stagedSourceId && activeSlot.stagedInoculumUl > 0) {
      const v = allVessels.find((x) => x.id === activeSlot.stagedSourceId);
      if (v) {
        return {
          viable: v.populations.reduce((a, p) => a + p.viableCount, 0),
          volMl: activeSlot.stagedInoculumUl / 1000,
        };
      }
    }
    if (selectedSource) {
      return {
        viable: selectedSource.populations.reduce((a, p) => a + p.viableCount, 0),
        volMl: pipetteVolMl,
      };
    }
    return null;
  }, [
    effectiveContainerKind,
    pipetteCargo,
    activeSlot.stagedSourceId,
    activeSlot.stagedInoculumUl,
    selectedSource,
    pipetteVolMl,
    allVessels,
  ]);

  const predictedPlateCfu = platePreviewSource
    ? Math.round(
        platePreviewSource.viable *
          platePreviewSource.volMl *
          Math.pow(10, -dilutionExponent)
      )
    : null;

  const spawnParticle = (
    slotId: DeskParticle['slotId'],
    color: string,
    direction: 'down' | 'up' = 'down'
  ) => {
    const id = particleIdRef.current++;
    setParticles((prev) => [...prev.slice(-14), { id, slotId, color, direction }]);
    window.setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }, 520);
  };

  // Magnetic Stirrer effect: dissolves dry solids on active desk pad when ON
  useEffect(() => {
    if (!stirrerOn) return;
    const t = window.setInterval(() => {
      setSlots((prev) => {
        const cur = prev[activeSlotId];
        if (cur.existingVesselId || cur.stirProgress >= 1 || cur.volumeMl <= 0) return prev;
        return {
          ...prev,
          [activeSlotId]: {
            ...cur,
            stirProgress: Number(Math.min(1, cur.stirProgress + 0.14).toFixed(2)),
            lastProbedPh: null,
          },
        };
      });
    }, 350);
    return () => window.clearInterval(t);
  }, [stirrerOn, activeSlotId]);

  // Unified Gradual Thermal & Evaporation Loop (Heating Stand, Autoclave Chamber, Ice Bucket, Ambient Cool)
  // Runs every 120ms using refs so there are zero timer teardowns!
  useEffect(() => {
    let lastTs = performance.now();
    let tickCount = 0;

    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - lastTs) / 1000);
      lastTs = now;
      tickCount += 1;

      const curStandSid = standSlotIdRef.current;
      const isBurnerOn = burnerStandOnRef.current;
      const curAutoSid = autoclaveSlotIdRef.current;
      const curIceSid = iceBucketSlotIdRef.current;
      const curSlots = slotsRef.current;

      // Update fresh Bench Slots thermal states smoothly
      let slotChanged = false;
      const nextSlots: Record<BenchSlotId, BenchSlotVessel> = { ...curSlots };

      (['A', 'B', 'C'] as BenchSlotId[]).forEach((sid) => {
        const s = curSlots[sid];
        if (!s.containerKind) return;

        // If this slot holds an existing Tray Vessel, update it via callback
        if (s.existingVesselId && onUpdateExistingRef.current) {
          const eid = s.existingVesselId;
          const evObj = existingVesselsRef.current.find((v) => v.id === eid);
          if (!evObj) return;

          if (curStandSid === sid && isBurnerOn) {
            onUpdateExistingRef.current(eid, (ev) => {
              const nextTemp = Number(Math.min(100, ev.temperatureC + 15 * dt).toFixed(1));
              const heatKilled = nextTemp > 52;
              let nextEv: CultureVessel = {
                ...ev,
                temperatureC: nextTemp,
                populations: heatKilled
                  ? ev.populations.map((p) => ({
                      ...p,
                      deadCount: p.deadCount + p.viableCount * Math.min(1, 1.5 * dt),
                      viableCount: p.viableCount * Math.max(0, 1 - 1.5 * dt),
                      stressLevel: 1,
                    }))
                  : ev.populations,
              };
              if (nextTemp >= 99 && nextEv.volumeMl > 1.0) {
                nextEv = boilEvaporateExistingVessel(nextEv, 0.85 * dt);
              }
              return nextEv;
            });
            if (tickCount % 5 === 0) spawnParticle('heating_stand', '#BAE6FD', 'up');
          } else if (curIceSid === sid) {
            onUpdateExistingRef.current(eid, (ev) => {
              if (ev.temperatureC <= 2.6) return ev;
              const alpha = 1 - Math.exp(-0.24 * dt);
              const nextTemp = Number((ev.temperatureC + (2.5 - ev.temperatureC) * alpha).toFixed(1));
              return { ...ev, temperatureC: Math.max(2.5, nextTemp) };
            });
            if (tickCount % 7 === 0) spawnParticle('ice_bucket', '#BAE6FD', 'up');
          } else if (curAutoSid === sid) {
            onUpdateExistingRef.current(eid, (ev) => {
              const nextTemp = Number(Math.min(121, ev.temperatureC + 12 * dt).toFixed(1));
              return {
                ...ev,
                temperatureC: nextTemp,
                populations:
                  nextTemp > 55
                    ? ev.populations.map((p) => ({
                        ...p,
                        deadCount: p.deadCount + p.viableCount,
                        viableCount: 0,
                        stressLevel: 1,
                      }))
                    : ev.populations,
              };
            });
          }
          return;
        }

        // Fresh Bench Slot thermal & boiling physics
        if (curStandSid === sid && isBurnerOn && s.volumeMl > 0) {
          slotChanged = true;
          const nextTemp = Number(Math.min(100, s.tempC + 16 * dt).toFixed(1));
          const nextStir =
            nextTemp >= 55 ? Number(Math.min(1, s.stirProgress + 0.35 * dt).toFixed(2)) : s.stirProgress;
          const nextAgarMelted = s.agarMelted || (s.agarG > 0 && nextTemp >= 85);
          const nextSterility =
            s.sterilityLevel === 'autoclaved'
              ? 'autoclaved'
              : nextTemp >= 92
              ? 'pasteurized'
              : s.sterilityLevel;
          const heatKill = s.inoculumKilledByHeat || (Boolean(s.stagedSourceId) && nextTemp > 50);

          let updatedSlot: BenchSlotVessel = {
            ...s,
            tempC: nextTemp,
            stirProgress: nextStir,
            agarMelted: nextAgarMelted,
            sterilityLevel: nextSterility,
            inoculumKilledByHeat: heatKill,
          };

          if (nextTemp >= 99 && updatedSlot.volumeMl > 0.5) {
            updatedSlot = boilEvaporateSlot(updatedSlot, 0.85 * dt);
          }

          nextSlots[sid] = updatedSlot;
          if (tickCount % 5 === 0) spawnParticle('heating_stand', '#BAE6FD', 'up');
        } else if (curAutoSid === sid && s.volumeMl > 0) {
          slotChanged = true;
          // Autoclave heats gradually from current temp -> 121 °C
          const nextTemp = Number(Math.min(121, s.tempC + 12.5 * dt).toFixed(1));
          const curProg = autoclaveProgressRef.current;
          const nextProg =
            nextTemp >= 115 ? Math.min(100, curProg + 36 * dt) : curProg;
          if (nextProg !== curProg) {
            setAutoclaveProgress(Number(nextProg.toFixed(0)));
          }
          const completed = nextProg >= 99.5;
          nextSlots[sid] = {
            ...s,
            tempC: nextTemp,
            stirProgress: nextTemp >= 65 ? 1 : s.stirProgress,
            agarMelted: s.agarG > 0 && nextTemp >= 85 ? true : s.agarMelted,
            sterilityLevel: completed ? 'autoclaved' : s.sterilityLevel,
            inoculumKilledByHeat: s.inoculumKilledByHeat || (Boolean(s.stagedSourceId) && nextTemp > 55),
            lastProbedPh: null,
          };
          if (tickCount % 6 === 0 && nextTemp >= 95) {
            spawnParticle('autoclave', '#E2E8F0', 'up');
          }
        } else if (curIceSid === sid) {
          if (s.tempC > 2.6) {
            slotChanged = true;
            // Gradual cold-bath conduction decay toward 2.5 °C
            const alpha = 1 - Math.exp(-0.24 * dt);
            const nextTemp = Number(Math.max(2.5, s.tempC + (2.5 - s.tempC) * alpha).toFixed(1));
            nextSlots[sid] = { ...s, tempC: nextTemp };
          }
          if (tickCount % 7 === 0) spawnParticle('ice_bucket', '#BAE6FD', 'up');
        } else if (s.tempC > 22.3) {
          // Slow passive room-air cooling
          slotChanged = true;
          const alpha = 1 - Math.exp(-0.025 * dt);
          const nextTemp = Number(Math.max(22, s.tempC + (22 - s.tempC) * alpha).toFixed(1));
          nextSlots[sid] = { ...s, tempC: nextTemp };
        }
      });

      if (slotChanged) {
        setSlots(nextSlots);
      }
    }, 120);

    return () => window.clearInterval(timer);
  }, []);

  // 3s cooling countdown for flamed nichrome loop
  useEffect(() => {
    if (loopState !== 'hot') return;
    if (loopCoolSec <= 0) {
      setLoopState('cool_sterile');
      setBenchAlert('Nichrome loop cooled and sterile! Click Source Bacteria Tube to pick a colony.');
      return;
    }
    const t = window.setTimeout(() => setLoopCoolSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [loopState, loopCoolSec]);

  const updateSlot = (slotId: BenchSlotId, updater: (prev: BenchSlotVessel) => BenchSlotVessel) => {
    setSlots((prev) => ({
      ...prev,
      [slotId]: updater(prev[slotId]),
    }));
    setProbeReadout((pr) => (pr && pr.slotId === slotId ? null : pr));
  };

  // Explicit Reset Bench handler (only resets when user clicks Reset Bench!)
  const handleResetBench = () => {
    clearManualBenchState();
    setSlots(createDefaultSlots());
    setActiveSlotId('B');
    setCustomLabel('');
    setWaterJarContaminated(false);
    setStirrerOn(false);
    setStandSlotId(null);
    setBurnerStandOn(false);
    setAutoclaveSlotId(null);
    setAutoclaveProgress(0);
    setIceBucketSlotId(null);
    setTipCount(24);
    setHasFreshTip(false);
    setTipDirtyOrigin(null);
    setTipLoadedStrainId(null);
    setCrossContamStrainId(null);
    setPipetteVolMl(5);
    setPipetteCargo(null);
    setPourAmountMl(25);
    setDilutionExponent(4);
    setLoopState('unsterile');
    setLoopCoolSec(0);
    setLoopKilledInoculum(false);
    setResuspendedIds([]);
    setHeldTool(null);
    setProbeReadout(null);
    labAudio.playUiClick();
    setBenchAlert('Manual bench reset to clean sterile baseline.');
  };

  // Helper: Move a slot exclusively between Bench Pad, Heating Stand, Autoclave Chamber, or Ice Bucket
  const getSlotStation = (sid: BenchSlotId): 'pad' | 'stand' | 'autoclave' | 'ice' => {
    if (standSlotId === sid) return 'stand';
    if (autoclaveSlotId === sid) return 'autoclave';
    if (iceBucketSlotId === sid) return 'ice';
    return 'pad';
  };

  const recallSlotToPad = (sid: BenchSlotId) => {
    if (standSlotId === sid) setStandSlotId(null);
    if (autoclaveSlotId === sid) {
      setAutoclaveSlotId(null);
      setAutoclaveProgress(0);
    }
    if (iceBucketSlotId === sid) setIceBucketSlotId(null);
  };

  const placeSlotOnHeatingStand = (sid: BenchSlotId) => {
    const slot = slots[sid];
    const ev = getSlotExistingVessel(slot);
    if (!ev && !slot.containerKind) {
      setBenchAlert(`Slot ${sid} is empty — select a container first.`);
      return;
    }
    if (!ev && slot.volumeMl <= 0) {
      setBenchAlert(`Add water/solution to Slot ${sid} before placing it on the Heating Burner Stand.`);
      return;
    }
    if (standSlotId === sid) {
      setStandSlotId(null);
      labAudio.playUiClick();
      setBenchAlert(`Returned Slot ${sid} from Heating Stand to its Bench Pad.`);
      return;
    }
    if (autoclaveSlotId === sid) {
      setAutoclaveSlotId(null);
      setAutoclaveProgress(0);
    }
    if (iceBucketSlotId === sid) setIceBucketSlotId(null);
    setStandSlotId(sid);
    setActiveSlotId(sid);
    labAudio.playUiClick();
    setBenchAlert(
      burnerStandOn
        ? `Placed Slot ${sid} on the lit Heating Burner Stand! Heating gradually toward 100 °C.`
        : `Placed Slot ${sid} on the Heating Burner Stand. Click "Flame ON" to start heating!`
    );
  };

  const placeSlotInAutoclave = (sid: BenchSlotId) => {
    const slot = slots[sid];
    const ev = getSlotExistingVessel(slot);
    if (ev) {
      setBenchAlert('Slot holds an already-active Tray vessel. Formulate new vessels for autoclaving.');
      return;
    }
    if (!slot.containerKind || slot.volumeMl <= 0) {
      setBenchAlert(`Add water/media into Slot ${sid} before loading into the Autoclave Chamber.`);
      return;
    }
    if (autoclaveSlotId === sid) {
      const done = slot.sterilityLevel === 'autoclaved';
      setAutoclaveSlotId(null);
      setAutoclaveProgress(0);
      labAudio.playUiClick();
      setBenchAlert(
        done
          ? `Retrieved sterile Slot ${sid} (${slot.tempC.toFixed(0)} °C) from Autoclave! Move it to Ice Bucket to cool before antibiotics/bacteria.`
          : `Unloaded Slot ${sid} early from Autoclave (${slot.tempC.toFixed(0)} °C).`
      );
      return;
    }
    if (standSlotId === sid) setStandSlotId(null);
    if (iceBucketSlotId === sid) setIceBucketSlotId(null);
    setAutoclaveSlotId(sid);
    setAutoclaveProgress(slot.sterilityLevel === 'autoclaved' ? 100 : 0);
    setActiveSlotId(sid);
    labAudio.playSterilizeCycle();
    setBenchAlert(
      `Loaded Slot ${sid} into the Autoclave Chamber! Gradually pressurizing & ramping temp → 121 °C.`
    );
  };

  const placeSlotInIceBucket = (sid: BenchSlotId) => {
    const slot = slots[sid];
    const ev = getSlotExistingVessel(slot);
    if (!ev && !slot.containerKind) {
      setBenchAlert(`Slot ${sid} is empty!`);
      return;
    }
    if (iceBucketSlotId === sid) {
      setIceBucketSlotId(null);
      labAudio.playUiClick();
      setBenchAlert(`Removed Slot ${sid} from the Ice Bucket back to Bench Pad.`);
      return;
    }
    if (standSlotId === sid) setStandSlotId(null);
    if (autoclaveSlotId === sid) {
      setAutoclaveSlotId(null);
      setAutoclaveProgress(0);
    }
    setIceBucketSlotId(sid);
    setActiveSlotId(sid);
    labAudio.playUiClick();
    setBenchAlert(
      `Placed Slot ${sid} in the Ice Bucket Cold Bath — cooling gradually toward 2.5 °C!`
    );
  };

  const pipetteCargoColor = useMemo(() => {
    if (!pipetteCargo) return '#38BDF8';
    if (pipetteCargo.speciesId) return '#FBBF24';
    if (pipetteCargo.naohMmoles > pipetteCargo.hclMmoles) return '#38BDF8';
    if (pipetteCargo.hclMmoles > pipetteCargo.naohMmoles) return '#FB7185';
    if (pipetteCargo.bufferMmoles > 0.05) return '#A78BFA';
    if (pipetteCargo.tryptoneG > 0.01) return '#D4B475';
    return '#38BDF8';
  }, [pipetteCargo]);

  const checkAndTrackTipOrigin = (newOrigin: string): boolean => {
    if (!tipDirtyOrigin || tipDirtyOrigin === newOrigin) {
      setTipDirtyOrigin(newOrigin);
      return false;
    }
    setTipDirtyOrigin(newOrigin);
    return true;
  };

  // Mount / Refill Tips
  const handleClickTipBox = () => {
    if (tipCount <= 0) {
      setTipCount(24);
      setBenchAlert('Refilled sterile P1000 tip box (24 tips).');
      labAudio.playUiClick();
      return;
    }
    setTipCount((c) => Math.max(0, c - 1));
    setHasFreshTip(true);
    setTipDirtyOrigin(null);
    setTipLoadedStrainId(null);
    setPipetteCargo(null);
    setHeldTool('pipette_p1000');
    labAudio.playUiClick();
    setBenchAlert('Mounted clean sterile tip on P1000 Pipette. Click Water Jar, Source Bacteria, or any Slot to SUCTION.');
  };

  // Eject Tip cleanly in Biohazard Bin
  const handleClickBiohazardBin = () => {
    setHasFreshTip(false);
    setTipDirtyOrigin(null);
    setTipLoadedStrainId(null);
    setCrossContamStrainId(null);
    setPipetteCargo(null);
    labAudio.playUiClick();
    setBenchAlert('Used tip ejected cleanly into Biohazard Bin — zero chemical or cross-strain carryover!');
  };

  // Infinite ddH2O Water Jar interaction
  const handleClickWaterJar = () => {
    if (heldTool !== 'pipette_p1000') {
      if (waterJarContaminated && !heldTool) {
        setWaterJarContaminated(false);
        spawnParticle('water_jar', '#7DD3FC', 'up');
        labAudio.playSinkPour();
        setBenchAlert('Rinsed and replenished the infinite ddH₂O Water Jar with pure distilled water!');
        return;
      }
      setHeldTool('pipette_p1000');
      labAudio.playUiClick();
      setBenchAlert(
        hasFreshTip
          ? `Holding P1000 (${pipetteVolMl < 1 ? `${Math.round(pipetteVolMl * 1000)} µL` : `${pipetteVolMl} mL`}). Click Water Jar again to SUCTION ddH₂O.`
          : 'Mount a sterile tip from the Tip Box on the left first, then click the Water Jar to suction ddH₂O!'
      );
      return;
    }
    if (!hasFreshTip) {
      setBenchAlert('No pipette tip mounted! Click the Tip Box on the left before suctioning water.');
      return;
    }
    if (pipetteCargo) {
      setBenchAlert('Pipette tip already holds liquid! Dispense into a Bench Slot or discard first.');
      return;
    }
    if (tipDirtyOrigin && tipDirtyOrigin !== 'water_jar') {
      setWaterJarContaminated(true);
      setBenchAlert(
        'Warning: You dipped an un-ejected dirty tip into the ddH₂O Water Jar! Eject tips in Biohazard Bin before returning to Water Jar. Click Water Jar with empty hands to rinse.'
      );
    } else {
      setTipDirtyOrigin('water_jar');
    }

    const drawMl = pipetteVolMl;
    setPipetteCargo({
      volumeMl: drawMl,
      naohMmoles: 0,
      hclMmoles: 0,
      bufferMmoles: 0,
      tryptoneG: 0,
      glucoseG: 0,
      saltsG: 0,
      agarG: 0,
      macconkeyUnits: 0,
      antibioticsUg: {},
      tempC: 22,
      sourceLabel: waterJarContaminated ? 'Contam. ddH₂O' : 'Pure ddH₂O',
      sourceVesselId: null,
      speciesId: null,
      vortexResuspended: true,
      originSignature: 'water_jar',
    });
    spawnParticle('water_jar', '#38BDF8', 'up');
    labAudio.playPipetteSuction();
    setBenchAlert(
      `Suctioned ${drawMl < 1 ? `${Math.round(drawMl * 1000)} µL` : `${drawMl} mL`} ddH₂O from infinite Water Jar. Click Slot A, B, or C to dispense!`
    );
  };

  // Interactive Heating Burner Stand click
  const handleClickHeatingStand = () => {
    if (heldTool === 'loop_nichrome') {
      if (!burnerStandOn) setBurnerStandOn(true);
      setLoopKilledInoculum(false);
      setLoopState('hot');
      setLoopCoolSec(3);
      labAudio.playUiClick();
      setBenchAlert('Flaming nichrome loop in Heating Burner Stand flame... cooling 3s!');
      return;
    }
    if (heldTool === 'pour_slot_A' || heldTool === 'pour_slot_B' || heldTool === 'pour_slot_C') {
      const sid = heldTool.replace('pour_slot_', '') as BenchSlotId;
      placeSlotOnHeatingStand(sid);
      setHeldTool(null);
      return;
    }
    if (standSlotId) {
      placeSlotOnHeatingStand(standSlotId);
      return;
    }
    placeSlotOnHeatingStand(activeSlotId);
  };

  // Interactive Autoclave Chamber click
  const handleClickAutoclave = () => {
    if (heldTool === 'pour_slot_A' || heldTool === 'pour_slot_B' || heldTool === 'pour_slot_C') {
      const sid = heldTool.replace('pour_slot_', '') as BenchSlotId;
      placeSlotInAutoclave(sid);
      setHeldTool(null);
      return;
    }
    if (autoclaveSlotId) {
      placeSlotInAutoclave(autoclaveSlotId);
      return;
    }
    placeSlotInAutoclave(activeSlotId);
  };

  // Interactive Ice Bucket click
  const handleClickIceBucket = () => {
    if (heldTool === 'pour_slot_A' || heldTool === 'pour_slot_B' || heldTool === 'pour_slot_C') {
      const sid = heldTool.replace('pour_slot_', '') as BenchSlotId;
      placeSlotInIceBucket(sid);
      setHeldTool(null);
      return;
    }
    if (iceBucketSlotId) {
      placeSlotInIceBucket(iceBucketSlotId);
      return;
    }
    placeSlotInIceBucket(activeSlotId);
  };

  const handleDrainActiveSlot = (reqPour: number | 'all') => {
    if (selectedExistingVessel && onUpdateExistingVessel) {
      const amount = reqPour === 'all' ? selectedExistingVessel.volumeMl : reqPour;
      const { nextVessel, pouredMl } = pourOutExistingVessel(selectedExistingVessel, amount);
      if (pouredMl <= 0) {
        setBenchAlert(`${selectedExistingVessel.label} is already at minimum volume (${selectedExistingVessel.volumeMl.toFixed(1)} mL).`);
        return;
      }
      onUpdateExistingVessel(selectedExistingVessel.id, () => nextVessel);
      setProbeReadout(null);
      labAudio.playSinkPour();
      setBenchAlert(`Drained ${pouredMl.toFixed(1)} mL from ${selectedExistingVessel.label} (${nextVessel.volumeMl.toFixed(1)} mL remaining).`);
      return;
    }

    if (activeSlot.volumeMl <= 0) {
      setBenchAlert(`Slot ${activeSlotId} is already empty.`);
      return;
    }
    const req = reqPour === 'all' ? activeSlot.volumeMl : reqPour;
    const { nextSlot, pouredMl } = pourVolumeOutOfSlot(activeSlot, req);
    updateSlot(activeSlotId, () => nextSlot);
    labAudio.playSinkPour();
    setBenchAlert(
      nextSlot.volumeMl <= 0
        ? `Emptied Slot ${activeSlotId} (${pouredMl.toFixed(1)} mL discarded).`
        : `Drained ${pouredMl.toFixed(1)} mL from Slot ${activeSlotId} (${nextSlot.volumeMl.toFixed(1)} mL remaining).`
    );
  };

  // Click Source Bacteria Tube on Left Rack
  const handleClickSourceTube = () => {
    if (!sourceVesselId) {
      setBenchAlert('Select a bacterial source strain in the Cells section first.');
      return;
    }
    if (heldTool === 'pipette_p1000') {
      if (!hasFreshTip) {
        setBenchAlert('Mount a sterile tip from the Tip Box before aspirating bacteria!');
        return;
      }
      if (pipetteCargo) {
        setBenchAlert('Pipette tip already holds liquid! Dispense or discard cargo first.');
        return;
      }
      const spId = selectedSource?.populations[0]?.speciesId ?? null;
      const cross =
        Boolean(tipLoadedStrainId && spId && tipLoadedStrainId !== spId) ||
        checkAndTrackTipOrigin(`strain_${spId}`);
      if (tipLoadedStrainId && spId && tipLoadedStrainId !== spId) {
        setCrossContamStrainId(tipLoadedStrainId);
      } else if (spId) {
        setTipLoadedStrainId(spId);
      }
      const drawMl = pipetteVolMl;
      setPipetteCargo({
        volumeMl: drawMl,
        naohMmoles: 0,
        hclMmoles: 0,
        bufferMmoles: 0,
        tryptoneG: 0,
        glucoseG: 0,
        saltsG: 0,
        agarG: 0,
        macconkeyUnits: 0,
        antibioticsUg: {},
        tempC: selectedSource?.temperatureC ?? 22,
        sourceLabel: selectedSourceSpecies?.commonLabel ?? 'Bacteria',
        sourceVesselId,
        speciesId: spId,
        vortexResuspended: resuspendedIds.includes(sourceVesselId),
        originSignature: `strain_${spId}`,
      });
      labAudio.playPipetteSuction();
      setBenchAlert(
        cross && crossContamStrainId
          ? 'Cross-contamination risk! Tip reused across strains without ejecting into Biohazard Bin.'
          : `Suctioned ${drawMl < 1 ? `${Math.round(drawMl * 1000)} µL` : `${drawMl} mL`} of ${selectedSourceSpecies?.commonLabel ?? 'bacteria'}. Click Slot A, B, or C to inoculate!`
      );
      return;
    }

    if (heldTool === 'loop_nichrome') {
      if (loopState === 'hot') {
        setLoopKilledInoculum(true);
        setLoopState('loaded');
        setBenchAlert('Loop was still glowing red-hot! Bacterial cells seared dead (0 viable CFU).');
        return;
      }
      if (loopState !== 'cool_sterile') {
        setBenchAlert('Flame the nichrome loop on the Heating Burner Stand and let it cool 3s first.');
        return;
      }
      setLoopKilledInoculum(false);
      setLoopState('loaded');
      labAudio.playUiClick();
      setBenchAlert('Colony loaded on cool sterile loop! Click Slot A, B, or C to streak/inoculate.');
      return;
    }

    setHeldTool((prev) => (prev === 'source_tube' ? null : 'source_tube'));
    labAudio.playUiClick();
    setBenchAlert('Holding Source Bacteria Tube — click the Vortex Mixer to resuspend settled cells.');
  };

  const handleClickVortexMixer = () => {
    setVortexPulsing(true);
    window.setTimeout(() => setVortexPulsing(false), 650);
    labAudio.playUiClick();

    if (heldTool === 'source_tube' || !heldTool || heldTool === 'pipette_p1000') {
      if (sourceVesselId) {
        setResuspendedIds((prev) => (prev.includes(sourceVesselId) ? prev : [...prev, sourceVesselId]));
      }
      if (selectedExistingVessel) {
        setResuspendedIds((prev) =>
          prev.includes(selectedExistingVessel.id) ? prev : [...prev, selectedExistingVessel.id]
        );
      } else {
        updateSlot(activeSlotId, (cur) => ({
          ...cur,
          stirProgress: Number(Math.min(1, cur.stirProgress + 0.45).toFixed(2)),
          vortexResuspended: true,
          lastProbedPh: null,
        }));
      }
      setBenchAlert('Vortexed cleanly! Source cells resuspended & active slot homogenized.');
    }
  };

  // Direct titration helper (using Calculator exact dose)
  const applyExactCalculatedTitration = () => {
    if (titrationResult.reagent === 'none' || titrationResult.volumeMl <= 0) return;
    const isAcid = titrationResult.reagent === 'hcl';
    const doseMl = titrationResult.volumeMl;
    const targetEv = selectedExistingVessel;
    const maxV = targetEv
      ? getMaxSafeVolumeMl(targetEv.vesselType)
      : getMaxSlotVolumeMl(activeSlot.containerKind);
    const curVol = targetEv ? targetEv.volumeMl : activeSlot.volumeMl;
    const headroom = Math.max(0, maxV - curVol);
    const actualMl = Number(Math.min(headroom, doseMl).toFixed(4));
    if (actualMl <= 0) {
      setBenchAlert(`Slot ${activeSlotId} has no headroom for titration dose!`);
      return;
    }

    if (targetEv && onUpdateExistingVessel) {
      const mmolesFactor = calcStockMolarity / 10;
      const { updated } = applyReagentDropToExistingVessel(
        targetEv,
        isAcid ? 'hcl_conc' : 'naoh_conc',
        actualMl * mmolesFactor,
        maxV
      );
      onUpdateExistingVessel(targetEv.id, () => updated);
      setProbeReadout(null);
      spawnParticle(activeSlotId, isAcid ? '#FB7185' : '#38BDF8', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        `Titrated exact ${actualMl >= 1 ? `${actualMl.toFixed(2)} mL` : `${(actualMl * 1000).toFixed(1)} µL`} of ${calcStockMolarity}M ${isAcid ? 'HCl' : 'NaOH'} into ${targetEv.label}! Dip pH Probe to verify.`
      );
      return;
    }

    const addedMmoles = actualMl * calcStockMolarity;
    updateSlot(activeSlotId, (s) => ({
      ...s,
      volumeMl: Number((s.volumeMl + actualMl).toFixed(2)),
      hclMmoles: isAcid ? s.hclMmoles + addedMmoles : s.hclMmoles,
      naohMmoles: !isAcid ? s.naohMmoles + addedMmoles : s.naohMmoles,
      // Liquid reagent mixes homogeneously without needing stir!
      lastProbedPh: null,
    }));
    spawnParticle(activeSlotId, isAcid ? '#FB7185' : '#38BDF8', 'down');
    labAudio.playPipetteDispense();
    setBenchAlert(
      `Titrated ${actualMl >= 1 ? `${actualMl.toFixed(3)} mL` : `${(actualMl * 1000).toFixed(1)} µL`} of ${calcStockMolarity}M ${isAcid ? 'HCl' : 'NaOH'} into Slot ${activeSlotId} — dip Digital pH Probe to verify!`
    );
  };

  // Clicking on any of the 3 Isometric Bench Slots (A, B, C)
  const handleSlotPointerDown = (targetSlotId: BenchSlotId) => {
    setActiveSlotId(targetSlotId);
    const targetSlot = slots[targetSlotId];
    const targetEv = getSlotExistingVessel(targetSlot);
    const targetKind = targetEv
      ? mapVesselTypeToContainerKind(targetEv.vesselType)
      : targetSlot.containerKind;

    // 1. No held tool -> selects slot (and recalls to pad if it's currently parked in Stand/Autoclave/Ice!)
    if (!heldTool) {
      const station = getSlotStation(targetSlotId);
      if (station !== 'pad') {
        recallSlotToPad(targetSlotId);
        labAudio.playUiClick();
        setBenchAlert(`Returned Slot ${targetSlotId} back onto its Bench Pad.`);
        return;
      }
      labAudio.playUiClick();
      if (targetEv) {
        setBenchAlert(`Selected Slot ${targetSlotId}: Tray Vessel "${targetEv.label}" (${targetEv.volumeMl.toFixed(1)} mL · ${targetEv.temperatureC.toFixed(1)}°C).`);
      } else {
        setBenchAlert(`Selected Bench Slot ${targetSlotId} (${targetSlot.containerKind ?? 'Empty'} · ${targetSlot.volumeMl.toFixed(1)} mL).`);
      }
      return;
    }

    if (!targetKind) {
      setBenchAlert(`Slot ${targetSlotId} has no container! Pick a Beaker, Flask, Tube, or Plate for Slot ${targetSlotId} in the drawer.`);
      return;
    }

    // 2. Pouring from another held Bench Slot
    if (heldTool === 'pour_slot_A' || heldTool === 'pour_slot_B' || heldTool === 'pour_slot_C') {
      const srcId = heldTool.replace('pour_slot_', '') as BenchSlotId;
      if (srcId === targetSlotId) {
        setBenchAlert(`Already holding Slot ${srcId}. Click a DIFFERENT Slot, or click Heating Stand / Autoclave / Ice Bucket.`);
        return;
      }
      const srcSlot = slots[srcId];
      const srcEv = getSlotExistingVessel(srcSlot);

      if (srcEv) {
        const reqMl = pourAmountMl === 'all' ? Math.max(0, srcEv.volumeMl - 0.5) : pourAmountMl;
        const { nextVessel, cargo, drawnMl } = suctionCargoFromExistingVessel(srcEv, reqMl);
        if (drawnMl <= 0) {
          setBenchAlert(`${srcEv.label} has no pourable volume left!`);
          return;
        }
        if (targetEv && onUpdateExistingVessel) {
          const maxSafe = getMaxSafeVolumeMl(targetEv.vesselType);
          const { updated, dispensedMl } = applyCargoToExistingVessel(targetEv, cargo, maxSafe);
          if (dispensedMl <= 0) {
            setBenchAlert(`${targetEv.label} is full!`);
            return;
          }
          onUpdateExistingVessel(srcEv.id, () => nextVessel);
          onUpdateExistingVessel(targetEv.id, () => updated);
          spawnParticle(targetSlotId, '#38BDF8', 'down');
          labAudio.playSinkPour();
          setBenchAlert(`Poured ${dispensedMl.toFixed(1)} mL from ${srcEv.label} into ${targetEv.label}!`);
          return;
        } else {
          const { nextTarget, dispensedMl } = dispenseCargoIntoSlot(cargo, targetSlot);
          if (dispensedMl <= 0) {
            setBenchAlert(`Slot ${targetSlotId} is full!`);
            return;
          }
          if (onUpdateExistingVessel) {
            onUpdateExistingVessel(srcEv.id, () => nextVessel);
          }
          updateSlot(targetSlotId, () => nextTarget);
          spawnParticle(targetSlotId, '#38BDF8', 'down');
          labAudio.playSinkPour();
          setBenchAlert(`Poured ${dispensedMl.toFixed(1)} mL from ${srcEv.label} into Slot ${targetSlotId}!`);
          return;
        }
      }

      if (srcSlot.volumeMl <= 0) {
        setBenchAlert(`Slot ${srcId} is empty — nothing to pour!`);
        return;
      }
      const reqMl = pourAmountMl === 'all' ? srcSlot.volumeMl : pourAmountMl;

      if (targetEv && onUpdateExistingVessel) {
        const maxSafe = getMaxSafeVolumeMl(targetEv.vesselType);
        const { nextSource, nextVessel, movedMl } = applySlotPourToExistingVessel(
          srcSlot,
          targetEv,
          reqMl,
          maxSafe
        );
        if (movedMl <= 0) {
          setBenchAlert(`${targetEv.label} has reached safe capacity (${maxSafe} mL)!`);
          return;
        }
        updateSlot(srcId, () => nextSource);
        onUpdateExistingVessel(targetEv.id, () => nextVessel);
        if (srcSlot.stagedSourceId && srcSlot.stagedInoculumUl > 0) {
          onInoculateExisting(
            targetEv.id,
            srcSlot.stagedSourceId,
            Math.round((srcSlot.stagedInoculumUl * movedMl) / Math.max(0.1, srcSlot.volumeMl)),
            dilutionExponent,
            {
              contaminationRisk: burnerStandOn ? 0 : 0.25,
              crossStrainId: srcSlot.crossContamStrainId ?? crossContamStrainId,
              vortexResuspended: srcSlot.vortexResuspended,
            }
          );
        }
        spawnParticle(targetSlotId, evaluateMediaFormulaMatch(srcSlot).liquidColorHex, 'down');
        labAudio.playSinkPour();
        setBenchAlert(`Poured ${movedMl.toFixed(1)} mL from Slot ${srcId} into Tray vessel ${targetEv.label}!`);
        if (nextSource.volumeMl <= 0) setHeldTool(null);
        return;
      }

      const { nextSource, nextTarget, movedMl } = transferLiquidBetweenSlots(srcSlot, targetSlot, reqMl);
      if (movedMl <= 0) {
        setBenchAlert(`Slot ${targetSlotId} is full!`);
        return;
      }
      setSlots((prev) => ({
        ...prev,
        [srcId]: nextSource,
        [targetSlotId]: nextTarget,
      }));
      setProbeReadout(null);
      spawnParticle(targetSlotId, evaluateMediaFormulaMatch(srcSlot).liquidColorHex, 'down');
      labAudio.playSinkPour();
      setBenchAlert(
        `Poured ${movedMl.toFixed(1)} mL from Slot ${srcId} into Slot ${targetSlotId}! (Now ${nextTarget.volumeMl.toFixed(1)} mL)`
      );
      if (nextSource.volumeMl <= 0) setHeldTool(null);
      return;
    }

    // 3. Digital pH Probe (Accurate true range down to -0.85 pH!)
    if (heldTool === 'ph_meter') {
      if (!targetEv && targetSlot.volumeMl <= 0) {
        setBenchAlert(`Slot ${targetSlotId} is dry! Add water or solution before dipping the Digital pH Probe.`);
        return;
      }
      const basePh = targetEv ? targetEv.pH : computeSlotTruePh(targetSlot);
      const unmixed = !targetEv && targetSlot.stirProgress < 0.85;
      const jitter = unmixed ? Number(((Math.random() - 0.5) * 0.65).toFixed(2)) : 0;
      const measured = Number(Math.max(-0.85, Math.min(14.0, basePh + jitter)).toFixed(2));
      updateSlot(targetSlotId, (s) => ({ ...s, lastProbedPh: measured }));
      setProbeReadout({ slotId: targetSlotId, pH: measured, unmixedWarning: unmixed });
      labAudio.playUiClick();
      setBenchAlert(
        unmixed
          ? `pH Probe reads ${measured.toFixed(2)} (UNMIXED solid powder! Toggle Stir ON or Heat to dissolve).`
          : `Digital pH Probe reading for ${targetEv ? targetEv.label : `Slot ${targetSlotId}`}: pH ${measured.toFixed(2)}`
      );
      return;
    }

    // 4. P1000 Pipette Suction / Dispense
    if (heldTool === 'pipette_p1000') {
      if (!hasFreshTip) {
        setBenchAlert('Mount a sterile tip from the Tip Box before pipetting!');
        return;
      }

      if (!pipetteCargo) {
        if (targetEv) {
          if (targetEv.volumeMl <= 0.05) {
            setBenchAlert(`${targetEv.label} has no remaining liquid to suction!`);
            return;
          }
          const { nextVessel, cargo, drawnMl } = suctionCargoFromExistingVessel(targetEv, pipetteVolMl);
          if (onUpdateExistingVessel) {
            onUpdateExistingVessel(targetEv.id, () => nextVessel);
          }
          if (cargo.speciesId) {
            if (tipLoadedStrainId && tipLoadedStrainId !== cargo.speciesId) {
              setCrossContamStrainId(tipLoadedStrainId);
            } else {
              setTipLoadedStrainId(cargo.speciesId);
            }
          }
          setTipDirtyOrigin(cargo.originSignature);
          setPipetteCargo(cargo);
          spawnParticle(targetSlotId, '#38BDF8', 'up');
          labAudio.playPipetteSuction();
          setBenchAlert(
            `Suctioned ${drawnMl < 1 ? `${Math.round(drawnMl * 1000)} µL` : `${drawnMl} mL`} from ${targetEv.label}! Click any target Slot to dispense.`
          );
          return;
        }

        if (targetSlot.volumeMl <= 0) {
          setBenchAlert(`Slot ${targetSlotId} is empty! Suction from Water Jar, Source Bacteria, or a filled Slot.`);
          return;
        }
        const drawnMl = Number(Math.min(targetSlot.volumeMl, pipetteVolMl).toFixed(2));
        const frac = drawnMl / targetSlot.volumeMl;
        const dummyEmpty = createEmptySlot('A', 'beaker');
        const { nextSource } = transferLiquidBetweenSlots(targetSlot, dummyEmpty, drawnMl);
        const extractedAbs: Record<string, number> = {};
        for (const [abId, ug] of Object.entries(targetSlot.antibioticsUg)) {
          extractedAbs[abId] = ug * frac;
        }
        updateSlot(targetSlotId, () => nextSource);
        setTipDirtyOrigin(`slot_${targetSlotId}`);
        setPipetteCargo({
          volumeMl: drawnMl,
          naohMmoles: targetSlot.naohMmoles * frac,
          hclMmoles: targetSlot.hclMmoles * frac,
          bufferMmoles: targetSlot.bufferMmoles * frac,
          tryptoneG: targetSlot.tryptoneG * frac,
          glucoseG: targetSlot.glucoseG * frac,
          saltsG: targetSlot.saltsG * frac,
          agarG: targetSlot.agarG * frac,
          macconkeyUnits: targetSlot.macconkeyUnits * frac,
          antibioticsUg: extractedAbs,
          tempC: targetSlot.tempC,
          sourceLabel: `Slot ${targetSlotId} mix`,
          sourceVesselId: targetSlot.stagedSourceId,
          speciesId: null,
          vortexResuspended: targetSlot.vortexResuspended,
          originSignature: `slot_${targetSlotId}`,
        });
        spawnParticle(targetSlotId, evaluateMediaFormulaMatch(targetSlot).liquidColorHex, 'up');
        labAudio.playPipetteSuction();
        setBenchAlert(
          `Suctioned ${drawnMl < 1 ? `${Math.round(drawnMl * 1000)} µL` : `${drawnMl} mL`} from Slot ${targetSlotId}! Click another Slot to dispense.`
        );
        return;
      }

      if (targetEv) {
        const maxSafe = getMaxSafeVolumeMl(targetEv.vesselType);
        const didApplyChemistry =
          onUpdateExistingVessel &&
          (!pipetteCargo.sourceVesselId ||
            pipetteCargo.naohMmoles > 0 ||
            pipetteCargo.hclMmoles > 0 ||
            pipetteCargo.bufferMmoles > 0 ||
            pipetteCargo.tryptoneG > 0 ||
            pipetteCargo.glucoseG > 0 ||
            Object.keys(pipetteCargo.antibioticsUg).length > 0 ||
            !pipetteCargo.sourceVesselId);

        let movedChemMl = pipetteCargo.volumeMl;
        if (didApplyChemistry && onUpdateExistingVessel) {
          const { updated, dispensedMl } = applyCargoToExistingVessel(targetEv, pipetteCargo, maxSafe);
          movedChemMl = dispensedMl;
          if (dispensedMl > 0) {
            onUpdateExistingVessel(targetEv.id, () => updated);
          } else if (!pipetteCargo.sourceVesselId) {
            setBenchAlert(`${targetEv.label} has reached capacity (${maxSafe} mL)!`);
            return;
          }
        }

        if (pipetteCargo.sourceVesselId && pipetteCargo.sourceVesselId !== targetEv.id) {
          onInoculateExisting(
            targetEv.id,
            pipetteCargo.sourceVesselId,
            Math.round(pipetteCargo.volumeMl * 1000),
            dilutionExponent,
            {
              contaminationRisk: burnerStandOn ? 0 : 0.25,
              crossStrainId: crossContamStrainId,
              vortexResuspended: pipetteCargo.vortexResuspended,
            }
          );
        }

        spawnParticle(targetSlotId, pipetteCargoColor, 'down');
        labAudio.playPipetteDispense();
        const dispVolText = movedChemMl < 1 ? `${Math.round(movedChemMl * 1000)} µL` : `${movedChemMl} mL`;
        setBenchAlert(
          pipetteCargo.sourceVesselId
            ? `Inoculated ${targetEv.label} with ${dispVolText} ${
                targetEv.vesselType === 'agar_plate' ? `at 10⁻${dilutionExponent}` : ''
              }!`
            : `Dispensed ${dispVolText} (${pipetteCargo.sourceLabel}) into Tray vessel ${targetEv.label}!`
        );
        setPipetteCargo(null);
        return;
      }

      const { nextTarget, dispensedMl } = dispenseCargoIntoSlot(pipetteCargo, targetSlot);
      if (dispensedMl <= 0) {
        setBenchAlert(`Slot ${targetSlotId} has reached capacity!`);
        return;
      }
      updateSlot(targetSlotId, () => nextTarget);
      spawnParticle(targetSlotId, pipetteCargoColor, 'down');
      labAudio.playPipetteDispense();
      const extraWarn = nextTarget.inoculumKilledByHeat
        ? ' (WARNING: Vessel >48 °C heat-killed inoculated cells! Cool in Ice Bucket first!)'
        : '';
      setBenchAlert(
        `Dispensed ${dispensedMl < 1 ? `${Math.round(dispensedMl * 1000)} µL` : `${dispensedMl} mL`} from ${pipetteCargo.sourceLabel} into Slot ${targetSlotId}${extraWarn}.`
      );
      setPipetteCargo(null);
      return;
    }

    // 5. Dry Ingredient Scoops (Tryptone/YE, Salts, Agar, MacConkey)
    if (
      heldTool === 'scoop_tryptone' ||
      heldTool === 'scoop_salts' ||
      heldTool === 'scoop_agar' ||
      heldTool === 'scoop_macconkey'
    ) {
      if (targetEv) {
        setBenchAlert('Dry powder scoops belong in new formulations — use 20% Glucose, 5× Tryptone, or Pour from another Slot to feed Tray vessels.');
        return;
      }
      const scoopColor =
        heldTool === 'scoop_tryptone'
          ? '#FBBF24'
          : heldTool === 'scoop_salts'
          ? '#F8FAFC'
          : heldTool === 'scoop_agar'
          ? '#FDE68A'
          : '#FB7185';
      updateSlot(targetSlotId, (s) => ({
        ...s,
        tryptoneG: heldTool === 'scoop_tryptone' ? Number((s.tryptoneG + 0.25).toFixed(3)) : s.tryptoneG,
        saltsG: heldTool === 'scoop_salts' ? Number((s.saltsG + 0.2).toFixed(3)) : s.saltsG,
        agarG: heldTool === 'scoop_agar' ? Number((s.agarG + 0.25).toFixed(3)) : s.agarG,
        macconkeyUnits:
          heldTool === 'scoop_macconkey' ? Number((s.macconkeyUnits + 0.35).toFixed(2)) : s.macconkeyUnits,
        stirProgress: stirrerOn || s.tempC >= 60 ? s.stirProgress : Number(Math.max(0.25, s.stirProgress - 0.35).toFixed(2)),
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, scoopColor, 'down');
      labAudio.playUiClick();
      const msg =
        heldTool === 'scoop_tryptone'
          ? '+0.25 g Tryptone + Yeast Extract scooped'
          : heldTool === 'scoop_salts'
          ? '+0.20 g NaCl / M9 Salts scooped'
          : heldTool === 'scoop_agar'
          ? '+0.25 g Bacteriological Agar scooped (Heat >=85° or Autoclave to melt)'
          : '+0.35 u MacConkey Selective Mix scooped';
      setBenchAlert(`${msg} into Slot ${targetSlotId}. Toggle Stir ON or Heat to dissolve!`);
      return;
    }

    // 6. Concentrated Liquid Droppers & Liquid Nutrients (NO unmixed penalty — liquids mix immediately!)
    const maxV = targetEv
      ? getMaxSafeVolumeMl(targetEv.vesselType)
      : getMaxSlotVolumeMl(targetSlot.containerKind);
    const curVol = targetEv ? targetEv.volumeMl : targetSlot.volumeMl;
    const headroom = Math.max(0, maxV - curVol);
    if (headroom <= 0.05) {
      setBenchAlert(`Slot ${targetSlotId} is full (${maxV} mL)! Drain excess liquid first.`);
      return;
    }

    if (heldTool === 'naoh_conc' || heldTool === 'hcl_conc' || heldTool === 'pbs_conc') {
      const reqMl = heldTool === 'pbs_conc' ? 2.5 : 0.5;
      if (targetEv && onUpdateExistingVessel) {
        const { updated, actualMl } = applyReagentDropToExistingVessel(
          targetEv,
          heldTool,
          reqMl,
          maxV
        );
        onUpdateExistingVessel(targetEv.id, () => updated);
        setProbeReadout(null);
        spawnParticle(
          targetSlotId,
          heldTool === 'naoh_conc' ? '#38BDF8' : heldTool === 'hcl_conc' ? '#FB7185' : '#A78BFA',
          'down'
        );
        labAudio.playPipetteDispense();
        setBenchAlert(
          `Added +${actualMl} mL ${
            heldTool === 'naoh_conc' ? '10M NaOH' : heldTool === 'hcl_conc' ? '10M HCl' : '10× PBS'
          } into ${targetEv.label} (Vol ${updated.volumeMl.toFixed(1)} mL). Dip Digital pH Probe to check pH!`
        );
        return;
      }
    }

    if (heldTool === 'naoh_conc') {
      const addMl = Number(Math.min(headroom, 0.5).toFixed(2));
      updateSlot(targetSlotId, (s) => ({
        ...s,
        volumeMl: Number((s.volumeMl + addMl).toFixed(2)),
        naohMmoles: s.naohMmoles + addMl * 10,
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, '#38BDF8', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        `Added +${addMl} mL of 10M NaOH to Slot ${targetSlotId} (homogeneous liquid mix). Dip Digital pH Probe to read!`
      );
      return;
    }

    if (heldTool === 'hcl_conc') {
      const addMl = Number(Math.min(headroom, 0.5).toFixed(2));
      updateSlot(targetSlotId, (s) => ({
        ...s,
        volumeMl: Number((s.volumeMl + addMl).toFixed(2)),
        hclMmoles: s.hclMmoles + addMl * 10,
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, '#FB7185', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        `Added +${addMl} mL of 10M HCl to Slot ${targetSlotId} (homogeneous liquid mix). Dip Digital pH Probe to verify!`
      );
      return;
    }

    if (heldTool === 'pbs_conc') {
      const addMl = Number(Math.min(headroom, 2.5).toFixed(2));
      updateSlot(targetSlotId, (s) => ({
        ...s,
        volumeMl: Number((s.volumeMl + addMl).toFixed(2)),
        bufferMmoles: s.bufferMmoles + addMl * 1.0,
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, '#A78BFA', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        `Added +${addMl} mL of 10× PBS Buffer to Slot ${targetSlotId} (homogeneous liquid mix).`
      );
      return;
    }

    if (heldTool === 'glucose_vial' || heldTool === 'tryptone_bottle') {
      if (targetEv) {
        if (targetEv.vesselType === 'agar_plate') {
          setBenchAlert('Solid agar plates cannot be liquid-fed — prepare or inoculate liquid broth instead.');
          return;
        }
        const suppId = heldTool === 'glucose_vial' ? 'glucose_20' : 'tryptone_yeast_5x';
        onFeedCulture(targetEv.id, suppId, Math.min(headroom, 1.5));
        spawnParticle(targetSlotId, heldTool === 'glucose_vial' ? '#34D399' : '#FBBF24', 'down');
        labAudio.playPipetteDispense();
        setBenchAlert(`Fed ${Math.min(headroom, 1.5).toFixed(1)} mL ${heldTool === 'glucose_vial' ? '20% Glucose' : '5× Tryptone/YE'} to ${targetEv.label}!`);
        return;
      }
      const addMl = Number(Math.min(headroom, heldTool === 'glucose_vial' ? 1.5 : 2.0).toFixed(2));
      updateSlot(targetSlotId, (s) => ({
        ...s,
        volumeMl: Number((s.volumeMl + addMl).toFixed(2)),
        glucoseG: heldTool === 'glucose_vial' ? Number((s.glucoseG + addMl * 0.2).toFixed(3)) : s.glucoseG,
        tryptoneG: heldTool === 'tryptone_bottle' ? Number((s.tryptoneG + addMl * 0.15).toFixed(3)) : s.tryptoneG,
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, heldTool === 'glucose_vial' ? '#34D399' : '#FBBF24', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        `Added +${addMl} mL ${heldTool === 'glucose_vial' ? '20% D-Glucose' : '5× Tryptone/YE'} to Slot ${targetSlotId}.`
      );
      return;
    }

    // 7. Antibiotics
    if (
      heldTool === 'ab_ampicillin' ||
      heldTool === 'ab_kanamycin' ||
      heldTool === 'ab_chloramphenicol' ||
      heldTool === 'ab_ciprofloxacin'
    ) {
      const abId = heldTool.replace('ab_', '');
      const ab = ANTIBIOTIC_COMPOUNDS.find((a) => a.id === abId);
      if (!ab) return;

      if (targetEv && onUpdateExistingVessel) {
        const { updated, actualMl, heatDegraded } = applyAntibioticDropToExistingVessel(
          targetEv,
          ab.id,
          ab.standardWorkingUgPerMl,
          0.5,
          maxV
        );
        onUpdateExistingVessel(targetEv.id, () => updated);
        spawnParticle(targetSlotId, '#F59E0B', 'down');
        labAudio.playPipetteDispense();
        setBenchAlert(
          heatDegraded
            ? `Warning: ${targetEv.label} is ${targetEv.temperatureC.toFixed(0)} °C (>55 °C)! Heat degraded Ampicillin to 25%. Chill in Ice Bucket first!`
            : `Added +${actualMl} mL ${ab.name} to ${targetEv.label} (Vol ${updated.volumeMl.toFixed(1)} mL).`
        );
        return;
      }

      const addMl = Number(Math.min(headroom, 0.5).toFixed(2));
      const targetRefVol = Math.max(15, targetSlot.volumeMl + addMl);
      const addUg = ab.standardWorkingUgPerMl * targetRefVol;
      const heatHurt = ab.id === 'ampicillin' && targetSlot.tempC > 55;

      updateSlot(targetSlotId, (s) => ({
        ...s,
        volumeMl: Number((s.volumeMl + addMl).toFixed(2)),
        antibioticsUg: {
          ...s.antibioticsUg,
          [ab.id]: (s.antibioticsUg[ab.id] ?? 0) + addUg,
        },
        heatDegradedAbIds:
          heatHurt && !s.heatDegradedAbIds.includes(ab.id)
            ? [...s.heatDegradedAbIds, ab.id]
            : s.heatDegradedAbIds,
        lastProbedPh: null,
      }));
      spawnParticle(targetSlotId, '#F59E0B', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        heatHurt
          ? `Warning: Slot ${targetSlotId} is ${targetSlot.tempC.toFixed(0)} °C (>55 °C)! Heat degraded Ampicillin potency to 25%. Cool in Ice Bucket first!`
          : `Added +${addMl} mL ${ab.name} to Slot ${targetSlotId} (Total Vol +${addMl} mL).`
      );
      return;
    }

    // 8. Nichrome Inoculation Loop
    if (heldTool === 'loop_nichrome') {
      if (loopState !== 'loaded' || !sourceVesselId) {
        setBenchAlert('Flame nichrome loop on Heating Burner Stand, wait 3s to cool, then pick cells from Source Tube.');
        return;
      }
      const curTemp = targetEv ? targetEv.temperatureC : targetSlot.tempC;
      const heatKilled = loopKilledInoculum || curTemp > 48;
      if (targetEv) {
        onInoculateExisting(
          targetEv.id,
          sourceVesselId,
          heatKilled ? 0 : 25,
          dilutionExponent,
          {
            contaminationRisk: burnerStandOn ? 0 : 0.25,
            vortexResuspended: true,
          }
        );
      } else {
        updateSlot(targetSlotId, (s) => ({
          ...s,
          stagedSourceId: sourceVesselId,
          stagedInoculumUl: s.stagedInoculumUl + (heatKilled ? 0 : 25),
          stagedMethod: 'loop',
          inoculumKilledByHeat: s.inoculumKilledByHeat || heatKilled,
          vortexResuspended: true,
        }));
      }
      setLoopState('unsterile');
      spawnParticle(targetSlotId, '#34D399', 'down');
      labAudio.playPipetteDispense();
      setBenchAlert(
        heatKilled
          ? 'Inoculum killed by thermal heat (>48 °C vessel or uncooled loop)! Zero viable CFU.'
          : `Streaked ${selectedSourceSpecies?.commonLabel ?? 'bacteria'} onto ${targetEv ? targetEv.label : `Slot ${targetSlotId}`}.`
      );
    }
  };

  // Dispense active Slot A / B / C to the main Sample Tray
  const handleDispenseActiveSlot = () => {
    if (selectedExistingVessel || beltVessels.length >= beltCapacity) return;
    if (!activeSlot.containerKind || activeSlot.volumeMl <= 0) {
      setBenchAlert(`Slot ${activeSlotId} has no liquid! Suction ddH₂O from the Water Jar first.`);
      return;
    }

    recallSlotToPad(activeSlotId);
    const evalRes = activeFormulaEval;
    const truePh = computeSlotTruePh(activeSlot);
    const resolvedVesselType: VesselType =
      activeSlot.containerKind === 'plate'
        ? 'agar_plate'
        : activeSlot.containerKind === 'tube'
        ? 'culture_tube'
        : 'flask_250ml';

    const absUgPerMl: Record<string, number> = {};
    for (const [abId, totalUg] of Object.entries(activeSlot.antibioticsUg)) {
      const conc = totalUg / Math.max(1, activeSlot.volumeMl);
      if (conc > 0.01) absUgPerMl[abId] = Number(conc.toFixed(2));
    }

    let risk =
      activeSlot.sterilityLevel === 'autoclaved'
        ? 0
        : activeSlot.sterilityLevel === 'pasteurized'
        ? 0.08
        : 0.3;
    if (activeSlot.stagedSourceId && !burnerStandOn) risk = Math.min(0.65, risk + 0.25);
    if (waterJarContaminated) risk = Math.min(0.75, risk + 0.25);

    const abPotency = activeSlot.heatDegradedAbIds.length > 0 ? 0.25 : 1.0;
    const stagedSpecies = activeSlot.stagedSourceId
      ? getSpeciesById(
          allVessels.find((v) => v.id === activeSlot.stagedSourceId)?.populations[0]?.speciesId ?? ''
        )
      : undefined;

    const abTag = Object.entries(absUgPerMl)
      .map(([id, c]) => `${id.slice(0, 3).toUpperCase()}${Math.round(c)}`)
      .join('+');

    const dilTag =
      resolvedVesselType === 'agar_plate' && activeSlot.stagedSourceId && dilutionExponent > 0
        ? `-1e-${dilutionExponent}`
        : '';

    const autoLabel =
      customLabel.trim() ||
      `${stagedSpecies ? stagedSpecies.commonLabel.split(' ')[0] : 'Mix'}-${evalRes.closestName.replace(/\s+/g, '')}${
        abTag ? `-${abTag}` : ''
      }${dilTag}`;

    onCreateVessel({
      label: autoLabel,
      vesselType: resolvedVesselType,
      mediaId: evalRes.closestMediaId,
      volumeMl: Number(activeSlot.volumeMl.toFixed(1)),
      initialPh: truePh,
      antibioticsUgPerMl: absUgPerMl,
      sourceVesselId: activeSlot.inoculumKilledByHeat ? null : activeSlot.stagedSourceId,
      inoculumUl: activeSlot.inoculumKilledByHeat ? 0 : activeSlot.stagedInoculumUl,
      dilutionExponent: resolvedVesselType === 'agar_plate' ? dilutionExponent : 0,
      actualParams: {
        actualVolumeMl: Number(activeSlot.volumeMl.toFixed(1)),
        actualPh: truePh,
        actualNutrients: evalRes.blendedNutrientYield,
        actualBufferCapacity: evalRes.blendedBufferCapacity,
        antibioticPotency: abPotency,
        contaminationRisk: risk,
        crossStrainId: activeSlot.crossContamStrainId ?? crossContamStrainId,
        vortexResuspended: activeSlot.vortexResuspended,
      },
    });

    updateSlot(activeSlotId, (s) => createEmptySlot(s.slotId, s.containerKind));
    setCustomLabel('');
    labAudio.playSaveSuccess();
    setBenchAlert(
      `Dispensed Slot ${activeSlotId} (${evalRes.closestName}, ${Math.round(
        evalRes.blendedNutrientYield * 100
      )}% nutrients) to Sample Tray!`
    );
  };

  // Custom Step Item Toggle Helper
  const togglePinInActiveStep = (itemId: string) => {
    if (!activeCustomStep) return;
    setCustomSteps((prev) =>
      prev.map((st) => {
        if (st.id !== activeCustomStep.id) return st;
        const has = st.items.includes(itemId);
        return {
          ...st,
          items: has ? st.items.filter((x) => x !== itemId) : [...st.items, itemId],
        };
      })
    );
  };

  const renderSlotVisualProps = (sid: BenchSlotId) => {
    const slot = slots[sid];
    const ev = getSlotExistingVessel(slot);
    const slotEval = evaluateMediaFormulaMatch(slot);
    const kind = ev ? mapVesselTypeToContainerKind(ev.vesselType) : slot.containerKind;
    const volMl = ev ? ev.volumeMl : slot.volumeMl;
    const tempC = ev ? ev.temperatureC : slot.tempC;
    const maxV = ev ? getMaxSafeVolumeMl(ev.vesselType) : getMaxSlotVolumeMl(kind);
    const evMedia = ev ? getMediaById(ev.mediaId) : undefined;
    const liqColor = ev
      ? (ev.od600 > 0.15 ? evMedia?.turbidColorHex : evMedia?.baseColorHex) ?? '#D4B475'
      : slotEval.liquidColorHex;
    const hasInoc = ev ? ev.populations.some((p) => p.viableCount > 0) : Boolean(slot.stagedSourceId);
    const fillFrac =
      kind === 'plate'
        ? volMl > 0 || slot.agarG > 0 || Boolean(ev)
          ? 0.55
          : 0
        : volMl <= 0
        ? 0
        : Math.max(0.08, Math.min(0.95, volMl / maxV));
    const spriteId: PixelSprite64Id =
      kind === 'plate'
        ? 'agar_plate'
        : kind === 'tube'
        ? 'tube_15'
        : kind === 'flask'
        ? 'flask_250'
        : 'beaker_250';
    return { slot, ev, kind, volMl, tempC, liqColor, hasInoc, fillFrac, spriteId };
  };

  // Helper to render one Isometric Bench Slot (A, B, or C)
  const renderDeskSlot = (slotId: BenchSlotId, x: number, y: number) => {
    const { slot, ev, kind, volMl, tempC, liqColor, hasInoc, fillFrac, spriteId } =
      renderSlotVisualProps(slotId);
    const isSelected = activeSlotId === slotId;
    const parkedAt = getSlotStation(slotId);
    const padLabel = ev ? ev.label.slice(0, 12) : kind?.toUpperCase() ?? 'EMPTY';
    const slotParticles = particles.filter((p) => p.slotId === slotId);

    return (
      <g
        key={slotId}
        transform={`translate(${x}, ${y})`}
        onPointerDown={() => handleSlotPointerDown(slotId)}
        className={heldTool ? 'cursor-crosshair' : 'cursor-pointer'}
      >
        <polygon
          points="-12,102 132,102 152,148 -32,148"
          fill="#0B111E"
          stroke={
            parkedAt === 'stand'
              ? '#F97316'
              : parkedAt === 'autoclave'
              ? '#10B981'
              : parkedAt === 'ice'
              ? '#38BDF8'
              : ev
              ? '#10B981'
              : isSelected
              ? '#38BDF8'
              : '#334155'
          }
          strokeWidth={isSelected || parkedAt !== 'pad' ? '2.5' : '1.5'}
        />
        <polygon
          points="2,108 118,108 134,138 -14,138"
          fill={slotId === 'B' ? '#1E293B' : '#131B2C'}
          stroke="#475569"
          strokeWidth="1"
        />

        {isSelected && (
          <rect
            x="4"
            y="128"
            width="18"
            height="5"
            rx="1.5"
            fill={stirrerOn && parkedAt === 'pad' ? '#10B981' : '#334155'}
          />
        )}

        {heldTool && (
          <ellipse
            cx="60"
            cy="122"
            rx="54"
            ry="13"
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeDasharray="5 3"
          />
        )}

        {parkedAt !== 'pad' ? (
          <g>
            <ellipse
              cx="60"
              cy="121"
              rx="42"
              ry="10"
              fill={parkedAt === 'stand' ? '#F97316' : parkedAt === 'autoclave' ? '#10B981' : '#38BDF8'}
              fillOpacity="0.18"
              stroke={parkedAt === 'stand' ? '#FB923C' : parkedAt === 'autoclave' ? '#34D399' : '#7DD3FC'}
              strokeDasharray="3 2"
            />
            <text
              x="60"
              y="60"
              textAnchor="middle"
              fill={parkedAt === 'stand' ? '#FDBA74' : parkedAt === 'autoclave' ? '#6EE7B7' : '#BAE6FD'}
              fontSize="10"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {parkedAt === 'stand' ? 'ON STAND' : parkedAt === 'autoclave' ? 'IN AUTOCLAVE' : 'IN ICE BATH'}
            </text>
            <text
              x="60"
              y="74"
              textAnchor="middle"
              fill="#64748B"
              fontSize="8.5"
              fontFamily="JetBrains Mono, monospace"
            >
              (Click pad to recall)
            </text>
          </g>
        ) : kind ? (
          <g transform="translate(0, -10)">
            <PixelToolSprite64
              id={spriteId}
              size={120}
              fillFraction={fillFrac}
              liquidColor={liqColor}
              hasInoculum={hasInoc}
              isStirring={stirrerOn && isSelected && volMl > 0}
            />
          </g>
        ) : (
          <text
            x="60"
            y="72"
            textAnchor="middle"
            fill="#475569"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            EMPTY SLOT
          </text>
        )}

        {slotParticles.map((pt, idx) => (
          <rect
            key={pt.id}
            x={50 + ((idx * 7) % 18)}
            y={pt.direction === 'up' ? 40 : 4}
            width="5"
            height="7"
            fill={pt.color}
            style={{
              animation:
                pt.direction === 'up'
                  ? 'lab-suction-rise 460ms ease-out forwards'
                  : 'lab-drop-fall 460ms ease-in forwards',
            }}
          />
        ))}

        <rect
          x="-6"
          y="148"
          width="132"
          height="32"
          rx="3"
          fill="#0B111E"
          stroke={ev ? '#10B981' : isSelected ? '#38BDF8' : '#334155'}
          strokeWidth={isSelected ? '1.8' : '1'}
        />
        <text
          x="60"
          y="162"
          textAnchor="middle"
          fill={ev ? '#6EE7B7' : isSelected ? '#7DD3FC' : '#E2E8F0'}
          fontSize="10"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {ev ? `TRAY · ${padLabel}` : `SLOT ${slotId} · ${padLabel}`}
        </text>
        <text
          x="60"
          y="174"
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="9.5"
          fontFamily="JetBrains Mono, monospace"
        >
          {volMl.toFixed(1)} mL · {tempC.toFixed(1)}°C
        </text>
      </g>
    );
  };

  const getCursorPourFill = (sid: BenchSlotId) => {
    const s = slots[sid];
    const ev = getSlotExistingVessel(s);
    const v = ev ? ev.volumeMl : s.volumeMl;
    const m = ev ? getMaxSafeVolumeMl(ev.vesselType) : getMaxSlotVolumeMl(s.containerKind);
    return Math.max(0.1, Math.min(1, v / Math.max(1, m)));
  };

  const getCursorPourColor = (sid: BenchSlotId) => {
    const s = slots[sid];
    const ev = getSlotExistingVessel(s);
    if (ev) return getMediaById(ev.mediaId)?.baseColorHex ?? '#D4B475';
    return evaluateMediaFormulaMatch(s).liquidColorHex;
  };

  // === Reusable Drawer Sub-Widgets (Shared across Categorized & Custom My-Step Views) ===

  const renderPinButton = (itemId: string) => {
    if (!activeCustomStep) return null;
    const pinned = activeCustomStep.items.includes(itemId);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePinInActiveStep(itemId);
        }}
        title={pinned ? `Remove from "${activeCustomStep.name}"` : `Add to "${activeCustomStep.name}"`}
        className={`px-1.5 py-0.5 text-[9.5px] font-mono rounded border flex items-center gap-0.5 shrink-0 cursor-pointer ${
          pinned
            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
            : 'bg-slate-950 border-slate-700 text-slate-500 hover:text-slate-200'
        }`}
      >
        <Pin className="w-2.5 h-2.5" />
        {pinned ? 'In Step' : '+Step'}
      </button>
    );
  };

  const renderPhCalculatorCard = () => (
    <div className="p-2.5 bg-slate-900/80 border border-cyan-500/40 rounded space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-cyan-200">
          <Calculator className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>pH Titration Calculator</span>
        </div>
        {renderPinButton('ph_calculator')}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Target pH</label>
          <input
            type="number"
            step={0.1}
            min={-0.5}
            max={13.5}
            value={calcTargetPh}
            onChange={(e) => setCalcTargetPh(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono tabular-nums text-cyan-200 focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Acid/Base Stock (M)</label>
          <select
            value={calcStockMolarity}
            onChange={(e) => setCalcStockMolarity(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200"
          >
            <option value={10}>10 M (Conc.)</option>
            <option value={5}>5 M</option>
            <option value={1}>1 M (Diluted)</option>
            <option value={0.1}>0.1 M (Fine)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {[1.7, 4.5, 6.8, 7.0, 7.4].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setCalcTargetPh(preset)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
              Math.abs(calcTargetPh - preset) < 0.05
                ? 'bg-cyan-600 border-cyan-400 text-white'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            pH {preset}
          </button>
        ))}
      </div>

      <div className="p-2 rounded bg-[#070B12] border border-slate-800 space-y-1 font-mono tabular-nums text-[11px]">
        <div className="flex justify-between text-slate-400">
          <span>Active Slot {activeSlotId} Vol:</span>
          <span className="text-slate-200">{effectiveVolumeMl.toFixed(1)} mL</span>
        </div>
        {titrationResult.reagent === 'none' ? (
          <div className="text-emerald-300">{titrationResult.note}</div>
        ) : (
          <>
            <div className="flex justify-between">
              <span className="text-slate-400">Required Titrant:</span>
              <span className={titrationResult.reagent === 'hcl' ? 'text-rose-300 font-semibold' : 'text-sky-300 font-semibold'}>
                {calcStockMolarity}M {titrationResult.reagent === 'hcl' ? 'HCl' : 'NaOH'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Calculated Volume:</span>
              <span className="text-amber-300 font-bold">
                {titrationResult.volumeMl >= 1
                  ? `${titrationResult.volumeMl.toFixed(3)} mL`
                  : `${titrationResult.volumeUl.toFixed(1)} µL`}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              {titrationResult.mmolesNeeded.toFixed(3)} mmol H⁺/OH⁻ → est. pH {titrationResult.projectedPh.toFixed(2)}
            </div>
          </>
        )}
      </div>

      {titrationResult.reagent !== 'none' && titrationResult.volumeMl > 0 && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={applyExactCalculatedTitration}
            className="flex-1 py-1.5 px-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap"
          >
            Add Calculated {titrationResult.volumeMl >= 1 ? `${titrationResult.volumeMl.toFixed(2)} mL` : `${Math.round(titrationResult.volumeUl)} µL`}
          </button>
          <button
            type="button"
            onClick={() => {
              setHeldTool(titrationResult.reagent === 'hcl' ? 'hcl_conc' : 'naoh_conc');
              setBenchAlert(`Selected ${titrationResult.reagent === 'hcl' ? '10M HCl' : '10M NaOH'} bottle. Click Slot ${activeSlotId} to dose manually.`);
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded cursor-pointer whitespace-nowrap"
          >
            Hold Bottle
          </button>
        </div>
      )}
    </div>
  );

  const renderPipetteCard = () => (
    <div className="p-2.5 bg-slate-900/70 border border-cyan-500/35 rounded space-y-2">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setHeldTool((p) => (p === 'pipette_p1000' ? null : 'pipette_p1000'))}
          className={`flex-1 p-1.5 rounded flex items-center gap-2.5 text-left cursor-pointer ${
            heldTool === 'pipette_p1000' ? 'bg-cyan-950/60' : 'hover:bg-slate-800/60'
          }`}
        >
          <PixelToolSprite64
            id="pipette_p1000"
            size={48}
            hasTip={hasFreshTip}
            pipetteFillFraction={pipetteCargo ? 0.78 : 0}
            liquidColor={pipetteCargoColor}
            hasInoculum={Boolean(pipetteCargo?.speciesId)}
            active={heldTool === 'pipette_p1000'}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-100">
              P1000 Suction Pipette
            </div>
            <div className="text-[10.5px] text-cyan-300 truncate">
              {!hasFreshTip
                ? 'Click Tip Box on desk to mount tip'
                : pipetteCargo
                ? `Loaded: ${pipetteCargo.volumeMl < 1 ? `${Math.round(pipetteCargo.volumeMl * 1000)} µL` : `${pipetteCargo.volumeMl} mL`} ${pipetteCargo.sourceLabel}`
                : `Ready (${pipetteVolMl < 1 ? `${Math.round(pipetteVolMl * 1000)} µL` : `${pipetteVolMl} mL`})`}
            </div>
          </div>
        </button>
        {renderPinButton('pipette_p1000')}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {PIPETTE_VOLUME_PRESETS_ML.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPipetteVolMl(p.ml)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
              pipetteVolMl === p.ml
                ? 'bg-cyan-600 border-cyan-400 text-white'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        {pipetteCargo && (
          <button
            type="button"
            onClick={() => {
              setPipetteCargo(null);
              labAudio.playSinkPour();
              setBenchAlert('Discarded liquid cargo from P1000 tip.');
            }}
            className="ml-auto px-1.5 py-0.5 text-[10px] font-mono rounded border bg-rose-950/60 border-rose-500/40 text-rose-200 cursor-pointer"
          >
            Flush
          </button>
        )}
      </div>
    </div>
  );

  const renderToolCardById = (itemId: string) => {
    if (itemId === 'ph_calculator') return <div key={itemId}>{renderPhCalculatorCard()}</div>;
    if (itemId === 'pipette_p1000') return <div key={itemId}>{renderPipetteCard()}</div>;

    if (itemId === 'heating_stand') {
      const slotProps = standSlotId ? renderSlotVisualProps(standSlotId) : null;
      return (
        <div key={itemId} className="p-2.5 bg-slate-900/75 border border-orange-500/40 rounded space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PixelToolSprite64 id="heating_stand" size={44} active={burnerStandOn} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-orange-200 truncate">
                  Heating Burner Stand
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {standSlotId && slotProps
                    ? `Slot ${standSlotId}: ${slotProps.tempC.toFixed(1)} °C · ${slotProps.volMl.toFixed(1)} mL`
                    : 'Place vessel on stand & toggle flame'}
                </div>
              </div>
            </div>
            {renderPinButton(itemId)}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => placeSlotOnHeatingStand(standSlotId ?? activeSlotId)}
              className={`py-1.5 px-2 text-[11px] font-medium rounded border cursor-pointer whitespace-nowrap ${
                standSlotId
                  ? 'bg-orange-950/50 border-orange-500/60 text-orange-200'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              {standSlotId ? `Remove Slot ${standSlotId}` : `Put Slot ${activeSlotId} On Stand`}
            </button>
            <button
              type="button"
              onClick={() => {
                setBurnerStandOn((b) => !b);
                labAudio.playUiClick();
              }}
              className={`py-1.5 px-2 text-[11px] font-semibold rounded border flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                burnerStandOn
                  ? 'bg-orange-600 border-orange-400 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {burnerStandOn ? 'Flame ON (Sterile)' : 'Flame OFF'}
            </button>
          </div>
        </div>
      );
    }

    if (itemId === 'autoclave_chamber') {
      const autoSlotProps = autoclaveSlotId ? renderSlotVisualProps(autoclaveSlotId) : null;
      return (
        <div key={itemId} className="p-2.5 bg-slate-900/75 border border-emerald-500/40 rounded space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PixelToolSprite64
                id="autoclave_unit"
                size={44}
                active={Boolean(autoclaveSlotId)}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-emerald-200 truncate">
                  Autoclave Chamber (121 °C)
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {autoclaveSlotId && autoSlotProps
                    ? `Heating Slot ${autoclaveSlotId}: ${autoSlotProps.tempC.toFixed(1)} °C (${autoclaveProgress}%)`
                    : 'Gradual pressure sterilization ramp'}
                </div>
              </div>
            </div>
            {renderPinButton(itemId)}
          </div>
          {autoclaveSlotId && (
            <div className="w-full h-1.5 bg-slate-950 rounded overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${Math.max(5, autoclaveProgress)}%` }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => placeSlotInAutoclave(autoclaveSlotId ?? activeSlotId)}
            className={`w-full py-1.5 px-2.5 text-[11px] font-semibold rounded border flex items-center justify-center gap-1.5 cursor-pointer ${
              autoclaveSlotId
                ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {autoclaveSlotId
              ? `Retrieve Slot ${autoclaveSlotId} (${autoclaveProgress >= 99 ? 'Sterile' : 'Heating'})`
              : `Load Slot ${activeSlotId} into Autoclave`}
          </button>
        </div>
      );
    }

    if (itemId === 'ice_bucket') {
      const iceProps = iceBucketSlotId ? renderSlotVisualProps(iceBucketSlotId) : null;
      return (
        <div key={itemId} className="p-2.5 bg-slate-900/75 border border-sky-500/40 rounded space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PixelToolSprite64 id="ice_bucket" size={44} active={Boolean(iceBucketSlotId)} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-sky-200 truncate">
                  Ice Bucket Cold Bath (→ 2.5 °C)
                </div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {iceBucketSlotId && iceProps
                    ? `Chilling Slot ${iceBucketSlotId}: ${iceProps.tempC.toFixed(1)} °C`
                    : 'Gradually chills hot flasks <55 °C'}
                </div>
              </div>
            </div>
            {renderPinButton(itemId)}
          </div>
          <button
            type="button"
            onClick={() => placeSlotInIceBucket(iceBucketSlotId ?? activeSlotId)}
            className={`w-full py-1.5 px-2.5 text-[11px] font-semibold rounded border flex items-center justify-center gap-1.5 cursor-pointer ${
              iceBucketSlotId
                ? 'bg-sky-900/60 border-sky-400 text-sky-100'
                : 'bg-sky-950/40 hover:bg-sky-900/60 border-sky-500/40 text-sky-200'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            {iceBucketSlotId
              ? `Remove Slot ${iceBucketSlotId} from Ice Bath`
              : `Place Slot ${activeSlotId} in Ice Bath`}
          </button>
        </div>
      );
    }

    // Standard reagent & instrument cards
    const reagentDefs: Record<
      string,
      { title: string; sub: string; sprite: PixelSprite64Id; color?: string }
    > = {
      ph_meter: {
        title: 'Digital pH Probe (Essential)',
        sub:
          activeSlot.lastProbedPh !== null
            ? `Last Probed: pH ${activeSlot.lastProbedPh.toFixed(2)}`
            : 'pH hidden on desk — dip Probe to read',
        sprite: 'ph_meter',
      },
      naoh_conc: {
        title: '10M NaOH Concentrate (+0.5 mL)',
        sub: 'Strong base — mixes cleanly',
        sprite: 'naoh_conc',
      },
      hcl_conc: {
        title: '10M HCl Concentrate (+0.5 mL)',
        sub: 'Volatile strong acid (20.2% azeotrope)',
        sprite: 'hcl_conc',
      },
      pbs_conc: {
        title: '10× PBS Buffer Conc. (+2.5 mL)',
        sub: selectedExistingVessel
          ? `Buf Strength: ${Math.round(selectedExistingVessel.bufferCapacity * 100)}%`
          : `Slot ${activeSlotId}: ${((activeSlot.bufferMmoles / Math.max(1, activeSlot.volumeMl)) * 1000).toFixed(0)} mM`,
        sprite: 'pbs_conc',
      },
      scoop_tryptone: {
        title: 'Scoop: Tryptone + Yeast Extract',
        sub: `Slot ${activeSlotId}: ${activeSlot.tryptoneG.toFixed(2)} g (+0.25g/click)`,
        sprite: 'scoop_spatula',
        color: '#FBBF24',
      },
      scoop_salts: {
        title: 'Scoop: NaCl & M9 Basal Salts',
        sub: `Slot ${activeSlotId}: ${activeSlot.saltsG.toFixed(2)} g (+0.20g/click)`,
        sprite: 'salts_jar',
        color: '#F8FAFC',
      },
      scoop_agar: {
        title: 'Scoop: Bacteriological Agar',
        sub: `Slot ${activeSlotId}: ${activeSlot.agarG.toFixed(2)} g (${activeSlot.agarMelted ? 'Melted' : 'Melt ≥85°'})`,
        sprite: 'agar_jar',
        color: '#FDE68A',
      },
      scoop_macconkey: {
        title: 'Scoop: MacConkey Selective Mix',
        sub: `Selective Gram+ inhibitor (${activeSlot.macconkeyUnits.toFixed(1)} u)`,
        sprite: 'macconkey_jar',
        color: '#FB7185',
      },
      glucose_vial: {
        title: '20% D-Glucose Solution (+1.5 mL)',
        sub: selectedExistingVessel
          ? 'Feeds selected Tray vessel'
          : `Slot ${activeSlotId}: ${activeSlot.glucoseG.toFixed(2)} g`,
        sprite: 'glucose_vial',
        color: '#34D399',
      },
      tryptone_bottle: {
        title: '5× Liquid Tryptone + YE (+2.0 mL)',
        sub: 'Adds soluble amino peptides',
        sprite: 'tryptone_bottle',
        color: '#FBBF24',
      },
    };

    if (reagentDefs[itemId]) {
      const def = reagentDefs[itemId];
      const toolKey = itemId as HeldToolId;
      const inHand = heldTool === toolKey;
      return (
        <div
          key={itemId}
          className={`w-full p-2 rounded border flex items-center gap-2 transition-colors ${
            inHand
              ? 'bg-cyan-950/50 border-cyan-400 text-slate-100'
              : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-600'
          }`}
        >
          <button
            type="button"
            onClick={() => setHeldTool((prev) => (prev === toolKey ? null : toolKey))}
            className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer"
          >
            <PixelToolSprite64
              id={def.sprite}
              size={44}
              liquidColor={def.color}
              active={inHand}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate">{def.title}</div>
              <div className="text-[10.5px] text-slate-400 truncate">{def.sub}</div>
            </div>
          </button>
          {renderPinButton(itemId)}
        </div>
      );
    }

    if (itemId.startsWith('ab_')) {
      const abId = itemId.replace('ab_', '');
      const ab = ANTIBIOTIC_COMPOUNDS.find((a) => a.id === abId);
      if (!ab) return null;
      const toolKey = itemId as HeldToolId;
      const inHand = heldTool === toolKey;
      const concUgMl = selectedExistingVessel
        ? selectedExistingVessel.antibioticsUgPerMl[ab.id] ?? 0
        : (activeSlot.antibioticsUg[ab.id] ?? 0) / Math.max(1, activeSlot.volumeMl);
      return (
        <div
          key={itemId}
          className={`p-2 rounded border flex items-center gap-2 ${
            inHand
              ? 'bg-amber-950/50 border-amber-400 text-slate-100'
              : concUgMl > 0.1
              ? 'bg-emerald-950/35 border-emerald-500/60 text-emerald-200'
              : 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-slate-600'
          }`}
        >
          <button
            type="button"
            onClick={() => setHeldTool((prev) => (prev === toolKey ? null : toolKey))}
            className="flex-1 min-w-0 text-left flex items-center gap-2 cursor-pointer"
          >
            <PixelToolSprite64 id={itemId as PixelSprite64Id} size={40} active={inHand || concUgMl > 0.1} />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{ab.name} Stock</div>
              <div className="text-[10px] font-mono tabular-nums text-slate-400 truncate">
                {concUgMl > 0.1 ? `${concUgMl.toFixed(1)} µg/mL` : '+0.5 mL'}
              </div>
            </div>
          </button>
          {renderPinButton(itemId)}
        </div>
      );
    }

    if (itemId === 'loop_nichrome') {
      return (
        <div key={itemId} className="space-y-1.5">
          <div className="p-2 rounded border bg-slate-900/70 border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setHeldTool((prev) => (prev === 'loop_nichrome' ? null : 'loop_nichrome'))}
              className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer"
            >
              <PixelToolSprite64
                id="loop_nichrome"
                size={44}
                loopState={loopState}
                active={heldTool === 'loop_nichrome'}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-100">Nichrome Inoculation Loop</div>
                <div className="text-[10.5px] text-slate-400 truncate">
                  {loopState === 'hot'
                    ? `Cooling ${loopCoolSec}s...`
                    : loopState === 'cool_sterile'
                    ? 'Sterile! Click Source Tube'
                    : loopState === 'loaded'
                    ? 'Loaded! Click Slot A/B/C'
                    : 'Flame on Heating Stand'}
                </div>
              </div>
            </button>
            {renderPinButton(itemId)}
          </div>
          <select
            value={sourceVesselId}
            onChange={(e) => setSourceVesselId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
          >
            <option value="">Select source strain...</option>
            {availableSources.map((src) => {
              const sp = src.populations[0]
                ? BACTERIAL_SPECIES.find((s) => s.id === src.populations[0].speciesId)
                : undefined;
              return (
                <option key={src.id} value={src.id}>
                  {src.label} ({sp?.commonLabel ?? 'Mixed'})
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      <HeldToolCursor
        highResSpriteId={heldTool ? HELD_TOOL_SPRITE_MAP[heldTool] : null}
        loopState={loopState}
        hasTip={heldTool === 'pipette_p1000' ? hasFreshTip : true}
        hasInoculum={heldTool === 'pipette_p1000' && Boolean(pipetteCargo?.speciesId)}
        pipetteFillFraction={
          heldTool === 'pipette_p1000' && pipetteCargo
            ? Math.max(0.28, Math.min(1, pipetteCargo.volumeMl / Math.max(0.1, pipetteVolMl)))
            : 0
        }
        fillFraction={
          heldTool === 'pour_slot_A'
            ? getCursorPourFill('A')
            : heldTool === 'pour_slot_B'
            ? getCursorPourFill('B')
            : heldTool === 'pour_slot_C'
            ? getCursorPourFill('C')
            : 0.65
        }
        liquidColor={
          heldTool === 'pipette_p1000'
            ? pipetteCargoColor
            : heldTool === 'scoop_tryptone'
            ? '#FBBF24'
            : heldTool === 'scoop_salts'
            ? '#F8FAFC'
            : heldTool === 'scoop_agar'
            ? '#FDE68A'
            : heldTool === 'scoop_macconkey'
            ? '#FB7185'
            : heldTool === 'pour_slot_A'
            ? getCursorPourColor('A')
            : heldTool === 'pour_slot_B'
            ? getCursorPourColor('B')
            : heldTool === 'pour_slot_C'
            ? getCursorPourColor('C')
            : '#38BDF8'
        }
        label={
          heldTool === 'pipette_p1000' && pipetteCargo
            ? `Holding ${pipetteCargo.volumeMl < 1 ? `${Math.round(pipetteCargo.volumeMl * 1000)}µL` : `${pipetteCargo.volumeMl}mL`} ${pipetteCargo.sourceLabel}`
            : heldTool
            ? HELD_TOOL_LABELS[heldTool]
            : undefined
        }
        working={Boolean(burnerStandOn && standSlotId)}
        onRelease={() => setHeldTool(null)}
      />

      <div className="w-full max-w-[1400px] h-[93vh] bg-[#0B0E17] border border-slate-700 rounded-lg overflow-hidden flex flex-col">
        {/* Clean Header Strip (NO Version Numbers; includes Temporary Bench Mode Switcher) */}
        <div className="px-4 py-2.5 bg-[#07090E] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PixelToolSprite64
              id="beaker_250"
              size={32}
              fillFraction={0.65}
              liquidColor={effectiveLiquidColor}
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                Media Formulation &amp; Wet-Lab Isometric Bench
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Multi-slot A/B/C bench, Heating Burner Stand, gradual Autoclave &amp; Ice Bath, titration calculator &amp; custom step workflow.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-400 hidden sm:inline">
              Tray: {beltVessels.length}/{beltCapacity}
            </span>
            {onSwitchSessionMode && (
              <div
                className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700"
                title="Temporary bench mode (exiting returns to your main HUD mode)"
              >
                <button
                  type="button"
                  onClick={() => onSwitchSessionMode('automate')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                    sessionMode === 'automate'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Automate
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchSessionMode('manual')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                    sessionMode === 'manual'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manual
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleResetBench}
              title="Reset Manual Bench progress and clear all 3 slots"
              className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/50 border border-slate-700 hover:border-rose-500/50 text-xs text-slate-300 hover:text-rose-200 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Bench
            </button>
            {heldTool && (
              <button
                type="button"
                onClick={() => setHeldTool(null)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 rounded whitespace-nowrap cursor-pointer"
              >
                Drop Tool (Esc)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Media Bench"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Split: Isometric Desk (Left) + Scrollable Tools & Calculator (Right) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* LEFT/CENTER: First-Person Isometric Wet-Lab Bench */}
          <div className="flex-1 min-w-0 flex flex-col bg-[#080B12] overflow-hidden">
            {/* Context Prompt Strip */}
            <div className="px-4 py-2 bg-[#0E1420] border-b border-slate-800/90 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular-nums text-cyan-300 shrink-0">
                  {heldTool ? 'IN HAND:' : selectedExistingVessel ? `TRAY (${activeSlotId}):` : `SLOT ${activeSlotId}:`}
                </span>
                <span className="text-slate-200 truncate">{benchAlert}</span>
              </div>
              {probeReadout && probeReadout.slotId === activeSlotId && (
                <span
                  className={`font-mono tabular-nums text-xs px-2 py-0.5 rounded border shrink-0 ${
                    probeReadout.unmixedWarning
                      ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                      : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  }`}
                >
                  PROBE pH {probeReadout.pH.toFixed(2)}
                  {probeReadout.unmixedWarning ? ' (Unmixed)' : ''}
                </span>
              )}
            </div>

            {/* Isometric SVG Stage */}
            <div className="relative flex-1 min-h-[370px] overflow-hidden select-none flex items-center justify-center p-2">
              <svg
                viewBox="0 0 960 540"
                className="w-full h-full max-w-[1000px] max-h-[550px]"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="wallGrad32" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0C1220" />
                    <stop offset="100%" stopColor="#131C2E" />
                  </linearGradient>
                  <linearGradient id="deskTopGrad32" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1A2438" />
                    <stop offset="55%" stopColor="#151E30" />
                    <stop offset="100%" stopColor="#101827" />
                  </linearGradient>
                  <radialGradient id="overheadLight32" cx="50%" cy="52%" r="50%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#090D16" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Backsplash Tile Wall */}
                <rect x="0" y="0" width="960" height="172" fill="url(#wallGrad32)" />
                {[44, 88, 132].map((y) => (
                  <line key={y} x1="0" y1={y} x2="960" y2={y} stroke="#1E293B" strokeWidth="1" />
                ))}
                {[120, 240, 360, 480, 600, 720, 840].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="172" stroke="#1E293B" strokeWidth="1" />
                ))}

                {/* Rear Reagent Ledge */}
                <polygon
                  points="55,126 905,126 935,168 25,168"
                  fill="#1E293B"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <rect x="25" y="168" width="910" height="10" fill="#0F172A" />

                {/* First-Person Trapezoidal Epoxy Benchtop */}
                <polygon
                  points="25,178 935,178 958,525 2,525"
                  fill="url(#deskTopGrad32)"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <rect x="2" y="525" width="956" height="15" fill="#0A0E17" />

                {[0.2, 0.35, 0.5, 0.65, 0.8].map((f) => (
                  <line
                    key={f}
                    x1={25 + f * 910}
                    y1="178"
                    x2={2 + f * 956}
                    y2="525"
                    stroke="#24324B"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                ))}
                <ellipse cx="480" cy="350" rx="390" ry="165" fill="url(#overheadLight32)" />

                {/* === REAR SHELF INSTRUMENTS === */}
                {/* Autoclave Chamber (Rear Left) — Gradual 121°C Thermal Sterilization */}
                <g transform="translate(52, 26)" onClick={handleClickAutoclave} className="cursor-pointer">
                  <PixelToolSprite64
                    id="autoclave_unit"
                    size={98}
                    active={Boolean(autoclaveSlotId)}
                  />
                  {particles
                    .filter((p) => p.slotId === 'autoclave')
                    .map((pt, idx) => (
                      <rect
                        key={pt.id}
                        x={44 + idx * 5}
                        y={16}
                        width="5"
                        height="7"
                        fill={pt.color}
                        style={{ animation: 'lab-suction-rise 450ms ease-out forwards' }}
                      />
                    ))}
                  <rect
                    x="-6"
                    y="98"
                    width="112"
                    height="24"
                    rx="3"
                    fill="#0B111E"
                    stroke={autoclaveSlotId ? '#10B981' : '#334155'}
                  />
                  <text
                    x="50"
                    y="112"
                    textAnchor="middle"
                    fill={autoclaveSlotId ? '#6EE7B7' : '#FBBF24'}
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {autoclaveSlotId
                      ? `AUTO SLOT ${autoclaveSlotId}: ${slots[autoclaveSlotId].tempC.toFixed(0)}° (${autoclaveProgress}%)`
                      : `AUTOCLAVE (Load ${activeSlotId})`}
                  </text>
                </g>

                {/* INFINITE ddH2O Water Jar (Rear Center-Left) */}
                <g transform="translate(216, 26)" onClick={handleClickWaterJar} className="cursor-pointer">
                  <PixelToolSprite64 id="water_jar" size={96} fillFraction={0.9} />
                  {particles
                    .filter((p) => p.slotId === 'water_jar')
                    .map((pt, idx) => (
                      <rect
                        key={pt.id}
                        x={40 + idx * 4}
                        y={28}
                        width="5"
                        height="7"
                        fill={pt.color}
                        style={{ animation: 'lab-suction-rise 450ms ease-out forwards' }}
                      />
                    ))}
                  <rect
                    x="-6"
                    y="98"
                    width="108"
                    height="24"
                    rx="3"
                    fill="#0B111E"
                    stroke={waterJarContaminated ? '#FB7185' : '#0284C7'}
                  />
                  <text
                    x="48"
                    y="113"
                    textAnchor="middle"
                    fill={waterJarContaminated ? '#FDA4AF' : '#7DD3FC'}
                    fontSize="9.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {waterJarContaminated ? 'DIRTY (Rinse)' : 'ddH₂O (∞ mL)'}
                  </text>
                </g>

                {/* Rear Digital Bench Meter (NO Live pH Display — Digital pH Probe Only) */}
                <g transform="translate(380, 32)">
                  <rect x="0" y="0" width="204" height="88" rx="4" fill="#0B111E" stroke="#334155" strokeWidth="2" />
                  <rect x="8" y="8" width="188" height="72" rx="2" fill="#060A12" stroke="#1E293B" />
                  <text x="16" y="25" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono, monospace">
                    SLOT {activeSlotId} · {effectiveTempC.toFixed(1)}°C
                  </text>
                  <text x="16" y="48" fill="#38BDF8" fontSize="16" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    {effectiveVolumeMl.toFixed(1)} mL
                  </text>
                  <text x="115" y="48" fill="#34D399" fontSize="12" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    {selectedExistingVessel
                      ? `NUTR ${Math.round(selectedExistingVessel.nutrientRemaining * 100)}%`
                      : `MIX ${Math.round(activeSlot.stirProgress * 100)}%`}
                  </text>
                  <text x="16" y="68" fill={selectedExistingVessel ? '#6EE7B7' : '#FBBF24'} fontSize="10" fontFamily="JetBrains Mono, monospace">
                    {selectedExistingVessel
                      ? `TRAY: ${selectedExistingVessel.label.slice(0, 18)}`
                      : activeSlot.sterilityLevel === 'autoclaved'
                      ? 'STERILE: AUTOCLAVED'
                      : activeSlot.sterilityLevel === 'pasteurized'
                      ? 'STERILE: PASTEURIZED'
                      : 'UNSTERILE (RAW)'}
                  </text>
                </g>

                {/* Biohazard Tip Bin (Rear Center-Right) */}
                <g transform="translate(636, 30)" onClick={handleClickBiohazardBin} className="cursor-pointer">
                  <PixelToolSprite64 id="biohazard_bin" size={90} active={hasFreshTip} />
                  <rect x="-8" y="94" width="106" height="24" rx="3" fill="#0B111E" stroke="#334155" />
                  <text x="45" y="109" textAnchor="middle" fill="#FDA4AF" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    EJECT TIP BIN
                  </text>
                </g>

                {/* === HEATING BURNER STAND (Rear/Right — Replaces separate Bunsen & Torch) === */}
                <g transform="translate(788, 30)">
                  <g onClick={handleClickHeatingStand} className="cursor-pointer">
                    <PixelToolSprite64 id="heating_stand" size={104} active={burnerStandOn} />
                    {/* Placed Vessel Resting On Top Of Wire Gauze Stand */}
                    {standSlotId && (() => {
                      const stProps = renderSlotVisualProps(standSlotId);
                      return (
                        <g transform="translate(22, -24)">
                          <PixelToolSprite64
                            id={stProps.spriteId}
                            size={60}
                            fillFraction={stProps.fillFrac}
                            liquidColor={stProps.liqColor}
                            hasInoculum={stProps.hasInoc}
                          />
                        </g>
                      );
                    })()}
                    {particles
                      .filter((p) => p.slotId === 'heating_stand')
                      .map((pt, idx) => (
                        <rect
                          key={pt.id}
                          x={44 + idx * 5}
                          y={-6}
                          width="5"
                          height="7"
                          fill={pt.color}
                          style={{ animation: 'lab-suction-rise 440ms ease-out forwards' }}
                        />
                      ))}
                  </g>
                  {/* Stand Status + Direct Flame Switch */}
                  <g
                    transform="translate(-4, 102)"
                    onClick={() => {
                      setBurnerStandOn((b) => !b);
                      labAudio.playUiClick();
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x="0"
                      y="0"
                      width="112"
                      height="24"
                      rx="3"
                      fill={burnerStandOn ? '#7C2D12' : '#0B111E'}
                      stroke={burnerStandOn ? '#F97316' : '#475569'}
                    />
                    <text
                      x="56"
                      y="15"
                      textAnchor="middle"
                      fill={burnerStandOn ? '#FDE047' : '#94A3B8'}
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {burnerStandOn
                        ? standSlotId
                          ? `HEATING ${standSlotId}: ON`
                          : 'FLAME: ON (Sterile)'
                        : standSlotId
                        ? `STAND (${standSlotId}) OFF`
                        : 'FLAME: OFF (Stand)'}
                    </text>
                  </g>
                </g>

                {/* === LEFT WING: ASEPTIC & VORTEX HARDWARE === */}
                <g transform="translate(46, 186)" onClick={handleClickTipBox} className="cursor-pointer">
                  <PixelToolSprite64 id="tip_box" size={82} active={hasFreshTip} />
                  <rect x="-4" y="80" width="90" height="18" rx="3" fill="#0B111E" stroke={hasFreshTip ? '#38BDF8' : '#334155'} />
                  <text x="41" y="92" textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    TIPS ({tipCount})
                  </text>
                </g>

                <g transform="translate(44, 294)" onClick={handleClickSourceTube} className="cursor-pointer">
                  <PixelToolSprite64
                    id="bacterial_stock"
                    size={84}
                    active={Boolean(sourceVesselId && resuspendedIds.includes(sourceVesselId))}
                  />
                  <rect x="-10" y="84" width="106" height="28" rx="3" fill="#0B111E" stroke={sourceVesselId ? '#10B981' : '#334155'} />
                  <text x="43" y="96" textAnchor="middle" fill="#E2E8F0" fontSize="9.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                    {selectedSourceSpecies?.commonLabel ?? 'No Source'}
                  </text>
                  <text
                    x="43"
                    y="107"
                    textAnchor="middle"
                    fill={sourceVesselId && resuspendedIds.includes(sourceVesselId) ? '#34D399' : '#FBBF24'}
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {sourceVesselId && resuspendedIds.includes(sourceVesselId) ? 'Resuspended' : 'Settled (Vortex!)'}
                  </text>
                </g>

                <g
                  transform={vortexPulsing ? 'translate(48, 412)' : 'translate(46, 415)'}
                  onClick={handleClickVortexMixer}
                  className="cursor-pointer"
                >
                  <PixelToolSprite64 id="vortex_mixer" size={84} active={vortexPulsing} />
                  <rect x="-4" y="82" width="92" height="18" rx="3" fill="#0B111E" stroke="#334155" />
                  <text x="42" y="94" textAnchor="middle" fill="#22D3EE" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                    {vortexPulsing ? 'VORTEXING' : 'VORTEX MIXER'}
                  </text>
                </g>

                {/* === CENTER: 3 MULTI-PURPOSE BENCH SLOTS (A, B, C) === */}
                {renderDeskSlot('A', 222, 232)}
                {renderDeskSlot('B', 420, 224)}
                {renderDeskSlot('C', 618, 232)}

                {/* Direct Magnetic Stir Toggle */}
                <g
                  transform="translate(425, 420)"
                  onClick={() => {
                    setStirrerOn((s) => !s);
                    labAudio.playUiClick();
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x="0"
                    y="0"
                    width="110"
                    height="24"
                    rx="3"
                    fill={stirrerOn ? '#065F46' : '#0F172A'}
                    stroke={stirrerOn ? '#34D399' : '#475569'}
                  />
                  <text
                    x="55"
                    y="15"
                    textAnchor="middle"
                    fill={stirrerOn ? '#A7F3D0' : '#CBD5E1'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {stirrerOn ? 'STIR BAR: ON' : 'TOGGLE STIR'}
                  </text>
                </g>

                {/* === RIGHT WING: ICE BUCKET COLD BATH (GRADUAL THERMAL CHILLER) === */}
                <g transform="translate(796, 305)" onClick={handleClickIceBucket} className="cursor-pointer">
                  <PixelToolSprite64 id="ice_bucket" size={126} active={Boolean(iceBucketSlotId)} />
                  {iceBucketSlotId && (() => {
                    const iceProps = renderSlotVisualProps(iceBucketSlotId);
                    return (
                      <g transform="translate(34, -8)">
                        <PixelToolSprite64
                          id={iceProps.spriteId}
                          size={58}
                          fillFraction={iceProps.fillFrac}
                          liquidColor={iceProps.liqColor}
                        />
                      </g>
                    );
                  })()}
                  {particles
                    .filter((p) => p.slotId === 'ice_bucket')
                    .map((pt, idx) => (
                      <rect
                        key={pt.id}
                        x={52 + idx * 5}
                        y={22}
                        width="6"
                        height="8"
                        fill={pt.color}
                        style={{ animation: 'lab-suction-rise 420ms ease-out forwards' }}
                      />
                    ))}
                  <rect
                    x="-2"
                    y="122"
                    width="130"
                    height="30"
                    rx="3"
                    fill="#0B111E"
                    stroke={iceBucketSlotId ? '#38BDF8' : '#334155'}
                  />
                  <text x="63" y="135" textAnchor="middle" fill="#BAE6FD" fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                    {iceBucketSlotId ? `CHILLING SLOT ${iceBucketSlotId}` : 'ICE BUCKET BATH'}
                  </text>
                  <text x="63" y="146" textAnchor="middle" fill="#7DD3FC" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    {iceBucketSlotId
                      ? `${renderSlotVisualProps(iceBucketSlotId).tempC.toFixed(1)} °C → 2.5°C`
                      : `Click to Place Slot ${activeSlotId}`}
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom Telemetry Bar + Dilution + Action Buttons */}
            <div className="px-4 py-2.5 bg-[#0E1420] border-t border-slate-800 space-y-2 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-300">
                  <span>
                    Slot <strong className="text-cyan-300">{activeSlotId}</strong>:{' '}
                    <strong className="text-white">{effectiveVolumeMl.toFixed(1)}</strong>/
                    {effectiveMaxVolMl} mL
                  </span>
                  <span>
                    Temp:{' '}
                    <strong className={effectiveTempC > 55 ? 'text-rose-300' : effectiveTempC <= 12 ? 'text-sky-300' : 'text-amber-300'}>
                      {effectiveTempC.toFixed(1)} °C
                    </strong>
                  </span>
                  {selectedExistingVessel ? (
                    <>
                      <span>
                        Vessel: <strong className="text-emerald-300">{selectedExistingVessel.label}</strong>
                      </span>
                      <span>
                        Nutrients: <strong className="text-cyan-300">{Math.round(selectedExistingVessel.nutrientRemaining * 100)}%</strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        Closest Formula:{' '}
                        <strong className="text-emerald-300">
                          {activeFormulaEval.closestName} ({Math.round(activeFormulaEval.topScore * 100)}%)
                        </strong>
                      </span>
                      <span>
                        Dissolved:{' '}
                        <strong className="text-cyan-300">{Math.round(activeSlot.stirProgress * 100)}%</strong>
                      </span>
                    </>
                  )}
                </div>

                {selectedExistingVessel ? (
                  <span className="text-emerald-300 text-[11px]">
                    Mounted Tray Vessel · Live Edits
                  </span>
                ) : (
                  <span
                    className={
                      activeSlot.sterilityLevel === 'autoclaved'
                        ? 'text-emerald-300 text-[11px]'
                        : activeSlot.sterilityLevel === 'pasteurized'
                        ? 'text-cyan-300 text-[11px]'
                        : 'text-amber-300 text-[11px]'
                    }
                  >
                    {activeSlot.sterilityLevel === 'autoclaved'
                      ? 'Autoclaved (0% risk)'
                      : activeSlot.sterilityLevel === 'pasteurized'
                      ? 'Boil-Pasteurized (8% risk)'
                      : 'Raw Unsterile (+30% risk)'}
                  </span>
                )}
              </div>

              {/* Full Serial Dilution Bar when active slot is Agar Plate */}
              {effectiveContainerKind === 'plate' && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-900/80 border border-amber-500/30 rounded text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-200">Serial Dilution (Plate):</span>
                    <div className="flex flex-wrap gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map((exp) => (
                        <button
                          key={exp}
                          type="button"
                          onClick={() => setDilutionExponent(exp)}
                          className={`px-2 py-0.5 text-[10.5px] font-mono tabular-nums rounded border cursor-pointer ${
                            dilutionExponent === exp
                              ? 'bg-amber-500/25 border-amber-400 text-amber-100 font-bold'
                              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {exp === 0 ? '10⁰' : `10⁻${exp}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {predictedPlateCfu !== null && (
                    <span
                      className={`font-mono tabular-nums text-[10.5px] ${
                        predictedPlateCfu >= 30 && predictedPlateCfu <= 250
                          ? 'text-emerald-300'
                          : predictedPlateCfu > 250
                          ? 'text-amber-300'
                          : 'text-slate-400'
                      }`}
                    >
                      Est: ~{predictedPlateCfu.toLocaleString()} CFU
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {!selectedExistingVessel && (
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder={`Label for Slot ${activeSlotId} vessel (optional)`}
                    maxLength={32}
                    className="flex-1 min-w-[140px] bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                )}
                <button
                  type="button"
                  onClick={() => placeSlotOnHeatingStand(standSlotId ?? activeSlotId)}
                  className={`px-2.5 py-1.5 text-xs rounded border flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    standSlotId === activeSlotId
                      ? 'bg-orange-950/60 border-orange-500/60 text-orange-200'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  {standSlotId === activeSlotId ? 'Off Stand' : `Put ${activeSlotId} on Stand`}
                </button>
                <button
                  type="button"
                  onClick={() => placeSlotInIceBucket(iceBucketSlotId ?? activeSlotId)}
                  className={`px-2.5 py-1.5 text-xs rounded border flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                    iceBucketSlotId === activeSlotId
                      ? 'bg-sky-900/60 border-sky-400 text-sky-100'
                      : 'bg-sky-950/50 hover:bg-sky-900/60 border-sky-500/40 text-sky-200'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  {iceBucketSlotId === activeSlotId ? 'Out of Ice' : 'Ice Bath'}
                </button>
                <button
                  type="button"
                  disabled={effectiveVolumeMl <= 0}
                  onClick={() => {
                    const toolId = `pour_slot_${activeSlotId}` as HeldToolId;
                    setHeldTool((prev) => (prev === toolId ? null : toolId));
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    heldTool === `pour_slot_${activeSlotId}`
                      ? 'bg-cyan-600 border-cyan-400 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 disabled:opacity-40'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Hold Slot {activeSlotId}
                </button>
                <button
                  type="button"
                  disabled={effectiveVolumeMl <= 0.5}
                  onClick={() => handleDrainActiveSlot(10)}
                  title="Discard 10 mL excess liquid from active slot"
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 rounded cursor-pointer whitespace-nowrap"
                >
                  -10 mL
                </button>
                {selectedExistingVessel ? (
                  <button
                    type="button"
                    onClick={() => {
                      recallSlotToPad(activeSlotId);
                      updateSlot(activeSlotId, (s) => ({ ...s, existingVesselId: null }));
                      setBenchAlert(`Detached ${selectedExistingVessel.label} from Slot ${activeSlotId} back to Tray.`);
                    }}
                    className="ml-auto px-3.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/50 text-emerald-200 text-xs font-semibold rounded flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Detach to Tray
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        recallSlotToPad(activeSlotId);
                        updateSlot(activeSlotId, (s) => createEmptySlot(s.slotId, s.containerKind));
                        setBenchAlert(`Cleared Slot ${activeSlotId}.`);
                      }}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={beltVessels.length >= beltCapacity || activeSlot.volumeMl <= 0}
                      onClick={handleDispenseActiveSlot}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {beltVessels.length >= beltCapacity
                        ? `Tray Full (${beltCapacity}/${beltCapacity})`
                        : `Dispense ${activeSlotId}`}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Scrollable Tools, Custom Steps & pH Titration Calculator */}
          <aside className="w-full lg:w-[404px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0B0E17] flex flex-col min-h-0 shrink-0">
            {/* Drawer Header & Tabs */}
            <div className="p-3 border-b border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">
                  Bench Tools &amp; Workflow
                </span>
                <span className="text-[11px] font-mono tabular-nums text-cyan-300">
                  Slot {activeSlotId} Selected
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1 p-0.5 bg-slate-900 rounded border border-slate-800">
                {(
                  [
                    { id: 'my_step', label: 'Steps' },
                    { id: 'all', label: 'All' },
                    { id: 'slots', label: 'Slots' },
                    { id: 'media', label: 'Media' },
                    { id: 'ph_conc', label: 'pH/Calc' },
                    { id: 'torch_rx', label: 'Heat' },
                    { id: 'strains', label: 'Cells' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setToolCategory(cat.id)}
                    className={`py-1 text-[10px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                      toolCategory === cat.id
                        ? cat.id === 'my_step'
                          ? 'bg-amber-600 text-white'
                          : 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Tool Cards */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
              {/* CUSTOMIZABLE MY STEPS WORKFLOW TAB */}
              {toolCategory === 'my_step' && (
                <section className="space-y-3">
                  <div className="p-2.5 bg-amber-950/20 border border-amber-500/35 rounded space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                        <ListChecks className="w-3.5 h-3.5" />
                        <span>My Custom Bench Steps</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingStepTools((e) => !e)}
                        className={`px-2 py-0.5 text-[10.5px] rounded border flex items-center gap-1 cursor-pointer ${
                          editingStepTools
                            ? 'bg-amber-600 border-amber-400 text-white'
                            : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        {editingStepTools ? 'Done Editing' : 'Pick Tools'}
                      </button>
                    </div>

                    {/* Step Switcher */}
                    <div className="flex flex-wrap gap-1">
                      {customSteps.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setActiveCustomStepId(st.id)}
                          className={`px-2 py-1 text-[10.5px] rounded border cursor-pointer transition-colors ${
                            activeCustomStep?.id === st.id
                              ? 'bg-amber-600/30 border-amber-400 text-amber-100 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st.name} ({st.items.length})
                        </button>
                      ))}
                    </div>

                    {/* Add New Step or Rename/Delete Current */}
                    <div className="flex gap-1.5 pt-1 border-t border-slate-800/80">
                      <input
                        type="text"
                        value={newStepName}
                        onChange={(e) => setNewStepName(e.target.value)}
                        placeholder="New step name (e.g. Boil & Acid)"
                        maxLength={28}
                        className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const label = newStepName.trim() || `Step ${customSteps.length + 1}`;
                          const newId = `step_${Date.now()}`;
                          setCustomSteps((prev) => [
                            ...prev,
                            { id: newId, name: label, items: ['ph_calculator', 'pipette_p1000'] },
                          ]);
                          setActiveCustomStepId(newId);
                          setNewStepName('');
                          setEditingStepTools(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-medium rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3" /> Add Step
                      </button>
                      {customSteps.length > 1 && activeCustomStep && (
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = customSteps.filter((s) => s.id !== activeCustomStep.id);
                            setCustomSteps(remaining);
                            setActiveCustomStepId(remaining[0].id);
                          }}
                          title="Delete current step"
                          className="p-1 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-200 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Tool Picker Checklist for Active Step */}
                    {editingStepTools && activeCustomStep && (
                      <div className="p-2 bg-[#070B12] border border-slate-800 rounded space-y-1.5 max-h-52 overflow-y-auto">
                        <div className="text-[10px] text-slate-400">
                          Check items to show in &ldquo;{activeCustomStep.name}&rdquo;:
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {CUSTOM_STEP_ITEM_CATALOG.map((catItem) => {
                            const checked = activeCustomStep.items.includes(catItem.id);
                            return (
                              <button
                                key={catItem.id}
                                type="button"
                                onClick={() => togglePinInActiveStep(catItem.id)}
                                className={`px-2 py-1 text-[10px] rounded border text-left truncate cursor-pointer ${
                                  checked
                                    ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-medium'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {checked ? '✓ ' : '+ '}
                                {catItem.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Render ONLY tools selected for the active custom step */}
                  {activeCustomStep && activeCustomStep.items.length > 0 ? (
                    <div className="space-y-2">
                      {activeCustomStep.items.map((itemId) => renderToolCardById(itemId))}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-slate-800 rounded text-xs text-slate-400 text-center">
                      No tools pinned to this step yet. Click &ldquo;Pick Tools&rdquo; above or click &ldquo;+Step&rdquo; on any tool card.
                    </div>
                  )}
                </section>
              )}

              {/* LIVE FORMULA SIMILARITY SCORER (visible in standard tabs) */}
              {toolCategory !== 'my_step' && (
                selectedExistingVessel ? (
                  <div className="p-2.5 bg-emerald-950/25 border border-emerald-500/45 rounded space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-200 truncate">
                        Tray Vessel: {selectedExistingVessel.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          recallSlotToPad(activeSlotId);
                          updateSlot(activeSlotId, (s) => ({ ...s, existingVesselId: null }));
                        }}
                        className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer shrink-0"
                      >
                        Unload
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 font-mono tabular-nums text-[10.5px] text-slate-300">
                      <span>Media: {activeExistingMedia?.shortName ?? selectedExistingVessel.mediaId}</span>
                      <span>Temp: {selectedExistingVessel.temperatureC.toFixed(1)} °C</span>
                      <span>Nutr: {Math.round(selectedExistingVessel.nutrientRemaining * 100)}%</span>
                      <span>Buf Cap: {Math.round(selectedExistingVessel.bufferCapacity * 100)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-900/75 border border-slate-800 rounded space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-200">
                        Slot {activeSlotId} Formula Similarity Match
                      </span>
                      <span className="font-mono tabular-nums text-emerald-300">
                        Yield {Math.round(activeFormulaEval.blendedNutrientYield * 100)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      {activeFormulaEval.scores.slice(0, 4).map((fm) => (
                        <div key={fm.mediaId} className="space-y-0.5">
                          <div className="flex justify-between text-[10px] font-mono tabular-nums">
                            <span className="text-slate-300">{fm.shortName}</span>
                            <span className="text-cyan-300">
                              {fm.score.toFixed(2)} ({Math.round(fm.score * 100)}%) · eff {fm.capacityEffect.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-950 rounded overflow-hidden">
                            <div
                              className="h-full bg-cyan-500 transition-all duration-200"
                              style={{ width: `${Math.round(fm.score * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeFormulaEval.osmolarityWarning && (
                      <div className="text-[10px] text-rose-300 flex items-center gap-1 pt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{activeFormulaEval.osmolarityWarning}</span>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* P1000 Pipette Card in standard tabs */}
              {toolCategory !== 'my_step' && renderPipetteCard()}

              {/* 01. BENCH SLOTS A/B/C CONTAINERS & EXISTING TRAY VESSELS */}
              {(toolCategory === 'all' || toolCategory === 'slots') && (
                <section className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300">
                      01. Bench Slots (A, B, C) &amp; Vessels
                    </span>
                    <div className="flex gap-1">
                      {(['A', 'B', 'C'] as BenchSlotId[]).map((sid) => (
                        <button
                          key={sid}
                          type="button"
                          onClick={() => setActiveSlotId(sid)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
                            activeSlotId === sid
                              ? 'bg-cyan-600 border-cyan-400 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-400'
                          }`}
                        >
                          {sid}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'beaker' as DeskContainerKind, name: '250mL Beaker', sprite: 'beaker_250' as const },
                        { id: 'flask' as DeskContainerKind, name: '250mL Flask', sprite: 'flask_250' as const },
                        { id: 'tube' as DeskContainerKind, name: '15mL Tube', sprite: 'tube_15' as const },
                        { id: 'plate' as DeskContainerKind, name: 'Agar Plate', sprite: 'agar_plate' as const },
                      ] as const
                    ).map((c) => {
                      const active = activeSlot.containerKind === c.id && !activeSlot.existingVesselId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            updateSlot(activeSlotId, (s) => ({
                              ...s,
                              containerKind: c.id,
                              existingVesselId: null,
                            }))
                          }
                          className={`p-1.5 rounded border text-left flex items-center gap-2 cursor-pointer ${
                            active
                              ? 'bg-cyan-950/45 border-cyan-500 text-slate-100'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <PixelToolSprite64 id={c.sprite} size={36} fillFraction={0.55} />
                          <span className="text-[11px] font-medium truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded">
                    <span className="text-[10.5px] text-slate-400">Pour step:</span>
                    <div className="flex gap-1">
                      {([5, 10, 25, 50, 'all'] as const).map((amt) => (
                        <button
                          key={String(amt)}
                          type="button"
                          onClick={() => setPourAmountMl(amt)}
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded border cursor-pointer ${
                            pourAmountMl === amt
                              ? 'bg-cyan-600 border-cyan-400 text-white'
                              : 'bg-slate-950 border-slate-700 text-slate-400'
                          }`}
                        >
                          {amt === 'all' ? 'All' : `${amt}mL`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {existingWorkbenchVessels.length > 0 && (
                    <div className="space-y-1">
                      <label className="block text-[10.5px] text-slate-400">
                        Mount Existing Solution / Culture onto Slot {activeSlotId}:
                      </label>
                      <select
                        value={activeSlot.existingVesselId ?? ''}
                        onChange={(e) => {
                          const vid = e.target.value || null;
                          const chosen = vid
                            ? existingWorkbenchVessels.find((v) => v.id === vid) ?? null
                            : null;
                          updateSlot(activeSlotId, (s) => ({
                            ...s,
                            existingVesselId: vid,
                            containerKind: chosen
                              ? mapVesselTypeToContainerKind(chosen.vesselType)
                              : s.containerKind,
                          }));
                          if (chosen) {
                            setBenchAlert(
                              `Placed "${chosen.label}" (${chosen.volumeMl.toFixed(1)} mL) onto Slot ${activeSlotId}!`
                            );
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                      >
                        <option value="">-- New Formulation on Slot {activeSlotId} --</option>
                        {existingWorkbenchVessels.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            Tray Vessel: {ev.label} ({ev.volumeMl.toFixed(1)} mL)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </section>
              )}

              {/* 02. MEDIA INGREDIENTS */}
              {(toolCategory === 'all' || toolCategory === 'media') && (
                <section className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-300">
                    02. Raw Media &amp; Nutrition Tools
                  </div>
                  {['scoop_tryptone', 'scoop_salts', 'scoop_agar', 'scoop_macconkey', 'glucose_vial', 'tryptone_bottle'].map(
                    (id) => renderToolCardById(id)
                  )}
                </section>
              )}

              {/* 03. pH PROBE, CALCULATOR & CONCENTRATES */}
              {(toolCategory === 'all' || toolCategory === 'ph_conc') && (
                <section className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-300">
                    03. pH Titration Calculator, Probe &amp; Concentrates
                  </div>
                  {renderPhCalculatorCard()}
                  {['ph_meter', 'hcl_conc', 'naoh_conc', 'pbs_conc'].map((id) =>
                    renderToolCardById(id)
                  )}
                </section>
              )}

              {/* 04. HEATING STAND, AUTOCLAVE, ICE BATH & ANTIBIOTICS */}
              {(toolCategory === 'all' || toolCategory === 'torch_rx') && (
                <section className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      04. Heating Stand, Autoclave, Ice Bath &amp; Antibiotics
                    </span>
                    {!selectedExistingVessel && Object.keys(activeSlot.antibioticsUg).length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSlot(activeSlotId, (s) => ({
                            ...s,
                            antibioticsUg: {},
                            heatDegradedAbIds: [],
                          }))
                        }
                        className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Clear Rx
                      </button>
                    )}
                  </div>

                  {renderToolCardById('heating_stand')}
                  {renderToolCardById('autoclave_chamber')}
                  {renderToolCardById('ice_bucket')}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {['ab_ampicillin', 'ab_kanamycin', 'ab_chloramphenicol', 'ab_ciprofloxacin'].map(
                      (id) => renderToolCardById(id)
                    )}
                  </div>
                </section>
              )}

              {/* 05. BACTERIAL INOCULATION & LOOP */}
              {(toolCategory === 'all' || toolCategory === 'strains') && (
                <section className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-300">
                    05. Bacterial Strains, Serial Dilution &amp; Loop
                  </div>
                  {renderToolCardById('loop_nichrome')}

                  {effectiveContainerKind === 'plate' && (
                    <div className="p-2 bg-slate-900/70 border border-slate-800 rounded space-y-1.5">
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-300 font-medium">Plate Serial Dilution</span>
                        <span className="font-mono tabular-nums text-amber-300">
                          {dilutionExponent === 0 ? '10⁰ (Direct)' : `10⁻${dilutionExponent}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((exp) => (
                          <button
                            key={exp}
                            type="button"
                            onClick={() => setDilutionExponent(exp)}
                            className={`py-1 text-[10px] font-mono rounded border cursor-pointer ${
                              dilutionExponent === exp
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {exp === 0 ? '10⁰' : `10⁻${exp}`}
                          </button>
                        ))}
                      </div>
                      {predictedPlateCfu !== null && (
                        <div className="text-[10px] font-mono tabular-nums text-slate-400">
                          Predicted Plate Colonies:{' '}
                          <span className={predictedPlateCfu >= 30 && predictedPlateCfu <= 250 ? 'text-emerald-300' : 'text-amber-300'}>
                            {predictedPlateCfu.toLocaleString()} CFU
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Trackpad Apply Helper for Held Tool */}
              {heldTool && (
                <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/40 rounded space-y-2">
                  <div className="text-[11px] text-cyan-200 font-medium">
                    Holding: {HELD_TOOL_LABELS[heldTool]}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSlotPointerDown(activeSlotId)}
                      className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      Apply to Slot {activeSlotId}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeldTool(null)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded cursor-pointer"
                    >
                      Drop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
