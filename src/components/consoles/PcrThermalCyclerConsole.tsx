import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu, Play, X } from 'lucide-react';
import { DNA_SEQUENCES, PRIMER_PRESETS } from '../../data/molecularDatabase';
import { computePrimerStats, runPcrSimulation } from '../../engine/molecularEngine';
import { CultureVessel, DNAFragmentSample, LabMode } from '../../types/lab';
import { DragTool, SlotGridTool } from '../tools';

interface PcrThermalCyclerConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  beltCapacity: number;
  onCreatePcrTube: (params: {
    label: string;
    amplicons: DNAFragmentSample[];
    outcome: string;
  }) => void;
  onClose: () => void;
}

type CycleStage = 'idle' | 'denature' | 'anneal' | 'extend' | 'complete';

export const PcrThermalCyclerConsole: React.FC<PcrThermalCyclerConsoleProps> = ({
  labMode = 'automate',
  beltVessels,
  allVessels,
  beltCapacity,
  onCreatePcrTube,
  onClose,
}) => {
  const dnaTubes = [
    ...beltVessels.filter((v) => (v.dnaFragments?.length ?? 0) > 0),
    ...allVessels.filter(
      (v) => v.location.zone !== 'belt' && (v.dnaFragments?.length ?? 0) > 0
    ),
  ];

  const [templateId, setTemplateId] = useState<string>(dnaTubes[0]?.id ?? '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRIMER_PRESETS[0].id);
  const [forwardSeq, setForwardSeq] = useState<string>(PRIMER_PRESETS[0].forwardSeq);
  const [reverseSeq, setReverseSeq] = useState<string>(PRIMER_PRESETS[0].reverseSeq);
  const [annealTempC, setAnnealTempC] = useState<number>(56);
  const [cycles, setCycles] = useState<number>(30);
  const [hasPolymerase, setHasPolymerase] = useState<boolean>(true);
  const [hasDntps, setHasDntps] = useState<boolean>(true);
  const [inspectedSeqId, setInspectedSeqId] = useState<string>(DNA_SEQUENCES[0].id);
  const [lastRun, setLastRun] = useState<ReturnType<typeof runPcrSimulation> | null>(null);

  const [isCycling, setIsCycling] = useState<boolean>(false);
  const [currentCycle, setCurrentCycle] = useState<number>(0);
  const [cycleStage, setCycleStage] = useState<CycleStage>('idle');
  const intervalRef = useRef<number | null>(null);

  // Manual Molecular Bench states: Pipette Rack, 4°C Ice Bucket, PCR Strip Wells
  const [pipetteSize, setPipetteSize] = useState<'P2' | 'P20' | 'P200' | 'P1000'>('P20');
  const [taqOnIce, setTaqOnIce] = useState<boolean>(false);
  const [enzymeColdFactor, setEnzymeColdFactor] = useState<number>(1.0);
  const [loadedStripWell, setLoadedStripWell] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Leaving Taq polymerase on the warm bench gradually decays cold factor down to 0.30
  useEffect(() => {
    if (labMode !== 'manual' || taqOnIce) return;
    const t = window.setInterval(() => {
      setEnzymeColdFactor((prev) => Number(Math.max(0.3, prev - 0.03).toFixed(2)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [labMode, taqOnIce]);

  const pipetteAccuracyFactor =
    pipetteSize === 'P2' || pipetteSize === 'P20'
      ? 1.0
      : pipetteSize === 'P200'
      ? 0.62
      : 0.42;

  const templateVessel = dnaTubes.find((v) => v.id === templateId) ?? null;

  const fwdStats = useMemo(() => computePrimerStats(forwardSeq), [forwardSeq]);
  const revStats = useMemo(() => computePrimerStats(reverseSeq), [reverseSeq]);
  const minTm = Math.min(fwdStats.tmC, revStats.tmC);
  const tmDelta = annealTempC - minTm;

  const annealQuality: 'optimal' | 'too_hot' | 'non_specific' =
    tmDelta > 3 ? 'too_hot' : tmDelta < -8 ? 'non_specific' : 'optimal';

  const inspectedSeq =
    DNA_SEQUENCES.find((s) => s.id === inspectedSeqId) ?? DNA_SEQUENCES[0];

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = PRIMER_PRESETS.find((x) => x.id === presetId);
    if (p) {
      setForwardSeq(p.forwardSeq);
      setReverseSeq(p.reverseSeq);
      setInspectedSeqId(p.targetSequenceId);
      const fTm = computePrimerStats(p.forwardSeq).tmC;
      const rTm = computePrimerStats(p.reverseSeq).tmC;
      setAnnealTempC(Number((Math.min(fTm, rTm) - 2.5).toFixed(1)));
    }
  };

  const handleRunPcr = () => {
    if (!templateVessel?.dnaFragments || beltVessels.length >= beltCapacity || isCycling) return;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }

    setIsCycling(true);
    setCurrentCycle(1);
    setCycleStage('denature');

    // Step across cycles (~650ms for 15 cycles .. ~1250ms for 35 cycles, 3 stages per step)
    const stepMs = Math.max(22, Math.round((620 + (cycles - 15) * 30) / (cycles * 1.4)));
    let tick = 0;
    const totalTicks = cycles;
    const stages: Array<'denature' | 'anneal' | 'extend'> = ['denature', 'anneal', 'extend'];

    intervalRef.current = window.setInterval(() => {
      tick += 1;
      const stageIdx = tick % 3;
      const cyc = Math.min(cycles, Math.max(1, tick));

      if (tick >= totalTicks) {
        if (intervalRef.current !== null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        const res = runPcrSimulation({
          templateFragments: templateVessel.dnaFragments ?? [],
          forwardSeq,
          reverseSeq,
          annealTempC,
          cycles,
          hasPolymerase,
          hasDntps,
          enzymeColdFactor: labMode === 'manual' ? enzymeColdFactor : 1.0,
          pipetteAccuracyFactor: labMode === 'manual' ? pipetteAccuracyFactor : 1.0,
        });
        setLastRun(res);
        setIsCycling(false);
        setCurrentCycle(cycles);
        setCycleStage('complete');

        const preset = PRIMER_PRESETS.find((p) => p.id === selectedPresetId);
        const geneTag = preset ? preset.targetGeneLabel.split(' ').pop() : 'Custom';
        onCreatePcrTube({
          label: `PCR-${geneTag}-${annealTempC.toFixed(0)}C`,
          amplicons: res.amplicons,
          outcome: res.outcome,
        });
        return;
      }

      setCurrentCycle(cyc);
      setCycleStage(stages[stageIdx]);
    }, stepMs);
  };

  const activeBlockTemp =
    cycleStage === 'denature'
      ? 95.0
      : cycleStage === 'anneal'
      ? annealTempC
      : cycleStage === 'extend'
      ? 72.0
      : 22.0;

  const canAmplify = hasPolymerase && hasDntps && annealQuality !== 'too_hot';
  const copyPower = canAmplify ? Math.min(cycles, currentCycle) : 0;

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                PCR Thermal Cycler &amp; Primer Workbench
              </h2>
              <p className="text-xs text-slate-400">
                Inspect A/T/G/C sequences, check primer melting temperature (Tm), and amplify target DNA across {cycles} thermal cycles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close PCR Thermal Cycler"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Reaction Setup & Thermal Profile */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  1. Template DNA Tube
                </label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value);
                    setLastRun(null);
                    setCycleStage('idle');
                    setCurrentCycle(0);
                  }}
                  className="w-full bg-[#0B0E17] border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-100"
                >
                  {dnaTubes.length === 0 && (
                    <option value="">Extract DNA at Microcentrifuge first</option>
                  )}
                  {dnaTubes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.dnaFragments?.length ?? 0} loci)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  2. Primer Pair Preset
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full bg-[#0B0E17] border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-100"
                >
                  {PRIMER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.expectedAmpliconBp} bp)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editable A/T/G/C Primers */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
              <div className="text-xs font-semibold text-slate-200">
                Primer Sequences (5′ → 3′) &amp; Calculated Tm
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Forward Primer</span>
                  <span className="font-mono-tabular text-cyan-300">
                    {fwdStats.length} nt · GC {fwdStats.gcPercent}% · Tm {fwdStats.tmC} °C
                  </span>
                </div>
                <input
                  type="text"
                  value={forwardSeq}
                  onChange={(e) => setForwardSeq(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100 tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Reverse Primer</span>
                  <span className="font-mono-tabular text-purple-300">
                    {revStats.length} nt · GC {revStats.gcPercent}% · Tm {revStats.tmC} °C
                  </span>
                </div>
                <input
                  type="text"
                  value={reverseSeq}
                  onChange={(e) => setReverseSeq(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono-tabular text-slate-100 tracking-wider"
                />
              </div>
            </div>

            {/* Master Mix Reagents & Thermal Cycler Program */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  3. Master Mix &amp; Cycling Program
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHasPolymerase((v) => !v)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                      hasPolymerase
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    Taq Polymerase: {hasPolymerase ? 'ON' : 'MISSING'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasDntps((v) => !v)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border cursor-pointer ${
                      hasDntps
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    dNTPs: {hasDntps ? 'ON' : 'MISSING'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono-tabular">
                <div
                  className={`p-2 rounded border transition-colors duration-150 ${
                    cycleStage === 'denature'
                      ? 'bg-rose-950/60 border-rose-400'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="text-rose-400 font-semibold">95.0 °C</div>
                  <div className="text-slate-500">Denature (30s)</div>
                </div>
                <div
                  className={`p-2 rounded border transition-colors duration-150 ${
                    cycleStage === 'anneal'
                      ? 'bg-purple-950/60 border-purple-400'
                      : 'bg-slate-900 border-purple-500/40'
                  }`}
                >
                  <div className="text-purple-300 font-semibold">{annealTempC.toFixed(1)} °C</div>
                  <div className="text-slate-400">Anneal (30s)</div>
                </div>
                <div
                  className={`p-2 rounded border transition-colors duration-150 ${
                    cycleStage === 'extend'
                      ? 'bg-emerald-950/60 border-emerald-400'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="text-emerald-400 font-semibold">72.0 °C</div>
                  <div className="text-slate-500">Extend (45s)</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Annealing Temperature (Optimal ≈ Tm - 3 °C)</span>
                  <span
                    className={`font-mono-tabular font-semibold ${
                      annealQuality === 'optimal'
                        ? 'text-emerald-300'
                        : annealQuality === 'non_specific'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {annealTempC.toFixed(1)} °C (
                    {annealQuality === 'optimal'
                      ? 'Specific Fit'
                      : annealQuality === 'non_specific'
                      ? 'Off-Target Risk'
                      : 'Above Tm'}
                    )
                  </span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={70}
                  step={0.5}
                  value={annealTempC}
                  onChange={(e) => setAnnealTempC(Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Amplification Cycles</span>
                  <span className="font-mono-tabular text-slate-200">{cycles} cycles</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={35}
                  step={1}
                  value={cycles}
                  onChange={(e) => setCycles(Number(e.target.value))}
                  className="w-full accent-purple-400"
                />
              </div>
            </div>

            {labMode === 'manual' && (
              <div className="space-y-3">
                <SlotGridTool
                  title="4. Micropipette Rack (Dispense 2 µL Taq / Primers)"
                  columns={4}
                  statusNote={
                    pipetteAccuracyFactor < 0.8
                      ? `Oversized ${pipetteSize} (${Math.round(pipetteAccuracyFactor * 100)}% accuracy)`
                      : `${pipetteSize} Precision (100%)`
                  }
                  slots={(['P2', 'P20', 'P200', 'P1000'] as const).map((p) => ({
                    id: p,
                    label: p,
                    occupied: pipetteSize === p,
                    sublabel: p === 'P2' || p === 'P20' ? 'Accurate 2 µL' : 'High Error',
                    tone: pipetteSize === p ? (p === 'P2' || p === 'P20' ? 'emerald' : 'rose') : 'slate',
                    sprite:
                      p === 'P2'
                        ? ('pipette_p2' as const)
                        : p === 'P20'
                        ? ('pipette_p20' as const)
                        : p === 'P200'
                        ? ('pipette_p200' as const)
                        : ('pipette_p1000' as const),
                  }))}
                  onToggleSlot={(id) => setPipetteSize(id as 'P2' | 'P20' | 'P200' | 'P1000')}
                />

                <DragTool
                  title="5. 4 °C Ice Bucket (Preserve Taq Polymerase Activity)"
                  hint="Place Taq Tube into Ice Bucket during setup"
                  tools={[
                    {
                      id: 'taq_tube',
                      label: 'Taq Polymerase & dNTP Mix',
                      subtitle: `Activity ${Math.round(enzymeColdFactor * 100)}%`,
                      statusLabel: taqOnIce ? 'Chilled 4 °C' : 'Warm Bench!',
                      tone: taqOnIce ? 'cyan' : 'amber',
                      sprite: 'taq_tube',
                      spriteActive: taqOnIce,
                    },
                  ]}
                  hotspots={[
                    {
                      id: 'ice_bucket',
                      label: '4 °C Ice Bucket',
                      statusLabel: taqOnIce ? 'Enzyme Preserved' : 'Click/Drop Here',
                      tone: 'cyan',
                      sprite: 'ice_bucket',
                      spriteActive: taqOnIce,
                    },
                    {
                      id: 'warm_rack',
                      label: 'Room Temp Rack (22 °C)',
                      statusLabel: taqOnIce ? 'Click to Remove' : 'Decaying Activity',
                      tone: 'amber',
                      sprite: 'heat_block',
                    },
                  ]}
                  onApply={(_toolId, hotspotId) => setTaqOnIce(hotspotId === 'ice_bucket')}
                />

                <SlotGridTool
                  title="6. Thermal Block 0.2 mL PCR Strip Loader (Load 1 Well)"
                  columns={4}
                  statusNote={
                    loadedStripWell !== null
                      ? `Loaded Well A${loadedStripWell + 1}`
                      : 'Click a well to load mix'
                  }
                  slots={Array.from({ length: 8 }, (_, idx) => ({
                    id: `well_${idx}`,
                    label: `A${idx + 1}`,
                    occupied: loadedStripWell === idx,
                    sublabel: loadedStripWell === idx ? '0.2 mL PCR' : 'Empty',
                    tone: 'emerald',
                    sprite: 'pcr_tube' as const,
                  }))}
                  onToggleSlot={(id) => setLoadedStripWell(Number(id.replace('well_', '')))}
                />
              </div>
            )}

            <button
              type="button"
              disabled={
                !templateVessel ||
                beltVessels.length >= beltCapacity ||
                isCycling ||
                (labMode === 'manual' && loadedStripWell === null)
              }
              onClick={handleRunPcr}
              className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              {beltVessels.length >= beltCapacity
                ? `Sample Tray Full (Max ${beltCapacity})`
                : labMode === 'manual' && loadedStripWell === null
                ? 'Load 0.2 mL PCR Tube into Strip Block First'
                : isCycling
                ? `Cycling ${currentCycle}/${cycles} (${activeBlockTemp.toFixed(1)} °C · ${cycleStage.toUpperCase()})`
                : `Run ${cycles}-Cycle PCR Program (Produce 0.2 mL Tube)`}
            </button>
          </div>

          {/* Right: Live Thermal Cycling Animator + Reference A/T/G/C Sequence Viewer */}
          <div className="lg:col-span-5 space-y-4">
            {/* Adaptive PCR Molecular Cycle Visualizer */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                <span className="text-slate-300 font-semibold">
                  Thermal Block: {activeBlockTemp.toFixed(1)} °C
                </span>
                <span className="text-purple-300">
                  Cycle {currentCycle}/{cycles} · 2^{copyPower}x
                </span>
              </div>

              <svg viewBox="0 0 320 96" className="w-full h-24 rounded bg-slate-950 border border-slate-800/80">
                {/* Thermal stage glow background */}
                <rect
                  x="0"
                  y="0"
                  width="320"
                  height="96"
                  fill={
                    cycleStage === 'denature'
                      ? '#EF4444'
                      : cycleStage === 'anneal'
                      ? '#A855F7'
                      : cycleStage === 'extend'
                      ? '#10B981'
                      : '#0F172A'
                  }
                  fillOpacity={isCycling ? 0.14 : 0.04}
                />

                {/* Top Sense Template Strand (separates upward during denature/anneal/extend) */}
                <g
                  style={{
                    transform:
                      cycleStage === 'denature' || cycleStage === 'anneal' || cycleStage === 'extend'
                        ? 'translateY(-14px)'
                        : 'translateY(0px)',
                    transition: 'transform 160ms ease',
                  }}
                >
                  <line x1="28" y1="42" x2="292" y2="42" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
                  <text x="16" y="45" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    5′
                  </text>
                  <text x="298" y="45" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    3′
                  </text>
                </g>

                {/* Bottom Antisense Template Strand */}
                <g
                  style={{
                    transform:
                      cycleStage === 'denature' || cycleStage === 'anneal' || cycleStage === 'extend'
                        ? 'translateY(14px)'
                        : 'translateY(0px)',
                    transition: 'transform 160ms ease',
                  }}
                >
                  <line x1="28" y1="54" x2="292" y2="54" stroke="#818CF8" strokeWidth="3" strokeLinecap="round" />
                  <text x="16" y="57" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    3′
                  </text>
                  <text x="298" y="57" fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    5′
                  </text>
                </g>

                {/* Forward & Reverse Primers (bind during anneal & extend unless Tm exceeded) */}
                {(cycleStage === 'anneal' || cycleStage === 'extend' || cycleStage === 'complete') && (
                  <g>
                    <line
                      x1="62"
                      y1="38"
                      x2="96"
                      y2="38"
                      stroke={
                        annealQuality === 'too_hot'
                          ? '#F43F5E'
                          : annealQuality === 'non_specific'
                          ? '#F59E0B'
                          : '#34D399'
                      }
                      strokeWidth="3.5"
                      strokeOpacity={annealQuality === 'too_hot' ? 0.35 : 0.95}
                      strokeDasharray={annealQuality === 'too_hot' ? '3 3' : undefined}
                      style={{
                        transform: annealQuality === 'too_hot' ? 'translateY(-10px)' : 'translateY(0px)',
                        transition: 'transform 160ms ease',
                      }}
                    />
                    <line
                      x1="224"
                      y1="58"
                      x2="258"
                      y2="58"
                      stroke={
                        annealQuality === 'too_hot'
                          ? '#F43F5E'
                          : annealQuality === 'non_specific'
                          ? '#F59E0B'
                          : '#C084FC'
                      }
                      strokeWidth="3.5"
                      strokeOpacity={annealQuality === 'too_hot' ? 0.35 : 0.95}
                      strokeDasharray={annealQuality === 'too_hot' ? '3 3' : undefined}
                      style={{
                        transform: annealQuality === 'too_hot' ? 'translateY(10px)' : 'translateY(0px)',
                        transition: 'transform 160ms ease',
                      }}
                    />
                  </g>
                )}

                {/* Newly synthesized Taq Polymerase extension strands */}
                {(cycleStage === 'extend' || cycleStage === 'complete') && canAmplify && (
                  <g>
                    <line
                      x1="96"
                      y1="38"
                      x2="256"
                      y2="38"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeDasharray="6 2"
                    />
                    <line
                      x1="64"
                      y1="58"
                      x2="224"
                      y2="58"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeDasharray="6 2"
                    />
                  </g>
                )}

                <text
                  x="160"
                  y="90"
                  textAnchor="middle"
                  fill={
                    !hasPolymerase || !hasDntps
                      ? '#FB7185'
                      : annealQuality === 'too_hot'
                      ? '#FB7185'
                      : annealQuality === 'non_specific'
                      ? '#FBBF24'
                      : '#94A3B8'
                  }
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {!hasPolymerase || !hasDntps
                    ? 'EXTENSION STALLED (Missing Taq / dNTPs)'
                    : annealQuality === 'too_hot'
                    ? `TOO HOT (${annealTempC.toFixed(1)}°C > Tm ${minTm.toFixed(1)}°C)`
                    : annealQuality === 'non_specific'
                    ? 'LOW TEMP: Non-specific primer binding'
                    : cycleStage === 'denature'
                    ? 'dsDNA Melting into Single Strands (95°C)'
                    : cycleStage === 'anneal'
                    ? `Primers Hybridizing at ${annealTempC.toFixed(1)}°C`
                    : cycleStage === 'extend'
                    ? 'Taq Polymerase Extending (72°C)'
                    : `Ready · Target Tm ≈ ${(minTm - 2.5).toFixed(1)}°C`}
                </text>
              </svg>

              {/* Cycle progress strip */}
              <div className="h-1.5 bg-slate-900 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    !canAmplify && isCycling
                      ? 'bg-rose-500'
                      : annealQuality === 'non_specific'
                      ? 'bg-amber-400'
                      : 'bg-purple-400'
                  }`}
                  style={{ width: `${Math.min(100, (currentCycle / Math.max(1, cycles)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">
                  Reference Gene Sequence Viewer
                </span>
                <select
                  value={inspectedSeqId}
                  onChange={(e) => setInspectedSeqId(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                >
                  {DNA_SEQUENCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shortName} ({s.lengthBp} bp)
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400">{inspectedSeq.description}</p>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded font-mono-tabular text-[10px] text-emerald-300/90 leading-relaxed break-all max-h-32 overflow-y-auto">
                <span className="text-slate-500">5&prime;-</span>
                {inspectedSeq.sequence.slice(0, 360)}
                {inspectedSeq.sequence.length > 360 ? `... (+${inspectedSeq.sequence.length - 360} bp)` : ''}
                <span className="text-slate-500">-3&prime;</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Features: {inspectedSeq.features.map((f) => `${f.name} (${f.startBp}–${f.endBp} bp)`).join(' · ')}
              </div>
            </div>

            {lastRun ? (
              <div
                className={`p-4 rounded border space-y-2 text-xs ${
                  lastRun.outcome === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : lastRun.outcome === 'non_specific'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="font-semibold text-slate-100">PCR Reaction Output</div>
                <p className="text-slate-300">{lastRun.summary}</p>
                {lastRun.amplicons.length > 0 && (
                  <div className="text-[11px] font-mono-tabular text-slate-400 pt-1">
                    Load this 0.2 mL PCR tube onto the Agarose Gel Rig to visualize the bands!
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-[#0B0E17] border border-dashed border-slate-800 rounded text-xs text-slate-500">
                Tip: Try setting Annealing Temp too high (e.g., 68 °C) or too low (42 °C) to see how real primer thermodynamics change your Gel Electrophoresis bands!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

