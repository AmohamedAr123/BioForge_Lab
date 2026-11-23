import React, { useEffect, useRef, useState } from 'react';
import { Camera, Zap, X } from 'lucide-react';
import { DNA_LADDERS } from '../../data/molecularDatabase';
import { computeGelMigrationFraction } from '../../engine/molecularEngine';
import { CultureVessel, GelRunSnapshot } from '../../types/lab';

interface GelElectrophoresisConsoleProps {
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  simMinutes: number;
  onCaptureGelSnapshot: (snap: Omit<GelRunSnapshot, 'id'>) => void;
  onClose: () => void;
}

export const GelElectrophoresisConsole: React.FC<GelElectrophoresisConsoleProps> = ({
  beltVessels,
  allVessels,
  simMinutes,
  onCaptureGelSnapshot,
  onClose,
}) => {
  const dnaSamples = [
    ...beltVessels.filter((v) => v.dnaFragments !== undefined),
    ...allVessels.filter(
      (v) => v.location.zone !== 'belt' && v.dnaFragments !== undefined
    ),
  ];

  const [agarosePercent, setAgarosePercent] = useState<number>(1.2);
  const [voltageV, setVoltageV] = useState<number>(100);
  const [ladderId, setLadderId] = useState<string>(DNA_LADDERS[0].id);
  const [uvMode, setUvMode] = useState<boolean>(true);
  const [laneSampleIds, setLaneSampleIds] = useState<string[]>(() => {
    const init = Array(7).fill('');
    dnaSamples.slice(0, 4).forEach((s, i) => {
      init[i] = s.id;
    });
    return init;
  });

  const [runProgress, setRunProgress] = useState<number>(0); // 0..1
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedLadder =
    DNA_LADDERS.find((l) => l.id === ladderId) ?? DNA_LADDERS[0];

  // Animate gel electrophoresis migration
  useEffect(() => {
    if (!isRunning) return;
    const speedFactor = (voltageV / 100) * 0.032;
    const timer = window.setInterval(() => {
      setRunProgress((prev) => {
        const next = prev + speedFactor;
        if (next >= 1) {
          setIsRunning(false);
          return 1;
        }
        return next;
      });
    }, 50);
    return () => window.clearInterval(timer);
  }, [isRunning, voltageV]);

  // Draw crisp high-resolution Agarose Gel & UV Gel Doc canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Gel slab background (UV transilluminator darkroom vs room light)
    ctx.fillStyle = uvMode ? '#050811' : '#1E293B';
    ctx.fillRect(0, 0, w, h);

    const padX = 36;
    const padTop = 44;
    const padBot = 30;
    const gelW = w - padX * 2;
    const gelH = h - padTop - padBot;

    // Translucent agarose slab
    ctx.fillStyle = uvMode ? '#091526' : '#334155';
    ctx.fillRect(padX, padTop, gelW, gelH);

    // Subtle pore matrix lines reflecting agarose density (0.8% sparse vs 2.0% tight mesh)
    const meshStep = Math.max(8, Math.round(24 - (agarosePercent - 0.8) * 12));
    ctx.strokeStyle = uvMode ? 'rgba(56, 189, 248, 0.045)' : 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gy = padTop + meshStep; gy < padTop + gelH; gy += meshStep) {
      ctx.moveTo(padX, gy);
      ctx.lineTo(padX + gelW, gy);
    }
    ctx.stroke();

    ctx.strokeStyle = uvMode ? '#1E3A5F' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, padTop, gelW, gelH);

    // Electrolysis micro-bubbles at cathode & anode buffer edges proportional to voltageV
    if (isRunning) {
      const bubbleCount = Math.round(6 + ((voltageV - 80) / 60) * 10);
      const speedMult = voltageV / 90;
      const phase = runProgress * 28 * speedMult;
      for (let i = 0; i < bubbleCount; i++) {
        const bxLeft = padX - 10 + ((i * 7) % 12) - 4;
        const bxRight = padX + gelW + 10 - ((i * 7) % 12) + 4;
        const byTop = padTop + 14 + (((i * 23 + phase * 18) % 60));
        const byBot = padTop + gelH - 12 - (((i * 23 + phase * 16) % 60));
        ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
        ctx.beginPath();
        ctx.arc(bxLeft, byTop, 1.8, 0, Math.PI * 2);
        ctx.arc(bxRight, byBot, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Polarity signs (- at top wells, + at bottom)
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText('(-) Cathode', padX, 20);
    ctx.fillStyle = '#F87171';
    ctx.fillText('(+) Anode', padX, h - 10);

    const numLanes = 8;
    const laneStep = gelW / numLanes;
    const bandW = laneStep * 0.62;

    const drawLane = (
      laneIdx: number,
      label: string,
      bands: Array<{ bp: number; intensity: number; isArtifact?: boolean }>
    ) => {
      const cx = padX + laneIdx * laneStep + laneStep / 2;

      // Lane label above well
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = '#CBD5E1';
      ctx.textAlign = 'center';
      ctx.fillText(`L${laneIdx + 1}`, cx, padTop - 10);

      // Physical comb well
      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - bandW / 2, padTop + 8, bandW, 8);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - bandW / 2, padTop + 8, bandW, 8);

      if (runProgress <= 0.01) return;

      // Subtle loading dye front
      const dyeY = padTop + 22 + (gelH - 36) * Math.min(0.95, runProgress * 0.96);
      ctx.fillStyle = uvMode ? 'rgba(56, 189, 248, 0.14)' : 'rgba(59, 130, 246, 0.45)';
      ctx.fillRect(cx - bandW / 2, dyeY, bandW, 4);

      for (const b of bands) {
        const frac = computeGelMigrationFraction(b.bp, agarosePercent, runProgress);
        const by = padTop + 22 + (gelH - 36) * frac;

        if (uvMode) {
          const haloX = (cx - bandW / 2 - 3) | 0;
          const haloW = (bandW + 6) | 0;
          const coreX = (cx - bandW / 2) | 0;
          const coreW = bandW | 0;
          const coreY = (by - 2) | 0;
          // Pre-layered soft glow halos (zero runtime shadowBlur)
          ctx.fillStyle = b.isArtifact
            ? `rgba(245, 158, 11, ${(0.16 * b.intensity).toFixed(2)})`
            : `rgba(34, 211, 238, ${(0.18 * b.intensity).toFixed(2)})`;
          ctx.fillRect(haloX, (by - 5) | 0, haloW, 10);
          ctx.fillStyle = b.isArtifact
            ? `rgba(251, 191, 36, ${Math.min(0.9, b.intensity).toFixed(2)})`
            : `rgba(103, 232, 249, ${Math.min(0.98, 0.4 + b.intensity * 0.6).toFixed(2)})`;
          ctx.fillRect(coreX, coreY, coreW, 4);
        } else {
          ctx.fillStyle = `rgba(30, 58, 138, ${b.intensity})`;
          ctx.fillRect((cx - bandW / 2) | 0, (by - 2) | 0, bandW | 0, 4);
        }

        // Annotate ladder sizes on Lane 1 and sample band sizes on completed run
        if (runProgress >= 0.95 && (laneIdx === 0 || bands.length <= 4)) {
          ctx.font = '600 9px "JetBrains Mono", monospace';
          ctx.fillStyle = laneIdx === 0 ? '#94A3B8' : '#67E8F9';
          ctx.textAlign = laneIdx === 0 ? 'right' : 'left';
          const textX = laneIdx === 0 ? cx - bandW / 2 - 4 : cx + bandW / 2 + 4;
          if (laneIdx === 0 && [5000, 3000, 1500, 1000, 500, 250, 100].includes(b.bp)) {
            ctx.fillText(`${b.bp}`, textX, by + 3);
          } else if (laneIdx > 0 && !b.isArtifact) {
            ctx.fillText(`${b.bp}bp`, textX, by + 3);
          }
        }
      }

      // Subtle sample caption at bottom
      ctx.font = '500 9px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText(label.slice(0, 10), cx, h - 10);
    };

    // Lane 1: DNA Ladder
    drawLane(
      0,
      'Ladder',
      selectedLadder.bandsBp.map((bp) => ({
        bp,
        intensity: bp === 1000 || bp === 500 ? 0.95 : 0.72,
      }))
    );

    // Lanes 2-8: Loaded tubes
    for (let i = 0; i < 7; i++) {
      const sId = laneSampleIds[i];
      const sample = dnaSamples.find((s) => s.id === sId);
      if (!sample) {
        drawLane(i + 1, 'Empty', []);
      } else {
        const bands = (sample.dnaFragments ?? []).map((f) => ({
          bp: f.lengthBp,
          intensity: Math.min(1, Math.max(0.35, f.concentrationNgPerUl / 120)),
          isArtifact: f.isArtifact,
        }));
        drawLane(i + 1, sample.label, bands);
      }
    }
  }, [
    runProgress,
    agarosePercent,
    ladderId,
    uvMode,
    laneSampleIds,
    dnaSamples,
    selectedLadder,
    isRunning,
    voltageV,
  ]);

  const handleStartRun = () => {
    setRunProgress(0.02);
    setIsRunning(true);
  };

  const handleCaptureGel = () => {
    if (!canvasRef.current) return;
    const imageDataUrl = canvasRef.current.toDataURL('image/png');
    const laneSummaries = [
      {
        laneNumber: 1,
        sampleLabel: selectedLadder.name,
        bandSizesBp: selectedLadder.bandsBp,
      },
      ...laneSampleIds.map((id, idx) => {
        const s = dnaSamples.find((x) => x.id === id);
        return {
          laneNumber: idx + 2,
          sampleLabel: s?.label ?? 'Empty',
          bandSizesBp: (s?.dnaFragments ?? []).map((f) => f.lengthBp),
        };
      }),
    ];

    onCaptureGelSnapshot({
      capturedAtSimMin: simMinutes,
      agarosePercent,
      voltageV,
      ladderId,
      laneSummaries,
      imageDataUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap
              className={`w-5 h-5 text-blue-400 shrink-0 transition-transform duration-200 ${
                isRunning ? 'scale-125 text-cyan-300' : ''
              }`}
            />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Agarose Gel Electrophoresis &amp; UV Gel Doc
              </h2>
              <p className="text-xs text-slate-400">
                Separate PCR amplicons and restriction fragments by base-pair size against a DNA Ladder.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close Gel Electrophoresis"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: UV Gel Doc Viewport */}
          <div className="lg:col-span-7 space-y-3">
            <canvas
              ref={canvasRef}
              width={640}
              height={400}
              className="w-full h-auto rounded border border-slate-800 bg-black"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUvMode((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border cursor-pointer ${
                    uvMode
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {uvMode ? 'UV Transilluminator: ON' : 'White Light View'}
                </button>
                <span className="text-xs font-mono-tabular text-slate-400">
                  Progress: {(runProgress * 100).toFixed(0)}% · {voltageV}V / {agarosePercent.toFixed(1)}%
                </span>
              </div>

              <button
                type="button"
                disabled={runProgress < 0.25}
                onClick={handleCaptureGel}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                Capture Gel Image to Notebook
              </button>
            </div>
          </div>

          {/* Right: Gel Parameters & Lane Loading */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Agarose Gel Concentration</span>
                  <span className="font-mono-tabular text-blue-300 font-semibold">
                    {agarosePercent.toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={2.0}
                  step={0.2}
                  value={agarosePercent}
                  onChange={(e) => setAgarosePercent(Number(e.target.value))}
                  className="w-full accent-blue-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Power Supply Voltage</span>
                  <span className="font-mono-tabular text-blue-300 font-semibold">{voltageV} V</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={140}
                  step={10}
                  value={voltageV}
                  onChange={(e) => setVoltageV(Number(e.target.value))}
                  className="w-full accent-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Lane 1: Reference DNA Ladder
                </label>
                <select
                  value={ladderId}
                  onChange={(e) => setLadderId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                >
                  {DNA_LADDERS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2 max-h-56 overflow-y-auto">
              <div className="text-xs font-semibold text-slate-200 mb-1">
                Load Samples into Wells 2–8
              </div>
              {laneSampleIds.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-tabular text-slate-400 w-12 shrink-0">
                    Well {idx + 2}
                  </span>
                  <select
                    value={val}
                    onChange={(e) => {
                      const next = [...laneSampleIds];
                      next[idx] = e.target.value;
                      setLaneSampleIds(next);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="">Empty</option>
                    {dnaSamples.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({(s.dnaFragments?.length ?? 0)} bands)
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartRun}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              {isRunning ? 'Electrophoresis Running...' : 'Run Electrophoresis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
