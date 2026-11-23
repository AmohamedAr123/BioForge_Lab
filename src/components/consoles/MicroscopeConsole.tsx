import React, { useEffect, useRef, useState } from 'react';
import { Camera, Microscope, X } from 'lucide-react';
import { getSpeciesById } from '../../data/scientificDatabase';
import { formatScientificCount } from '../../engine/simulation';
import { CultureVessel, LabMode, MicroscopeSnapshot } from '../../types/lab';
import { getPhStatus, getTemperatureStatus } from '../../utils/colorCoding';
import { IsometricMicroscopeWorkbench } from './IsometricMicroscopeWorkbench';

interface MicroscopeConsoleProps {
  labMode?: LabMode;
  beltVessels: CultureVessel[];
  allVessels: CultureVessel[];
  simMinutes: number;
  selectedVesselId: string | null;
  onCaptureSnapshot: (snapshot: Omit<MicroscopeSnapshot, 'id'>) => void;
  onClose: () => void;
}

interface SimulatedCellParticle {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  speciesId: string;
  isDead: boolean;
}

export const MicroscopeConsole: React.FC<MicroscopeConsoleProps> = ({
  labMode = 'automate',
  beltVessels,
  allVessels,
  simMinutes,
  selectedVesselId,
  onCaptureSnapshot,
  onClose,
}) => {
  const [sessionMode, setSessionMode] = useState<LabMode>(labMode ?? 'automate');

  const isCellCulture = (v: CultureVessel) =>
    v.vesselType === 'flask_250ml' ||
    v.vesselType === 'culture_tube' ||
    v.vesselType === 'agar_plate';

  const inspectableVessels = [
    ...beltVessels.filter(isCellCulture),
    ...allVessels.filter((v) => v.location.zone !== 'belt' && isCellCulture(v)),
  ];

  const [mountedVesselId, setMountedVesselId] = useState<string>(() => {
    if (
      selectedVesselId &&
      inspectableVessels.some((v) => v.id === selectedVesselId)
    ) {
      return selectedVesselId;
    }
    return inspectableVessels[0]?.id ?? '';
  });

  const [magnification, setMagnification] = useState<100 | 400 | 1000>(1000);
  const [opticalMode, setOpticalMode] = useState<
    'brightfield' | 'phase_contrast' | 'gram_stain'
  >('gram_stain');
  const [fineFocus, setFineFocus] = useState<number>(50); // 50 = sharp focus
  const [illumination, setIllumination] = useState<number>(85);
  const [captureFlash, setCaptureFlash] = useState<boolean>(false);
  const [turretPulse, setTurretPulse] = useState<boolean>(false);
  const turretTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (turretTimerRef.current !== null) {
      window.clearTimeout(turretTimerRef.current);
    }
    setTurretPulse(true);
    turretTimerRef.current = window.setTimeout(() => {
      setTurretPulse(false);
    }, 220);
    return () => {
      if (turretTimerRef.current !== null) {
        window.clearTimeout(turretTimerRef.current);
      }
    };
  }, [magnification, opticalMode, mountedVesselId]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<SimulatedCellParticle[]>([]);

  const mountedVessel =
    inspectableVessels.find((v) => v.id === mountedVesselId) ?? null;

  // Live mutable optical state read directly inside the persistent 60 FPS animation loop
  // so dragging Fine Focus or Illumination never tears down RAF.
  const opticsRef = useRef({
    magnification,
    opticalMode,
    mountedVesselTempC: mountedVessel?.temperatureC ?? 22,
  });
  opticsRef.current = {
    magnification,
    opticalMode,
    mountedVesselTempC: mountedVessel?.temperatureC ?? 22,
  };

  const totalViable = mountedVessel
    ? mountedVessel.populations.reduce((acc, p) => acc + p.viableCount, 0)
    : 0;
  const totalDead = mountedVessel
    ? mountedVessel.populations.reduce((acc, p) => acc + p.deadCount, 0)
    : 0;

  const densityBucket = Math.round(Math.log10(Math.max(1, totalViable + totalDead)) * 4);

  const lastPopulatedVesselIdRef = useRef<string>('');
  const particleVersionRef = useRef<number>(0);

  // Guard if mounted vessel was removed or list populated after mount
  useEffect(() => {
    if (mountedVesselId && inspectableVessels.some((v) => v.id === mountedVesselId)) return;
    const fallback =
      selectedVesselId && inspectableVessels.some((v) => v.id === selectedVesselId)
        ? selectedVesselId
        : inspectableVessels[0]?.id ?? '';
    if (fallback !== mountedVesselId) {
      setMountedVesselId(fallback);
    }
  }, [inspectableVessels, mountedVesselId, selectedVesselId]);

  useEffect(() => {
    if (!mountedVessel) {
      particlesRef.current = [];
      lastPopulatedVesselIdRef.current = '';
      particleVersionRef.current += 1;
      return;
    }

    const totalCells = totalViable + totalDead;
    const targetCount =
      totalCells <= 0
        ? 0
        : Math.min(165, Math.max(4, Math.round((Math.log10(Math.max(1e4, totalCells)) - 3.5) * 28)));

    const popWeights = mountedVessel.populations.map((p) => ({
      speciesId: p.speciesId,
      viable: p.viableCount,
      dead: p.deadCount,
      total: p.viableCount + p.deadCount,
    }));
    const grandTotal = popWeights.reduce((acc, p) => acc + p.total, 0) || 1;

    const createParticle = (): SimulatedCellParticle | null => {
      let r = Math.random() * grandTotal;
      let chosen = popWeights[0];
      for (const pw of popWeights) {
        r -= pw.total;
        if (r <= 0) {
          chosen = pw;
          break;
        }
      }
      if (!chosen) return null;

      const isDead = Math.random() < chosen.dead / Math.max(1, chosen.total);
      const angle = Math.random() * Math.PI * 2;
      return {
        x: 64 + Math.random() * 592,
        y: 64 + Math.random() * 592,
        angle,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        speciesId: chosen.speciesId,
        isDead,
      };
    };

    // Only reset all positions when switching to a different vessel;
    // otherwise incrementally add/remove/update dead flags so cells never teleport!
    if (lastPopulatedVesselIdRef.current !== mountedVesselId) {
      lastPopulatedVesselIdRef.current = mountedVesselId;
      const particles: SimulatedCellParticle[] = [];
      for (let i = 0; i < targetCount; i++) {
        const p = createParticle();
        if (p) particles.push(p);
      }
      particlesRef.current = particles;
      particleVersionRef.current += 1;
      return;
    }

    const existing = particlesRef.current;
    let mutated = false;

    if (targetCount > existing.length) {
      const toAdd = targetCount - existing.length;
      for (let i = 0; i < toAdd; i++) {
        const p = createParticle();
        if (p) existing.push(p);
      }
      mutated = true;
    } else if (targetCount < existing.length) {
      existing.length = targetCount;
      mutated = true;
    }

    // Update dead/live proportion gently without moving cells
    const deadRatio = totalCells > 0 ? totalDead / totalCells : 0;
    const expectedDead = Math.round(existing.length * deadRatio);
    let currentDead = 0;
    for (let i = 0; i < existing.length; i++) {
      if (existing[i].isDead) currentDead++;
    }
    if (currentDead < expectedDead) {
      let diff = expectedDead - currentDead;
      for (let i = 0; i < existing.length && diff > 0; i++) {
        if (!existing[i].isDead) {
          existing[i].isDead = true;
          diff--;
          mutated = true;
        }
      }
    } else if (currentDead > expectedDead) {
      let diff = currentDead - expectedDead;
      for (let i = 0; i < existing.length && diff > 0; i++) {
        if (existing[i].isDead) {
          existing[i].isDead = false;
          diff--;
          mutated = true;
        }
      }
    }

    if (mutated) {
      particleVersionRef.current += 1;
    }
  }, [mountedVesselId, densityBucket, totalViable, totalDead, mountedVessel]);

  // Persistent RAF loop for Automate Mode viewport
  useEffect(() => {
    if (sessionMode === 'manual') return;

    let rafId = 0;
    let lastTime = performance.now();
    let cachedVignette: HTMLCanvasElement | null = null;
    let cachedVignetteSize = 0;

    let lastStaticKey = '';

    const drawViewport = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) {
        rafId = requestAnimationFrame(drawViewport);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const {
        magnification: mag,
        opticalMode: mode,
        mountedVesselTempC,
      } = opticsRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const isFixedSmear = mode === 'gram_stain';
      const particleCount = particlesRef.current.length;

      // Fixed smears and sterile slides are completely stationary; skip redundant 60 Hz redraws
      if (isFixedSmear || particleCount === 0) {
        const staticKey = `${w}|${mag}|${mode}|${particleVersionRef.current}|${particleCount}`;
        if (staticKey === lastStaticKey) {
          rafId = requestAnimationFrame(drawViewport);
          return;
        }
        lastStaticKey = staticKey;
      } else {
        lastStaticKey = '';
      }

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      ctx.clip();

      if (mode === 'phase_contrast') {
        ctx.fillStyle = '#1E2630';
      } else if (mode === 'gram_stain') {
        ctx.fillStyle = '#F4F1EC';
      } else {
        ctx.fillStyle = '#EEF4F0';
      }
      ctx.fillRect(0, 0, w, h);

      const magScale = mag === 100 ? 0.5 : mag === 400 ? 1.18 : 2.4;

      for (const cell of particlesRef.current) {
        const sp = getSpeciesById(cell.speciesId);
        if (!sp) continue;

        if (!isFixedSmear) {
          if (sp.motile && !cell.isDead && mountedVesselTempC > 12) {
            if (Math.random() < 1.1 * dt) {
              cell.angle += (Math.random() - 0.5) * 0.85;
              cell.vx = Math.cos(cell.angle);
              cell.vy = Math.sin(cell.angle);
            }
            const swimSpeed = mag === 100 ? 10 : mag === 400 ? 22 : 36;
            cell.x += cell.vx * swimSpeed * dt;
            cell.y += cell.vy * swimSpeed * dt;
          } else {
            cell.x += (Math.random() - 0.5) * 4.5 * dt;
            cell.y += (Math.random() - 0.5) * 4.5 * dt;
          }

          if (cell.x < 24) cell.x = w - 24;
          if (cell.x > w - 24) cell.x = 24;
          if (cell.y < 24) cell.y = h - 24;
          if (cell.y > h - 24) cell.y = 24;
        }

        let fill = '#475569';
        let stroke = '#1E293B';
        if (mode === 'gram_stain') {
          if (sp.gramStatus === 'positive') {
            fill = cell.isDead ? '#7E22CE' : '#5B21B6';
            stroke = '#3B0764';
          } else {
            fill = cell.isDead ? '#FB7185' : '#E11D48';
            stroke = '#9F1239';
          }
        } else if (mode === 'phase_contrast') {
          fill = cell.isDead ? '#64748B' : '#0F172A';
          stroke = '#CBD5E1';
        } else {
          fill = cell.isDead ? 'rgba(100,116,139,0.45)' : 'rgba(51,65,85,0.68)';
          stroke = 'rgba(30,41,59,0.5)';
        }

        const lenPx = Math.max(2.2, sp.lengthUm * 5.2 * magScale);
        const widPx = Math.max(1.8, sp.widthUm * 5.2 * magScale);

        ctx.save();
        ctx.translate(cell.x, cell.y);
        ctx.rotate(cell.angle);
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = mode === 'phase_contrast' ? 1.2 : 0.8;

        if (sp.shape === 'coccus') {
          if (sp.arrangement === 'clusters') {
            const offsets = [
              [0, 0],
              [widPx * 0.85, 0.2],
              [-widPx * 0.75, widPx * 0.5],
              [widPx * 0.2, -widPx * 0.8],
              [widPx * 0.9, widPx * 0.85],
            ];
            for (const [ox, oy] of offsets) {
              ctx.beginPath();
              ctx.arc(ox, oy, widPx * 0.55, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            }
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, widPx * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else {
          const segments = sp.arrangement === 'chains' ? 3 : 1;
          for (let s = 0; s < segments; s++) {
            const ox = (s - (segments - 1) / 2) * (lenPx + 1.5);
            ctx.beginPath();
            ctx.roundRect(ox - lenPx / 2, -widPx / 2, lenPx, widPx, widPx / 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      if (!cachedVignette || cachedVignetteSize !== w) {
        cachedVignetteSize = w;
        cachedVignette = document.createElement('canvas');
        cachedVignette.width = w;
        cachedVignette.height = h;
        const vCtx = cachedVignette.getContext('2d');
        if (vCtx) {
          const grad = vCtx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.5);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,0.45)');
          vCtx.fillStyle = grad;
          vCtx.fillRect(0, 0, w, h);
        }
      }
      ctx.drawImage(cachedVignette, 0, 0);

      ctx.restore();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();

      rafId = requestAnimationFrame(drawViewport);
    };

    rafId = requestAnimationFrame(drawViewport);
    return () => cancelAnimationFrame(rafId);
  }, [sessionMode]);

  if (sessionMode === 'manual') {
    return (
      <IsometricMicroscopeWorkbench
        sessionMode={sessionMode}
        onSwitchSessionMode={setSessionMode}
        inspectableVessels={inspectableVessels}
        mountedVesselId={mountedVesselId}
        onSelectVesselId={setMountedVesselId}
        simMinutes={simMinutes}
        onCaptureSnapshot={onCaptureSnapshot}
        onClose={onClose}
      />
    );
  }

  // GPU-composited optical blur and condenser illumination
  const blurPx = Math.abs(fineFocus - 50) * 0.14;
  const lumFactor = Math.max(0.35, illumination / 100);
  const scaleLabel = magnification === 1000 ? '10 µm' : magnification === 400 ? '25 µm' : '100 µm';
  const scaleBarCssPx = magnification === 1000 ? 70 : magnification === 400 ? 70 : 75;

  const primaryPop = mountedVessel?.populations[0];
  const primarySpecies = primaryPop ? getSpeciesById(primaryPop.speciesId) : undefined;
  const tempBadge = mountedVessel
    ? getTemperatureStatus(mountedVessel.temperatureC, mountedVessel.vesselType, primarySpecies)
    : null;
  const phBadge = mountedVessel ? getPhStatus(mountedVessel.pH, primarySpecies) : null;

  const handleCapture = () => {
    if (!mountedVessel || !canvasRef.current) return;

    const srcCanvas = canvasRef.current;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = srcCanvas.width;
    outCanvas.height = srcCanvas.height;
    const outCtx = outCanvas.getContext('2d');
    if (outCtx) {
      outCtx.save();
      outCtx.beginPath();
      outCtx.arc(outCanvas.width / 2, outCanvas.height / 2, outCanvas.width / 2 - 4, 0, Math.PI * 2);
      outCtx.clip();
      const filterParts: string[] = [`brightness(${lumFactor.toFixed(2)})`];
      if (blurPx > 0.2) filterParts.push(`blur(${blurPx.toFixed(1)}px)`);
      outCtx.filter = filterParts.join(' ');
      outCtx.drawImage(srcCanvas, 0, 0);
      outCtx.filter = 'none';

      const barPx = magnification === 1000 ? 126 : magnification === 400 ? 126 : 135;
      outCtx.fillStyle = opticalMode === 'phase_contrast' ? '#E2E8F0' : '#0F172A';
      outCtx.fillRect(outCanvas.width - barPx - 64, outCanvas.height - 62, barPx, 5);
      outCtx.font = '600 18px "JetBrains Mono", monospace';
      outCtx.textAlign = 'center';
      outCtx.fillText(scaleLabel, outCanvas.width - barPx / 2 - 64, outCanvas.height - 76);
      outCtx.restore();
    }

    const imageDataUrl = outCanvas.toDataURL('image/png');
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 180);

    const speciesSummary = primarySpecies
      ? `${primarySpecies.scientificName} (${primarySpecies.shape}, Gram-${primarySpecies.gramStatus})`
      : 'Sterile / No cells observed';

    onCaptureSnapshot({
      capturedAtSimMin: simMinutes,
      vesselId: mountedVessel.id,
      vesselLabel: mountedVessel.label,
      speciesIds: mountedVessel.populations.map((p) => p.speciesId),
      magnification,
      opticalMode,
      od600AtCapture: mountedVessel.od600,
      viableCountAtCapture: totalViable,
      summaryObservation: `${magnification}x ${opticalMode.replace('_', ' ')} — ${speciesSummary} · Viable ${formatScientificCount(totalViable)} CFU/mL`,
      imageDataUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-[#111827] border border-slate-700 rounded-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0B0E17] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Microscope className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Compound &amp; Phase-Contrast Microscope
              </h2>
              <p className="text-xs text-slate-400">
                Inspect cell morphology, Gram stain differentiation, chaining/clustering, and flagellar motility.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-[#111827] border border-slate-700 rounded p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSessionMode('automate')}
                className="px-2.5 py-1 rounded font-semibold bg-cyan-600 text-white cursor-pointer"
              >
                Automate
              </button>
              <button
                type="button"
                onClick={() => setSessionMode('manual')}
                className="px-2.5 py-1 rounded font-semibold text-slate-300 hover:text-white cursor-pointer"
                title="Temporarily switch to Manual Isometric Microscope Bench (reverts to HUD mode on exit)"
              >
                Manual
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              aria-label="Close Microscope"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Hardware-Composited Optical Viewport */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div
              className="relative rounded-full overflow-hidden border-4 bg-black transition-all duration-200"
              style={{
                borderColor: `rgba(56, 189, 248, ${(0.25 + (illumination / 100) * 0.45).toFixed(2)})`,
              }}
            >
              <canvas
                ref={canvasRef}
                width={720}
                height={720}
                style={{
                  filter: `brightness(${lumFactor.toFixed(2)})${
                    blurPx > 0.2 ? ` blur(${(blurPx * 0.55).toFixed(1)}px)` : ''
                  }`,
                  willChange: 'filter, opacity, transform',
                }}
                className={`w-[380px] h-[380px] sm:w-[400px] sm:h-[400px] block transition-[opacity,transform] duration-200 ${
                  captureFlash
                    ? 'opacity-40'
                    : turretPulse
                    ? 'scale-95 opacity-85'
                    : 'scale-100 opacity-100'
                }`}
              />

              {/* Crisp Scale Bar HUD overlay unaffected by specimen defocus */}
              {mountedVessel && (
                <div className="pointer-events-none absolute bottom-8 right-12 flex flex-col items-center">
                  <span
                    className={`text-[11px] font-mono-tabular font-semibold mb-1 ${
                      opticalMode === 'phase_contrast' ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {scaleLabel}
                  </span>
                  <div
                    style={{ width: `${scaleBarCssPx}px` }}
                    className={`h-[3px] transition-all duration-200 ${
                      opticalMode === 'phase_contrast' ? 'bg-slate-100' : 'bg-slate-900'
                    }`}
                  />
                </div>
              )}

              {!mountedVessel && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 text-center px-12">
                  Select a culture vessel to mount a sample slide on the stage.
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between w-full max-w-[400px] text-xs text-slate-400 font-mono-tabular">
              <span>Objective: {magnification}x {magnification === 1000 ? '(Oil)' : ''}</span>
              <span>Mode: {opticalMode.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Right: Optical Turret, Slide Selection & Sample Diagnostics */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mounted Sample Slide
              </label>
              <select
                value={mountedVesselId}
                onChange={(e) => setMountedVesselId(e.target.value)}
                className="w-full bg-[#0B0E17] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {inspectableVessels.length === 0 && (
                  <option value="">No vessels available to inspect</option>
                )}
                {inspectableVessels.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.location.zone === 'belt' ? 'Sample Tray' : v.location.stationId.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Objective Lens Turret
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([100, 400, 1000] as const).map((mag) => (
                  <button
                    key={mag}
                    type="button"
                    onClick={() => setMagnification(mag)}
                    className={`py-2 px-3 rounded border text-xs font-mono-tabular font-semibold cursor-pointer whitespace-nowrap ${
                      magnification === mag
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                        : 'bg-[#0B0E17] border-slate-800 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {mag}x {mag === 1000 ? 'Oil' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Illumination &amp; Staining Technique
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'gram_stain' as const, label: 'Gram Stain' },
                  { id: 'phase_contrast' as const, label: 'Phase Contrast' },
                  { id: 'brightfield' as const, label: 'Brightfield' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOpticalMode(m.id)}
                    className={`py-2 px-2 rounded border text-xs font-medium cursor-pointer whitespace-nowrap ${
                      opticalMode === m.id
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                        : 'bg-[#0B0E17] border-slate-800 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus & Condenser Controls */}
            <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Fine Focus Knob</span>
                  <span
                    className={`font-mono-tabular font-medium ${
                      Math.abs(fineFocus - 50) <= 3 ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {Math.abs(fineFocus - 50) <= 3 ? 'In Focus (0 µm)' : `${fineFocus - 50} µm (Out of Focus)`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fineFocus}
                  onChange={(e) => setFineFocus(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Condenser Illumination</span>
                  <span className="font-mono-tabular text-amber-300">{illumination}%</span>
                </div>
                <input
                  type="range"
                  min={35}
                  max={100}
                  value={illumination}
                  onChange={(e) => setIllumination(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            {mountedVessel && (
              <div className="p-3.5 bg-[#0B0E17] border border-slate-800 rounded space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Morphological &amp; Viability Readout</div>
                {primarySpecies ? (
                  <>
                    <div className="text-slate-300">
                      <span>{primarySpecies.scientificName}</span>
                      <span className="mx-1.5 text-slate-500" aria-hidden="true">·</span>
                      <span className={primarySpecies.gramStatus === 'positive' ? 'text-purple-300' : 'text-rose-300'}>
                        Gram-{primarySpecies.gramStatus} {primarySpecies.shape}
                      </span>
                      <span className="mx-1.5 text-slate-500" aria-hidden="true">·</span>
                      <span className="capitalize">{primarySpecies.arrangement}</span>
                    </div>
                    <div className="font-mono-tabular text-slate-400">
                      Dimensions: {primarySpecies.lengthUm} × {primarySpecies.widthUm} µm ·{' '}
                      {primarySpecies.motile ? 'Motile (Flagellated)' : 'Non-motile'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono-tabular">
                      <span className="text-emerald-300">
                        Viable: {formatScientificCount(totalViable)} CFU/mL
                      </span>
                      <span className="text-rose-300">
                        Dead: {formatScientificCount(totalDead)}
                      </span>
                      {tempBadge && (
                        <span className={tempBadge.textClass}>
                          {mountedVessel.temperatureC.toFixed(1)} °C
                        </span>
                      )}
                      {phBadge && (
                        <span className={phBadge.textClass}>pH {mountedVessel.pH.toFixed(2)}</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">
                    Sterile media field — zero bacterial cells detected.
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!mountedVessel}
              onClick={handleCapture}
              className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Capture Micrograph to Lab Notebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
