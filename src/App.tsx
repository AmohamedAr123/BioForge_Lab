/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoalTrackerHud } from './components/GoalTrackerHud';
import { LabCanvasStage } from './components/LabCanvasStage';
import { QuestBoardModal } from './components/QuestBoardModal';
import { BELT_CAPACITY, SampleBelt } from './components/SampleBelt';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { AutoclaveConsole } from './components/consoles/AutoclaveConsole';
import { CentrifugeExtractionConsole } from './components/consoles/CentrifugeExtractionConsole';
import { ColdStorageConsole } from './components/consoles/ColdStorageConsole';
import { GelElectrophoresisConsole } from './components/consoles/GelElectrophoresisConsole';
import { IncubatorConsole } from './components/consoles/IncubatorConsole';
import { MediaBenchConsole } from './components/consoles/MediaBenchConsole';
import { MicroscopeConsole } from './components/consoles/MicroscopeConsole';
import { PcrThermalCyclerConsole } from './components/consoles/PcrThermalCyclerConsole';
import { RestrictionDigestConsole } from './components/consoles/RestrictionDigestConsole';
import { SpectrophotometerConsole } from './components/consoles/SpectrophotometerConsole';
import { DataManagerModal } from './components/DataManagerModal';
import { GuideModal } from './components/GuideModal';
import { InventoryModal } from './components/InventoryModal';
import { NotebookDrawer } from './components/NotebookDrawer';
import { ReferenceModal, ReferenceTabId } from './components/ReferenceModal';
import { ALL_QUESTS_FLAT } from './data/tutorialGoals';
import { labAudio } from './engine/audio';
import { clearManualBenchState } from './engine/manualBenchChemistry';
import { evaluateCompletedQuests } from './engine/questEvaluator';
import {
  applyNutrientFeedToVessel,
  createFormulatedVessel,
  formatSimTime,
  inoculateExistingVessel,
  stepVesselsSimulation,
} from './engine/simulation';
import {
  createInitialSaveState,
  loadSavedState,
  saveStateToLocal,
} from './engine/storage';
import {
  CultureVessel,
  DNAFragmentSample,
  GelRunSnapshot,
  LabMode,
  ManualActualParams,
  MicroscopeSnapshot,
  NotebookEntry,
  SimulationSaveState,
  SimulationSpeed,
  StationId,
  VesselType,
} from './types/lab';

export default function App() {
  const [state, setState] = useState<SimulationSaveState>(() => {
    const loaded = loadSavedState();
    labAudio.setMuted(loaded.muted);
    return loaded;
  });

  const [activeStationId, setActiveStationId] = useState<StationId | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<
    'guide' | 'notebook' | 'reference' | 'data' | 'goals' | 'inventory' | null
  >(null);
  const [inventoryInitialSlot, setInventoryInitialSlot] = useState<number | null>(null);
  const [referenceTab, setReferenceTab] = useState<ReferenceTabId>('dictionary');
  const [referenceTermId, setReferenceTermId] = useState<string | null>(null);
  const [selectedBeltVesselId, setSelectedBeltVesselId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  const vesselsLiveRef = useRef<CultureVessel[]>(state.vessels);
  const simEngineRef = useRef({
    simMinutes: state.simMinutes,
    vessels: state.vessels,
    speed: state.speed,
    shakingIncubator: state.shakingIncubator,
    staticIncubator: state.staticIncubator,
  });
  const dirtySaveRef = useRef(false);

  const commitSimState = useCallback(
    (updater: (live: SimulationSaveState) => SimulationSaveState) => {
      const liveSnapshot: SimulationSaveState = {
        ...stateRef.current,
        simMinutes: simEngineRef.current.simMinutes,
        vessels: simEngineRef.current.vessels,
        speed: simEngineRef.current.speed,
        shakingIncubator: simEngineRef.current.shakingIncubator,
        staticIncubator: simEngineRef.current.staticIncubator,
      };
      const next = updater(liveSnapshot);
      if (next === liveSnapshot) return;
      simEngineRef.current.simMinutes = next.simMinutes;
      simEngineRef.current.vessels = next.vessels;
      simEngineRef.current.speed = next.speed;
      simEngineRef.current.shakingIncubator = next.shakingIncubator;
      simEngineRef.current.staticIncubator = next.staticIncubator;
      vesselsLiveRef.current = next.vessels;
      stateRef.current = next;
      dirtySaveRef.current = true;
      setState(next);
    },
    []
  );

  const markEvent = useCallback((eventKey: string) => {
    setState((prev) => {
      if (prev.achievedEvents.includes(eventKey)) return prev;
      dirtySaveRef.current = true;
      return {
        ...prev,
        achievedEvents: [...prev.achievedEvents, eventKey],
      };
    });
  }, []);

  // High-speed simulation loop decoupled from React re-renders:
  // steps physics & biology inside mutable refs via RAF deltaTime and syncs React HUD at ~4.5 Hz (220 ms).
  useEffect(() => {
    if (state.speed === 0) return;

    let rafId = 0;
    let lastFrameTime = performance.now();
    let lastHudSyncTime = lastFrameTime;
    const HUD_SYNC_INTERVAL_MS = 220;

    const tick = (now: number) => {
      const dtRealSec = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
      lastFrameTime = now;

      const eng = simEngineRef.current;
      if (eng.speed > 0 && dtRealSec > 0) {
        const dtSimMin = dtRealSec * eng.speed;
        const nextSimMin = eng.simMinutes + dtSimMin;
        const nextVessels = stepVesselsSimulation(
          eng.vessels,
          dtSimMin,
          nextSimMin,
          eng.shakingIncubator,
          eng.staticIncubator
        );
        eng.simMinutes = nextSimMin;
        eng.vessels = nextVessels;
        vesselsLiveRef.current = nextVessels;
        dirtySaveRef.current = true;

        if (now - lastHudSyncTime >= HUD_SYNC_INTERVAL_MS) {
          lastHudSyncTime = now;
          const syncedSimMin = eng.simMinutes;
          const syncedVessels = eng.vessels;
          setState((prev) => ({
            ...prev,
            simMinutes: syncedSimMin,
            vessels: syncedVessels,
          }));
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [state.speed]);

  // Automatic Quest Completion Evaluator (throttled to ~1100 ms)
  const lastQuestEvalTimeRef = useRef(0);
  useEffect(() => {
    const runQuestEval = () => {
      lastQuestEvalTimeRef.current = performance.now();
      const current = stateRef.current;
      const evaluated = evaluateCompletedQuests(current);
      if (evaluated.length > current.completedQuestIds.length) {
        const newlyCompleted = evaluated.filter(
          (id) => !current.completedQuestIds.includes(id)
        );
        dirtySaveRef.current = true;
        setState((prev) => ({
          ...prev,
          completedQuestIds: evaluateCompletedQuests(prev),
        }));
        if (newlyCompleted.length > 0) {
          const lastQ = ALL_QUESTS_FLAT.find(
            (q) => q.id === newlyCompleted[newlyCompleted.length - 1]
          );
          labAudio.playSaveSuccess();
          if (lastQ) {
            showToast(`Quest Completed: ${lastQ.title}`);
          }
        }
      }
    };

    const elapsed = performance.now() - lastQuestEvalTimeRef.current;
    if (elapsed >= 1100) {
      runQuestEval();
      return;
    }

    const timerId = window.setTimeout(runQuestEval, 1100 - elapsed);
    return () => window.clearTimeout(timerId);
  }, [
    state.vessels,
    state.notebookEntries,
    state.achievedEvents,
    state.completedQuestIds,
    showToast,
  ]);

  // Dirty-flagged periodic localStorage persistence (avoids JSON serialization churn per frame)
  useEffect(() => {
    const flushSave = () => {
      if (!dirtySaveRef.current) return;
      dirtySaveRef.current = false;
      const snapshot: SimulationSaveState = {
        ...stateRef.current,
        simMinutes: simEngineRef.current.simMinutes,
        vessels: simEngineRef.current.vessels,
        speed: simEngineRef.current.speed,
        shakingIncubator: simEngineRef.current.shakingIncubator,
        staticIncubator: simEngineRef.current.staticIncubator,
      };
      saveStateToLocal(snapshot);
    };

    const saveInterval = window.setInterval(flushSave, 4500);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('beforeunload', flushSave);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(saveInterval);
      window.removeEventListener('beforeunload', flushSave);
      document.removeEventListener('visibilitychange', handleVisibility);
      flushSave();
    };
  }, []);

  // Escape key closes active console or overlay; '?' opens Lab Guide
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if (e.key === 'Escape') {
        if (activeStationId) setActiveStationId(null);
        else if (activeOverlay) setActiveOverlay(null);
      } else if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setActiveStationId(null);
        setActiveOverlay((prev) => (prev === 'guide' ? null : 'guide'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeStationId, activeOverlay]);

  const beltVessels = useMemo(
    () => state.vessels.filter((v) => v.location.zone === 'belt'),
    [state.vessels]
  );

  const getNextFreeBeltSlot = (vessels: CultureVessel[]): number | null => {
    const used = new Set(
      vessels
        .filter((v) => v.location.zone === 'belt')
        .map((v) => (v.location.zone === 'belt' ? v.location.slotIndex : -1))
    );
    for (let i = 0; i < BELT_CAPACITY; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  };

  const handleMoveToBelt = useCallback(
    (vesselId: string) => {
      commitSimState((prev) => {
        const slot = getNextFreeBeltSlot(prev.vessels);
        if (slot === null) {
          showToast(`Carried Sample Tray is full (${BELT_CAPACITY}/${BELT_CAPACITY}).`);
          return prev;
        }
        labAudio.playUiClick();
        const targetVessel = prev.vessels.find((v) => v.id === vesselId);
        const nextEvents =
          targetVessel?.vesselType === 'glycerol_stock' &&
          !prev.achievedEvents.includes('took_stock')
            ? [...prev.achievedEvents, 'took_stock']
            : prev.achievedEvents;

        return {
          ...prev,
          achievedEvents: nextEvents,
          vessels: prev.vessels.map((v) =>
            v.id === vesselId ? { ...v, location: { zone: 'belt', slotIndex: slot } } : v
          ),
        };
      });
      setSelectedBeltVesselId(vesselId);
    },
    [commitSimState, showToast]
  );

  const handleMoveToEquipment = useCallback(
    (vesselId: string, stationId: StationId, slotIndex: number) => {
      labAudio.playUiClick();
      commitSimState((prev) => ({
        ...prev,
        vessels: prev.vessels.map((v) =>
          v.id === vesselId
            ? { ...v, location: { zone: 'equipment', stationId, slotIndex } }
            : v
        ),
      }));
      setSelectedBeltVesselId((prev) => (prev === vesselId ? null : prev));
    },
    [commitSimState]
  );

  const handleCreateVessel = useCallback(
    (params: {
      label: string;
      vesselType: VesselType;
      mediaId: string;
      volumeMl: number;
      initialPh?: number;
      antibioticsUgPerMl: Record<string, number>;
      sourceVesselId: string | null;
      inoculumUl: number;
      dilutionExponent?: number;
      actualParams?: ManualActualParams;
    }) => {
      commitSimState((prev) => {
        const beltSlot = getNextFreeBeltSlot(prev.vessels);
        if (beltSlot === null) {
          showToast(`Carried Sample Tray is full (max ${BELT_CAPACITY} vessels).`);
          return prev;
        }

        const sourceVessel = params.sourceVesselId
          ? prev.vessels.find((v) => v.id === params.sourceVesselId)
          : undefined;

        const {
          vessel: newVessel,
          contaminated,
          crossContaminated,
        } = createFormulatedVessel({
          id: `vessel_${prev.nextVesselCounter}`,
          label: params.label,
          vesselType: params.vesselType,
          mediaId: params.mediaId,
          volumeMl: params.volumeMl,
          initialPh: params.initialPh,
          antibioticsUgPerMl: params.antibioticsUgPerMl,
          sourceVessel,
          inoculumUl: params.inoculumUl,
          dilutionExponent: params.dilutionExponent,
          beltSlot,
          simMinutes: prev.simMinutes,
          actualParams: params.actualParams,
        });

        const nextEvents = [...prev.achievedEvents];
        if (
          (params.vesselType === 'flask_250ml' || params.vesselType === 'culture_tube') &&
          newVessel.populations.length > 0 &&
          !nextEvents.includes('prepared_broth')
        ) {
          nextEvents.push('prepared_broth');
        }

        labAudio.playPipetteDispense();
        if (contaminated || crossContaminated) {
          showToast(
            `Prepared ${newVessel.label} — aseptic warning: ${
              crossContaminated ? 'tip cross-contamination' : 'non-sterile background contaminant'
            }!`
          );
        } else if (
          params.actualParams?.antibioticPotency !== undefined &&
          params.actualParams.antibioticPotency < 0.9
        ) {
          showToast(
            `Prepared ${newVessel.label} (note: heat-degraded antibiotic potency ${(
              params.actualParams.antibioticPotency * 100
            ).toFixed(0)}%).`
          );
        } else {
          showToast(`Prepared ${newVessel.label} on Carried Sample Tray.`);
        }

        return {
          ...prev,
          achievedEvents: nextEvents,
          vessels: [...prev.vessels, newVessel],
          nextVesselCounter: prev.nextVesselCounter + 1,
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleInoculateExisting = useCallback(
    (
      targetVesselId: string,
      sourceVesselId: string,
      inoculumUl: number,
      dilutionExponent = 0,
      actualParams?: ManualActualParams
    ) => {
      commitSimState((prev) => {
        const source = prev.vessels.find((v) => v.id === sourceVesselId);
        const target = prev.vessels.find((v) => v.id === targetVesselId);
        if (!source || !target) return prev;

        const { updatedVessel, contaminated, crossContaminated } = inoculateExistingVessel({
          targetVessel: target,
          sourceVessel: source,
          inoculumUl,
          dilutionExponent,
          actualParams,
        });

        labAudio.playPipetteDispense();
        if (contaminated || crossContaminated) {
          showToast(
            `Inoculated ${target.label} — aseptic warning: ${
              crossContaminated ? 'reused tip cross-contamination' : 'airborne contaminant seeded'
            }!`
          );
        } else {
          showToast(`Inoculated ${target.label} (${inoculumUl} µL).`);
        }

        return {
          ...prev,
          vessels: prev.vessels.map((v) => (v.id === targetVesselId ? updatedVessel : v)),
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleFeedCulture = useCallback(
    (vesselId: string, supplementId: string, feedMl: number) => {
      commitSimState((prev) => {
        const target = prev.vessels.find((v) => v.id === vesselId);
        if (!target) return prev;
        const result = applyNutrientFeedToVessel(
          target,
          supplementId,
          feedMl,
          prev.simMinutes
        );
        if (result.actualFeedMl <= 0) {
          showToast(result.summary);
          return prev;
        }
        labAudio.playPipetteDispense();
        showToast(result.summary);
        return {
          ...prev,
          vessels: prev.vessels.map((v) =>
            v.id === vesselId ? result.updatedVessel : v
          ),
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleUpdateExistingVessel = useCallback(
    (vesselId: string, updater: (v: CultureVessel) => CultureVessel) => {
      commitSimState((prev) => ({
        ...prev,
        vessels: prev.vessels.map((v) => (v.id === vesselId ? updater(v) : v)),
      }));
    },
    [commitSimState]
  );

  const handleCreateDnaExtract = useCallback(
    (params: {
      label: string;
      fragments: DNAFragmentSample[];
      sourceVessel: CultureVessel;
      hasPlasmid: boolean;
    }) => {
      commitSimState((prev) => {
        const slot = getNextFreeBeltSlot(prev.vessels);
        if (slot === null) {
          showToast(`Carried Sample Tray is full (max ${BELT_CAPACITY} vessels).`);
          return prev;
        }

        const newTube: CultureVessel = {
          id: `vessel_${prev.nextVesselCounter}`,
          label: params.label,
          vesselType: 'microtube_1_5ml',
          mediaId: 'lb_broth',
          volumeMl: 0.05,
          nutrientRemaining: 0,
          antibioticsUgPerMl: {},
          temperatureC: 22.0,
          pH: 8.0,
          initialPh: 8.0,
          bufferCapacity: 1.0,
          dissolvedO2Percent: 0,
          populations: [],
          od600: 0,
          colonyCount: 0,
          colonyDiameterMm: 0,
          createdAtSimMin: prev.simMinutes,
          lastLoggedSimMin: prev.simMinutes,
          history: [],
          location: { zone: 'belt', slotIndex: slot },
          dnaFragments: params.fragments,
          molecularOrigin: params.hasPlasmid ? 'extracted_plasmid' : 'extracted_genomic',
          notes: `Extracted from ${params.sourceVessel.label}`,
        };

        const nextEvents = prev.achievedEvents.includes('extracted_dna')
          ? prev.achievedEvents
          : [...prev.achievedEvents, 'extracted_dna'];

        labAudio.playPipetteDispense();
        showToast(`Eluted purified DNA tube: ${newTube.label}`);

        return {
          ...prev,
          achievedEvents: nextEvents,
          vessels: [...prev.vessels, newTube],
          nextVesselCounter: prev.nextVesselCounter + 1,
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleCreatePcrTube = useCallback(
    (params: {
      label: string;
      amplicons: DNAFragmentSample[];
      outcome: string;
    }) => {
      commitSimState((prev) => {
        const slot = getNextFreeBeltSlot(prev.vessels);
        if (slot === null) {
          showToast(`Carried Sample Tray is full (max ${BELT_CAPACITY} vessels).`);
          return prev;
        }

        const newTube: CultureVessel = {
          id: `vessel_${prev.nextVesselCounter}`,
          label: params.label,
          vesselType: 'pcr_tube',
          mediaId: 'lb_broth',
          volumeMl: 0.025,
          nutrientRemaining: 0,
          antibioticsUgPerMl: {},
          temperatureC: 4.0,
          pH: 8.3,
          initialPh: 8.3,
          bufferCapacity: 1.0,
          dissolvedO2Percent: 0,
          populations: [],
          od600: 0,
          colonyCount: 0,
          colonyDiameterMm: 0,
          createdAtSimMin: prev.simMinutes,
          lastLoggedSimMin: prev.simMinutes,
          history: [],
          location: { zone: 'belt', slotIndex: slot },
          dnaFragments: params.amplicons,
          molecularOrigin: 'pcr_product',
          notes: `PCR outcome: ${params.outcome}`,
        };

        const nextEvents =
          params.amplicons.length > 0 && !prev.achievedEvents.includes('ran_pcr_success')
            ? [...prev.achievedEvents, 'ran_pcr_success']
            : prev.achievedEvents;

        labAudio.playSaveSuccess();
        showToast(`PCR finished: ${newTube.label} placed on Sample Tray.`);

        return {
          ...prev,
          achievedEvents: nextEvents,
          vessels: [...prev.vessels, newTube],
          nextVesselCounter: prev.nextVesselCounter + 1,
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleCreateDigestTube = useCallback(
    (params: {
      label: string;
      fragments: DNAFragmentSample[];
    }) => {
      commitSimState((prev) => {
        const slot = getNextFreeBeltSlot(prev.vessels);
        if (slot === null) {
          showToast(`Carried Sample Tray is full (max ${BELT_CAPACITY} vessels).`);
          return prev;
        }

        const newTube: CultureVessel = {
          id: `vessel_${prev.nextVesselCounter}`,
          label: params.label,
          vesselType: 'microtube_1_5ml',
          mediaId: 'lb_broth',
          volumeMl: 0.02,
          nutrientRemaining: 0,
          antibioticsUgPerMl: {},
          temperatureC: 37.0,
          pH: 7.5,
          initialPh: 7.5,
          bufferCapacity: 1.0,
          dissolvedO2Percent: 0,
          populations: [],
          od600: 0,
          colonyCount: 0,
          colonyDiameterMm: 0,
          createdAtSimMin: prev.simMinutes,
          lastLoggedSimMin: prev.simMinutes,
          history: [],
          location: { zone: 'belt', slotIndex: slot },
          dnaFragments: params.fragments,
          molecularOrigin: 'restriction_digest',
          notes: '37 °C Restriction enzyme digest reaction',
        };

        const nextEvents = prev.achievedEvents.includes('ran_restriction_digest')
          ? prev.achievedEvents
          : [...prev.achievedEvents, 'ran_restriction_digest'];

        labAudio.playPipetteDispense();
        showToast(`Restriction digest complete: ${newTube.label}`);

        return {
          ...prev,
          achievedEvents: nextEvents,
          vessels: [...prev.vessels, newTube],
          nextVesselCounter: prev.nextVesselCounter + 1,
        };
      });
    },
    [commitSimState, showToast]
  );

  const handleDisposeVessel = useCallback(
    (vesselId: string) => {
      labAudio.playSterilizeCycle();
      commitSimState((prev) => ({
        ...prev,
        vessels: prev.vessels.filter((v) => v.id !== vesselId),
      }));
      showToast('Vessel autoclaved at 121 °C and safely discarded.');
    },
    [commitSimState, showToast]
  );

  const handleCaptureSnapshot = useCallback(
    (snapData: Omit<MicroscopeSnapshot, 'id'>) => {
      labAudio.playSnapshotShutter();
      const snapshot: MicroscopeSnapshot = {
        ...snapData,
        id: `snap_${Date.now()}`,
      };
      const liveSimMin = simEngineRef.current.simMinutes;

      setState((prev) => {
        const targetId = prev.activeNotebookEntryId ?? prev.notebookEntries[0]?.id;
        if (!targetId) return prev;
        dirtySaveRef.current = true;
        const nextEvents = prev.achievedEvents.includes('captured_micrograph')
          ? prev.achievedEvents
          : [...prev.achievedEvents, 'captured_micrograph'];

        return {
          ...prev,
          achievedEvents: nextEvents,
          notebookEntries: prev.notebookEntries.map((entry) => {
            if (entry.id !== targetId) return entry;
            const linked = entry.linkedVesselIds.includes(snapData.vesselId)
              ? entry.linkedVesselIds
              : [...entry.linkedVesselIds, snapData.vesselId];
            return {
              ...entry,
              linkedVesselIds: linked,
              snapshots: [snapshot, ...entry.snapshots],
              updatedAtSimMin: liveSimMin,
            };
          }),
        };
      });

      showToast('Micrograph captured & attached to active Notebook entry.');
    },
    [showToast]
  );

  const handleCaptureGelSnapshot = useCallback(
    (gelData: Omit<GelRunSnapshot, 'id'>) => {
      labAudio.playSnapshotShutter();
      const gelSnap: GelRunSnapshot = {
        ...gelData,
        id: `gel_${Date.now()}`,
      };
      const liveSimMin = simEngineRef.current.simMinutes;

      setState((prev) => {
        const targetId = prev.activeNotebookEntryId ?? prev.notebookEntries[0]?.id;
        if (!targetId) return prev;
        dirtySaveRef.current = true;
        const nextEvents = prev.achievedEvents.includes('captured_gel')
          ? prev.achievedEvents
          : [...prev.achievedEvents, 'captured_gel'];

        return {
          ...prev,
          achievedEvents: nextEvents,
          notebookEntries: prev.notebookEntries.map((entry) => {
            if (entry.id !== targetId) return entry;
            return {
              ...entry,
              gelSnapshots: [gelSnap, ...(entry.gelSnapshots ?? [])],
              updatedAtSimMin: liveSimMin,
            };
          }),
        };
      });

      showToast('UV Gel Doc image saved to active Notebook entry.');
    },
    [showToast]
  );

  const handleLogOdToNotebook = useCallback(
    (vessel: CultureVessel, displayedOd?: number) => {
      labAudio.playSaveSuccess();
      const liveSimMin = simEngineRef.current.simMinutes;
      const odVal = typeof displayedOd === 'number' ? displayedOd : vessel.od600;
      const logLine = `[${formatSimTime(liveSimMin)}] ${vessel.label}: OD600 = ${odVal.toFixed(3)} · Temp ${vessel.temperatureC.toFixed(1)} °C · pH ${vessel.pH.toFixed(2)} · DO2 ${vessel.dissolvedO2Percent.toFixed(0)}%`;
      setState((prev) => {
        const targetId = prev.activeNotebookEntryId ?? prev.notebookEntries[0]?.id;
        if (!targetId) return prev;
        dirtySaveRef.current = true;
        const nextEvents = prev.achievedEvents.includes('logged_od600')
          ? prev.achievedEvents
          : [...prev.achievedEvents, 'logged_od600'];

        return {
          ...prev,
          achievedEvents: nextEvents,
          notebookEntries: prev.notebookEntries.map((entry) => {
            if (entry.id !== targetId) return entry;
            const linked = entry.linkedVesselIds.includes(vessel.id)
              ? entry.linkedVesselIds
              : [...entry.linkedVesselIds, vessel.id];
            return {
              ...entry,
              linkedVesselIds: linked,
              observations: entry.observations
                ? `${entry.observations}\n${logLine}`
                : logLine,
              updatedAtSimMin: liveSimMin,
            };
          }),
        };
      });
      showToast(`Recorded OD600 (${odVal.toFixed(3)}) in Notebook.`);
    },
    [showToast]
  );

  const handleCreateNotebookEntry = useCallback(() => {
    const newId = `nb_${Date.now()}`;
    const liveSimMin = simEngineRef.current.simMinutes;
    setState((prev) => {
      dirtySaveRef.current = true;
      const newEntry: NotebookEntry = {
        id: newId,
        title: `Exp ${String(prev.notebookEntries.length + 1).padStart(2, '0')}: Untitled Investigation`,
        hypothesis: '',
        protocolNotes: '',
        observations: '',
        linkedVesselIds: [],
        snapshots: [],
        gelSnapshots: [],
        timelinePhase: 'six_hours',
        createdAtSimMin: liveSimMin,
        updatedAtSimMin: liveSimMin,
      };
      return {
        ...prev,
        notebookEntries: [newEntry, ...prev.notebookEntries],
        activeNotebookEntryId: newId,
      };
    });
  }, []);

  const handleUpdateNotebookEntry = useCallback((updated: NotebookEntry) => {
    const liveSimMin = simEngineRef.current.simMinutes;
    setState((prev) => {
      dirtySaveRef.current = true;
      return {
        ...prev,
        notebookEntries: prev.notebookEntries.map((e) =>
          e.id === updated.id ? { ...updated, updatedAtSimMin: liveSimMin } : e
        ),
      };
    });
  }, []);

  const handleDeleteNotebookEntry = useCallback((id: string) => {
    setState((prev) => {
      dirtySaveRef.current = true;
      const remaining = prev.notebookEntries.filter((e) => e.id !== id);
      return {
        ...prev,
        notebookEntries: remaining,
        activeNotebookEntryId:
          prev.activeNotebookEntryId === id ? remaining[0]?.id ?? null : prev.activeNotebookEntryId,
      };
    });
  }, []);

  const handleOpenDictionaryTerm = useCallback((termId: string) => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setReferenceTab('dictionary');
    setReferenceTermId(termId);
    setActiveOverlay('reference');
  }, []);

  const handleToggleQuestManual = useCallback((questId: string) => {
    labAudio.playUiClick();
    setState((prev) => {
      dirtySaveRef.current = true;
      const exists = prev.completedQuestIds.includes(questId);
      return {
        ...prev,
        completedQuestIds: exists
          ? prev.completedQuestIds.filter((id) => id !== questId)
          : [...prev.completedQuestIds, questId],
      };
    });
  }, []);

  // Stable memoized callbacks for TopTelemetryBar, LabCanvasStage, GoalTrackerHud & SampleBelt
  const handleSetSpeed = useCallback(
    (speed: SimulationSpeed) => {
      labAudio.playUiClick();
      commitSimState((prev) => ({ ...prev, speed }));
    },
    [commitSimState]
  );

  const handleSetLabMode = useCallback(
    (labMode: LabMode) => {
      labAudio.playUiClick();
      dirtySaveRef.current = true;
      setState((prev) => ({ ...prev, labMode }));
      showToast(
        labMode === 'manual'
          ? 'Switched to Manual Bench Mode: physical instruments & aseptic steps enabled.'
          : 'Switched to Automate Mode: fast calibrated instrument presets enabled.'
      );
    },
    [showToast]
  );

  const handleToggleMute = useCallback(() => {
    setState((prev) => {
      dirtySaveRef.current = true;
      const nextMuted = !prev.muted;
      labAudio.setMuted(nextMuted);
      return { ...prev, muted: nextMuted };
    });
  }, []);

  const handleOpenGoals = useCallback(() => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setActiveOverlay('goals');
  }, []);

  const handleOpenInventory = useCallback((slotIndex?: number) => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setInventoryInitialSlot(typeof slotIndex === 'number' ? slotIndex : null);
    setActiveOverlay('inventory');
  }, []);

  const handleOpenGuide = useCallback(() => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setActiveOverlay('guide');
  }, []);

  const handleOpenNotebook = useCallback(() => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setActiveOverlay('notebook');
  }, []);

  const handleOpenReference = useCallback(() => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setReferenceTab('species');
    setReferenceTermId(null);
    setActiveOverlay('reference');
  }, []);

  const handleOpenDataManager = useCallback(() => {
    labAudio.playUiClick();
    setActiveStationId(null);
    setActiveOverlay('data');
  }, []);

  const handleToggleGoalHud = useCallback(() => {
    labAudio.playUiClick();
    dirtySaveRef.current = true;
    setState((prev) => ({ ...prev, goalHudHidden: !prev.goalHudHidden }));
  }, []);

  const handleToggleGoalHudCollapse = useCallback(() => {
    dirtySaveRef.current = true;
    setState((prev) => ({ ...prev, goalHudCollapsed: !prev.goalHudCollapsed }));
  }, []);

  const handleHideGoalHud = useCallback(() => {
    labAudio.playUiClick();
    dirtySaveRef.current = true;
    setState((prev) => ({ ...prev, goalHudHidden: true }));
  }, []);

  const handlePlayerMovePersist = useCallback(
    (player: { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' }) => {
      dirtySaveRef.current = true;
      setState((prev) => ({ ...prev, player }));
    },
    []
  );

  const handlePlayerWalked = useCallback(() => {
    markEvent('player_walked');
  }, [markEvent]);

  const handleOpenStation = useCallback((stationId: StationId) => {
    labAudio.playStationOpen();
    setActiveOverlay(null);
    setActiveStationId(stationId);
  }, []);

  const handleCloseStation = useCallback(() => {
    setActiveStationId(null);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setActiveOverlay(null);
  }, []);

  const handleSelectBeltVessel = useCallback((id: string) => {
    labAudio.playUiClick();
    setSelectedBeltVesselId((prev) => (prev === id ? null : id));
  }, []);

  const topRightHud = useMemo(
    () =>
      state.goalHudHidden ? null : (
        <GoalTrackerHud
          completedQuestIds={state.completedQuestIds}
          activeGoalId={state.activeGoalId}
          collapsed={state.goalHudCollapsed}
          onToggleCollapse={handleToggleGoalHudCollapse}
          onHideHud={handleHideGoalHud}
          onOpenQuestBoard={handleOpenGoals}
          onOpenDictionaryTerm={handleOpenDictionaryTerm}
        />
      ),
    [
      state.goalHudHidden,
      state.completedQuestIds,
      state.activeGoalId,
      state.goalHudCollapsed,
      handleToggleGoalHudCollapse,
      handleHideGoalHud,
      handleOpenGoals,
      handleOpenDictionaryTerm,
    ]
  );

  return (
    <div className="h-screen w-screen bg-[#0B0E17] text-slate-100 flex flex-col overflow-hidden">
      <TopTelemetryBar
        simMinutes={state.simMinutes}
        speed={state.speed}
        labMode={state.labMode}
        muted={state.muted}
        onSetSpeed={handleSetSpeed}
        onSetLabMode={handleSetLabMode}
        onToggleMute={handleToggleMute}
        onOpenGoals={handleOpenGoals}
        onOpenInventory={handleOpenInventory}
        onOpenGuide={handleOpenGuide}
        onOpenNotebook={handleOpenNotebook}
        onOpenReference={handleOpenReference}
        onOpenDataManager={handleOpenDataManager}
        beltCount={beltVessels.length}
        beltCapacity={BELT_CAPACITY}
        notebookCount={state.notebookEntries.length}
        completedQuestsCount={state.completedQuestIds.length}
        totalQuestsCount={ALL_QUESTS_FLAT.length}
        goalHudHidden={state.goalHudHidden}
        onToggleGoalHud={handleToggleGoalHud}
      />

      <LabCanvasStage
        vessels={state.vessels}
        vesselsLiveRef={vesselsLiveRef}
        simSpeed={state.speed}
        shakingIncubator={state.shakingIncubator}
        staticIncubator={state.staticIncubator}
        activeStationId={activeStationId}
        initialPlayer={state.player}
        onPlayerMovePersist={handlePlayerMovePersist}
        onPlayerWalked={handlePlayerWalked}
        onOpenStation={handleOpenStation}
        topRightHud={topRightHud}
      />

      <SampleBelt
        beltVessels={beltVessels}
        selectedVesselId={selectedBeltVesselId}
        onSelectVessel={handleSelectBeltVessel}
        onOpenInventory={handleOpenInventory}
      />

      {/* Station Instrument Consoles */}
      {activeStationId === 'cold_storage' && (
        <ColdStorageConsole
          vessels={state.vessels}
          beltVessels={beltVessels}
          onMoveToBelt={handleMoveToBelt}
          onMoveToEquipment={handleMoveToEquipment}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'media_bench' && (
        <MediaBenchConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          beltCapacity={BELT_CAPACITY}
          onCreateVessel={handleCreateVessel}
          onInoculateExisting={handleInoculateExisting}
          onFeedCulture={handleFeedCulture}
          onUpdateExistingVessel={handleUpdateExistingVessel}
          onClose={handleCloseStation}
        />
      )}

      {(activeStationId === 'shaking_incubator' || activeStationId === 'static_incubator') && (
        <IncubatorConsole
          mode={activeStationId === 'shaking_incubator' ? 'shaking' : 'static'}
          vessels={state.vessels}
          beltVessels={beltVessels}
          shakingConfig={state.shakingIncubator}
          staticConfig={state.staticIncubator}
          onUpdateShakingConfig={(shakingIncubator) =>
            commitSimState((prev) => ({ ...prev, shakingIncubator }))
          }
          onUpdateStaticConfig={(staticIncubator) =>
            commitSimState((prev) => ({ ...prev, staticIncubator }))
          }
          onMoveToBelt={handleMoveToBelt}
          onMoveToEquipment={handleMoveToEquipment}
          onFeedCulture={handleFeedCulture}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'microscope' && (
        <MicroscopeConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          simMinutes={state.simMinutes}
          selectedVesselId={selectedBeltVesselId}
          onCaptureSnapshot={handleCaptureSnapshot}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'spectrophotometer' && (
        <SpectrophotometerConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          selectedVesselId={selectedBeltVesselId}
          onLogOdToNotebook={handleLogOdToNotebook}
          onMeasureNanoDrop={() => markEvent('measured_nanodrop')}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'centrifuge_miniprep' && (
        <CentrifugeExtractionConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          beltCapacity={BELT_CAPACITY}
          onCreateDnaExtract={handleCreateDnaExtract}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'pcr_cycler' && (
        <PcrThermalCyclerConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          beltCapacity={BELT_CAPACITY}
          onCreatePcrTube={handleCreatePcrTube}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'restriction_bench' && (
        <RestrictionDigestConsole
          labMode={state.labMode}
          beltVessels={beltVessels}
          allVessels={state.vessels}
          beltCapacity={BELT_CAPACITY}
          onCreateDigestTube={handleCreateDigestTube}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'gel_electrophoresis' && (
        <GelElectrophoresisConsole
          beltVessels={beltVessels}
          allVessels={state.vessels}
          simMinutes={state.simMinutes}
          onCaptureGelSnapshot={handleCaptureGelSnapshot}
          onClose={handleCloseStation}
        />
      )}

      {activeStationId === 'autoclave' && (
        <AutoclaveConsole
          beltVessels={beltVessels}
          onDisposeVessel={handleDisposeVessel}
          onClose={handleCloseStation}
        />
      )}

      {/* Global Overlays */}
      {activeOverlay === 'inventory' && (
        <InventoryModal
          beltVessels={beltVessels}
          selectedVesselId={selectedBeltVesselId}
          simMinutes={state.simMinutes}
          shakingIncubator={state.shakingIncubator}
          staticIncubator={state.staticIncubator}
          initialSlotIndex={inventoryInitialSlot}
          onSelectVessel={(id) => {
            labAudio.playUiClick();
            setSelectedBeltVesselId(id);
          }}
          onUpdateVesselNotes={(vesselId, notes) =>
            commitSimState((prev) => ({
              ...prev,
              vessels: prev.vessels.map((v) => (v.id === vesselId ? { ...v, notes } : v)),
            }))
          }
          onClose={handleCloseOverlay}
        />
      )}

      {activeOverlay === 'goals' && (
        <QuestBoardModal
          completedQuestIds={state.completedQuestIds}
          goalHudHidden={state.goalHudHidden}
          onToggleGoalHud={() => {
            labAudio.playUiClick();
            setState((prev) => ({ ...prev, goalHudHidden: !prev.goalHudHidden }));
          }}
          onToggleQuestManual={handleToggleQuestManual}
          onOpenDictionaryTerm={handleOpenDictionaryTerm}
          onClose={handleCloseOverlay}
        />
      )}

      {activeOverlay === 'guide' && (
        <GuideModal onClose={handleCloseOverlay} />
      )}

      {activeOverlay === 'notebook' && (
        <NotebookDrawer
          entries={state.notebookEntries}
          activeEntryId={state.activeNotebookEntryId}
          vessels={state.vessels}
          simMinutes={state.simMinutes}
          onSelectEntry={(id) =>
            setState((prev) => ({ ...prev, activeNotebookEntryId: id }))
          }
          onCreateEntry={handleCreateNotebookEntry}
          onUpdateEntry={handleUpdateNotebookEntry}
          onDeleteEntry={handleDeleteNotebookEntry}
          onClose={handleCloseOverlay}
        />
      )}

      {activeOverlay === 'reference' && (
        <ReferenceModal
          initialTab={referenceTab}
          initialTermId={referenceTermId}
          onClose={handleCloseOverlay}
        />
      )}

      {activeOverlay === 'data' && (
        <DataManagerModal
          saveState={state}
          onImportState={(next) => {
            labAudio.setMuted(next.muted);
            commitSimState(() => next);
            dirtySaveRef.current = false;
            saveStateToLocal(next);
            showToast('Imported laboratory state from JSON.');
          }}
          onResetLab={() => {
            clearManualBenchState();
            const fresh = createInitialSaveState();
            commitSimState(() => fresh);
            dirtySaveRef.current = false;
            saveStateToLocal(fresh);
            showToast('Laboratory reset to initial baseline.');
          }}
          onClose={handleCloseOverlay}
        />
      )}

      {/* Non-intrusive completion toast */}
      {toastMessage && (
        <div className="fixed bottom-20 right-5 z-50 bg-[#0B0E17]/95 border border-cyan-500/50 text-slate-100 text-xs font-medium px-3.5 py-2 rounded-md shadow-lg">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

