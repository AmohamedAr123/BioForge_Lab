import React, { useEffect, useRef, useState } from 'react';
import { Activity, BookPlus, Dna, X } from 'lucide-react';
import { getMediaById, getSpeciesById } from '../../data/scientificDatabase';
import { computeNanoDropSpectrum } from '../../engine/molecularEngine';
import { formatScientificCount } from '../../engine/simulation';
import { CultureVessel, LabMode } from '../../types/lab';
import {
  getDnaPurityStatus,
  getNutrientStatus,
  getOxygenStatus,
  getPhStatus,
  getTemperatureStatus,
} from '../../utils/colorCoding';
import { DialAndTriggerTool, DragTool, SlotGridTool } from '../tools';

interface SpectrophotometerConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  selectedVesselId: string | null;
  onLogOdToNotebook: (vessel: CultureVessel, displayedOd?: number) => void;
  onMeasureNanoDrop?: (vessel: CultureVessel) => void;
  onClose: () => void;
}

export const SpectrophotometerConsole: React.FC<SpectrophotometerConsoleProps> = ({
  labMode = 'automate',
  beltVessels,
  allVessels,
  selectedVesselId,
  onLogOdToNotebook,
  onMeasureNanoDrop,
  onClose,
}) => {
  const liquidVessels = [
    ...beltVessels.filter((v) => v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube'),
    ...allVessels.filter(
      (v) =>
        v.location.zone !== 'belt' &&
        (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube')
    ),
  ];

  const dnaVessels = [
    ...beltVessels.filter((v) => (v.dnaFragments?.length ?? 0) > 0),
    ...allVessels.filter(
      (v) => v.location.zone !== 'belt' && (v.dnaFragments?.length ?? 0) > 0
    ),
  ];

  const [mode, setMode] = useState<'od600' | 'nanodrop'>(() => {
    if (selectedVesselId && dnaVessels.some((v) => v.id === selectedVesselId)) {
      return 'nanodrop';
    }
    return 'od600';
  });

  const [cuvetteVesselId, setCuvetteVesselId] = useState<string>(() => {
    if (selectedVesselId && liquidVessels.some((v) => v.id === selectedVesselId)) {
      return selectedVesselId;
    }
    return liquidVessels[0]?.id ?? '';
  });

  const [dnaTubeId, setDnaTubeId] = useState<string>(() => {
    if (selectedVesselId && dnaVessels.some((v) => v.id === selectedVesselId)) {
      return selectedVesselId;
    }
    return dnaVessels[0]?.id ?? '';
  });

  const [isBlanked, setIsBlanked] = useState<boolean>(() => labMode !== 'manual');
  const [cuvetteSlot, setCuvetteSlot] = useState<'blank' | 'sample'>('sample');
  const [pedestalDirtyFromId, setPedestalDirtyFromId] = useState<string | null>(null);
  const [lastNanoDropId, setLastNanoDropId] = useState<string>(dnaTubeId);

  const [loggedFeedback, setLoggedFeedback] = useState<boolean>(false);
  const [beamSweeping, setBeamSweeping] = useState<boolean>(true);
  const sweepTimerRef = useRef<number | null>(null);

  const triggerBeamSweep = () => {
    if (sweepTimerRef.current !== null) {
      window.clearTimeout(sweepTimerRef.current);
    }
    setBeamSweeping(false);
    sweepTimerRef.current = window.setTimeout(() => {
      setBeamSweeping(true);
      sweepTimerRef.current = window.setTimeout(() => {
        setBeamSweeping(false);
      }, 720);
    }, 15);
  };

  useEffect(() => {
    triggerBeamSweep();
    return () => {
      if (sweepTimerRef.current !== null) {
        window.clearTimeout(sweepTimerRef.current);
      }
    };
  }, [mode, cuvetteVesselId, dnaTubeId]);

  const vessel = liquidVessels.find((v) => v.id === cuvetteVesselId) ?? null;
  const dnaTube = dnaVessels.find((v) => v.id === dnaTubeId) ?? null;

  // Require blanking in Manual Mode when switching media or entering manual
  useEffect(() => {
    if (labMode === 'manual') {
      setIsBlanked(false);
    } else {
      setIsBlanked(true);
    }
  }, [labMode, vessel?.mediaId]);

  // Track NanoDrop pedestal carryover if DNA tube switches without wiping clean
  useEffect(() => {
    if (dnaTubeId && lastNanoDropId && dnaTubeId !== lastNanoDropId && labMode === 'manual') {
      setPedestalDirtyFromId(lastNanoDropId);
    }
    setLastNanoDropId(dnaTubeId);
  }, [dnaTubeId, lastNanoDropId, labMode]);

  useEffect(() => {
    if (mode === 'nanodrop' && dnaTube && onMeasureNanoDrop) {
      onMeasureNanoDrop(dnaTube);
    }
  }, [mode, dnaTube, onMeasureNanoDrop]);

  const media = vessel ? getMediaById(vessel.mediaId) : undefined;
  const primaryPop = vessel?.populations[0];
  const species = primaryPop ? getSpeciesById(primaryPop.speciesId) : undefined;
  const tempStatus = vessel
    ? getTemperatureStatus(vessel.temperatureC, vessel.vesselType, species)
    : null;
  const phStatus = vessel ? getPhStatus(vessel.pH, species) : null;
  const oxygenStatus = vessel
    ? getOxygenStatus(vessel.dissolvedO2Percent, vessel.vesselType, species)
    : null;
  const nutrientStatus = vessel ? getNutrientStatus(vessel.nutrientRemaining) : null;

  // Build clean SVG Growth Curve from vessel.history
  const history = vessel?.history ?? [];
  const maxMin = Math.max(60, history[history.length - 1]?.simMinutes ?? 60);
  const maxOd = Math.max(0.5, ...history.map((pt) => pt.od600));

  const chartW = 500;
  const chartH = 210;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const polylinePoints = history
    .map((pt) => {
      const px = padL + (pt.simMinutes / maxMin) * plotW;
      const py = padT + plotH - (pt.od600 / maxOd) * plotH;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

  const blankedOdOffset = labMode === 'manual' && !isBlanked ? 0.085 : 0;
  const displayedOd600 = vessel
    ? cuvetteSlot === 'blank' && labMode === 'manual'
      ? isBlanked
        ? 0
        : 0.085
      : Number((vessel.od600 + blankedOdOffset).toFixed(3))
    : 0;

  // NanoDrop calculations (including pedestal carryover if not wiped in Manual Mode)
  const dnaFragments = dnaTube?.dnaFragments ?? [];
  const rawNgPerUl = dnaFragments.reduce((acc, f) => acc + f.concentrationNgPerUl, 0);
  const rawPurity =
    dnaFragments.length > 0
      ? dnaFragments.reduce((acc, f) => acc + f.purityA260_280, 0) / dnaFragments.length
      : 0;
  const hasCarryover = labMode === 'manual' && pedestalDirtyFromId !== null;
  const totalNgPerUl = hasCarryover ? Number((rawNgPerUl + 18.5).toFixed(1)) : rawNgPerUl;
  const avgPurity =
    rawPurity > 0
      ? hasCarryover
        ? Number(Math.max(1.25, rawPurity - 0.28).toFixed(2))
        : rawPurity
      : 0;
  const purityStatus = dnaTube && dnaFragments.length > 0 ? getDnaPurityStatus(avgPurity) : null;
  const nanoPoints = computeNanoDropSpectrum(totalNgPerUl, avgPurity);
  const maxAbs = Math.max(0.25, ...nanoPoints.map((p) => p.absorbance));
  const nanoPolyline = nanoPoints
    .map((pt) => {
      const px = padL + ((pt.nm - 230) / (320 - 230)) * plotW;
      const py = padT + plotH - (pt.absorbance / maxAbs) * plotH;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {mode === 'od600' ? (
              <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
            ) : (
              <Dna className="w-5 h-5 text-sky-400 shrink-0" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                {mode === 'od600'
                  ? 'UV/Vis Spectrophotometer (λ = 600 nm)'
                  : 'NanoDrop Microvolume Nucleic Acid Reader (260/280 nm)'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'od600'
                  ? 'Quantify bacterial broth turbidity (OD600) and inspect time-series growth kinetics.'
                  : 'Quantify purified DNA yield (ng/µL) and check A260/A280 protein contamination ratios.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setMode('od600')}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap cursor-pointer ${
                  mode === 'od600'
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-100 border border-transparent'
                }`}
              >
                Culture OD600
              </button>
              <button
                type="button"
                onClick={() => setMode('nanodrop')}
                className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap cursor-pointer ${
                  mode === 'nanodrop'
                    ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-100 border border-transparent'
                }`}
              >
                NanoDrop A260/A280
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Spectrophotometer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {mode === 'od600' ? (
          <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Readout & Cuvette Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cuvette Sample Source
                </label>
                <select
                  value={cuvetteVesselId}
                  onChange={(e) => {
                    setCuvetteVesselId(e.target.value);
                    setLoggedFeedback(false);
                  }}
                  className="w-full bg-[#0B0E17] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {liquidVessels.length === 0 && <option value="">No liquid cultures available</option>}
                  {liquidVessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.location.zone === 'belt' ? 'Tray' : v.location.stationId.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              {labMode === 'manual' && (
                <div className="space-y-3">
                  <SlotGridTool
                    title="Cuvette Holder Carousel"
                    columns={2}
                    statusNote={isBlanked ? 'Media Blanked (0.000 AU)' : 'Uncalibrated (+0.085 AU)'}
                    slots={[
                      {
                        id: 'blank',
                        label: 'Ref: Sterile Medium',
                        occupied: cuvetteSlot === 'blank',
                        sublabel: `${media?.shortName ?? 'Blank'} Cuvette`,
                        tone: 'amber',
                        sprite: 'cuvette_blank',
                      },
                      {
                        id: 'sample',
                        label: 'Sample Cuvette',
                        occupied: cuvetteSlot === 'sample',
                        sublabel: vessel?.label ?? 'Empty',
                        tone: 'cyan',
                        sprite: 'cuvette_sample',
                      },
                    ]}
                    onToggleSlot={(id) => setCuvetteSlot(id as 'blank' | 'sample')}
                  />

                  <DialAndTriggerTool
                    label="Calibration: Zero / Blank Spectrophotometer"
                    value={0}
                    min={0}
                    max={1}
                    step={1}
                    hideDial
                    tone={isBlanked ? 'emerald' : 'amber'}
                    disabled={cuvetteSlot !== 'blank'}
                    statusText={cuvetteSlot === 'blank' ? 'Ref Cuvette in Beam' : 'Insert Ref Cuvette First'}
                    triggerLabel={isBlanked ? 'Re-Zero Blank (600 nm)' : 'Zero / Blank on Sterile Medium'}
                    onChangeValue={() => {}}
                    onTrigger={() => {
                      setIsBlanked(true);
                      triggerBeamSweep();
                    }}
                    sprite="cuvette_blank"
                    spriteActive={isBlanked}
                  />
                </div>
              )}

              <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Optical Density (600 nm)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBlanked(true);
                      triggerBeamSweep();
                    }}
                    className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
                  >
                    {isBlanked ? 'Media Blanked' : 'Zero Blank (+0.085 Offset)'}
                  </button>
                </div>

                {/* Adaptive Cuvette & Beer-Lambert 600nm Beam Attenuation Stage */}
                {(() => {
                  const od = displayedOd600;
                  const transmittance = Math.pow(10, -Math.min(2.2, od));
                  const fillFrac = vessel ? Math.min(1, Math.max(0.25, vessel.volumeMl / 120)) : 0.6;
                  const liqH = Math.round(fillFrac * 44);
                  const liqY = 58 - liqH;
                  const speckCount = Math.min(18, Math.round(od * 12));
                  return (
                    <svg viewBox="0 0 260 68" className="w-full h-16 rounded bg-slate-950 border border-slate-800/80">
                      {/* Left 600nm Tungsten-Halogen Source */}
                      <rect x="10" y="24" width="16" height="20" rx="2" fill="#1E293B" stroke="#475569" />
                      <line
                        x1="26"
                        y1="34"
                        x2="108"
                        y2="34"
                        stroke="#22D3EE"
                        strokeWidth="4"
                        strokeOpacity="0.9"
                      />
                      {beamSweeping && (
                        <circle
                          cx="68"
                          cy="34"
                          r="4.5"
                          fill="#67E8F9"
                          style={{ animation: 'lab-beam-sweep 650ms ease-in-out 1' }}
                        />
                      )}

                      {/* 1 cm Quartz Cuvette */}
                      <rect x="108" y="10" width="44" height="50" rx="2" fill="#0F172A" stroke="#64748B" strokeWidth="1.5" />
                      <rect
                        x="110"
                        y={liqY}
                        width="40"
                        height={liqH}
                        fill="#0891B2"
                        fillOpacity={Math.min(0.85, 0.14 + od * 0.48)}
                        className="transition-all duration-300"
                      />
                      {Array.from({ length: speckCount }).map((_, idx) => (
                        <circle
                          key={idx}
                          cx={114 + ((idx * 17) % 32)}
                          cy={Math.max(liqY + 3, 18 + ((idx * 13) % Math.max(8, liqH - 6)))}
                          r="1.3"
                          fill="#E2E8F0"
                          fillOpacity="0.65"
                        />
                      ))}

                      {/* Attenuated Transmitted Beam -> Photodiode */}
                      <line
                        x1="152"
                        y1="34"
                        x2="234"
                        y2="34"
                        stroke="#22D3EE"
                        strokeWidth={Math.max(1, 4 * transmittance)}
                        strokeOpacity={Math.max(0.12, transmittance * 0.95)}
                      />
                      <rect x="234" y="24" width="16" height="20" rx="2" fill="#1E293B" stroke="#475569" />
                      <text
                        x="212"
                        y="16"
                        textAnchor="middle"
                        fill="#94A3B8"
                        fontSize="8.5"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        T = {(transmittance * 100).toFixed(1)}%
                      </text>
                    </svg>
                  );
                })()}

                <div className="text-4xl font-mono-tabular font-bold text-cyan-300">
                  {vessel ? displayedOd600.toFixed(3) : '0.000'}
                  <span className="text-xs font-normal text-slate-400 ml-2">AU</span>
                </div>

                {labMode === 'manual' && !isBlanked && (
                  <div className="text-[11px] text-rose-300">
                    Uncalibrated media background (+0.085 AU offset). Select Reference Cuvette &amp; press Zero / Blank.
                  </div>
                )}

                {vessel && displayedOd600 > 1.0 && (
                  <div className="text-[11px] text-amber-400">
                    Above linear Beer-Lambert threshold (OD &gt; 1.0); detector saturation reduces slope.
                  </div>
                )}

                {vessel && tempStatus && phStatus && oxygenStatus && nutrientStatus && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Organism</span>
                      <span className="text-slate-200">{species?.commonLabel ?? 'Sterile Blank'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Medium</span>
                      <span className="text-slate-200">{media?.shortName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Viable Density</span>
                      <span className="font-mono-tabular text-slate-200">
                        {formatScientificCount(
                          vessel.populations.reduce((acc, p) => acc + p.viableCount, 0)
                        )}{' '}
                        CFU/mL
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400">Temperature</span>
                      <span className={`font-mono-tabular font-medium ${tempStatus.textClass}`}>
                        {vessel.temperatureC.toFixed(1)} °C ({tempStatus.label})
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400">Live pH</span>
                      <span className={`font-mono-tabular font-medium ${phStatus.textClass}`}>
                        {vessel.pH.toFixed(2)} ({phStatus.label})
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400">Dissolved O₂</span>
                      <span className={`font-mono-tabular font-medium ${oxygenStatus.textClass}`}>
                        {vessel.dissolvedO2Percent.toFixed(0)}% ({oxygenStatus.label})
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400">Nutrients Left</span>
                      <span className={`font-mono-tabular font-medium ${nutrientStatus.textClass}`}>
                        {(vessel.nutrientRemaining * 100).toFixed(1)}% ({nutrientStatus.label})
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-800/70 text-[10px] text-slate-500">
                      Status:{' '}
                      <span className="text-emerald-300">Optimal</span> ·{' '}
                      <span className="text-cyan-300">Cold/Lag</span> ·{' '}
                      <span className="text-amber-300">Sub-Optimal</span> ·{' '}
                      <span className="text-rose-300">Stress/Exhausted</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!vessel}
                onClick={() => {
                  if (!vessel) return;
                  triggerBeamSweep();
                  onLogOdToNotebook(vessel, displayedOd600);
                  setLoggedFeedback(true);
                }}
                className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookPlus className="w-4 h-4" />
                {loggedFeedback ? 'Logged to Active Notebook Entry' : 'Record OD600 Reading to Notebook'}
              </button>
            </div>

            {/* Right: Live Time-Series Growth Curve */}
            <div className="lg:col-span-7 bg-[#0B0E17] border border-slate-800 rounded p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-200">
                  Live Growth Curve (OD600 vs. Elapsed Time)
                </h3>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {history.length} data points
                </span>
              </div>

              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = padT + plotH * (1 - frac);
                  const val = (maxOd * frac).toFixed(2);
                  return (
                    <g key={frac}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="#1E293B"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {[0, 0.5, 1].map((frac) => {
                  const x = padL + plotW * frac;
                  const hr = ((maxMin * frac) / 60).toFixed(1);
                  return (
                    <text
                      key={frac}
                      x={x}
                      y={chartH - 8}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {hr}h
                    </text>
                  );
                })}

                {history.length >= 2 && (
                  <polyline
                    fill="none"
                    stroke="#06B6D4"
                    strokeWidth="2.2"
                    points={polylinePoints}
                  />
                )}
              </svg>
            </div>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: NanoDrop Microvolume Pedestal Readout */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  1.5 µL Pedestal DNA Sample
                </label>
                <select
                  value={dnaTubeId}
                  onChange={(e) => setDnaTubeId(e.target.value)}
                  className="w-full bg-[#0B0E17] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  {dnaVessels.length === 0 && (
                    <option value="">No DNA extracts or PCR tubes available</option>
                  )}
                  {dnaVessels.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.dnaFragments?.length ?? 0} loci)
                    </option>
                  ))}
                </select>
              </div>

              {labMode === 'manual' && (
                <DragTool
                  title="NanoDrop Optical Pedestal Maintenance"
                  hint="Wipe upper & lower pedestals between different DNA tubes"
                  tools={[
                    {
                      id: 'lint_free_wipe',
                      label: 'Lint-Free Kimwipe',
                      statusLabel: hasCarryover ? 'Wipe Needed!' : 'Clean',
                      tone: hasCarryover ? 'amber' : 'emerald',
                      sprite: 'kimwipe',
                      spriteActive: hasCarryover,
                    },
                  ]}
                  hotspots={[
                    {
                      id: 'nanodrop_pedestal',
                      label: '1.5 µL Quartz Pedestal',
                      statusLabel: hasCarryover
                        ? 'DNA Carryover (+18.5 ng/µL)'
                        : 'Clean & Blanked',
                      tone: hasCarryover ? 'rose' : 'emerald',
                      sprite: 'nanodrop',
                      spriteActive: hasCarryover,
                    },
                  ]}
                  onApply={() => setPedestalDirtyFromId(null)}
                />
              )}

              <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">dsDNA Concentration</span>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    1.0 A260 = 50 ng/µL
                  </span>
                </div>

                {/* Adaptive NanoDrop 1.5 µL Microvolume Optical Pedestal Visualizer */}
                <svg viewBox="0 0 260 66" className="w-full h-16 rounded bg-slate-950 border border-slate-800/80">
                  {/* Upper & Lower Optical Pedestals */}
                  <rect x="112" y="4" width="36" height="14" rx="2" fill="#334155" stroke="#64748B" />
                  <rect x="112" y="48" width="36" height="14" rx="2" fill="#334155" stroke="#64748B" />
                  {/* 1.5 µL Liquid Bridge Column */}
                  <path
                    d="M120 18 Q125 33 120 48 L140 48 Q135 33 140 18 Z"
                    fill={avgPurity >= 1.75 ? '#38BDF8' : avgPurity >= 1.55 ? '#FBBF24' : '#FB7185'}
                    fillOpacity={dnaTube ? Math.min(0.85, 0.25 + totalNgPerUl / 280) : 0.15}
                  />
                  {/* Vertical UV Path (260/280 nm Xenon flash) */}
                  <line
                    x1="130"
                    y1="14"
                    x2="130"
                    y2="52"
                    stroke={avgPurity >= 1.75 ? '#7DD3FC' : '#FCD34D'}
                    strokeWidth={beamSweeping ? '3.5' : '1.5'}
                    strokeOpacity={dnaTube ? 0.9 : 0.25}
                  />
                  <text
                    x="166"
                    y="36"
                    fill="#94A3B8"
                    fontSize="9"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    1.5 µL · λ260/280nm
                  </text>
                </svg>

                <div className="text-4xl font-mono-tabular font-bold text-sky-300">
                  {dnaTube ? totalNgPerUl.toFixed(1) : '0.0'}
                  <span className="text-xs font-normal text-slate-400 ml-2">ng/µL</span>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">A260 / A280 Purity Ratio</span>
                    <span
                      className={`font-mono-tabular font-semibold ${
                        purityStatus ? purityStatus.textClass : 'text-slate-400'
                      }`}
                    >
                      {dnaTube ? avgPurity.toFixed(2) : '—'}
                      {purityStatus ? ` (${purityStatus.label})` : ''}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Peak A260 Absorbance</span>
                    <span className="font-mono-tabular text-slate-200">
                      {(totalNgPerUl / 50).toFixed(2)} AU
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500">
                    Purity:{' '}
                    <span className="text-emerald-300">≥1.75 Pure</span> ·{' '}
                    <span className="text-amber-300">1.55–1.74 Minor Carryover</span> ·{' '}
                    <span className="text-rose-300">&lt;1.55 Contaminated</span>
                  </div>

                  {dnaTube && dnaFragments.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      <div className="text-[11px] text-slate-400">Detected DNA Species</div>
                      {dnaFragments.map((f) => (
                        <div
                          key={f.id}
                          className="flex justify-between text-[11px] font-mono-tabular text-slate-300"
                        >
                          <span className="truncate">{f.name}</span>
                          <span className="shrink-0 ml-2">
                            {f.lengthBp} bp · {f.concentrationNgPerUl} ng/µL
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: 230-320 nm UV Absorbance Spectrum */}
            <div className="lg:col-span-7 bg-[#0B0E17] border border-slate-800 rounded p-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-200">
                  UV Absorbance Spectrum (230–320 nm)
                </h3>
                <span className="text-[11px] font-mono-tabular text-sky-400">
                  Peak λ = 260 nm (DNA) · 280 nm (Protein)
                </span>
              </div>

              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto">
                {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
                  const y = padT + plotH * (1 - frac);
                  return (
                    <g key={frac}>
                      <line
                        x1={padL}
                        y1={y}
                        x2={chartW - padR}
                        y2={y}
                        stroke="#1E293B"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 6}
                        y={y + 3}
                        textAnchor="end"
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {(maxAbs * frac).toFixed(2)}
                      </text>
                    </g>
                  );
                })}

                {/* Reference vertical markers at 260 nm and 280 nm */}
                {[
                  { nm: 260, label: '260nm', color: '#38BDF8' },
                  { nm: 280, label: '280nm', color: '#F59E0B' },
                ].map((m) => {
                  const mx = padL + ((m.nm - 230) / (320 - 230)) * plotW;
                  return (
                    <g key={m.nm}>
                      <line
                        x1={mx}
                        y1={padT}
                        x2={mx}
                        y2={padT + plotH}
                        stroke={m.color}
                        strokeOpacity="0.35"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={mx}
                        y={padT + 10}
                        textAnchor="middle"
                        fill={m.color}
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}

                {[230, 260, 290, 320].map((nm) => {
                  const x = padL + ((nm - 230) / (320 - 230)) * plotW;
                  return (
                    <text
                      key={nm}
                      x={x}
                      y={chartH - 8}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {nm}nm
                    </text>
                  );
                })}

                {dnaTube && (
                  <polyline
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.4"
                    points={nanoPolyline}
                  />
                )}
              </svg>

              <p className="text-[11px] text-slate-400 mt-2">
                Clean DNA exhibits a sharp single peak centered at 260 nm (A260/A280 ≈ 1.83). Skipping the ethanol wash during miniprep extraction creates a shoulder near 280 nm and 230 nm.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

