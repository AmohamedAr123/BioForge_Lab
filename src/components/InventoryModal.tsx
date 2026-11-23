import React, { useMemo, useState } from 'react';
import {
  Check,
  Cpu,
  Disc,
  Dna,
  FlaskConical,
  Package,
  Snowflake,
  TestTube2,
  X,
} from 'lucide-react';
import { getAntibioticById, getMediaById, getSpeciesById } from '../data/scientificDatabase';
import {
  computeVesselPhysiologySnapshot,
  formatScientificCount,
  formatSimTime,
} from '../engine/simulation';
import { CultureVessel, ShakingIncubatorConfig, StaticIncubatorConfig } from '../types/lab';
import {
  evaluateAntibioticDecision,
  getDnaPurityStatus,
  getGrowthPhaseStatus,
  getNutrientStatus,
  getOxygenStatus,
  getPhStatus,
  getTemperatureStatus,
} from '../utils/colorCoding';
import { BELT_CAPACITY } from './SampleBelt';

interface InventoryModalProps {
  beltVessels: CultureVessel[];
  selectedVesselId: string | null;
  simMinutes: number;
  shakingIncubator?: ShakingIncubatorConfig;
  staticIncubator?: StaticIncubatorConfig;
  initialSlotIndex?: number | null;
  onSelectVessel: (vesselId: string) => void;
  onUpdateVesselNotes: (vesselId: string, notes: string) => void;
  onClose: () => void;
}

function formatVesselTypeLabel(vType: CultureVessel['vesselType']): string {
  switch (vType) {
    case 'flask_250ml':
      return '250 mL Erlenmeyer Flask';
    case 'culture_tube':
      return '15 mL Culture Tube';
    case 'agar_plate':
      return '90 mm Agar Petri Plate';
    case 'glycerol_stock':
      return 'Cryo Glycerol Stock Vial';
    case 'microtube_1_5ml':
      return '1.5 mL Microcentrifuge Tube';
    case 'pcr_tube':
      return '0.2 mL PCR Reaction Tube';
  }
}

function VesselIcon({
  vesselType,
  className = 'w-4 h-4',
}: {
  vesselType: CultureVessel['vesselType'];
  className?: string;
}) {
  if (vesselType === 'flask_250ml') return <FlaskConical className={`${className} text-cyan-400`} />;
  if (vesselType === 'culture_tube') return <TestTube2 className={`${className} text-cyan-400`} />;
  if (vesselType === 'agar_plate') return <Disc className={`${className} text-amber-400`} />;
  if (vesselType === 'glycerol_stock') return <Snowflake className={`${className} text-sky-400`} />;
  if (vesselType === 'microtube_1_5ml') return <Dna className={`${className} text-teal-400`} />;
  return <Cpu className={`${className} text-purple-400`} />;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  beltVessels,
  selectedVesselId,
  simMinutes,
  shakingIncubator = { targetTempC: 37, rpm: 220, powerOn: true },
  staticIncubator = { targetTempC: 37, powerOn: true },
  initialSlotIndex = null,
  onSelectVessel,
  onUpdateVesselNotes,
  onClose,
}) => {
  const slots = useMemo(
    () =>
      Array.from({ length: BELT_CAPACITY }, (_, idx) =>
        beltVessels.find((v) => v.location.zone === 'belt' && v.location.slotIndex === idx) ?? null
      ),
    [beltVessels]
  );

  const [focusedSlot, setFocusedSlot] = useState<number>(() => {
    if (typeof initialSlotIndex === 'number' && initialSlotIndex >= 0 && initialSlotIndex < BELT_CAPACITY) {
      return initialSlotIndex;
    }
    if (selectedVesselId) {
      const idx = slots.findIndex((s) => s?.id === selectedVesselId);
      if (idx >= 0) return idx;
    }
    const firstOccupied = slots.findIndex((s) => s !== null);
    return firstOccupied >= 0 ? firstOccupied : 0;
  });

  const vessel = slots[focusedSlot] ?? null;
  const media = vessel ? getMediaById(vessel.mediaId) : undefined;
  const primaryPop = vessel?.populations[0];
  const primarySpecies = primaryPop ? getSpeciesById(primaryPop.speciesId) : undefined;

  const tempStatus = vessel
    ? getTemperatureStatus(vessel.temperatureC, vessel.vesselType, primarySpecies)
    : null;
  const phStatus = vessel ? getPhStatus(vessel.pH, primarySpecies) : null;
  const o2Status = vessel
    ? getOxygenStatus(vessel.dissolvedO2Percent, vessel.vesselType, primarySpecies)
    : null;
  const nutrientStatus = vessel ? getNutrientStatus(vessel.nutrientRemaining) : null;
  const phaseStatus = primaryPop ? getGrowthPhaseStatus(primaryPop.phase) : null;

  const activeAntibiotics = vessel
    ? Object.entries(vessel.antibioticsUgPerMl).filter(([, conc]) => conc > 0.01)
    : [];

  const dnaFragments = vessel?.dnaFragments ?? [];
  const totalDnaNgUl = dnaFragments.reduce((sum, f) => sum + f.concentrationNgPerUl, 0);
  const avgDnaPurity =
    dnaFragments.length > 0
      ? dnaFragments.reduce((sum, f) => sum + f.purityA260_280, 0) / dnaFragments.length
      : 0;
  const dnaPurityStatus = dnaFragments.length > 0 ? getDnaPurityStatus(avgDnaPurity) : null;

  const isCultureVessel =
    vessel !== null &&
    (vessel.vesselType === 'flask_250ml' ||
      vessel.vesselType === 'culture_tube' ||
      vessel.vesselType === 'agar_plate');
  const physSnap =
    vessel && isCultureVessel
      ? computeVesselPhysiologySnapshot(vessel, shakingIncubator, staticIncubator)
      : null;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col h-[90vh]">
        {/* Header + Inline Semantic Color Legend */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Carried Sample Tray Inventory ({beltVessels.length}/{BELT_CAPACITY} Occupied)
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                <span>Color Legend:</span>
                <span className="text-emerald-300 font-medium">Optimal / Pure / Selective</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300 font-medium">Active / Cold Preserved</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-medium">Sub-Optimal / Caution</span>
                <span aria-hidden="true">·</span>
                <span className="text-rose-300 font-medium">Stress / Kills / Contaminated</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Detailed Inventory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left: All 10 Carried Slots */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-[#0B0E17]/50">
            {slots.map((slotVessel, idx) => {
              const isFocused = focusedSlot === idx;
              const isSelectedOnTray = slotVessel !== null && selectedVesselId === slotVessel.id;

              if (!slotVessel) {
                return (
                  <button
                    key={`slot_${idx}`}
                    type="button"
                    onClick={() => setFocusedSlot(idx)}
                    className={`w-full px-3 py-2.5 rounded border text-left transition-colors cursor-pointer flex items-center justify-between ${
                      isFocused
                        ? 'bg-slate-900 border-slate-500 text-slate-300'
                        : 'bg-slate-950/50 border-dashed border-slate-800 text-slate-600 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-mono-tabular">Slot {idx + 1}</span>
                    <span className="text-xs">Empty Carry Slot</span>
                  </button>
                );
              }

              const sp = slotVessel.populations[0]
                ? getSpeciesById(slotVessel.populations[0].speciesId)
                : undefined;
              const sTemp = getTemperatureStatus(slotVessel.temperatureC, slotVessel.vesselType, sp);
              const sPh = getPhStatus(slotVessel.pH, sp);
              const sPhase = slotVessel.populations[0]
                ? getGrowthPhaseStatus(slotVessel.populations[0].phase)
                : null;
              const dnaTotal = (slotVessel.dnaFragments ?? []).reduce(
                (acc, f) => acc + f.concentrationNgPerUl,
                0
              );

              return (
                <button
                  key={slotVessel.id}
                  type="button"
                  onClick={() => setFocusedSlot(idx)}
                  className={`w-full p-3 rounded border text-left transition-colors cursor-pointer space-y-1.5 ${
                    isFocused
                      ? 'bg-cyan-950/35 border-cyan-500/70'
                      : 'bg-[#0B0E17] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0">
                        #{idx + 1}
                      </span>
                      <VesselIcon vesselType={slotVessel.vesselType} />
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {slotVessel.label}
                      </span>
                    </div>
                    {isSelectedOnTray && (
                      <span className="text-[11px] font-medium text-cyan-300 whitespace-nowrap shrink-0">
                        Active on Tray
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-mono-tabular">
                    <span className={sTemp.textClass}>{slotVessel.temperatureC.toFixed(1)} °C</span>
                    <span className="text-slate-600" aria-hidden="true">/</span>
                    {(slotVessel.vesselType === 'flask_250ml' ||
                      slotVessel.vesselType === 'culture_tube' ||
                      slotVessel.vesselType === 'agar_plate') && (
                      <>
                        <span className={sPh.textClass}>pH {slotVessel.pH.toFixed(2)}</span>
                        <span className="text-slate-600" aria-hidden="true">/</span>
                      </>
                    )}
                    {slotVessel.vesselType === 'microtube_1_5ml' || slotVessel.vesselType === 'pcr_tube' ? (
                      <span className="text-teal-300">
                        {dnaTotal.toFixed(1)} ng/µL · {slotVessel.dnaFragments?.length ?? 0} loci
                      </span>
                    ) : slotVessel.vesselType === 'agar_plate' ? (
                      <span className="text-amber-300">
                        {slotVessel.colonyCount} colonies · Ø {slotVessel.colonyDiameterMm.toFixed(1)} mm
                      </span>
                    ) : slotVessel.vesselType === 'glycerol_stock' ? (
                      <span className="text-sky-300">{sp?.commonLabel ?? 'Master Stock'}</span>
                    ) : (
                      <span className={sPhase?.textClass ?? 'text-slate-300'}>
                        OD {slotVessel.od600.toFixed(3)} · {sPhase?.label ?? 'Sterile'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Complete Detailed Inspector for Selected Slot */}
          <div className="lg:col-span-7 overflow-y-auto p-5 space-y-5">
            {!vessel ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded p-8 space-y-2">
                <Package className="w-8 h-8 text-slate-600" />
                <div className="text-sm font-medium text-slate-300">
                  Slot {focusedSlot + 1} is currently empty
                </div>
                <p className="text-xs text-slate-500 max-w-md">
                  Retrieve a Glycerol Stock from Cold Storage (-80 °C), formulate a fresh flask or Petri plate at the Media Bench, or extract/amplify DNA to fill this carried slot.
                </p>
              </div>
            ) : (
              <>
                {/* Item Header & Action */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <VesselIcon vesselType={vessel.vesselType} className="w-5 h-5" />
                      <h3 className="text-lg font-semibold text-slate-100">{vessel.label}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>Slot {focusedSlot + 1} of {BELT_CAPACITY}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatVesselTypeLabel(vessel.vesselType)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        {vessel.volumeMl >= 1 ? `${vessel.volumeMl} mL` : `${(vessel.volumeMl * 1000).toFixed(0)} µL`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">
                        Created {formatSimTime(vessel.createdAtSimMin)} (Age {(Math.max(0, simMinutes - vessel.createdAtSimMin) / 60).toFixed(1)} h)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectVessel(vessel.id)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedVesselId === vessel.id
                        ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                        : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedVesselId === vessel.id ? 'Active on Sample Tray' : 'Select as Active Sample'}
                  </button>
                </div>

                {/* Live Environment & Chemistry Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2.5">
                    Real-Time Physical &amp; Chemical Telemetry
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {tempStatus && (
                      <div className={`p-3 rounded border ${tempStatus.surfaceClass}`}>
                        <div className="text-[11px] opacity-80">Temperature</div>
                        <div className="text-lg font-mono-tabular font-bold mt-0.5">
                          {vessel.temperatureC.toFixed(1)} °C
                        </div>
                        <div className="text-[11px] font-medium mt-0.5">{tempStatus.label}</div>
                      </div>
                    )}

                    {phStatus && (
                      <div className={`p-3 rounded border ${phStatus.surfaceClass}`}>
                        <div className="text-[11px] opacity-80">Live Medium pH</div>
                        <div className="text-lg font-mono-tabular font-bold mt-0.5">
                          {vessel.pH.toFixed(2)}
                        </div>
                        <div className="text-[11px] font-medium mt-0.5">
                          {phStatus.label}
                          {Math.abs(vessel.pH - vessel.initialPh) >= 0.02
                            ? ` (Δ ${(vessel.pH - vessel.initialPh) >= 0 ? '+' : ''}${(vessel.pH - vessel.initialPh).toFixed(2)})`
                            : ''}
                        </div>
                      </div>
                    )}

                    {o2Status && (
                      <div className={`p-3 rounded border ${o2Status.surfaceClass}`}>
                        <div className="text-[11px] opacity-80">Dissolved O₂</div>
                        <div className="text-lg font-mono-tabular font-bold mt-0.5">
                          {vessel.vesselType === 'glycerol_stock' ||
                          vessel.vesselType === 'microtube_1_5ml' ||
                          vessel.vesselType === 'pcr_tube'
                            ? '—'
                            : `${vessel.dissolvedO2Percent.toFixed(1)}%`}
                        </div>
                        <div className="text-[11px] font-medium mt-0.5">{o2Status.label}</div>
                      </div>
                    )}

                    {nutrientStatus && (
                      <div className={`p-3 rounded border ${nutrientStatus.surfaceClass}`}>
                        <div className="text-[11px] opacity-80">Nutrients Left</div>
                        <div className="text-lg font-mono-tabular font-bold mt-0.5">
                          {isCultureVessel || vessel.vesselType === 'glycerol_stock'
                            ? `${(vessel.nutrientRemaining * 100).toFixed(1)}%`
                            : '—'}
                        </div>
                        <div className="text-[11px] font-medium mt-0.5">
                          {isCultureVessel || vessel.vesselType === 'glycerol_stock'
                            ? nutrientStatus.label
                            : 'Elution Buffer'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medium Formulation Details */}
                {(isCultureVessel || vessel.vesselType === 'glycerol_stock') && media && (
                  <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200">Medium: {media.name}</span>
                      <span className="font-mono-tabular text-slate-400">
                        Start pH {vessel.initialPh.toFixed(1)} · Buffer {(vessel.bufferCapacity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-slate-400">{media.compositionSummary}</div>
                  </div>
                )}

                {/* Biological Populations */}
                {vessel.populations.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-300">
                        Biological Culture Status
                      </h4>
                      {vessel.vesselType === 'agar_plate' ? (
                        <span className="text-xs font-mono-tabular text-amber-300">
                          {vessel.colonyCount} colonies · Ø {vessel.colonyDiameterMm.toFixed(2)} mm
                        </span>
                      ) : vessel.vesselType !== 'glycerol_stock' ? (
                        <span className="text-xs font-mono-tabular text-cyan-300">
                          OD600: {vessel.od600.toFixed(3)} AU
                        </span>
                      ) : null}
                    </div>

                    {vessel.populations.map((pop, idx) => {
                      const sp = getSpeciesById(pop.speciesId);
                      const pStatus = getGrowthPhaseStatus(pop.phase);
                      const totalCells = pop.viableCount + pop.deadCount;
                      const viabilityPct = totalCells > 0 ? (pop.viableCount / totalCells) * 100 : 0;
                      const viabilityTone =
                        viabilityPct >= 75
                          ? 'text-emerald-300'
                          : viabilityPct >= 30
                          ? 'text-amber-300'
                          : 'text-rose-300';

                      return (
                        <div
                          key={`${pop.speciesId}_${idx}`}
                          className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2.5 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-100">
                                {sp?.commonLabel ?? pop.speciesId}
                              </span>{' '}
                              {sp && (
                                <span className="text-slate-400">
                                  (<span className="italic">{sp.scientificName}</span> · Gram-{sp.gramStatus} {sp.shape})
                                </span>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-medium ${pStatus.surfaceClass}`}>
                              Phase: {pStatus.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-tabular">
                            <div className="p-2 bg-slate-900/70 rounded">
                              <div className="text-[10px] text-slate-400">Viable Cells</div>
                              <div className="text-emerald-300 font-semibold">
                                {formatScientificCount(pop.viableCount)} CFU/mL
                              </div>
                            </div>
                            <div className="p-2 bg-slate-900/70 rounded">
                              <div className="text-[10px] text-slate-400">Non-Viable / Dead</div>
                              <div className="text-rose-300 font-semibold">
                                {formatScientificCount(pop.deadCount)}
                              </div>
                            </div>
                            <div className="p-2 bg-slate-900/70 rounded">
                              <div className="text-[10px] text-slate-400">Viability</div>
                              <div className={`font-semibold ${viabilityTone}`}>
                                {viabilityPct.toFixed(1)}%
                              </div>
                            </div>
                            <div className="p-2 bg-slate-900/70 rounded">
                              <div className="text-[10px] text-slate-400">Lag / Stress</div>
                              <div className="text-slate-200">
                                {(pop.lagProgress * 100).toFixed(0)}% lag · {(pop.stressLevel * 100).toFixed(0)}% stress
                              </div>
                            </div>
                          </div>

                          {sp && (
                            <div className="text-[11px] text-slate-400">
                              Optimal envelope: {sp.tempOptC} °C (range {sp.tempMinC}–{sp.tempMaxC} °C) · pH {sp.phOpt.toFixed(1)} (range {sp.phMin.toFixed(1)}–{sp.phMax.toFixed(1)})
                            </div>
                          )}
                          {idx === 0 && physSnap && (
                            <div className="pt-1.5 border-t border-slate-800/70 text-[11px] font-mono-tabular text-slate-300 flex flex-wrap gap-x-3 gap-y-1">
                              <span>Temp {(physSnap.tempFactor * 100).toFixed(0)}%</span>
                              <span>pH {(physSnap.phFactor * 100).toFixed(0)}%</span>
                              <span>O₂ {(physSnap.oxygenFactor * 100).toFixed(0)}%</span>
                              <span>Media {(physSnap.mediaFactor * 100).toFixed(0)}%</span>
                              <span>Mix {(physSnap.agitationFactor * 100).toFixed(0)}%</span>
                              <span className="text-cyan-300 font-semibold">
                                {physSnap.effectiveDoublingTimeMin !== null
                                  ? `Doubling td ≈ ${physSnap.effectiveDoublingTimeMin.toFixed(1)} min`
                                  : 'Currently Not Dividing'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Active Antibiotics & Susceptibility Breakdown */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">
                    Active Antibiotics &amp; Strain Susceptibility
                  </h4>
                  {activeAntibiotics.length === 0 ? (
                    <div className="p-3 bg-[#0B0E17] border border-slate-800 rounded text-xs text-slate-400">
                      Antibiotic-free vessel (0 µg/mL). No antimicrobial selective pressure present.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeAntibiotics.map(([abId, conc]) => {
                        const ab = getAntibioticById(abId);
                        const decision = primarySpecies
                          ? evaluateAntibioticDecision(primarySpecies, abId, conc)
                          : null;
                        return (
                          <div
                            key={abId}
                            className={`p-3 rounded border text-xs space-y-1 ${
                              decision ? decision.surfaceClass : 'bg-[#0B0E17] border-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold">
                                {ab?.name ?? abId}: {conc.toFixed(abId === 'ciprofloxacin' ? 2 : 1)} µg/mL
                              </span>
                              <span className="font-medium">
                                {decision ? decision.label : ab?.mode}
                              </span>
                            </div>
                            {decision && (
                              <p className="text-[11px] opacity-90">{decision.explanation}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Molecular / DNA Cargo */}
                {(dnaFragments.length > 0 ||
                  vessel.vesselType === 'microtube_1_5ml' ||
                  vessel.vesselType === 'pcr_tube') && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-300">
                        Molecular &amp; DNA Cargo
                      </h4>
                      {dnaPurityStatus && (
                        <span className={`text-xs font-mono-tabular font-semibold ${dnaPurityStatus.textClass}`}>
                          {totalDnaNgUl.toFixed(1)} ng/µL · A260/A280 {avgDnaPurity.toFixed(2)} ({dnaPurityStatus.label})
                        </span>
                      )}
                    </div>

                    {dnaFragments.length === 0 ? (
                      <div className="p-3 bg-[#0B0E17] border border-slate-800 rounded text-xs text-rose-300">
                        Empty DNA tube (0 fragments / 0 ng/µL). No amplified or extracted DNA detected.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {dnaFragments.map((frag) => (
                          <div
                            key={frag.id}
                            className="p-2.5 bg-[#0B0E17] border border-slate-800 rounded flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <span className="font-medium text-teal-300">{frag.name}</span>
                              <span className="text-slate-500 ml-2 capitalize">({frag.topology})</span>
                            </div>
                            <div className="font-mono-tabular text-slate-300">
                              {frag.lengthBp.toLocaleString()} bp · {frag.concentrationNgPerUl.toFixed(1)} ng/µL
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Editable Vessel Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Sample Label Notes
                  </label>
                  <textarea
                    rows={2}
                    value={vessel.notes ?? ''}
                    onChange={(e) => onUpdateVesselNotes(vessel.id, e.target.value)}
                    placeholder="Add observations, experiment tags, or notes for this carried vessel..."
                    className="w-full bg-[#0B0E17] border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
