import React, { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Droplets, Flame, Power, X } from 'lucide-react';
import {
  getMediaById,
  getNutrientSupplementById,
  getSpeciesById,
  NUTRIENT_SUPPLEMENTS,
} from '../../data/scientificDatabase';
import {
  computeVesselPhysiologySnapshot,
  formatScientificCount,
  getMaxSafeVolumeMl,
} from '../../engine/simulation';
import {
  CultureVessel,
  ShakingIncubatorConfig,
  StaticIncubatorConfig,
} from '../../types/lab';
import {
  getGrowthPhaseStatus,
  getNutrientStatus,
  getOxygenStatus,
  getPhStatus,
  getTemperatureStatus,
} from '../../utils/colorCoding';
import { BELT_CAPACITY } from '../SampleBelt';

interface IncubatorConsoleProps {
  mode: 'shaking' | 'static';
  vessels: CultureVessel[];
  beltVessels: CultureVessel[];
  shakingConfig: ShakingIncubatorConfig;
  staticConfig: StaticIncubatorConfig;
  onUpdateShakingConfig: (next: ShakingIncubatorConfig) => void;
  onUpdateStaticConfig: (next: StaticIncubatorConfig) => void;
  onMoveToBelt: (vesselId: string) => void;
  onMoveToEquipment: (
    vesselId: string,
    stationId: 'shaking_incubator' | 'static_incubator',
    slotIndex: number
  ) => void;
  onFeedCulture: (vesselId: string, supplementId: string, feedMl: number) => void;
  onClose: () => void;
}

const PlateVisualizer: React.FC<{ vessel: CultureVessel }> = ({ vessel }) => {
  const media = getMediaById(vessel.mediaId);
  const pop = vessel.populations[0];
  const species = pop ? getSpeciesById(pop.speciesId) : undefined;

  const colonies = useMemo(() => {
    const count = Math.min(140, vessel.colonyCount);
    const items: Array<{ x: number; y: number; r: number }> = [];
    let seed = 0;
    for (let i = 0; i < vessel.id.length; i++) {
      seed = (seed * 31 + vessel.id.charCodeAt(i)) % 99991;
    }
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const radiusPx = Math.max(1.4, Math.min(6.5, vessel.colonyDiameterMm * 1.45));
    for (let i = 0; i < count; i++) {
      const angle = nextRand() * Math.PI * 2;
      const dist = Math.sqrt(nextRand()) * 58;
      items.push({
        x: 75 + Math.cos(angle) * dist,
        y: 75 + Math.sin(angle) * dist,
        r: radiusPx * (0.75 + nextRand() * 0.45),
      });
    }
    return items;
  }, [vessel.id, vessel.colonyCount, vessel.colonyDiameterMm]);

  const colonyColor =
    media?.isMacConkey && species?.colonyProfile.macConkeyColorHex
      ? species.colonyProfile.macConkeyColorHex
      : species?.colonyProfile.colorHex ?? '#E2E8F0';

  return (
    <div className="flex flex-col items-center p-3 bg-[#0B0E17] border border-slate-800 rounded">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0">
        <circle cx="75" cy="75" r="70" fill="#1E293B" stroke="#475569" strokeWidth="2" />
        <circle
          cx="75"
          cy="75"
          r="64"
          fill={media?.baseColorHex ?? '#D7C59B'}
          fillOpacity={0.85}
        />
        {vessel.colonyDiameterMm >= 0.25 &&
          colonies.map((c, idx) => (
            <circle
              key={idx}
              cx={c.x}
              cy={c.y}
              r={c.r}
              fill={colonyColor}
              fillOpacity={species?.colonyProfile.opacity ?? 0.9}
              stroke={species?.colonyProfile.edgeHex ?? '#94A3B8'}
              strokeWidth="0.6"
            />
          ))}
      </svg>
      <div className="mt-2 text-center text-xs">
        <div className="font-medium text-slate-200">{vessel.label}</div>
        <div className="font-mono-tabular text-[11px] text-slate-400">
          {vessel.colonyDiameterMm >= 0.25
            ? `${vessel.colonyCount} colonies · Ø ${vessel.colonyDiameterMm.toFixed(1)} mm`
            : 'Incubating — colonies not yet macroscopic'}
        </div>
        {species && vessel.colonyDiameterMm >= 0.25 && (
          <div className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
            {species.colonyProfile.description}
          </div>
        )}
      </div>
    </div>
  );
};

export const IncubatorConsole: React.FC<IncubatorConsoleProps> = ({
  mode,
  vessels,
  beltVessels,
  shakingConfig,
  staticConfig,
  onUpdateShakingConfig,
  onUpdateStaticConfig,
  onMoveToBelt,
  onMoveToEquipment,
  onFeedCulture,
  onClose,
}) => {
  const stationId = mode === 'shaking' ? 'shaking_incubator' : 'static_incubator';
  const chamberVessels = vessels.filter(
    (v) => v.location.zone === 'equipment' && v.location.stationId === stationId
  );

  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(() => {
    const firstPlate = chamberVessels.find((v) => v.vesselType === 'agar_plate');
    return firstPlate?.id ?? null;
  });
  const [feedingVesselId, setFeedingVesselId] = useState<string | null>(null);
  const [quickSuppId, setQuickSuppId] = useState<string>('glucose_20');
  const [quickDoseMl, setQuickDoseMl] = useState<number>(1.5);

  const configTemp = mode === 'shaking' ? shakingConfig.targetTempC : staticConfig.targetTempC;
  const powerOn = mode === 'shaking' ? shakingConfig.powerOn : staticConfig.powerOn;

  const compatibleBeltVessels = beltVessels.filter((v) => {
    if (
      v.vesselType === 'glycerol_stock' ||
      v.vesselType === 'microtube_1_5ml' ||
      v.vesselType === 'pcr_tube'
    ) {
      return false;
    }
    if (mode === 'shaking') return v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube';
    return true;
  });

  const handleLoadVessel = (vesselId: string) => {
    const used = new Set(
      chamberVessels.map((v) => (v.location.zone === 'equipment' ? v.location.slotIndex : -1))
    );
    let slot = 0;
    while (used.has(slot) && slot < 6) slot++;
    if (slot < 6) {
      onMoveToEquipment(vesselId, stationId, slot);
      const v = beltVessels.find((b) => b.id === vesselId);
      if (v?.vesselType === 'agar_plate') setSelectedPlateId(v.id);
    }
  };

  const inspectedPlate =
    chamberVessels.find((v) => v.id === selectedPlateId && v.vesselType === 'agar_plate') ??
    chamberVessels.find((v) => v.vesselType === 'agar_plate') ??
    null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {mode === 'shaking'
                  ? 'Orbital Shaking Incubator (Liquid Broth)'
                  : 'Static Convection Incubator (Agar Plates & Tubes)'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'shaking'
                  ? 'Controls chamber temperature and orbital aeration RPM for submerged bacterial growth.'
                  : 'Maintains stable thermal environment for colony development on solid agar plates.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Incubator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Hardware Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">Chamber Thermostat</span>
                <button
                  type="button"
                  onClick={() =>
                    mode === 'shaking'
                      ? onUpdateShakingConfig({ ...shakingConfig, powerOn: !powerOn })
                      : onUpdateStaticConfig({ ...staticConfig, powerOn: !powerOn })
                  }
                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 cursor-pointer ${
                    powerOn
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {powerOn ? 'Heater On' : 'Standby'}
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Setpoint Temperature</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const nextTemp = Number(Math.max(15, configTemp - 0.5).toFixed(1));
                        if (mode === 'shaking') {
                          onUpdateShakingConfig({ ...shakingConfig, targetTempC: nextTemp });
                        } else {
                          onUpdateStaticConfig({ ...staticConfig, targetTempC: nextTemp });
                        }
                      }}
                      className="px-1.5 py-0.5 text-[11px] font-mono-tabular bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    >
                      -0.5°
                    </button>
                    <span className="text-lg font-mono-tabular font-semibold text-amber-300 min-w-[74px] text-center">
                      {configTemp.toFixed(1)} °C
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextTemp = Number(Math.min(50, configTemp + 0.5).toFixed(1));
                        if (mode === 'shaking') {
                          onUpdateShakingConfig({ ...shakingConfig, targetTempC: nextTemp });
                        } else {
                          onUpdateStaticConfig({ ...staticConfig, targetTempC: nextTemp });
                        }
                      }}
                      className="px-1.5 py-0.5 text-[11px] font-mono-tabular bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                    >
                      +0.5°
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  step={0.1}
                  value={configTemp}
                  onChange={(e) => {
                    const temp = Number(Number(e.target.value).toFixed(1));
                    if (mode === 'shaking') {
                      onUpdateShakingConfig({ ...shakingConfig, targetTempC: temp });
                    } else {
                      onUpdateStaticConfig({ ...staticConfig, targetTempC: temp });
                    }
                  }}
                  className="w-full accent-amber-400"
                />
                <div className="flex justify-between text-[11px] font-mono-tabular text-slate-500 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      mode === 'shaking'
                        ? onUpdateShakingConfig({ ...shakingConfig, targetTempC: 25 })
                        : onUpdateStaticConfig({ ...staticConfig, targetTempC: 25 })
                    }
                    className="hover:text-slate-300 cursor-pointer"
                  >
                    25 °C
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mode === 'shaking'
                        ? onUpdateShakingConfig({ ...shakingConfig, targetTempC: 30 })
                        : onUpdateStaticConfig({ ...staticConfig, targetTempC: 30 })
                    }
                    className="hover:text-slate-300 cursor-pointer"
                  >
                    30 °C
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mode === 'shaking'
                        ? onUpdateShakingConfig({ ...shakingConfig, targetTempC: 37 })
                        : onUpdateStaticConfig({ ...staticConfig, targetTempC: 37 })
                    }
                    className="hover:text-slate-300 cursor-pointer"
                  >
                    37 °C (Opt)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mode === 'shaking'
                        ? onUpdateShakingConfig({ ...shakingConfig, targetTempC: 45 })
                        : onUpdateStaticConfig({ ...staticConfig, targetTempC: 45 })
                    }
                    className="hover:text-slate-300 cursor-pointer"
                  >
                    45 °C (Heat)
                  </button>
                </div>
              </div>

              {mode === 'shaking' && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Orbital Agitation</span>
                    <span className="text-lg font-mono-tabular font-semibold text-cyan-300">
                      {shakingConfig.rpm} RPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={5}
                    value={shakingConfig.rpm}
                    onChange={(e) =>
                      onUpdateShakingConfig({
                        ...shakingConfig,
                        rpm: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Every 5 RPM increment smoothly alters dissolved O₂ transfer (kLa) and boundary-layer nutrient mixing.
                  </p>
                </div>
              )}

              {/* Live Adaptive Chamber Animation (scales with RPM, Volume mL, OD600, and Temp °C) */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-300">
                    {mode === 'shaking' ? 'Live Orbital Shaker Deck' : 'Live Thermal Convection Chamber'}
                  </span>
                  <span className="font-mono-tabular text-amber-300">
                    {powerOn
                      ? `${configTemp.toFixed(1)} °C${mode === 'shaking' ? ` · ${shakingConfig.rpm} RPM` : ''}`
                      : 'Chamber Offline'}
                  </span>
                </div>

                {(() => {
                  const orbitActive = mode === 'shaking' && powerOn && shakingConfig.rpm > 0;
                  const orbitPeriodSec = orbitActive
                    ? Math.max(0.24, 1.45 - (shakingConfig.rpm / 300) * 1.15)
                    : 0;
                  const orbitRadiusPx = orbitActive
                    ? Number((1.2 + (shakingConfig.rpm / 300) * 3.8).toFixed(1))
                    : 0;
                  const heatIntensity = powerOn ? Math.max(0, Math.min(1, (configTemp - 15) / 35)) : 0;

                  return (
                    <div
                      className="relative p-3 rounded border border-slate-800 overflow-hidden bg-[#060911]"
                      style={{
                        boxShadow: powerOn
                          ? `inset 0 0 ${Math.round(8 + heatIntensity * 18)}px rgba(245, 158, 11, ${(0.06 + heatIntensity * 0.16).toFixed(2)})`
                          : 'none',
                      }}
                    >
                      <div
                        className="flex items-end justify-around gap-2 min-h-[62px]"
                        style={
                          orbitActive
                            ? ({
                                '--orbit-r': `${orbitRadiusPx}px`,
                                animation: `lab-orbit ${orbitPeriodSec.toFixed(2)}s linear infinite`,
                              } as React.CSSProperties)
                            : undefined
                        }
                      >
                        {chamberVessels.length === 0 ? (
                          <div className="text-[11px] text-slate-600 py-3">
                            Load vessels from Sample Tray to observe live agitation &amp; heating
                          </div>
                        ) : (
                          chamberVessels.slice(0, 6).map((cv) => {
                            const fillPct =
                              cv.vesselType === 'agar_plate'
                                ? 30
                                : cv.vesselType === 'culture_tube'
                                ? Math.max(20, Math.min(92, (cv.volumeMl / 12) * 100))
                                : Math.max(18, Math.min(92, (cv.volumeMl / 120) * 100));
                            const bubbleDurSec = orbitActive
                              ? Math.max(0.55, 2.2 - (shakingConfig.rpm / 300) * 1.55)
                              : 0;
                            const mRecipe = getMediaById(cv.mediaId);

                            return (
                              <div key={cv.id} className="flex flex-col items-center gap-1">
                                <div
                                  className={`relative border border-slate-600 bg-slate-950/80 overflow-hidden flex items-end ${
                                    cv.vesselType === 'agar_plate'
                                      ? 'w-9 h-4 rounded-full'
                                      : cv.vesselType === 'culture_tube'
                                      ? 'w-4 h-12 rounded-b-full'
                                      : 'w-8 h-11 rounded-t-sm rounded-b-md'
                                  }`}
                                >
                                  <div
                                    className="w-full transition-all duration-200"
                                    style={{
                                      height: `${fillPct}%`,
                                      backgroundColor: mRecipe?.baseColorHex ?? '#D4B475',
                                      opacity: Math.min(0.96, 0.55 + cv.od600 * 0.25),
                                    }}
                                  />
                                  {orbitActive && cv.vesselType !== 'agar_plate' && (
                                    <span
                                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-200"
                                      style={{
                                        animation: `lab-bubble-rise ${bubbleDurSec.toFixed(2)}s ease-out infinite`,
                                      }}
                                    />
                                  )}
                                  {powerOn && mode === 'static' && (
                                    <span
                                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-300/70"
                                      style={{
                                        animation: `lab-bubble-rise ${(2.4 - heatIntensity * 1.2).toFixed(2)}s ease-out infinite`,
                                      }}
                                    />
                                  )}
                                </div>
                                <span className="text-[9px] font-mono-tabular text-slate-400">
                                  {cv.volumeMl}mL
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {mode === 'static' && inspectedPlate && <PlateVisualizer vessel={inspectedPlate} />}
          </div>

          {/* Right: 6 Chamber Slots + Load from Belt */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-200">
                  Incubator Rack ({chamberVessels.length}/6 Occupied)
                </h3>
                <span className="text-[10px] text-slate-400">
                  <span className="text-emerald-300">Optimal</span> ·{' '}
                  <span className="text-amber-300">Sub-Optimal</span> ·{' '}
                  <span className="text-rose-300">Stress/Lysis</span>
                </span>
              </div>

              {chamberVessels.length === 0 ? (
                <div className="p-5 border border-dashed border-slate-800 rounded text-xs text-slate-500 text-center">
                  Incubator rack is empty. Load vessels from your Carried Sample Tray below.
                </div>
              ) : (
                <div className="space-y-2">
                  {chamberVessels.map((v) => {
                    const pop = v.populations[0];
                    const sp = pop ? getSpeciesById(pop.speciesId) : undefined;
                    const media = getMediaById(v.mediaId);
                    const totalViable = v.populations.reduce((acc, p) => acc + p.viableCount, 0);

                    const tStatus = getTemperatureStatus(v.temperatureC, v.vesselType, sp);
                    const pStatus = getPhStatus(v.pH, sp);
                    const o2Status = getOxygenStatus(v.dissolvedO2Percent, v.vesselType, sp);
                    const nutrStatus = getNutrientStatus(v.nutrientRemaining);
                    const phaseStatus = pop ? getGrowthPhaseStatus(pop.phase) : null;
                    const physSnap = computeVesselPhysiologySnapshot(
                      v,
                      shakingConfig,
                      staticConfig
                    );
                    const isLiquidBroth =
                      v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube';
                    const isFeedOpen = feedingVesselId === v.id;
                    const maxSafeVol = getMaxSafeVolumeMl(v.vesselType);
                    const headroomMl = Math.max(
                      0,
                      Number((maxSafeVol - v.volumeMl).toFixed(1))
                    );
                    const activeSupp =
                      getNutrientSupplementById(quickSuppId) ?? NUTRIENT_SUPPLEMENTS[0];
                    const clampedQuickDose =
                      headroomMl > 0
                        ? Number(
                            Math.max(
                              Math.min(activeSupp.minDoseMl, headroomMl),
                              Math.min(activeSupp.maxDoseMl, headroomMl, quickDoseMl)
                            ).toFixed(1)
                          )
                        : 0;

                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          if (v.vesselType === 'agar_plate') setSelectedPlateId(v.id);
                        }}
                        className={`p-3 bg-[#0B0E17] border rounded space-y-2 ${
                          selectedPlateId === v.id
                            ? 'border-amber-500/60'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="text-sm font-medium text-slate-100 truncate">
                              {v.label}
                            </div>
                            <div className="text-xs text-slate-400">
                              <span>{sp?.commonLabel ?? 'Sterile'}</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{media?.shortName}</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span className="font-mono-tabular">{v.volumeMl} mL</span>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span className={phaseStatus?.textClass ?? 'text-slate-300'}>
                                {phaseStatus?.label ?? 'Sterile'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-mono-tabular">
                              {v.vesselType === 'agar_plate' ? (
                                <span className="text-amber-300">
                                  {v.colonyCount} col · Ø {v.colonyDiameterMm.toFixed(1)} mm
                                </span>
                              ) : (
                                <>
                                  <span className="text-cyan-300">OD {v.od600.toFixed(3)}</span>
                                  <span className="text-slate-400">
                                    {formatScientificCount(totalViable)} CFU/mL
                                  </span>
                                  <span className={nutrStatus.textClass}>
                                    Nutr {(v.nutrientRemaining * 100).toFixed(0)}%
                                  </span>
                                </>
                              )}
                              <span className={tStatus.textClass}>
                                {v.temperatureC.toFixed(1)} °C ({tStatus.label})
                              </span>
                              <span className={pStatus.textClass}>
                                pH {v.pH.toFixed(2)} ({pStatus.label})
                              </span>
                              {v.vesselType !== 'agar_plate' && (
                                <span className={o2Status.textClass}>
                                  DO₂ {v.dissolvedO2Percent.toFixed(0)}%
                                </span>
                              )}
                            </div>
                            {physSnap && (
                              <div className="text-[10px] font-mono-tabular text-slate-400">
                                Live Rates: T {(physSnap.tempFactor * 100).toFixed(0)}% · pH{' '}
                                {(physSnap.phFactor * 100).toFixed(0)}% · O₂{' '}
                                {(physSnap.oxygenFactor * 100).toFixed(0)}% · Mix{' '}
                                {(physSnap.agitationFactor * 100).toFixed(0)}% ·{' '}
                                <span className="text-cyan-300">
                                  {physSnap.effectiveDoublingTimeMin !== null
                                    ? `td ≈ ${physSnap.effectiveDoublingTimeMin.toFixed(1)} min`
                                    : physSnap.netRatePerMin < -0.0002
                                    ? 'Net Decline'
                                    : 'Arrested'}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isLiquidBroth && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFeedingVesselId(isFeedOpen ? null : v.id);
                                }}
                                className={`px-2.5 py-1.5 text-xs font-medium rounded flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer border ${
                                  isFeedOpen
                                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                                    : 'bg-slate-900 border-slate-700 hover:border-emerald-500/50 text-emerald-300'
                                }`}
                                title="Administer sterile fed-batch nutrient feed"
                              >
                                <Droplets className="w-3.5 h-3.5" />
                                Feed
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMoveToBelt(v.id);
                              }}
                              disabled={beltVessels.length >= BELT_CAPACITY}
                              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 rounded flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <ArrowUpFromLine className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </div>

                        {isLiquidBroth && isFeedOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <select
                              value={quickSuppId}
                              onChange={(e) => {
                                const nextId = e.target.value;
                                setQuickSuppId(nextId);
                                const nextSupp = getNutrientSupplementById(nextId);
                                if (nextSupp) setQuickDoseMl(nextSupp.defaultDoseMl);
                              }}
                              className="sm:col-span-5 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                            >
                              {NUTRIENT_SUPPLEMENTS.map((sup) => (
                                <option key={sup.id} value={sup.id}>
                                  {sup.shortName}
                                </option>
                              ))}
                            </select>

                            {headroomMl <= 0.05 ? (
                              <span className="sm:col-span-7 text-[11px] text-rose-300">
                                At {maxSafeVol} mL safe capacity
                              </span>
                            ) : (
                              <>
                                <div className="sm:col-span-4 flex items-center gap-2">
                                  <input
                                    type="range"
                                    min={Math.min(activeSupp.minDoseMl, headroomMl)}
                                    max={Math.min(activeSupp.maxDoseMl, headroomMl)}
                                    step={Math.min(activeSupp.stepMl, Math.max(0.1, headroomMl))}
                                    value={clampedQuickDose}
                                    onChange={(e) => setQuickDoseMl(Number(e.target.value))}
                                    className="flex-1 accent-emerald-400"
                                  />
                                  <span className="text-[11px] font-mono-tabular text-emerald-300 w-12 text-right">
                                    {clampedQuickDose.toFixed(1)}mL
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  disabled={clampedQuickDose <= 0}
                                  onClick={() => {
                                    onFeedCulture(v.id, activeSupp.id, clampedQuickDose);
                                  }}
                                  className="sm:col-span-3 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded whitespace-nowrap cursor-pointer"
                                >
                                  Add Feed
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
                Load from Carried Sample Tray
              </h3>
              {compatibleBeltVessels.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {mode === 'shaking'
                    ? 'No flasks or culture tubes in your Sample Tray.'
                    : 'No compatible vessels in your Sample Tray.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {compatibleBeltVessels.map((v) => {
                    const sp = v.populations[0] ? getSpeciesById(v.populations[0].speciesId) : undefined;
                    const pSt = getPhStatus(v.pH, sp);
                    return (
                      <div
                        key={v.id}
                        className="p-2.5 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate">{v.label}</div>
                          <div className="text-[11px] font-mono-tabular text-slate-400">
                            {v.vesselType === 'agar_plate'
                              ? 'Agar Plate'
                              : `OD ${v.od600.toFixed(2)}`}{' '}
                            · <span className={pSt.textClass}>pH {v.pH.toFixed(2)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={chamberVessels.length >= 6}
                          onClick={() => handleLoadVessel(v.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          Load
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
