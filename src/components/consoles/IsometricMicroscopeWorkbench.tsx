import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Crosshair,
  Eye,
  Flame,
  RotateCcw,
  X,
} from 'lucide-react';
import { getSpeciesById } from '../../data/scientificDatabase';
import { labAudio } from '../../engine/audio';
import { formatScientificCount } from '../../engine/simulation';
import { CultureVessel, LabMode, MicroscopeSnapshot } from '../../types/lab';
import { getPhStatus, getTemperatureStatus } from '../../utils/colorCoding';
import {
  HeldToolCursor,
  PixelMicroscope128,
  PixelSprite64Id,
  PixelToolSprite64,
} from '../tools';

export interface IsometricMicroscopeWorkbenchProps {
  sessionMode?: LabMode;
  onSwitchSessionMode?: (mode: LabMode) => void;
  inspectableVessels: CultureVessel[];
  mountedVesselId: string;
  onSelectVesselId: (id: string) => void;
  simMinutes: number;
  onCaptureSnapshot: (snapshot: Omit<MicroscopeSnapshot, 'id'>) => void;
  onClose: () => void;
}

type HeldScopeToolId =
  | 'glass_slide'
  | 'pipette_p1000'
  | 'loop_nichrome'
  | 'stain_cv'
  | 'stain_iodine'
  | 'stain_ethanol'
  | 'stain_safranin'
  | 'water_jar'
  | 'immersion_oil';

interface SlideCellParticle {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  speciesId: string;
  isDead: boolean;
}

const TOOL_SPRITE_MAP: Record<HeldScopeToolId, PixelSprite64Id> = {
  glass_slide: 'glass_slide',
  pipette_p1000: 'pipette_p1000',
  loop_nichrome: 'loop_nichrome',
  stain_cv: 'stain_cv',
  stain_iodine: 'stain_iodine',
  stain_ethanol: 'stain_ethanol',
  stain_safranin: 'stain_safranin',
  water_jar: 'water_jar',
  immersion_oil: 'immersion_oil',
};

const TOOL_LABELS: Record<HeldScopeToolId, string> = {
  glass_slide: 'Clean Glass Slide (Click Staining Rack to Place)',
  pipette_p1000: 'P1000 Pipette (Suction Vessel → Click Slide)',
  loop_nichrome: 'Nichrome Loop (Flame → Vessel → Slide)',
  stain_cv: '1. Crystal Violet Primary Stain (Click Slide)',
  stain_iodine: "2. Gram's Iodine Mordant (Click Slide)",
  stain_ethanol: '3. 95% Ethanol Decolorizer (HOLD on Slide 5–10s)',
  stain_safranin: '4. Safranin Counterstain (Click Slide)',
  water_jar: 'ddH₂O Rinse Bottle (Click Slide to Rinse)',
  immersion_oil: 'Cedarwood Immersion Oil (Required for 1000x)',
};

const WORLD_SIZE = 1600;

export const IsometricMicroscopeWorkbench: React.FC<IsometricMicroscopeWorkbenchProps> = ({
  sessionMode = 'manual',
  onSwitchSessionMode,
  inspectableVessels,
  mountedVesselId,
  onSelectVesselId,
  simMinutes,
  onCaptureSnapshot,
  onClose,
}) => {
  const [viewStage, setViewStage] = useState<'bench' | 'eyepiece'>('bench');
  const [heldTool, setHeldTool] = useState<HeldScopeToolId | null>(null);

  // Slide Preparation & Staining Workflow State
  const [hasSlideOnRack, setHasSlideOnRack] = useState<boolean>(true);
  const [hasSmearSample, setHasSmearSample] = useState<boolean>(false);
  const [heatFixed, setHeatFixed] = useState<boolean>(false);
  const [stainCv, setStainCv] = useState<boolean>(false);
  const [stainIodine, setStainIodine] = useState<boolean>(false);
  const [ethanolSec, setEthanolSec] = useState<number>(0);
  const [isHoldingEthanol, setIsHoldingEthanol] = useState<boolean>(false);
  const [stainSafranin, setStainSafranin] = useState<boolean>(false);
  const [oilApplied, setOilApplied] = useState<boolean>(false);
  const [slideMountedOnScope, setSlideMountedOnScope] = useState<boolean>(false);

  // Shared Wet-Lab Hardware State (Reused Pipette / Tip / Loop / Burner mechanics)
  const [tipCount, setTipCount] = useState<number>(24);
  const [hasFreshTip, setHasFreshTip] = useState<boolean>(false);
  const [pipetteHasDrop, setPipetteHasDrop] = useState<boolean>(false);
  const [bunsenLit, setBunsenLit] = useState<boolean>(false);
  const [loopState, setLoopState] = useState<'unsterile' | 'hot' | 'cool_sterile' | 'loaded'>('unsterile');
  const [loopCoolSec, setLoopCoolSec] = useState<number>(0);

  // Eyepiece Optical Controls & X-Y Stage Coordinates
  const [magnification, setMagnification] = useState<100 | 400 | 1000>(1000);
  const [opticalMode, setOpticalMode] = useState<'gram_stain' | 'phase_contrast' | 'brightfield'>('gram_stain');
  const [fineFocus, setFineFocus] = useState<number>(50);
  const [illumination, setIllumination] = useState<number>(85);
  const [stageX, setStageX] = useState<number>(WORLD_SIZE / 2);
  const [stageY, setStageY] = useState<number>(WORLD_SIZE / 2);
  const [captureFlash, setCaptureFlash] = useState<boolean>(false);
  const [turretPulse, setTurretPulse] = useState<boolean>(false);
  const [benchStatus, setBenchStatus] = useState<string>(
    'Prep a slide on the right: Transfer culture with P1000 Pipette or flamed Loop, Heat-Fix, Stain, then click the 128×128 Microscope on the left.'
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<SlideCellParticle[]>([]);
  const dragPanRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const mountedVessel = useMemo(
    () => inspectableVessels.find((v) => v.id === mountedVesselId) ?? null,
    [inspectableVessels, mountedVesselId]
  );

  // Reset slide prep when switching target vessel
  useEffect(() => {
    setHasSmearSample(false);
    setHeatFixed(false);
    setStainCv(false);
    setStainIodine(false);
    setEthanolSec(0);
    setStainSafranin(false);
    setOilApplied(false);
    setSlideMountedOnScope(false);
    setPipetteHasDrop(false);
    setStageX(WORLD_SIZE / 2);
    setStageY(WORLD_SIZE / 2);
  }, [mountedVesselId]);

  // Cooling loop countdown
  useEffect(() => {
    if (loopState !== 'hot') return;
    if (loopCoolSec <= 0) {
      setLoopState('cool_sterile');
      setBenchStatus('Nichrome loop cooled and sterile! Click Sample Vessel to pick cells.');
      return;
    }
    const t = window.setTimeout(() => setLoopCoolSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [loopState, loopCoolSec]);

  // Continuous 95% Ethanol Decolorizer hold timer (5–10s sweet spot!)
  useEffect(() => {
    if (!isHoldingEthanol) return;
    const t = window.setInterval(() => {
      setEthanolSec((prev) => {
        const next = Number(Math.min(15.0, prev + 0.1).toFixed(1));
        return next;
      });
    }, 100);
    return () => window.clearInterval(t);
  }, [isHoldingEthanol]);

  useEffect(() => {
    const stopHold = () => setIsHoldingEthanol(false);
    window.addEventListener('pointerup', stopHold);
    window.addEventListener('pointercancel', stopHold);
    return () => {
      window.removeEventListener('pointerup', stopHold);
      window.removeEventListener('pointercancel', stopHold);
    };
  }, []);

  useEffect(() => {
    setTurretPulse(true);
    const t = window.setTimeout(() => setTurretPulse(false), 200);
    return () => window.clearTimeout(t);
  }, [magnification, opticalMode, mountedVesselId]);

  // Determine manual Gram Stain accuracy
  const gramResult: 'accurate' | 'over_decolorized' | 'unstained' =
    opticalMode !== 'gram_stain'
      ? 'accurate'
      : !stainCv || !stainIodine || !stainSafranin
      ? 'unstained'
      : ethanolSec > 10.0
      ? 'over_decolorized'
      : ethanolSec >= 5.0
      ? 'accurate'
      : 'unstained';

  const slideColorHex = useMemo(() => {
    if (!hasSlideOnRack || !hasSmearSample) return '#94A3B8';
    if (stainSafranin && stainIodine && stainCv) return '#9333EA';
    if (stainIodine) return '#92400E';
    if (stainCv) return '#6D28D9';
    return '#CBD5E1';
  }, [hasSlideOnRack, hasSmearSample, stainCv, stainIodine, stainSafranin]);

  const totalViable = mountedVessel
    ? mountedVessel.populations.reduce((acc, p) => acc + p.viableCount, 0)
    : 0;
  const totalDead = mountedVessel
    ? mountedVessel.populations.reduce((acc, p) => acc + p.deadCount, 0)
    : 0;

  const densityBucket = Math.round(Math.log10(Math.max(1, totalViable + totalDead)) * 4);

  const lastPopulatedVesselIdRef = useRef<string>('');

  // Populate wide 1600x1600 virtual slide cell field incrementally without teleporting cells
  useEffect(() => {
    if (!mountedVessel) {
      particlesRef.current = [];
      lastPopulatedVesselIdRef.current = '';
      return;
    }

    const totalCells = totalViable + totalDead;
    const targetCount =
      totalCells <= 0
        ? 0
        : Math.min(480, Math.max(16, Math.round((Math.log10(Math.max(1e4, totalCells)) - 3.5) * 78)));

    const popWeights = mountedVessel.populations.map((p) => ({
      speciesId: p.speciesId,
      viable: p.viableCount,
      dead: p.deadCount,
      total: p.viableCount + p.deadCount,
    }));
    const grandTotal = popWeights.reduce((acc, p) => acc + p.total, 0) || 1;

    const createParticle = (): SlideCellParticle | null => {
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
        x: 40 + Math.random() * (WORLD_SIZE - 80),
        y: 40 + Math.random() * (WORLD_SIZE - 80),
        angle,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        speciesId: chosen.speciesId,
        isDead,
      };
    };

    if (lastPopulatedVesselIdRef.current !== mountedVesselId) {
      lastPopulatedVesselIdRef.current = mountedVesselId;
      const particles: SlideCellParticle[] = [];
      for (let i = 0; i < targetCount; i++) {
        const p = createParticle();
        if (p) particles.push(p);
      }
      particlesRef.current = particles;
      return;
    }

    const existing = particlesRef.current;
    if (targetCount > existing.length) {
      const toAdd = targetCount - existing.length;
      for (let i = 0; i < toAdd; i++) {
        const p = createParticle();
        if (p) existing.push(p);
      }
    } else if (targetCount < existing.length) {
      existing.length = targetCount;
    }
  }, [mountedVesselId, densityBucket, mountedVessel, totalViable, totalDead]);

  const opticsRef = useRef({
    magnification,
    opticalMode,
    mountedVesselTempC: mountedVessel?.temperatureC ?? 22,
    gramResult,
    stageX,
    stageY,
    hasSmearSample,
    heatFixed,
  });
  opticsRef.current = {
    magnification,
    opticalMode,
    mountedVesselTempC: mountedVessel?.temperatureC ?? 22,
    gramResult,
    stageX,
    stageY,
    hasSmearSample,
    heatFixed,
  };

  // Persistent 60 FPS Eyepiece Rendering Loop (NO air bubbles!)
  useEffect(() => {
    if (viewStage !== 'eyepiece') return;
    let rafId = 0;
    let lastTime = performance.now();
    let cachedVignette: HTMLCanvasElement | null = null;
    let cachedVignetteSize = 0;

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
        gramResult: gr,
        stageX: sx,
        stageY: sy,
        hasSmearSample: hasSample,
        heatFixed: isFixed,
      } = opticsRef.current;

      const w = canvas.width;
      const h = canvas.height;
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

      // Subtle optical stage coordinate reticle markings at low brightness so panning is palpable
      ctx.strokeStyle =
        mode === 'phase_contrast' ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.06)';
      ctx.lineWidth = 1;
      const gridSpacing = mag === 100 ? 60 : mag === 400 ? 110 : 180;
      const offsetX = ((-sx % gridSpacing) + gridSpacing) % gridSpacing;
      const offsetY = ((-sy % gridSpacing) + gridSpacing) % gridSpacing;
      for (let gx = offsetX; gx < w; gx += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = offsetY; gy < h; gy += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      if (hasSample) {
        const magScale = mag === 100 ? 0.55 : mag === 400 ? 1.25 : 2.5;
        const zoomFov = mag === 100 ? 0.65 : mag === 400 ? 1.0 : 1.35;
        const isFixedSmear = mode === 'gram_stain' || isFixed;

        for (const cell of particlesRef.current) {
          const sp = getSpeciesById(cell.speciesId);
          if (!sp) continue;

          if (!isFixedSmear) {
            if (sp.motile && !cell.isDead && mountedVesselTempC > 12) {
              if (Math.random() < 0.03) {
                cell.angle += (Math.random() - 0.5) * 1.4;
                cell.vx = Math.cos(cell.angle);
                cell.vy = Math.sin(cell.angle);
              }
              const swimSpeed = 36;
              cell.x += cell.vx * swimSpeed * dt;
              cell.y += cell.vy * swimSpeed * dt;
            } else {
              cell.x += (Math.random() - 0.5) * 14 * dt;
              cell.y += (Math.random() - 0.5) * 14 * dt;
            }
            if (cell.x < 30) cell.x = WORLD_SIZE - 30;
            if (cell.x > WORLD_SIZE - 30) cell.x = 30;
            if (cell.y < 30) cell.y = WORLD_SIZE - 30;
            if (cell.y > WORLD_SIZE - 30) cell.y = 30;
          }

          const screenX = w / 2 + (cell.x - sx) * zoomFov;
          const screenY = h / 2 + (cell.y - sy) * zoomFov;
          if (screenX < -30 || screenX > w + 30 || screenY < -30 || screenY > h + 30) {
            continue;
          }

          let fill = '#475569';
          let stroke = '#1E293B';
          if (mode === 'gram_stain') {
            if (gr === 'unstained') {
              fill = 'rgba(100,116,139,0.38)';
              stroke = 'rgba(71,85,105,0.45)';
            } else if (sp.gramStatus === 'positive' && gr === 'accurate') {
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

          const lenPx = Math.max(2.4, sp.lengthUm * 5.2 * magScale);
          const widPx = Math.max(2.0, sp.widthUm * 5.2 * magScale);

          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate(cell.angle);
          ctx.fillStyle = fill;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = mode === 'phase_contrast' ? 1.2 : 0.85;

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
      }

      // Cached Lens Vignette
      if (!cachedVignette || cachedVignetteSize !== w) {
        cachedVignetteSize = w;
        cachedVignette = document.createElement('canvas');
        cachedVignette.width = w;
        cachedVignette.height = h;
        const vCtx = cachedVignette.getContext('2d');
        if (vCtx) {
          const grad = vCtx.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w * 0.5);
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
  }, [viewStage]);

  const oilMissingBlurPx = magnification === 1000 && !oilApplied ? 6.0 : 0;
  const blurPx = Math.abs(fineFocus - 50) * 0.14 + oilMissingBlurPx;
  const lumFactor = Math.max(0.35, illumination / 100);
  const scaleLabel = magnification === 1000 ? '10 µm' : magnification === 400 ? '25 µm' : '100 µm';
  const scaleBarCssPx = magnification === 1000 ? 74 : magnification === 400 ? 74 : 78;

  const primaryPop = mountedVessel?.populations[0];
  const primarySpecies = primaryPop ? getSpeciesById(primaryPop.speciesId) : undefined;
  const tempBadge = mountedVessel
    ? getTemperatureStatus(mountedVessel.temperatureC, mountedVessel.vesselType, primarySpecies)
    : null;
  const phBadge = mountedVessel ? getPhStatus(mountedVessel.pH, primarySpecies) : null;

  // Slide Prep Bench Handlers
  const handleResetSlide = () => {
    setHasSlideOnRack(true);
    setHasSmearSample(false);
    setHeatFixed(false);
    setStainCv(false);
    setStainIodine(false);
    setEthanolSec(0);
    setStainSafranin(false);
    setOilApplied(false);
    setSlideMountedOnScope(false);
    labAudio.playUiClick();
    setBenchStatus('Placed a fresh sterile Glass Slide on the Staining Rack.');
  };

  const handleClickTipBox = () => {
    if (tipCount <= 0) {
      setTipCount(24);
      labAudio.playUiClick();
      setBenchStatus('Refilled P1000 sterile tip box (24 tips).');
      return;
    }
    setTipCount((c) => c - 1);
    setHasFreshTip(true);
    setPipetteHasDrop(false);
    setHeldTool('pipette_p1000');
    labAudio.playUiClick();
    setBenchStatus('Mounted sterile tip on P1000 Pipette. Click Sample Tube to draw bacterial suspension.');
  };

  const handleClickBiohazardBin = () => {
    setHasFreshTip(false);
    setPipetteHasDrop(false);
    labAudio.playUiClick();
    setBenchStatus('Ejected used pipette tip cleanly into Biohazard Bin.');
  };

  const handleClickSampleTube = () => {
    if (!mountedVessel) {
      setBenchStatus('Select a source vessel first.');
      return;
    }
    if (heldTool === 'pipette_p1000') {
      if (!hasFreshTip) {
        setBenchStatus('Mount a sterile tip from the Tip Box before drawing culture!');
        return;
      }
      setPipetteHasDrop(true);
      labAudio.playPipetteSuction();
      setBenchStatus(`Suctioned 50 µL droplet from ${mountedVessel.label}. Click the Glass Slide to deposit smear!`);
      return;
    }
    if (heldTool === 'loop_nichrome') {
      if (loopState === 'hot') {
        setBenchStatus('Loop is still glowing hot — wait 3s for cool_sterile!');
        return;
      }
      if (loopState !== 'cool_sterile') {
        setBenchStatus('Flame nichrome loop on Bunsen Burner and let it cool 3s first.');
        return;
      }
      setLoopState('loaded');
      labAudio.playUiClick();
      setBenchStatus(`Picked cells from ${mountedVessel.label} on loop! Click the Glass Slide to smear.`);
      return;
    }
    setHeldTool('pipette_p1000');
    labAudio.playUiClick();
    setBenchStatus(
      hasFreshTip
        ? 'Holding P1000 Pipette — click Sample Tube again to suction a droplet.'
        : 'Click the Tip Box first to mount a sterile tip on your P1000 Pipette.'
    );
  };

  const handleClickBunsenBurner = () => {
    if (heldTool === 'loop_nichrome') {
      if (!bunsenLit) setBunsenLit(true);
      setLoopState('hot');
      setLoopCoolSec(3);
      labAudio.playUiClick();
      setBenchStatus('Flamed nichrome loop glowing red... cooling 3s!');
      return;
    }
    if (hasSmearSample && !heatFixed && bunsenLit) {
      setHeatFixed(true);
      labAudio.playUiClick();
      setBenchStatus('Passed slide over Bunsen flame — bacterial smear is Heat-Fixed!');
      return;
    }
    setBunsenLit((b) => {
      const next = !b;
      setBenchStatus(
        next
          ? 'Bunsen Burner lit! Flame your Nichrome Loop or click Heat-Fix Slide.'
          : 'Bunsen Burner turned OFF.'
      );
      return next;
    });
    labAudio.playUiClick();
  };

  const handleSlidePointerDown = () => {
    if (heldTool === 'glass_slide') {
      handleResetSlide();
      setHeldTool(null);
      return;
    }
    if (!hasSlideOnRack) {
      setBenchStatus('Place a clean Glass Slide on the Staining Rack first!');
      return;
    }

    if (heldTool === 'pipette_p1000') {
      if (!pipetteHasDrop) {
        setBenchStatus('Click the Sample Culture Tube first to suction a 50 µL smear droplet.');
        return;
      }
      setPipetteHasDrop(false);
      setHasSmearSample(true);
      labAudio.playPipetteDispense();
      setBenchStatus('Deposited bacterial smear onto Glass Slide! Pass over lit Bunsen Burner to Heat-Fix.');
      return;
    }

    if (heldTool === 'loop_nichrome') {
      if (loopState !== 'loaded') {
        setBenchStatus('Flame the loop on Bunsen Burner, let it cool, and pick sample first!');
        return;
      }
      setLoopState('unsterile');
      setHasSmearSample(true);
      labAudio.playPipetteDispense();
      setBenchStatus('Spread bacterial smear across Glass Slide! Pass over lit Bunsen Burner to Heat-Fix.');
      return;
    }

    if (heldTool === 'stain_cv') {
      if (!hasSmearSample) {
        setBenchStatus('Deposit and heat-fix a bacterial smear on the slide before applying Crystal Violet!');
        return;
      }
      setStainCv(true);
      labAudio.playPipetteDispense();
      setBenchStatus("Step 1 Applied: Crystal Violet floods all cells purple. Rinse or add Step 2: Gram's Iodine.");
      return;
    }

    if (heldTool === 'stain_iodine') {
      if (!stainCv) {
        setBenchStatus('Apply Step 1 (Crystal Violet) before Step 2 (Gram’s Iodine)!');
        return;
      }
      setStainIodine(true);
      labAudio.playPipetteDispense();
      setBenchStatus("Step 2 Applied: Gram's Iodine mordant locks CV–I complexes inside thick peptidoglycan.");
      return;
    }

    if (heldTool === 'stain_ethanol') {
      if (!stainIodine) {
        setBenchStatus("Complete Steps 1 & 2 (Crystal Violet + Gram's Iodine) before decolorizing with 95% Ethanol!");
        return;
      }
      setIsHoldingEthanol(true);
      labAudio.playSinkPour();
      setBenchStatus('Holding 95% Ethanol Decolorizer wash... release inside 5.0–10.0s sweet spot!');
      return;
    }

    if (heldTool === 'stain_safranin') {
      if (!stainIodine) {
        setBenchStatus('Complete Crystal Violet, Iodine, and Ethanol wash before applying Safranin!');
        return;
      }
      setStainSafranin(true);
      labAudio.playPipetteDispense();
      setBenchStatus('Step 4 Applied: Safranin counterstain! Click Immersion Oil (for 1000x) or mount slide on Microscope.');
      return;
    }

    if (heldTool === 'water_jar') {
      labAudio.playSinkPour();
      setBenchStatus('Gently rinsed excess stain off the slide with distilled ddH₂O.');
      return;
    }

    if (heldTool === 'immersion_oil') {
      if (!hasSmearSample) {
        setBenchStatus('Prepare your specimen smear on the slide before adding Cedarwood Immersion Oil!');
        return;
      }
      setOilApplied(true);
      labAudio.playPipetteDispense();
      setBenchStatus('Added Cedarwood Immersion Oil bead onto slide! Click the 128×128 Microscope on the left to inspect.');
      return;
    }

    if (!hasSmearSample) {
      setBenchStatus('Pick up the P1000 Pipette or Nichrome Loop to transfer cells onto this slide.');
    } else if (!heatFixed) {
      setBenchStatus('Heat-fix smear by clicking the Bunsen Burner, or proceed straight to Staining / Eyepiece.');
    }
  };

  const handleOpenEyepieceFromMicroscope = () => {
    if (!mountedVessel) {
      setBenchStatus('Select a culture vessel before inspecting through the Microscope!');
      return;
    }
    if (!hasSmearSample) {
      // Allow clicking microscope even if user wants Phase Contrast wet mount prompt, or auto-warn clearly
      setBenchStatus('Slide has no sample smear yet — transfer a drop from Sample Vessel onto the Glass Slide on the right first!');
      return;
    }
    setSlideMountedOnScope(true);
    setViewStage('eyepiece');
    labAudio.playStationOpen();
  };

  const panStage = (dx: number, dy: number) => {
    const step = magnification === 1000 ? 110 : magnification === 400 ? 150 : 210;
    setStageX((x) => Math.max(220, Math.min(WORLD_SIZE - 220, x + dx * step)));
    setStageY((y) => Math.max(220, Math.min(WORLD_SIZE - 220, y + dy * step)));
    labAudio.playUiClick();
  };

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
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-2 sm:p-4">
      {viewStage === 'bench' && (
        <HeldToolCursor
          highResSpriteId={heldTool ? TOOL_SPRITE_MAP[heldTool] : null}
          loopState={loopState}
          hasTip={heldTool === 'pipette_p1000' ? hasFreshTip : true}
          pipetteFillFraction={heldTool === 'pipette_p1000' && pipetteHasDrop ? 0.72 : 0}
          liquidColor={
            heldTool === 'stain_cv'
              ? '#7C3AED'
              : heldTool === 'stain_iodine'
              ? '#92400E'
              : heldTool === 'stain_safranin'
              ? '#E11D48'
              : heldTool === 'immersion_oil'
              ? '#FACC15'
              : '#38BDF8'
          }
          label={heldTool ? TOOL_LABELS[heldTool] : undefined}
          working={isHoldingEthanol}
          onRelease={() => setHeldTool(null)}
        />
      )}

      <div className="w-full max-w-[1380px] h-[93vh] bg-[#0B0E17] border border-slate-700 rounded-lg overflow-hidden flex flex-col">
        {/* Clean Workstation Header */}
        <div className="px-4 py-2.5 bg-[#07090E] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PixelMicroscope128
              size={34}
              magnification={magnification}
              hasSlide={hasSmearSample}
              slideColor={slideColorHex}
              oilApplied={oilApplied}
            />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                Compound Microscope &amp; Gram-Staining Bench
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {viewStage === 'bench'
                  ? 'Prepare heat-fixed smears & Gram stains on the right, then click the 128×128 Microscope on the left to inspect.'
                  : 'Use the Stage Pan controls (Up / Down / Left / Right), Objective Turret, Focus, and Illumination.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onSwitchSessionMode && (
              <div
                className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700"
                title="Temporary workstation mode (returns to main HUD mode on exit)"
              >
                <button
                  type="button"
                  onClick={() => onSwitchSessionMode('automate')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                    sessionMode === 'automate'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Automate
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchSessionMode('manual')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded whitespace-nowrap cursor-pointer transition-colors ${
                    sessionMode === 'manual'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manual
                </button>
              </div>
            )}

            {viewStage === 'eyepiece' ? (
              <button
                type="button"
                onClick={() => setViewStage('bench')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-100 rounded flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Slide Prep Bench
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetSlide}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Fresh Slide
              </button>
            )}
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

        {/* === STAGE 1: ISOMETRIC BENCH VIEW (128x128 MICROSCOPE LEFT + SLIDE PREP & STAINS RIGHT) === */}
        {viewStage === 'bench' ? (
          <div className="flex-1 min-h-0 flex flex-col bg-[#080B12] overflow-hidden">
            {/* Context Prompt */}
            <div className="px-4 py-2 bg-[#0E1420] border-b border-slate-800 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-cyan-300 shrink-0">
                  {heldTool ? 'IN HAND:' : 'STATUS:'}
                </span>
                <span className="text-slate-200 truncate">{benchStatus}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {heldTool && (
                  <button
                    type="button"
                    onClick={() => setHeldTool(null)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] text-slate-200 rounded cursor-pointer"
                  >
                    Put Down (Esc)
                  </button>
                )}
              </div>
            </div>

            {/* Split Isometric Bench: Big 128x128 Microscope Left + Slide Prep & Stains Right */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
              {/* LEFT SIDE: Big 128x128 Pixel Art Microscope */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 p-5 flex flex-col items-center justify-between bg-gradient-to-b from-[#0C1220] to-[#090D16]">
                <div className="w-full space-y-1.5">
                  <label className="block text-[11px] font-medium text-slate-400">
                    1. Select Culture Vessel to Sample
                  </label>
                  <select
                    value={mountedVesselId}
                    onChange={(e) => onSelectVesselId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {inspectableVessels.length === 0 && (
                      <option value="">No vessels available to sample</option>
                    )}
                    {inspectableVessels.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} ({v.location.zone === 'belt' ? 'Tray' : v.location.stationId.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Big 128x128 Pixel Microscope Stage */}
                <button
                  type="button"
                  onClick={handleOpenEyepieceFromMicroscope}
                  className="group my-4 p-4 rounded-lg border border-slate-800 hover:border-cyan-500/60 bg-[#070B12]/90 flex flex-col items-center gap-3 transition-colors cursor-pointer"
                >
                  <PixelMicroscope128
                    size={280}
                    magnification={magnification}
                    hasSlide={hasSmearSample || slideMountedOnScope}
                    slideColor={slideColorHex}
                    oilApplied={oilApplied}
                    illuminated={illumination > 35}
                  />
                  <div className="px-4 py-1.5 bg-cyan-600 group-hover:bg-cyan-500 text-white text-xs font-semibold rounded flex items-center gap-2 whitespace-nowrap">
                    <Eye className="w-4 h-4" />
                    {hasSmearSample
                      ? 'Mount Slide & Look Through Eyepiece'
                      : 'Prepare Smear Slide First →'}
                  </div>
                </button>

                {/* Microscope Stage Lens & Oil Quick Summary */}
                <div className="w-full p-2.5 bg-[#0B111E] border border-slate-800 rounded grid grid-cols-3 gap-2 text-center font-mono tabular-nums text-[11px]">
                  <div>
                    <div className="text-[10px] text-slate-500">TURRET</div>
                    <div className="text-cyan-300 font-semibold">{magnification}×</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">GRAM STAIN</div>
                    <div
                      className={
                        gramResult === 'accurate' && stainSafranin
                          ? 'text-emerald-300 font-semibold'
                          : gramResult === 'over_decolorized'
                          ? 'text-rose-300 font-semibold'
                          : 'text-amber-300 font-semibold'
                      }
                    >
                      {stainSafranin ? (gramResult === 'accurate' ? 'Accurate' : 'Over-Wash') : 'Not Done'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">IMMERSION OIL</div>
                    <div className={oilApplied ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                      {oilApplied ? 'Applied' : 'Dry'}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Isometric Slide Prep & Gram Staining Rack (Reuses Shared Wet-Lab Tools!) */}
              <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4 bg-[#0B101C]">
                {/* Slide Prep Progress Checklist */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[10px] font-mono">
                  {[
                    { label: '1.Smear', done: hasSmearSample },
                    { label: '2.Heat-Fix', done: heatFixed },
                    { label: '3.CV Stain', done: stainCv },
                    { label: '4.Iodine', done: stainIodine },
                    { label: `5.EtOH ${ethanolSec.toFixed(1)}s`, done: ethanolSec >= 5 && ethanolSec <= 10 },
                    { label: '6.Safranin', done: stainSafranin },
                    { label: '7.Oil Drop', done: oilApplied },
                    { label: '8.Scope', done: viewStage !== 'bench' || slideMountedOnScope },
                  ].map((st) => (
                    <div
                      key={st.label}
                      className={`px-1.5 py-1 rounded border text-center truncate ${
                        st.done
                          ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      {st.label}
                    </div>
                  ))}
                </div>

                {/* Isometric Staining & Transfer Desk */}
                <div className="p-3 bg-[#070B12] border border-slate-800 rounded-lg space-y-4">
                  {/* Top Row: Shared Aseptic Tools (Reused PixelToolSprites64 from Media Bench!) */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-300 mb-2">
                      Aseptic Smear Transfer &amp; Heat-Fix Tools (Shared Lab Hardware)
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      <button
                        type="button"
                        onClick={handleClickTipBox}
                        className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer ${
                          hasFreshTip ? 'bg-cyan-950/35 border-cyan-500/50' : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <PixelToolSprite64 id="tip_box" size={44} active={hasFreshTip} />
                        <span className="text-[10px] font-mono text-sky-300">Tips ({tipCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHeldTool((t) => (t === 'pipette_p1000' ? null : 'pipette_p1000'))}
                        className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer ${
                          heldTool === 'pipette_p1000'
                            ? 'bg-cyan-950/55 border-cyan-400'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <PixelToolSprite64
                          id="pipette_p1000"
                          size={44}
                          hasTip={hasFreshTip}
                          pipetteFillFraction={pipetteHasDrop ? 0.72 : 0}
                          active={heldTool === 'pipette_p1000'}
                        />
                        <span className="text-[10px] font-mono text-slate-200">P1000 Pipette</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHeldTool((t) => (t === 'loop_nichrome' ? null : 'loop_nichrome'))}
                        className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer ${
                          heldTool === 'loop_nichrome'
                            ? 'bg-amber-950/50 border-amber-400'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <PixelToolSprite64
                          id="loop_nichrome"
                          size={44}
                          loopState={loopState}
                          active={heldTool === 'loop_nichrome'}
                        />
                        <span className="text-[10px] font-mono text-slate-200">
                          {loopState === 'hot' ? `Cool ${loopCoolSec}s` : 'Loop'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClickSampleTube}
                        className="p-2 rounded border bg-slate-900/70 border-slate-800 hover:border-emerald-500/60 flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <PixelToolSprite64 id="bacterial_stock" size={44} active={Boolean(mountedVessel)} />
                        <span className="text-[10px] font-mono text-emerald-300 truncate max-w-full">
                          Sample Tube
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClickBunsenBurner}
                        className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer ${
                          bunsenLit
                            ? 'bg-orange-950/45 border-orange-500/60'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <PixelToolSprite64 id="bunsen_burner" size={44} active={bunsenLit} />
                        <span className="text-[10px] font-mono text-amber-300">
                          {hasSmearSample && !heatFixed && bunsenLit
                            ? 'Click: Heat-Fix!'
                            : bunsenLit
                            ? 'Burner ON'
                            : 'Light Burner'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClickBiohazardBin}
                        className="p-2 rounded border bg-slate-900/70 border-slate-800 hover:border-rose-500/60 flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <PixelToolSprite64 id="biohazard_bin" size={44} active={hasFreshTip} />
                        <span className="text-[10px] font-mono text-rose-300">Eject Tip</span>
                      </button>
                    </div>
                  </div>

                  {/* Center: Interactive Glass Slide Staining Bridge */}
                  <div
                    onPointerDown={handleSlidePointerDown}
                    className={`p-4 rounded-lg border-2 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                      heldTool
                        ? 'border-cyan-400/80 bg-cyan-950/20 cursor-crosshair'
                        : 'border-slate-700 bg-slate-900/60 cursor-pointer hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <PixelToolSprite64
                        id="glass_slide"
                        size={88}
                        active={hasSmearSample}
                        liquidColor={slideColorHex}
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                          <span>Glass Slide on Staining Rack</span>
                          {oilApplied && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-amber-950/70 border border-amber-500/50 text-amber-200 rounded">
                              Oil Bead Ready
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {!hasSmearSample
                            ? 'Step A: Click with loaded P1000 Pipette or Loop to deposit smear.'
                            : !heatFixed
                            ? 'Step B: Click lit Bunsen Burner (or Heat-Fix button below) to lock cells to glass.'
                            : 'Step C: Heat-Fixed! Apply stains 1→4 below with held bottles.'}
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-400">
                          EtOH Decolorize: {ethanolSec.toFixed(1)}s{' '}
                          {ethanolSec > 10
                            ? '(Over-decolorized! Click Reset Stain)'
                            : ethanolSec >= 5
                            ? '(5–10s Sweet Spot ✓)'
                            : '(Hold 95% Ethanol 5–10s on slide)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                      {hasSmearSample && !heatFixed && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!bunsenLit) setBunsenLit(true);
                            setHeatFixed(true);
                            labAudio.playUiClick();
                            setBenchStatus('Heat-fixed bacterial smear over Bunsen flame!');
                          }}
                          className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-semibold rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          Heat-Fix Smear
                        </button>
                      )}
                      {heldTool === 'stain_ethanol' && (
                        <button
                          type="button"
                          onPointerDown={() => setIsHoldingEthanol(true)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap"
                        >
                          Hold Ethanol Wash ({ethanolSec.toFixed(1)}s)
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: 64x64 Gram Stain Reagent Bottles + ddH2O Rinse + Oil */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Gram Stain Rack, ddH₂O Rinse &amp; Immersion Oil (Pick up &amp; click Glass Slide)
                      </span>
                      {(stainCv || stainIodine || ethanolSec > 0 || stainSafranin) && (
                        <button
                          type="button"
                          onClick={() => {
                            setStainCv(false);
                            setStainIodine(false);
                            setEthanolSec(0);
                            setStainSafranin(false);
                            setBenchStatus('Cleared stain layers for fresh restaining.');
                          }}
                          className="text-[10.5px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          Reset Stain
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(
                        [
                          { id: 'stain_cv' as HeldScopeToolId, label: '1. Crystal Violet', done: stainCv },
                          { id: 'stain_iodine' as HeldScopeToolId, label: "2. Gram's Iodine", done: stainIodine },
                          {
                            id: 'stain_ethanol' as HeldScopeToolId,
                            label: '3. 95% Ethanol',
                            done: ethanolSec >= 5 && ethanolSec <= 10,
                          },
                          { id: 'stain_safranin' as HeldScopeToolId, label: '4. Safranin', done: stainSafranin },
                          { id: 'water_jar' as HeldScopeToolId, label: 'ddH₂O Rinse', done: false },
                          { id: 'immersion_oil' as HeldScopeToolId, label: 'Immersion Oil', done: oilApplied },
                        ] as const
                      ).map((st) => {
                        const inHand = heldTool === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setHeldTool((prev) => (prev === st.id ? null : st.id))}
                            className={`p-2 rounded border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                              inHand
                                ? 'bg-cyan-950/55 border-cyan-400 text-white'
                                : st.done
                                ? 'bg-emerald-950/35 border-emerald-500/60 text-emerald-200'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <PixelToolSprite64
                              id={TOOL_SPRITE_MAP[st.id]}
                              size={46}
                              active={inHand || st.done}
                            />
                            <span className="text-[10px] font-medium text-center leading-tight">
                              {st.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* === STAGE 2: EYEPIECE OPTICAL VIEW (LEFT 3/4 VIEWPORT + RIGHT 1/4 CONTROLS) === */
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* LEFT ~3/4: Large Optical Viewport */}
            <div className="lg:col-span-9 bg-[#05080F] p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <div
                onPointerDown={(e) => {
                  dragPanRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
                }}
                onPointerMove={(e) => {
                  if (!dragPanRef.current.active) return;
                  const dx = e.clientX - dragPanRef.current.lastX;
                  const dy = e.clientY - dragPanRef.current.lastY;
                  dragPanRef.current.lastX = e.clientX;
                  dragPanRef.current.lastY = e.clientY;
                  setStageX((x) => Math.max(220, Math.min(WORLD_SIZE - 220, x - dx * 1.4)));
                  setStageY((y) => Math.max(220, Math.min(WORLD_SIZE - 220, y - dy * 1.4)));
                }}
                onPointerUp={() => {
                  dragPanRef.current.active = false;
                }}
                onPointerLeave={() => {
                  dragPanRef.current.active = false;
                }}
                className="relative rounded-full overflow-hidden border-4 bg-black cursor-grab active:cursor-grabbing transition-all duration-200"
                style={{
                  borderColor: `rgba(56, 189, 248, ${(0.25 + (illumination / 100) * 0.45).toFixed(2)})`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={760}
                  height={760}
                  style={{
                    filter: `brightness(${lumFactor.toFixed(2)})${
                      blurPx > 0.2 ? ` blur(${(blurPx * 0.55).toFixed(1)}px)` : ''
                    }`,
                    willChange: 'filter, opacity, transform',
                  }}
                  className={`w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] xl:w-[540px] xl:h-[540px] block transition-all duration-200 ${
                    captureFlash
                      ? 'opacity-40'
                      : turretPulse
                      ? 'scale-95 opacity-85'
                      : 'scale-100 opacity-100'
                  }`}
                />

                {mountedVessel && (
                  <div className="pointer-events-none absolute bottom-10 right-14 flex flex-col items-center">
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

                {magnification === 1000 && !oilApplied && (
                  <div className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/60 text-[10.5px] font-mono text-rose-200 whitespace-nowrap">
                    1000× Oil Objective Blurry — Return to Bench &amp; Add Immersion Oil
                  </div>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-mono tabular-nums text-slate-400">
                <span>Lens: {magnification}× {magnification === 1000 ? '(Oil)' : ''}</span>
                <span>Mode: {opticalMode.replace('_', ' ')}</span>
                <span>
                  Stage XY: ({Math.round(stageX)}, {Math.round(stageY)})
                </span>
                <span className="text-slate-500">Drag field or use arrow pad to pan slide</span>
              </div>
            </div>

            {/* RIGHT ~1/4: Focused Optical, Stage Pan & Capture Controls */}
            <aside className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#0B0E17] p-3.5 overflow-y-auto space-y-3.5">
              {/* Objective Lens Turret */}
              <div>
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                  Objective Lens Turret
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([100, 400, 1000] as const).map((mag) => (
                    <button
                      key={mag}
                      type="button"
                      onClick={() => setMagnification(mag)}
                      className={`py-1.5 px-2 rounded border text-xs font-mono tabular-nums font-semibold cursor-pointer ${
                        magnification === mag
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {mag}×{mag === 1000 ? ' Oil' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optical Illumination Mode */}
              <div>
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                  Optics &amp; Staining Mode
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: 'gram_stain' as const, label: 'Gram Stain' },
                    { id: 'phase_contrast' as const, label: 'Phase Contrast' },
                    { id: 'brightfield' as const, label: 'Brightfield' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOpticalMode(m.id)}
                      className={`py-1.5 px-2.5 rounded border text-xs font-medium text-left cursor-pointer ${
                        opticalMode === m.id
                          ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mechanical X-Y Stage Pan Pad */}
              <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Mechanical X-Y Stage</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStageX(WORLD_SIZE / 2);
                      setStageY(WORLD_SIZE / 2);
                    }}
                    className="text-[10px] text-cyan-300 hover:text-cyan-200 underline cursor-pointer"
                  >
                    Center
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 max-w-[144px] mx-auto">
                  <div />
                  <button
                    type="button"
                    onClick={() => panStage(0, -1)}
                    aria-label="Move Stage Up"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-slate-200" />
                  </button>
                  <div />
                  <button
                    type="button"
                    onClick={() => panStage(-1, 0)}
                    aria-label="Move Stage Left"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-200" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStageX(WORLD_SIZE / 2);
                      setStageY(WORLD_SIZE / 2);
                    }}
                    aria-label="Center Stage"
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded flex items-center justify-center cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => panStage(1, 0)}
                    aria-label="Move Stage Right"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-slate-200" />
                  </button>
                  <div />
                  <button
                    type="button"
                    onClick={() => panStage(0, 1)}
                    aria-label="Move Stage Down"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-slate-200" />
                  </button>
                  <div />
                </div>
              </div>

              {/* Fine Focus & Illumination */}
              <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded space-y-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Fine Focus</span>
                    <span
                      className={`font-mono tabular-nums ${
                        Math.abs(fineFocus - 50) <= 3 ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {Math.abs(fineFocus - 50) <= 3 ? 'Sharp (0 µm)' : `${fineFocus - 50} µm`}
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
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Condenser Light</span>
                    <span className="font-mono tabular-nums text-amber-300">{illumination}%</span>
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

              {/* Quick Oil Dropper Shortcut when on 1000x */}
              {magnification === 1000 && !oilApplied && (
                <button
                  type="button"
                  onClick={() => setViewStage('bench')}
                  className="w-full py-1.5 px-3 bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/60 text-amber-200 text-xs font-medium rounded cursor-pointer"
                >
                  Back to Bench to Add Immersion Oil
                </button>
              )}

              {/* Specimen Readout */}
              {mountedVessel && (
                <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded space-y-1.5 text-[11px]">
                  <div className="font-semibold text-slate-200 truncate">{mountedVessel.label}</div>
                  {primarySpecies ? (
                    <>
                      <div className="text-slate-300">
                        {primarySpecies.scientificName} ·{' '}
                        <span className={primarySpecies.gramStatus === 'positive' ? 'text-purple-300' : 'text-rose-300'}>
                          Gram-{primarySpecies.gramStatus} {primarySpecies.shape}
                        </span>
                      </div>
                      <div className="font-mono tabular-nums text-slate-400">
                        Viable: <span className="text-emerald-300">{formatScientificCount(totalViable)}</span> · Dead:{' '}
                        <span className="text-rose-300">{formatScientificCount(totalDead)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 font-mono tabular-nums">
                        {tempBadge && <span className={tempBadge.textClass}>{mountedVessel.temperatureC.toFixed(1)} °C</span>}
                        {phBadge && <span className={phBadge.textClass}>pH {mountedVessel.pH.toFixed(2)}</span>}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500">Sterile — zero bacterial cells.</div>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={!mountedVessel}
                onClick={handleCapture}
                className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Capture Micrograph
              </button>

              {slideMountedOnScope && stainSafranin && gramResult === 'accurate' && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Slide stained &amp; mounted</span>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};
