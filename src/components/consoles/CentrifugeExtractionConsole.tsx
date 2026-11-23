import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dna, Disc, Sparkles, X } from 'lucide-react';
import { getSpeciesById } from '../../data/scientificDatabase';
import { extractDnaFromCulture } from '../../engine/molecularEngine';
import { formatScientificCount } from '../../engine/simulation';
import { CultureVessel, DNAFragmentSample, LabMode } from '../../types/lab';
import {
  DialAndTriggerTool,
  DragTool,
  SlotGridTool,
  isRotorBalanced,
  type SlotGridItem,
} from '../tools';

interface CentrifugeExtractionConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  beltCapacity: number;
  onCreateDnaExtract: (params: {
    label: string;
    fragments: DNAFragmentSample[];
    sourceVessel: CultureVessel;
    hasPlasmid: boolean;
  }) => void;
  onClose: () => void;
}

type SpinStage = 'idle' | 'pelleting' | 'washing' | 'eluting' | 'done';

export const CentrifugeExtractionConsole: React.FC<CentrifugeExtractionConsoleProps> = ({
  labMode = 'automate',
  beltVessels,
  allVessels,
  beltCapacity,
  onCreateDnaExtract,
  onClose,
}) => {
  const liquidCultures = [
    ...beltVessels.filter((v) => v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube'),
    ...allVessels.filter(
      (v) =>
        v.location.zone !== 'belt' &&
        (v.vesselType === 'flask_250ml' || v.vesselType === 'culture_tube')
    ),
  ];

  const [sourceId, setSourceId] = useState<string>(liquidCultures[0]?.id ?? '');
  const [rcfXg, setRcfXg] = useState<number>(12000);
  const [spinMinutes, setSpinMinutes] = useState<number>(3);
  const [includeEthanolWash, setIncludeEthanolWash] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [spinStage, setSpinStage] = useState<SpinStage>('idle');
  const [lastResult, setLastResult] = useState<ReturnType<typeof extractDnaFromCulture> | null>(
    null
  );

  // Manual Mode states: Pipette Rack, 56°C Lysis Block, 8-place Rotor Balance
  const [selectedPipette, setSelectedPipette] = useState<'P20' | 'P200' | 'P1000'>('P200');
  const [heatBlockLysisDone, setHeatBlockLysisDone] = useState<boolean>(false);
  const [lysisBlockTempC, setLysisBlockTempC] = useState<number>(56);
  const [rotorOccupied, setRotorOccupied] = useState<boolean[]>([
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]);

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const rotorSlotItems: SlotGridItem[] = useMemo(
    () =>
      rotorOccupied.map((occ, idx) => ({
        id: `rotor_${idx}`,
        label: String(idx + 1),
        occupied: occ,
        sublabel: occ ? (idx === 0 ? 'Sample' : 'Balance') : 'Empty',
        sprite: 'rotor_tube' as const,
      })),
    [rotorOccupied]
  );

  const rotorIsBalanced = labMode !== 'manual' || isRotorBalanced(rotorSlotItems);
  const pipetteAccuracyFactor =
    selectedPipette === 'P200' ? 1.0 : selectedPipette === 'P1000' ? 0.84 : 0.72;

  const selectedCulture = liquidCultures.find((v) => v.id === sourceId) ?? null;

  // Continuous physics scaling: 2,000 xg (~1.10s/rev) up to 16,000 xg (~0.18s/rev)
  const rcfNorm = Math.max(0, Math.min(1, (rcfXg - 2000) / 14000));
  const spinPeriodSec = Number((1.1 - rcfNorm * 0.92).toFixed(2));
  // Spin duration scales cleanly with spinMinutes: 1 min -> 600ms .. 5 min -> 1400ms
  const totalAnimMs = 420 + spinMinutes * 200;

  // Pellet size & compaction preview based on OD600 and RCF
  const cultureOd = selectedCulture?.od600 ?? 0;
  const pelletRadius = Math.max(3, Math.min(13, 3 + cultureOd * 7.5));
  const pelletHeight = Math.max(3.5, Math.min(9, (4 + cultureOd * 4) * (1.15 - rcfNorm * 0.45)));

  const handleRunExtraction = () => {
    if (!selectedCulture || beltVessels.length >= beltCapacity || isSpinning || !rotorIsBalanced) {
      return;
    }
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    setIsSpinning(true);
    setSpinStage('pelleting');

    const t1 = window.setTimeout(() => {
      setSpinStage('washing');
    }, Math.round(totalAnimMs * 0.38));

    const t2 = window.setTimeout(() => {
      setSpinStage('eluting');
    }, Math.round(totalAnimMs * 0.72));

    const t3 = window.setTimeout(() => {
      const res = extractDnaFromCulture({
        sourceVessel: selectedCulture,
        rcfXg,
        spinMinutes,
        includeEthanolWash,
        pipetteAccuracyFactor: labMode === 'manual' ? pipetteAccuracyFactor : 1.0,
        heatBlockLysisDone: labMode === 'manual' ? heatBlockLysisDone : true,
      });
      setLastResult(res);
      setIsSpinning(false);
      setSpinStage('done');

      if (res.fragments.length > 0) {
        const hasPlasmid = res.fragments.some((f) => f.topology === 'circular');
        const sp = selectedCulture.populations[0]
          ? getSpeciesById(selectedCulture.populations[0].speciesId)
          : undefined;
        const shortSp = sp?.commonLabel.replace(/\s+/g, '') ?? 'DNA';
        onCreateDnaExtract({
          label: `${shortSp}-${hasPlasmid ? 'Plasmid+gDNA' : 'gDNA'}`,
          fragments: res.fragments,
          sourceVessel: selectedCulture,
          hasPlasmid,
        });
      }
    }, totalAnimMs);

    timersRef.current = [t1, t2, t3];
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Disc
              className="w-5 h-5 text-sky-400 shrink-0"
              style={
                isSpinning
                  ? { animation: `lab-swirl-spin ${spinPeriodSec}s linear infinite` }
                  : undefined
              }
            />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Microcentrifuge &amp; Spin-Column DNA Extraction
              </h2>
              <p className="text-xs text-slate-400">
                Pellet bacterial cells at high RCF (×g), lyse membranes, wash proteins away, and elute pure DNA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Microcentrifuge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Rotor & Miniprep Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                1. Harvest Source Broth Culture (1.5 mL aliquot)
              </label>
              <select
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setLastResult(null);
                  setSpinStage('idle');
                }}
                className="w-full bg-[#0B0E17] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {liquidCultures.length === 0 && (
                  <option value="">No liquid cultures available</option>
                )}
                {liquidCultures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} (OD {v.od600.toFixed(2)})
                  </option>
                ))}
              </select>
              {selectedCulture && (
                <div className="text-[11px] font-mono-tabular text-slate-400 mt-1.5">
                  OD600: {selectedCulture.od600.toFixed(3)} · Viable:{' '}
                  {formatScientificCount(
                    selectedCulture.populations.reduce((a, p) => a + p.viableCount, 0)
                  )}{' '}
                  CFU/mL
                </div>
              )}
            </div>

            {labMode === 'manual' ? (
              <div className="space-y-3">
                <SlotGridTool
                  title="2. Micropipette Rack (Buffer Transfer: P200 Optimal)"
                  columns={3}
                  statusNote={`Selected: ${selectedPipette} (${Math.round(pipetteAccuracyFactor * 100)}% accuracy)`}
                  slots={(['P20', 'P200', 'P1000'] as const).map((p) => ({
                    id: p,
                    label: p,
                    occupied: selectedPipette === p,
                    sublabel: p === 'P200' ? '20–200 µL (Optimal)' : p === 'P20' ? 'Too small' : 'Oversized',
                    tone: selectedPipette === p ? (p === 'P200' ? 'emerald' : 'amber') : 'slate',
                    sprite: p === 'P20' ? 'pipette_p20' : p === 'P200' ? 'pipette_p200' : 'pipette_p1000',
                  }))}
                  onToggleSlot={(id) => setSelectedPipette(id as 'P20' | 'P200' | 'P1000')}
                />

                <DialAndTriggerTool
                  label="3. Dry Heat Block (Alkaline Lysis)"
                  unit="°C"
                  value={lysisBlockTempC}
                  min={37}
                  max={70}
                  step={1}
                  presets={[37, 56, 65]}
                  onChangeValue={setLysisBlockTempC}
                  tone={heatBlockLysisDone ? 'emerald' : 'cyan'}
                  statusText={
                    heatBlockLysisDone
                      ? 'Lysis Complete (100%)'
                      : 'Pending (+58% yield if lysed at 56°C)'
                  }
                  triggerLabel={
                    heatBlockLysisDone
                      ? 'Heat Lysis Done'
                      : `Incubate Lysate at ${lysisBlockTempC} °C`
                  }
                  onTrigger={() => setHeatBlockLysisDone(lysisBlockTempC >= 52 && lysisBlockTempC <= 62)}
                  sprite="heat_block"
                  spriteActive={!heatBlockLysisDone}
                />

                <DragTool
                  title="4. Spin-Column Buffer & Wash Step"
                  hint="Apply Ethanol Wash to Silica Column before centrifuging"
                  tools={[
                    {
                      id: 'etoh_wash',
                      label: '70% Ethanol Wash Buffer',
                      subtitle: includeEthanolWash ? 'Applied' : 'Removes proteins',
                      tone: 'emerald',
                      sprite: 'etoh_bottle',
                    },
                    {
                      id: 'skip_wash',
                      label: 'Omit Wash (Water Only)',
                      subtitle: 'Protein carryover risk',
                      tone: 'amber',
                      sprite: 'wash_bottle',
                    },
                  ]}
                  hotspots={[
                    {
                      id: 'spin_column',
                      label: 'Silica Spin Column',
                      statusLabel: includeEthanolWash ? 'EtOH Wash Ready' : 'Unwashed Lysate',
                      tone: includeEthanolWash ? 'emerald' : 'amber',
                      sprite: 'spin_column',
                      spriteActive: includeEthanolWash,
                    },
                  ]}
                  onApply={(toolId) => setIncludeEthanolWash(toolId === 'etoh_wash')}
                />

                <SlotGridTool
                  title="5. 8-Place Microcentrifuge Rotor (Symmetry Required)"
                  layout="rotor"
                  requireOppositeSymmetry
                  slots={rotorSlotItems}
                  onToggleSlot={(slotId) => {
                    const idx = Number(slotId.replace('rotor_', ''));
                    if (Number.isNaN(idx)) return;
                    setRotorOccupied((prev) => prev.map((v, i) => (i === idx ? !v : v)));
                  }}
                />

                <DialAndTriggerTool
                  label="6. Rotor Speed (RCF) & Spin Execute"
                  unit="×g"
                  value={rcfXg}
                  min={2000}
                  max={16000}
                  step={1000}
                  presets={[6000, 10000, 12000, 16000]}
                  onChangeValue={setRcfXg}
                  disabled={!selectedCulture || isSpinning || beltVessels.length >= beltCapacity || !rotorIsBalanced}
                  tone="cyan"
                  statusText={rotorIsBalanced ? `${spinMinutes} min spin` : 'Balance Rotor First!'}
                  triggerLabel={
                    beltVessels.length >= beltCapacity
                      ? `Sample Tray Full (Max ${beltCapacity})`
                      : !rotorIsBalanced
                      ? 'Unbalanced Rotor — Add Opposite Counterweight'
                      : isSpinning
                      ? `Spinning (${spinStage.toUpperCase()})...`
                      : 'Start Balanced Centrifuge Spin'
                  }
                  onTrigger={handleRunExtraction}
                  sprite="centrifuge"
                  spriteActive={isSpinning}
                />
              </div>
            ) : (
              <>
                <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">2. Rotor Centrifugal Force (RCF)</span>
                      <span className="font-mono-tabular text-sky-300 font-semibold">
                        {rcfXg.toLocaleString()} ×g
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2000}
                      max={16000}
                      step={1000}
                      value={rcfXg}
                      onChange={(e) => setRcfXg(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Recommended ≥ 10,000 ×g to firmly pellet bacteria from liquid supernatant.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Spin Duration</span>
                      <span className="font-mono-tabular text-slate-200">{spinMinutes} min</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={spinMinutes}
                      onChange={(e) => setSpinMinutes(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIncludeEthanolWash((v) => !v)}
                      className="w-full flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-200">
                          3. Spin-Column Ethanol Wash Buffer
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Rinses away cellular proteins &amp; salts before TE elution.
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded border whitespace-nowrap shrink-0 ${
                          includeEthanolWash
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        {includeEthanolWash ? 'Included' : 'Skipped'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedCulture || isSpinning || beltVessels.length >= beltCapacity}
                  onClick={handleRunExtraction}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Dna className="w-4 h-4" />
                  {beltVessels.length >= beltCapacity
                    ? `Sample Tray Full (Max ${beltCapacity})`
                    : isSpinning
                    ? `Spinning (${spinStage.toUpperCase()}) at ${rcfXg.toLocaleString()} ×g...`
                    : 'Spin, Lyse & Elute Purified DNA (1.5 mL Tube)'}
                </button>
              </>
            )}
          </div>

          {/* Right: Adaptive Rotor & Spin-Column Visualizer + Elution Output */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400">
                <span>8-Place Rotor ({rcfXg.toLocaleString()} ×g)</span>
                <span className={isSpinning ? 'text-sky-300 font-semibold' : 'text-slate-500'}>
                  {isSpinning
                    ? spinStage === 'pelleting'
                      ? 'Phase 1/3: Cell Pelleting'
                      : spinStage === 'washing'
                      ? includeEthanolWash
                        ? 'Phase 2/3: EtOH Silica Wash'
                        : 'Phase 2/3: Unwashed Lysate'
                      : 'Phase 3/3: TE DNA Elution'
                    : `Cycle ${(totalAnimMs / 1000).toFixed(2)}s · ${spinPeriodSec}s/rev`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                {/* Rotor SVG */}
                <div className="flex flex-col items-center">
                  <svg
                    width="148"
                    height="148"
                    viewBox="0 0 160 160"
                    style={
                      isSpinning
                        ? { animation: `lab-swirl-spin ${spinPeriodSec}s linear infinite` }
                        : undefined
                    }
                  >
                    <circle cx="80" cy="80" r="70" fill="#1E293B" stroke="#475569" strokeWidth="3" />
                    <circle
                      cx="80"
                      cy="80"
                      r="56"
                      fill="none"
                      stroke="#38BDF8"
                      strokeOpacity={isSpinning ? 0.25 + rcfNorm * 0.45 : 0.12}
                      strokeDasharray={isSpinning ? '14 10' : '4 6'}
                      strokeWidth="2"
                    />
                    <circle cx="80" cy="80" r="20" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const rx = 80 + Math.cos(rad) * 46;
                      const ry = 80 + Math.sin(rad) * 46;
                      const isLoaded = deg === 0 || deg === 180;
                      return (
                        <circle
                          key={deg}
                          cx={rx}
                          cy={ry}
                          r="9"
                          fill={isLoaded ? '#0284C7' : '#0F172A'}
                          stroke={isLoaded && isSpinning ? '#7DD3FC' : '#64748B'}
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Adaptive Spin-Column & Pelleting SVG */}
                <div className="flex flex-col items-center">
                  <svg width="136" height="148" viewBox="0 0 136 148">
                    {/* Outer 1.5 mL Catch Microtube */}
                    <path
                      d="M42 26 L94 26 L88 104 L68 134 L48 104 Z"
                      fill="#0F172A"
                      stroke="#475569"
                      strokeWidth="2"
                    />

                    {/* Supernatant / Elution Fluid inside catch tube */}
                    <path
                      d="M49 88 L87 88 L84 103 L68 130 L52 103 Z"
                      fill={
                        spinStage === 'eluting' || spinStage === 'done'
                          ? '#22D3EE'
                          : spinStage === 'washing' && !includeEthanolWash
                          ? '#F59E0B'
                          : '#38BDF8'
                      }
                      fillOpacity={
                        spinStage === 'idle'
                          ? Math.min(0.45, 0.1 + cultureOd * 0.25)
                          : spinStage === 'eluting' || spinStage === 'done'
                          ? Math.min(0.85, 0.25 + cultureOd * 0.45)
                          : 0.35
                      }
                      className="transition-all duration-300"
                    />

                    {/* Inner Silica Spin Column */}
                    <path
                      d="M48 16 L88 16 L84 74 L52 74 Z"
                      fill="#1E293B"
                      fillOpacity="0.82"
                      stroke="#64748B"
                      strokeWidth="1.5"
                    />

                    {/* Silica Membrane Disc (stained amber if ethanol wash skipped) */}
                    <rect
                      x="53"
                      y="64"
                      width="30"
                      height="6"
                      rx="1.5"
                      fill={
                        includeEthanolWash
                          ? spinStage === 'washing'
                            ? '#34D399'
                            : '#CBD5E1'
                          : '#F59E0B'
                      }
                      className="transition-colors duration-200"
                    />

                    {/* Bacterial Cell Pellet compaction scaled by OD600 & RCF */}
                    {selectedCulture && (
                      <ellipse
                        cx="68"
                        cy="123"
                        rx={spinStage === 'pelleting' ? pelletRadius : pelletRadius * 0.72}
                        ry={pelletHeight}
                        fill="#E2E8F0"
                        fillOpacity={spinStage === 'idle' ? 0.25 : 0.85}
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Ethanol Wash / DNA Elution Droplets */}
                    {isSpinning && (spinStage === 'washing' || spinStage === 'eluting') && (
                      <g>
                        {[0, 1].map((idx) => (
                          <circle
                            key={idx}
                            cx={65 + idx * 6}
                            cy="74"
                            r="2.8"
                            fill={
                              spinStage === 'washing'
                                ? includeEthanolWash
                                  ? '#34D399'
                                  : '#FBBF24'
                                : '#38BDF8'
                            }
                            style={{
                              animation: `lab-drop-fall ${0.42 + idx * 0.14}s linear infinite`,
                              animationDelay: `${idx * 0.15}s`,
                            }}
                          />
                        ))}
                      </g>
                    )}

                    <text
                      x="68"
                      y="144"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {includeEthanolWash ? 'EtOH Wash ON' : 'No EtOH Wash'}
                    </text>
                  </svg>
                </div>
              </div>

              {/* Dynamic progress bar during spin */}
              <div className="h-1.5 bg-slate-900 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSpinning
                      ? 'bg-sky-400'
                      : spinStage === 'done'
                      ? 'bg-emerald-400'
                      : 'bg-slate-700'
                  }`}
                  style={{
                    width:
                      spinStage === 'idle'
                        ? '0%'
                        : spinStage === 'pelleting'
                        ? '35%'
                        : spinStage === 'washing'
                        ? '70%'
                        : '100%',
                  }}
                />
              </div>
            </div>

            {lastResult ? (
              <div
                className={`p-4 rounded border space-y-2 text-xs ${
                  lastResult.fragments.length > 0
                    ? lastResult.purityA260_280 >= 1.7
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-slate-100">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Extraction Result</span>
                </div>
                <p className="text-slate-300">{lastResult.statusNote}</p>
                {lastResult.fragments.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/70 space-y-1 font-mono-tabular text-[11px]">
                    <div>Pellet Efficiency: {(lastResult.pelletEfficiency * 100).toFixed(0)}%</div>
                    <div>Total DNA Yield: {lastResult.totalYieldNgPerUl} ng/µL</div>
                    <div>
                      Expected A260/A280: {lastResult.purityA260_280.toFixed(2)}{' '}
                      {lastResult.purityA260_280 >= 1.7 ? '(Pure)' : '(Protein Contaminated)'}
                    </div>
                    <div className="pt-1 text-slate-400">
                      Isolated Loci: {lastResult.fragments.map((f) => f.name).join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[#0B0E17] border border-dashed border-slate-800 rounded text-xs text-slate-500">
                Select a grown culture (OD600 ≥ 0.20 works best) and run the extraction protocol. Check the eluted tube on NanoDrop mode inside the Spectrophotometer!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

