import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scissors, X } from 'lucide-react';
import { RESTRICTION_ENZYMES } from '../../data/molecularDatabase';
import { runRestrictionDigest } from '../../engine/molecularEngine';
import { CultureVessel, DNAFragmentSample, LabMode } from '../../types/lab';
import { DialAndTriggerTool, DragTool, SlotGridTool } from '../tools';

interface RestrictionDigestConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  beltCapacity: number;
  onCreateDigestTube: (params: {
    label: string;
    fragments: DNAFragmentSample[];
  }) => void;
  onClose: () => void;
}

export const RestrictionDigestConsole: React.FC<RestrictionDigestConsoleProps> = ({
  labMode = 'automate',
  beltVessels,
  allVessels,
  beltCapacity,
  onCreateDigestTube,
  onClose,
}) => {
  const dnaSources = [
    ...beltVessels.filter((v) => (v.dnaFragments?.length ?? 0) > 0),
    ...allVessels.filter(
      (v) => v.location.zone !== 'belt' && (v.dnaFragments?.length ?? 0) > 0
    ),
  ];

  const [sourceId, setSourceId] = useState<string>(dnaSources[0]?.id ?? '');
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>(['ecori', 'psti']);
  const [digestPhase, setDigestPhase] = useState<'idle' | 'docking' | 'cleaved'>('idle');
  const [lastDigest, setLastDigest] = useState<ReturnType<typeof runRestrictionDigest> | null>(
    null
  );

  // Manual Molecular Bench states: Pipette Rack, 4°C Ice Bucket, 37°C Heat Block
  const [pipetteSize, setPipetteSize] = useState<'P2' | 'P20' | 'P200' | 'P1000'>('P2');
  const [enzymeOnIce, setEnzymeOnIce] = useState<boolean>(false);
  const [enzymeColdFactor, setEnzymeColdFactor] = useState<number>(1.0);
  const [heatBlockTempC, setHeatBlockTempC] = useState<number>(37);

  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (labMode !== 'manual' || enzymeOnIce) return;
    const t = window.setInterval(() => {
      setEnzymeColdFactor((prev) => Number(Math.max(0.2, prev - 0.04).toFixed(2)));
    }, 1000);
    return () => window.clearInterval(t);
  }, [labMode, enzymeOnIce]);

  const pipetteAcc =
    pipetteSize === 'P2' || pipetteSize === 'P20' ? 1.0 : pipetteSize === 'P200' ? 0.72 : 0.45;
  const effectiveEnzymeActivity =
    labMode === 'manual'
      ? Number((enzymeColdFactor * pipetteAcc * (heatBlockTempC >= 34 && heatBlockTempC <= 40 ? 1.0 : 0.35)).toFixed(2))
      : 1.0;

  const sourceVessel = dnaSources.find((v) => v.id === sourceId) ?? null;

  // Primary locus for the adaptive circular/linear restriction map visualizer
  const primaryLocus = useMemo(() => {
    const frags = sourceVessel?.dnaFragments ?? [];
    return frags.find((f) => f.topology === 'circular') ?? frags[0] ?? null;
  }, [sourceVessel]);

  // Scan exact cut positions on the primary locus for selected enzymes
  const cutMarkers = useMemo(() => {
    if (!primaryLocus) return [];
    const seq = primaryLocus.sequence.toUpperCase();
    const len = Math.max(1, seq.length);
    const markers: Array<{ enzymeName: string; posBp: number; frac: number }> = [];

    for (const enzId of selectedEnzymes) {
      const enz = RESTRICTION_ENZYMES.find((e) => e.id === enzId);
      if (!enz) continue;
      let idx = seq.indexOf(enz.recognitionSeq);
      while (idx !== -1) {
        const cutPos = idx + enz.cutOffset;
        markers.push({
          enzymeName: enz.name,
          posBp: cutPos,
          frac: cutPos / len,
        });
        idx = seq.indexOf(enz.recognitionSeq, idx + 1);
      }
    }
    return markers.sort((a, b) => a.posBp - b.posBp);
  }, [primaryLocus, selectedEnzymes]);

  const toggleEnzyme = (id: string) => {
    setSelectedEnzymes((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
    setLastDigest(null);
    setDigestPhase('idle');
  };

  const handleRunDigest = () => {
    if (!sourceVessel?.dnaFragments || selectedEnzymes.length === 0) return;
    if (beltVessels.length >= beltCapacity || digestPhase === 'docking') return;

    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];

    setDigestPhase('docking');
    const animMs = 520 + selectedEnzymes.length * 140;

    const t = window.setTimeout(() => {
      const res = runRestrictionDigest(
        sourceVessel.dnaFragments ?? [],
        selectedEnzymes,
        effectiveEnzymeActivity
      );
      setLastDigest(res);
      setDigestPhase('cleaved');

      const enzNames = selectedEnzymes
        .map((id) => RESTRICTION_ENZYMES.find((e) => e.id === id)?.name ?? id)
        .join('+');
      onCreateDigestTube({
        label: `Digest-${enzNames}`,
        fragments: res.digestedFragments,
      });
    }, animMs);

    timersRef.current = [t];
  };

  const isDocking = digestPhase === 'docking';
  const isCleaved = digestPhase === 'cleaved';

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Scissors
              className={`w-5 h-5 text-teal-400 shrink-0 transition-transform duration-200 ${
                isDocking ? 'scale-125 -rotate-12' : ''
              }`}
            />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Restriction Enzyme Digestion Bench (37 °C)
              </h2>
              <p className="text-xs text-slate-400">
                Cleave circular plasmids or PCR products at exact palindromic recognition sequences for restriction mapping.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Restriction Digest Bench"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Enzyme & Template Selection */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                1. DNA Sample to Digest
              </label>
              <select
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  setLastDigest(null);
                  setDigestPhase('idle');
                }}
                className="w-full bg-[#0B0E17] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100"
              >
                {dnaSources.length === 0 && (
                  <option value="">Extract DNA or run PCR first</option>
                )}
                {dnaSources.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.dnaFragments?.map((f) => `${f.lengthBp} bp`).join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                2. Select Restriction Endonucleases (Single or Double Digest)
              </label>
              <div className="space-y-2">
                {RESTRICTION_ENZYMES.map((enz) => {
                  const active = selectedEnzymes.includes(enz.id);
                  return (
                    <button
                      key={enz.id}
                      type="button"
                      onClick={() => toggleEnzyme(enz.id)}
                      className={`w-full p-3 rounded border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-teal-950/35 border-teal-500/60'
                          : 'bg-[#0B0E17] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-100">{enz.name}</span>
                        <span className="text-xs font-mono-tabular text-teal-300">
                          5&prime;-{enz.recognitionSeq}-3&prime; ({enz.overhangBases} overhang)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{enz.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {labMode === 'manual' ? (
              <div className="space-y-3">
                <SlotGridTool
                  title="3. Micropipette Rack (1 µL Restriction Enzyme)"
                  columns={4}
                  statusNote={`${pipetteSize} (${Math.round(pipetteAcc * 100)}% precision)`}
                  slots={(['P2', 'P20', 'P200', 'P1000'] as const).map((p) => ({
                    id: p,
                    label: p,
                    occupied: pipetteSize === p,
                    sublabel: p === 'P2' || p === 'P20' ? 'Accurate 1 µL' : 'High Error',
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
                  title="4. 4 °C Ice Bucket (Restriction Enzyme Stability)"
                  hint="Keep endonucleases cold on ice until added"
                  tools={[
                    {
                      id: 'restriction_enzyme',
                      label: 'Restriction Endonuclease Vial',
                      subtitle: `Activity ${Math.round(enzymeColdFactor * 100)}%`,
                      statusLabel: enzymeOnIce ? 'Chilled 4 °C' : 'Warm Bench!',
                      tone: enzymeOnIce ? 'cyan' : 'amber',
                      sprite: 'enzyme_vial',
                      spriteActive: enzymeOnIce,
                    },
                  ]}
                  hotspots={[
                    {
                      id: 'ice_bucket',
                      label: '4 °C Ice Bucket',
                      statusLabel: enzymeOnIce ? 'Active' : 'Click/Drop Here',
                      tone: 'cyan',
                      sprite: 'ice_bucket',
                      spriteActive: enzymeOnIce,
                    },
                    {
                      id: 'warm_bench',
                      label: 'Warm Bench (22 °C)',
                      statusLabel: enzymeOnIce ? 'Click to Remove' : 'Heat Denaturing',
                      tone: 'rose',
                      sprite: 'heat_block',
                    },
                  ]}
                  onApply={(_toolId, hotspotId) => setEnzymeOnIce(hotspotId === 'ice_bucket')}
                />

                <DialAndTriggerTool
                  label="5. Dry Heat Block Incubation (37 °C Optimal)"
                  unit="°C"
                  value={heatBlockTempC}
                  min={22}
                  max={65}
                  step={1}
                  presets={[25, 37, 50]}
                  onChangeValue={setHeatBlockTempC}
                  disabled={
                    !sourceVessel ||
                    selectedEnzymes.length === 0 ||
                    beltVessels.length >= beltCapacity ||
                    isDocking
                  }
                  tone="emerald"
                  statusText={`Net Activity ${Math.round(effectiveEnzymeActivity * 100)}%`}
                  triggerLabel={
                    beltVessels.length >= beltCapacity
                      ? `Sample Tray Full (Max ${beltCapacity})`
                      : isDocking
                      ? `Incubating at ${heatBlockTempC} °C...`
                      : `Incubate Digest at ${heatBlockTempC} °C`
                  }
                  onTrigger={handleRunDigest}
                  sprite="heat_block"
                  spriteActive={isDocking}
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  !sourceVessel ||
                  selectedEnzymes.length === 0 ||
                  beltVessels.length >= beltCapacity ||
                  isDocking
                }
                onClick={handleRunDigest}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                {beltVessels.length >= beltCapacity
                  ? `Sample Tray Full (Max ${beltCapacity})`
                  : isDocking
                  ? `Incubating at 37 °C (${cutMarkers.length} cleavage site${cutMarkers.length === 1 ? '' : 's'})...`
                  : 'Incubate 37 °C Restriction Digest (Create Cut Tube)'}
              </button>
            )}
          </div>

          {/* Right: Adaptive Cleavage Map + Input Fragments & Digest Result */}
          <div className="lg:col-span-5 space-y-4">
            {/* Live Restriction Cleavage Visualizer */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                <span className="text-slate-200 font-semibold">
                  {primaryLocus ? `${primaryLocus.name} (${primaryLocus.lengthBp} bp)` : 'No DNA Loaded'}
                </span>
                <span className="text-teal-300">
                  {cutMarkers.length} cut site{cutMarkers.length === 1 ? '' : 's'}
                </span>
              </div>

              <svg viewBox="0 0 260 116" className="w-full h-28 rounded bg-slate-950 border border-slate-800/80">
                {primaryLocus?.topology === 'circular' ? (
                  <g>
                    {/* Circular Plasmid Map */}
                    <circle
                      cx="130"
                      cy="58"
                      r={isCleaved && cutMarkers.length > 0 ? 39 : 36}
                      fill="none"
                      stroke={isDocking ? '#2DD4BF' : '#0D9488'}
                      strokeWidth="4.5"
                      strokeDasharray={
                        isCleaved && cutMarkers.length > 0
                          ? cutMarkers.length >= 2
                            ? '44 12'
                            : '214 14'
                          : undefined
                      }
                      className="transition-all duration-300"
                    />
                    <text
                      x="130"
                      y="61"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {isDocking
                        ? '37°C Cleaving'
                        : isCleaved && cutMarkers.length > 0
                        ? `${cutMarkers.length} Cut${cutMarkers.length > 1 ? 's' : ''}`
                        : 'Circular'}
                    </text>

                    {/* Cut markers radially around ring */}
                    {cutMarkers.map((cm, i) => {
                      const angle = cm.frac * Math.PI * 2 - Math.PI / 2;
                      const innerR = isDocking ? 31 : 28;
                      const outerR = isDocking ? 46 : 44;
                      const x1 = 130 + Math.cos(angle) * innerR;
                      const y1 = 58 + Math.sin(angle) * innerR;
                      const x2 = 130 + Math.cos(angle) * outerR;
                      const y2 = 58 + Math.sin(angle) * outerR;
                      const lx = 130 + Math.cos(angle) * 53;
                      const ly = 58 + Math.sin(angle) * 53;
                      return (
                        <g key={`${cm.enzymeName}-${i}`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#FBBF24"
                            strokeWidth="2.5"
                          />
                          <text
                            x={lx}
                            y={ly + 3}
                            textAnchor="middle"
                            fill="#FDE68A"
                            fontSize="8"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {cm.enzymeName}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                ) : primaryLocus ? (
                  <g>
                    {/* Linear DNA duplex map */}
                    <line
                      x1="24"
                      y1="58"
                      x2="236"
                      y2="58"
                      stroke={isDocking ? '#2DD4BF' : '#0D9488'}
                      strokeWidth="4.5"
                      strokeDasharray={isCleaved && cutMarkers.length > 0 ? '48 8' : undefined}
                      className="transition-all duration-300"
                    />
                    {cutMarkers.map((cm, i) => {
                      const cx = 24 + cm.frac * 212;
                      return (
                        <g key={`${cm.enzymeName}-${i}`}>
                          <line
                            x1={cx}
                            y1={isDocking ? 40 : 46}
                            x2={cx}
                            y2={isDocking ? 76 : 70}
                            stroke="#FBBF24"
                            strokeWidth="2.5"
                          />
                          <text
                            x={cx}
                            y="34"
                            textAnchor="middle"
                            fill="#FDE68A"
                            fontSize="8.5"
                            fontFamily="JetBrains Mono, monospace"
                          >
                            {cm.enzymeName} ({cm.posBp}bp)
                          </text>
                        </g>
                      );
                    })}
                    {cutMarkers.length === 0 && (
                      <text
                        x="130"
                        y="82"
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        No selected enzyme sites on primary locus
                      </text>
                    )}
                  </g>
                ) : (
                  <text
                    x="130"
                    y="62"
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Select a DNA tube to inspect restriction sites
                  </text>
                )}
              </svg>
            </div>

            <div className="p-4 bg-[#0B0E17] border border-slate-800 rounded space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Input DNA Loci
              </div>
              {sourceVessel?.dnaFragments ? (
                <div className="space-y-1.5">
                  {sourceVessel.dnaFragments.map((f) => (
                    <div
                      key={f.id}
                      className="p-2 bg-slate-900/70 border border-slate-800 rounded text-xs flex justify-between"
                    >
                      <span className="text-slate-200 truncate">{f.name}</span>
                      <span className="font-mono-tabular text-teal-300 shrink-0 ml-2">
                        {f.lengthBp} bp ({f.topology})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No DNA sample selected.</p>
              )}
            </div>

            {lastDigest ? (
              <div className="p-4 bg-teal-950/25 border border-teal-500/40 rounded space-y-2 text-xs">
                <div className="font-semibold text-slate-100">Digestion Complete</div>
                <p className="text-slate-300">{lastDigest.summary}</p>
                <div className="space-y-1 pt-1">
                  {lastDigest.digestedFragments.map((df) => (
                    <div
                      key={df.id}
                      className="flex justify-between font-mono-tabular text-[11px] text-teal-200"
                    >
                      <span className="truncate">{df.name}</span>
                      <span>{df.lengthBp} bp</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#0B0E17] border border-dashed border-slate-800 rounded text-xs text-slate-500">
                Try digesting DNA extracted from <span className="text-slate-300">E. coli [pUC-AmpR]</span> with <span className="text-teal-300">EcoRI + PstI</span>, then run the digested tube alongside uncut plasmid on the Agarose Gel Rig!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

