import { BACTERIAL_SPECIES, getMediaById } from '../data/scientificDatabase';
import { compactVesselHistory, computeOd600 } from './simulation';
import { CultureVessel, SimulationSaveState } from '../types/lab';

const STORAGE_KEY = 'bioforge_lab_state_v1';
export const CURRENT_SCHEMA_VERSION = 4;

function buildStarterStocks(): CultureVessel[] {
  return BACTERIAL_SPECIES.map((sp, idx) => ({
    id: `stock_${sp.id}`,
    label: `${sp.commonLabel} Glycerol Stock`,
    vesselType: 'glycerol_stock',
    mediaId: 'lb_broth',
    volumeMl: 1.0,
    nutrientRemaining: 1.0,
    antibioticsUgPerMl: {},
    temperatureC: -80,
    pH: 7.0,
    initialPh: 7.0,
    bufferCapacity: 0.5,
    dissolvedO2Percent: 0,
    populations: [
      {
        speciesId: sp.id,
        viableCount: 2.0e8,
        deadCount: 0,
        phase: 'dormant',
        lagProgress: 0,
        stressLevel: 0,
      },
    ],
    od600: 0,
    colonyCount: 0,
    colonyDiameterMm: 0,
    createdAtSimMin: 0,
    lastLoggedSimMin: 0,
    history: [],
    location: { zone: 'equipment', stationId: 'cold_storage', slotIndex: idx },
    notes: `Master glycerol stock (-80 °C) · ${sp.scientificName} ${sp.strainCode}`,
  }));
}

export function createInitialSaveState(): SimulationSaveState {
  const starterStocks = buildStarterStocks();

  const starterFlask: CultureVessel = {
    id: 'vessel_1',
    label: 'EC-LB-01 (Baseline)',
    vesselType: 'flask_250ml',
    mediaId: 'lb_broth',
    volumeMl: 50,
    nutrientRemaining: 0.995,
    antibioticsUgPerMl: {},
    temperatureC: 37.0,
    pH: 7.0,
    initialPh: 7.0,
    bufferCapacity: 0.42,
    dissolvedO2Percent: 86,
    populations: [
      {
        speciesId: 'ecoli_k12',
        viableCount: 2.5e7,
        deadCount: 0,
        phase: 'lag',
        lagProgress: 0.65,
        stressLevel: 0,
      },
    ],
    od600: 0,
    colonyCount: 0,
    colonyDiameterMm: 0,
    createdAtSimMin: 0,
    lastLoggedSimMin: 0,
    history: [
      {
        simMinutes: 0,
        od600: 0.0313,
        viableCount: 2.5e7,
        tempC: 37.0,
        nutrientRemaining: 0.995,
        pH: 7.0,
        dissolvedO2Percent: 86,
      },
    ],
    location: { zone: 'equipment', stationId: 'shaking_incubator', slotIndex: 0 },
    notes: 'Baseline E. coli K-12 culture in LB Broth at 37 °C, pH 7.0, 220 RPM.',
  };
  starterFlask.od600 = computeOd600(starterFlask);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    simMinutes: 0,
    speed: 10,
    labMode: 'automate',
    muted: false,
    vessels: [...starterStocks, starterFlask],
    shakingIncubator: {
      targetTempC: 37.0,
      rpm: 220,
      powerOn: true,
    },
    staticIncubator: {
      targetTempC: 37.0,
      powerOn: true,
    },
    notebookEntries: [
      {
        id: 'nb_1',
        title: 'Exp 01: E. coli K-12 Growth Kinetics & Molecular Workflow',
        hypothesis:
          'At 37 °C, pH 7.0, and 220 RPM aeration in LB Miller broth, E. coli K-12 will double roughly every 20 minutes until nutrient depletion and pH shift drive stationary phase near OD600 ≈ 2.2–2.8.',
        protocolNotes:
          '1. Inoculated 50 mL LB Broth (pH 7.0) with E. coli K-12 baseline culture.\n2. Placed flask in Shaking Incubator (37.0 °C, 220 RPM).\n3. Inspect Inventory, measure OD600, check 1000x Gram Stain, then extract DNA for PCR and Gel Electrophoresis.',
        observations:
          'Culture EC-LB-01 initiated in shaking incubator. Follow the Goal Tracker in the top-right corner to master every instrument step by step.',
        linkedVesselIds: ['vessel_1'],
        snapshots: [],
        gelSnapshots: [],
        timelinePhase: 'six_hours',
        createdAtSimMin: 0,
        updatedAtSimMin: 0,
      },
    ],
    activeNotebookEntryId: 'nb_1',
    player: {
      x: 9 * 64 + 32,
      y: 4 * 64 + 32,
      facing: 'down',
    },
    nextVesselCounter: 2,
    completedQuestIds: [],
    activeGoalId: 'goal_1_basics',
    goalHudCollapsed: false,
    goalHudHidden: false,
    achievedEvents: [],
  };
}

export function loadSavedState(): SimulationSaveState {
  if (typeof window === 'undefined') return createInitialSaveState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSaveState();
    const parsed = JSON.parse(raw) as Partial<SimulationSaveState>;
    if (!parsed || typeof parsed.schemaVersion !== 'number' || !Array.isArray(parsed.vessels)) {
      return createInitialSaveState();
    }
    return migrateState(parsed);
  } catch {
    return createInitialSaveState();
  }
}

export function saveStateToLocal(state: SimulationSaveState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function migrateState(raw: Partial<SimulationSaveState>): SimulationSaveState {
  const fallback = createInitialSaveState();
  const sourceVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;

  let migratedPlayer = raw.player ?? fallback.player;
  if (sourceVersion < 2 && raw.player) {
    migratedPlayer = {
      ...raw.player,
      x: raw.player.x * 2,
      y: raw.player.y * 2,
    };
  }

  // Ensure v3/v4 adds missing starter stocks and backfills pH / bufferCapacity / dissolvedO2Percent
  const rawVessels = Array.isArray(raw.vessels) ? raw.vessels : fallback.vessels;
  const existingVessels: CultureVessel[] = rawVessels.map((v) => {
    const media = getMediaById(v.mediaId);
    const defaultPh = media?.pH ?? 7.0;
    return {
      ...v,
      pH: typeof v.pH === 'number' ? v.pH : defaultPh,
      initialPh: typeof v.initialPh === 'number' ? v.initialPh : defaultPh,
      bufferCapacity: typeof v.bufferCapacity === 'number' ? v.bufferCapacity : media?.bufferCapacity ?? 0.42,
      dissolvedO2Percent:
        typeof v.dissolvedO2Percent === 'number'
          ? v.dissolvedO2Percent
          : v.vesselType === 'agar_plate'
          ? 100
          : v.vesselType === 'glycerol_stock'
          ? 0
          : 80,
      history: Array.isArray(v.history) ? compactVesselHistory(v.history) : [],
    };
  });

  const existingIds = new Set(existingVessels.map((v) => v.id));
  for (const starter of buildStarterStocks()) {
    if (!existingIds.has(starter.id)) {
      existingVessels.push(starter);
    }
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    simMinutes: typeof raw.simMinutes === 'number' ? raw.simMinutes : fallback.simMinutes,
    speed:
      raw.speed === 0 ||
      raw.speed === 1 ||
      raw.speed === 10 ||
      raw.speed === 50 ||
      raw.speed === 100 ||
      raw.speed === 500
        ? raw.speed
        : fallback.speed,
    labMode: raw.labMode === 'manual' ? 'manual' : 'automate',
    muted: Boolean(raw.muted),
    vessels: existingVessels,
    shakingIncubator: raw.shakingIncubator ?? fallback.shakingIncubator,
    staticIncubator: raw.staticIncubator ?? fallback.staticIncubator,
    notebookEntries: Array.isArray(raw.notebookEntries)
      ? raw.notebookEntries.map((e) => ({
          ...e,
          gelSnapshots: e.gelSnapshots ?? [],
          timelinePhase: e.timelinePhase ?? 'six_hours',
        }))
      : fallback.notebookEntries,
    activeNotebookEntryId: raw.activeNotebookEntryId ?? fallback.activeNotebookEntryId,
    player: migratedPlayer,
    nextVesselCounter:
      typeof raw.nextVesselCounter === 'number' ? raw.nextVesselCounter : fallback.nextVesselCounter,
    completedQuestIds: Array.isArray(raw.completedQuestIds) ? raw.completedQuestIds : [],
    activeGoalId: typeof raw.activeGoalId === 'string' ? raw.activeGoalId : fallback.activeGoalId,
    goalHudCollapsed: Boolean(raw.goalHudCollapsed),
    goalHudHidden: Boolean(raw.goalHudHidden),
    achievedEvents: Array.isArray(raw.achievedEvents) ? raw.achievedEvents : [],
  };
}

export function exportStateAsJson(state: SimulationSaveState): string {
  return JSON.stringify(
    {
      ...state,
      exportedAtIso: new Date().toISOString(),
      application: 'BioForge Lab',
    },
    null,
    2
  );
}

export function parseImportedJson(jsonText: string):
  | { ok: true; state: SimulationSaveState }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(jsonText) as Partial<SimulationSaveState>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.vessels)) {
      return { ok: false, error: 'Invalid save file: missing laboratory vessel array.' };
    }
    if (typeof parsed.simMinutes !== 'number') {
      return { ok: false, error: 'Invalid save file: missing simulation timestamp.' };
    }
    return { ok: true, state: migrateState(parsed) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to parse JSON save data.',
    };
  }
}
