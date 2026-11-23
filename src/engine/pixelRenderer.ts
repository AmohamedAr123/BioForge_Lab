import {
  LAB_PROPS,
  LAB_STATIONS,
  LabBenchProp,
  MAP_COLS,
  MAP_ROWS,
  StationDefinition,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './labMap';
import {
  CultureVessel,
  LabPlayerState,
  ShakingIncubatorConfig,
  StaticIncubatorConfig,
  StationId,
} from '../types/lab';

export interface RenderWorldContext {
  player: LabPlayerState;
  vessels: CultureVessel[];
  shakingIncubator: ShakingIncubatorConfig;
  staticIncubator: StaticIncubatorConfig;
  hoveredStationId: StationId | null;
  nearbyStationId: StationId | null;
  activeStationId: StationId | null;
  animTimeSec: number;
  clickTargetTile: { tx: number; ty: number } | null;
}

export interface WorkstationLayerContext {
  vessels: CultureVessel[];
  shakingIncubator: ShakingIncubatorConfig;
  staticIncubator: StaticIncubatorConfig;
  hoveredStationId: StationId | null;
  nearbyStationId: StationId | null;
  activeStationId: StationId | null;
}

export interface DynamicLayerContext {
  player: LabPlayerState;
  vessels: CultureVessel[];
  shakingIncubator: ShakingIncubatorConfig;
  hoveredStationId: StationId | null;
  nearbyStationId: StationId | null;
  activeStationId?: StationId | null;
  simSpeed?: number;
  animTimeSec: number;
  clickTargetTile: { tx: number; ty: number } | null;
}

export interface DynamicLayerDirtyState {
  px: number;
  py: number;
  facing: LabPlayerState['facing'];
  isMoving: boolean;
  stride: number;
  hasHeld: boolean;
  nearbyStationId: StationId | null;
  activeStationId: StationId | null;
  clickTx: number;
  clickTy: number;
  pathLen: number;
  pathHeadX: number;
  pathHeadY: number;
  pathTailX: number;
  pathTailY: number;
  flicker: number;
  shakeOffset: number;
  spinStep: number;
  pcrPhase: number;
  shkFlaskMask: number;
}

// ============================================================================
// Offscreen Sprite & Text Measurement Caches (Zero Per-Frame Allocations)
// ============================================================================

const MAX_SPRITE_CACHE = 96;
const spriteCache = new Map<string, HTMLCanvasElement>();
const textWidthCache = new Map<string, number>();
let measureCanvasCtx: CanvasRenderingContext2D | null = null;
let fallbackCompositeCanvas: HTMLCanvasElement | null = null;

if (typeof document !== 'undefined' && document.fonts?.ready) {
  document.fonts.ready.then(() => {
    textWidthCache.clear();
    spriteCache.clear();
  });
}

function setBoundedSprite(key: string, canvas: HTMLCanvasElement): void {
  if (spriteCache.has(key)) {
    spriteCache.delete(key);
  } else if (spriteCache.size >= MAX_SPRITE_CACHE) {
    const oldestKey = spriteCache.keys().next().value;
    if (oldestKey !== undefined) {
      spriteCache.delete(oldestKey);
    }
  }
  spriteCache.set(key, canvas);
}

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, width | 0);
  c.height = Math.max(1, height | 0);
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  return c;
}

function measureCachedTextWidth(font: string, text: string): number {
  const key = `${font}|${text}`;
  const cached = textWidthCache.get(key);
  if (cached !== undefined) return cached;

  if (!measureCanvasCtx) {
    const c = createOffscreenCanvas(16, 16);
    measureCanvasCtx = c.getContext('2d');
  }
  if (!measureCanvasCtx) return text.length * 8;

  measureCanvasCtx.font = font;
  const w = measureCanvasCtx.measureText(text).width;
  textWidthCache.set(key, w);
  return w;
}

function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function getCachedTextSprite(
  cacheKey: string,
  text: string,
  font: string,
  fillStyle: string,
  align: CanvasTextAlign = 'left'
): HTMLCanvasElement {
  const cached = spriteCache.get(cacheKey);
  if (cached) return cached;

  const textW = Math.ceil(measureCachedTextWidth(font, text));
  const w = Math.max(8, textW + 8);
  const h = 22;
  const canvas = createOffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.font = font;
    ctx.fillStyle = fillStyle;
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    const drawX = align === 'center' ? (w / 2) | 0 : align === 'right' ? w - 4 : 4;
    ctx.fillText(text, drawX, (h / 2) | 0);
  }
  setBoundedSprite(cacheKey, canvas);
  return canvas;
}

function getStationBadgeSprite(
  stationId: StationId,
  label: string,
  accentColor: string,
  isFocus: boolean,
  isNearbyPrompt: boolean
): HTMLCanvasElement {
  const key = `badge:${stationId}:${isFocus ? 'f' : 'i'}:${isNearbyPrompt ? 'e' : 'n'}:${label}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const font = isFocus
    ? '600 17px "Plus Jakarta Sans", sans-serif'
    : '500 15px "Plus Jakarta Sans", sans-serif';
  const textW = measureCachedTextWidth(font, label);
  const boxW = Math.round(textW + 18);
  const boxH = 26;
  const pad = 2;

  const canvas = createOffscreenCanvas(boxW + pad * 2, boxH + pad * 2);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = isFocus ? 'rgba(11, 14, 23, 0.94)' : 'rgba(11, 14, 23, 0.8)';
    ctx.fillRect(pad, pad, boxW, boxH);

    ctx.strokeStyle = isFocus ? accentColor : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = isFocus ? 2 : 1.5;
    ctx.strokeRect(pad + 0.5, pad + 0.5, boxW - 1, boxH - 1);

    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = isFocus ? '#F8FAFC' : '#CBD5E1';
    ctx.fillText(label, (pad + boxW / 2) | 0, (pad + boxH / 2 + 1) | 0);
  }

  setBoundedSprite(key, canvas);
  return canvas;
}

function getStationHighlightSprite(
  w: number,
  h: number,
  strokeColor: string,
  strong: boolean
): HTMLCanvasElement {
  const key = `glow:${w}x${h}:${strokeColor}:${strong ? '1' : '0'}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const pad = 6;
  const canvas = createOffscreenCanvas(w + pad * 2, h + pad * 2);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    if (strong) {
      // Pre-baked crisp pixel aura (zero runtime shadowBlur)
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 5;
      ctx.strokeRect(pad - 1, pad - 1, w + 2, h + 2);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strong ? 3 : 2;
    ctx.strokeRect(pad + 2, pad + 2, w - 4, h - 4);
  }
  setBoundedSprite(key, canvas);
  return canvas;
}

const PLAYER_SPRITE_W = 54;
const PLAYER_SPRITE_H = 72;
const PLAYER_PIVOT_X = 27;
const PLAYER_PIVOT_Y = 44;

function getPlayerSprite(
  facing: LabPlayerState['facing'],
  stride: number,
  hasHeld: boolean
): HTMLCanvasElement {
  const clampedStride = Math.max(-4, Math.min(4, stride | 0));
  const key = `player:${facing}:${clampedStride}:${hasHeld ? '1' : '0'}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = createOffscreenCanvas(PLAYER_SPRITE_W, PLAYER_SPRITE_H);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    const cx = PLAYER_PIVOT_X;
    const cy = PLAYER_PIVOT_Y;

    pxRect(ctx, cx - 16, cy + 16, 32, 12, 'rgba(0,0,0,0.45)');

    pxRect(ctx, cx - 10, cy + 10 + (clampedStride > 0 ? -2 : 0), 8, 12, '#1E293B');
    pxRect(ctx, cx + 2, cy + 10 + (clampedStride < 0 ? -2 : 0), 8, 12, '#1E293B');

    pxRect(ctx, cx - 16, cy - 16, 32, 30, '#F8FAFC');
    pxRect(ctx, cx - 14, cy - 14, 28, 26, '#E2E8F0');
    pxRect(ctx, cx - 6, cy - 16, 12, 10, '#0F766E');
    pxRect(ctx, cx + 6, cy - 6, 4, 8, '#06B6D4');

    pxRect(ctx, cx - 20, cy - 12 + clampedStride, 6, 18, '#F1F5F9');
    pxRect(ctx, cx - 20, cy + 4 + clampedStride, 6, 6, '#22D3EE');
    pxRect(ctx, cx + 14, cy - 12 - clampedStride, 6, 18, '#F1F5F9');
    pxRect(ctx, cx + 14, cy + 4 - clampedStride, 6, 6, '#22D3EE');

    if (hasHeld) {
      pxRect(ctx, cx + 16, cy - 4 - clampedStride, 10, 12, '#F59E0B');
      pxRect(ctx, cx + 18, cy - 8 - clampedStride, 6, 4, '#E2E8F0');
    }

    pxRect(ctx, cx - 12, cy - 38, 24, 22, '#F1C27D');
    // Blonde hairstyle crown + sunlit highlight + warm blonde shadow
    pxRect(ctx, cx - 13, cy - 43, 26, 9, '#FACC15');
    pxRect(ctx, cx - 10, cy - 42, 16, 3, '#FEF08A');
    pxRect(ctx, cx - 13, cy - 36, 4, 5, '#CA8A04');
    pxRect(ctx, cx + 9, cy - 36, 4, 5, '#CA8A04');
    if (facing === 'up') {
      pxRect(ctx, cx - 13, cy - 37, 26, 19, '#FACC15');
      pxRect(ctx, cx - 9, cy - 35, 18, 4, '#FEF08A');
      pxRect(ctx, cx - 13, cy - 23, 26, 5, '#CA8A04');
    } else {
      const eyeY = cy - 28;
      if (facing === 'left') {
        pxRect(ctx, cx + 4, cy - 36, 9, 14, '#EAB308');
        pxRect(ctx, cx - 12, eyeY, 12, 6, '#38BDF8');
        pxRect(ctx, cx - 10, eyeY + 2, 4, 2, '#0F172A');
      } else if (facing === 'right') {
        pxRect(ctx, cx - 13, cy - 36, 9, 14, '#EAB308');
        pxRect(ctx, cx, eyeY, 12, 6, '#38BDF8');
        pxRect(ctx, cx + 6, eyeY + 2, 4, 2, '#0F172A');
      } else {
        pxRect(ctx, cx - 10, eyeY, 8, 6, '#38BDF8');
        pxRect(ctx, cx + 2, eyeY, 8, 6, '#38BDF8');
        pxRect(ctx, cx - 8, eyeY + 2, 4, 2, '#0F172A');
        pxRect(ctx, cx + 4, eyeY + 2, 4, 2, '#0F172A');
      }
    }
  }

  setBoundedSprite(key, canvas);
  return canvas;
}

// ============================================================================
// Layer 1: Static Environment Layer (Rendered ONLY on mount / resize / zoom)
// ============================================================================

function drawFloorAndWalls(ctx: CanvasRenderingContext2D) {
  for (let ty = 0; ty < MAP_ROWS; ty++) {
    for (let tx = 0; tx < MAP_COLS; tx++) {
      const x = tx * TILE_SIZE;
      const y = ty * TILE_SIZE;

      if (ty === 0) {
        pxRect(ctx, x, y, TILE_SIZE, TILE_SIZE, '#1E293B');
        pxRect(ctx, x, y, TILE_SIZE, 10, '#334155');
        pxRect(ctx, x, y + 10, TILE_SIZE, 2, '#475569');
        pxRect(ctx, x, y + 52, TILE_SIZE, 12, '#0F172A');
        pxRect(ctx, x, y + 50, TILE_SIZE, 2, '#334155');
        if (tx >= 3 && tx <= 20 && tx % 4 === 0) {
          pxRect(ctx, x + 8, y + 16, TILE_SIZE - 16, 28, '#0B1726');
          pxRect(ctx, x + 10, y + 18, TILE_SIZE - 20, 6, '#16334E');
          pxRect(ctx, x + 12, y + 26, TILE_SIZE - 24, 14, '#0D2136');
        }
        continue;
      }

      if (tx === 0 || tx === MAP_COLS - 1 || ty === MAP_ROWS - 1) {
        pxRect(ctx, x, y, TILE_SIZE, TILE_SIZE, '#182232');
        pxRect(ctx, x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, '#111827');
        pxRect(ctx, x + 6, y + 6, TILE_SIZE - 12, 2, '#243247');
        continue;
      }

      const isAlt = (tx + ty) % 2 === 0;
      pxRect(ctx, x, y, TILE_SIZE, TILE_SIZE, isAlt ? '#17202F' : '#1A2435');
      pxRect(ctx, x, y, TILE_SIZE, 2, '#121926');
      pxRect(ctx, x, y, 2, TILE_SIZE, '#121926');
      pxRect(ctx, x + 2, y + 2, TILE_SIZE - 4, 1, 'rgba(255,255,255,0.025)');
      if ((tx * 7 + ty * 13) % 5 === 0) {
        pxRect(ctx, x + 20, y + 24, 4, 4, '#223047');
      }
    }
  }

  // Analytical island perimeter line (y = 6..8)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4 * TILE_SIZE - 8, 6 * TILE_SIZE - 8, 12 * TILE_SIZE + 16, 2 * TILE_SIZE + 16);

  // Molecular Bay perimeter line (y = 11..13)
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2 * TILE_SIZE - 8, 11 * TILE_SIZE - 8, 16 * TILE_SIZE + 16, 2 * TILE_SIZE + 16);

  // Autoclave / Biohazard floor hazard striping
  const ax = 19 * TILE_SIZE;
  const ay = 10 * TILE_SIZE;
  for (let i = 0; i < 3 * TILE_SIZE; i += 16) {
    pxRect(ctx, ax + i, ay + 48, 8, 8, '#F59E0B');
  }

  // BSL-2 Cleanroom mat in front of BSL-2 suite (y = 8)
  pxRect(ctx, 18 * TILE_SIZE, 8 * TILE_SIZE + 4, 4 * TILE_SIZE, 30, '#0E3A4A');
  pxRect(ctx, 18 * TILE_SIZE + 4, 8 * TILE_SIZE + 8, 4 * TILE_SIZE - 8, 22, '#114B5F');
}

function getLabPropSprite(prop: LabBenchProp): HTMLCanvasElement {
  const w = prop.widthTiles * TILE_SIZE;
  const h = prop.heightTiles * TILE_SIZE;
  const key = `prop:${prop.kind}:${w}x${h}:${prop.label ?? ''}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = createOffscreenCanvas(w + 4, h + 12);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    const x = 0;
    const y = 0;

    pxRect(ctx, x + 4, y + h, w - 4, 10, 'rgba(0,0,0,0.38)');

    if (prop.kind === 'bench_dark' || prop.kind === 'bench_steel') {
      const topColor = prop.kind === 'bench_steel' ? '#475569' : '#263244';
      const surfaceColor = prop.kind === 'bench_steel' ? '#64748B' : '#1E293B';
      const frontColor = '#0F172A';

      pxRect(ctx, x + 2, y + 4, w - 4, h - 28, topColor);
      pxRect(ctx, x + 6, y + 8, w - 12, h - 36, surfaceColor);
      pxRect(ctx, x + 6, y + 8, w - 12, 2, 'rgba(255,255,255,0.08)');
      pxRect(ctx, x + 2, y + h - 24, w - 4, 24, frontColor);
      for (let dx = 8; dx < w - 32; dx += 56) {
        pxRect(ctx, x + dx, y + h - 20, 44, 16, '#1E293B');
        pxRect(ctx, x + dx + 14, y + h - 14, 16, 4, '#94A3B8');
      }
    } else if (prop.kind === 'cabinet_tall') {
      pxRect(ctx, x + 4, y + 4, w - 8, h - 4, '#334155');
      pxRect(ctx, x + 8, y + 8, w - 16, h - 28, '#1E293B');
      for (let bx = 16; bx < w - 20; bx += 20) {
        pxRect(ctx, x + bx, y + 20, 12, 20, '#38BDF8');
        pxRect(ctx, x + bx + 2, y + 16, 8, 4, '#F8FAFC');
        pxRect(ctx, x + bx, y + 52, 12, 20, '#10B981');
        pxRect(ctx, x + bx + 2, y + 48, 8, 4, '#E2E8F0');
      }
      pxRect(ctx, x + 4, y + h - 20, w - 8, 20, '#0F172A');
    } else if (prop.kind === 'sink') {
      pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#475569');
      pxRect(ctx, x + 16, y + 16, w - 32, h - 48, '#0F172A');
      pxRect(ctx, x + 20, y + 20, w - 40, h - 56, '#1E293B');
      pxRect(ctx, x + w / 2 - 4, y + 8, 8, 20, '#CBD5E1');
      pxRect(ctx, x + w / 2 - 4, y + h - 24, w / 2, 4, '#1E293B');
      pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');
    } else if (prop.kind === 'biosafety_shell') {
      pxRect(ctx, x + 4, y + 4, w - 8, h - 4, '#94A3B8');
      pxRect(ctx, x + 12, y + 12, w - 24, h - 44, '#0F172A');
      pxRect(ctx, x + 20, y + 20, w - 40, h - 60, '#0B2538');
      pxRect(ctx, x + 24, y + 24, w - 48, 6, '#7DD3FC');
      pxRect(ctx, x + 12, y + h - 36, w - 24, 8, '#CBD5E1');
      pxRect(ctx, x + 8, y + h - 24, w - 16, 24, '#1E293B');
    }

    if (prop.label) {
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.textAlign = 'center';
      ctx.fillText(prop.label, x + w / 2, y + h - 6);
    }
  }

  setBoundedSprite(key, canvas);
  return canvas;
}

export function renderStaticEnvironmentLayer(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawFloorAndWalls(ctx);

  for (const prop of LAB_PROPS) {
    const sprite = getLabPropSprite(prop);
    ctx.drawImage(sprite, (prop.tx * TILE_SIZE) | 0, (prop.ty * TILE_SIZE) | 0);
  }
}

// ============================================================================
// Layer 2: Workstations & Semi-Static Layer (Dirty-Flag + Offscreen Caching)
// ============================================================================

function getStationBaseSprite(
  st: StationDefinition,
  rc: WorkstationLayerContext,
  stationVesselSig: string
): HTMLCanvasElement {
  const w = st.widthTiles * TILE_SIZE;
  const h = st.heightTiles * TILE_SIZE;

  let extraKey = '';
  if (st.id === 'shaking_incubator') {
    extraKey = `${rc.shakingIncubator.powerOn ? 1 : 0}:${rc.shakingIncubator.targetTempC.toFixed(0)}:${rc.shakingIncubator.rpm}`;
  } else if (st.id === 'static_incubator') {
    extraKey = `${rc.staticIncubator.powerOn ? 1 : 0}:${rc.staticIncubator.targetTempC.toFixed(1)}:${stationVesselSig}`;
  } else if (st.id !== 'cold_storage') {
    extraKey = stationVesselSig;
  }

  const key = `station:${st.id}:${extraKey}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = createOffscreenCanvas(w + 4, h + 12);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    setBoundedSprite(key, canvas);
    return canvas;
  }
  ctx.imageSmoothingEnabled = false;

  const x = 0;
  const y = 0;

  pxRect(ctx, x + 4, y + h, w - 4, 10, 'rgba(0,0,0,0.42)');

  if (st.id === 'cold_storage') {
    const halfW = Math.floor(w / 2) - 4;
    pxRect(ctx, x + 4, y + 4, halfW, h - 4, '#64748B');
    pxRect(ctx, x + 8, y + 8, halfW - 8, h - 28, '#CBD5E1');
    pxRect(ctx, x + 10, y + 10, halfW - 12, 2, '#F8FAFC');
    pxRect(ctx, x + 16, y + 16, halfW - 24, 22, '#0F172A');
    const tempTxt = getCachedTextSprite(
      'txt:-80C',
      '-80°C',
      '700 12px "JetBrains Mono", monospace',
      '#38BDF8',
      'center'
    );
    ctx.drawImage(tempTxt, (x + 4 + halfW / 2 - tempTxt.width / 2) | 0, (y + 16) | 0);
    pxRect(ctx, x + 8, y + h - 20, halfW - 8, 16, '#334155');
    pxRect(ctx, x + 14, y + 46, 8, 4, '#E0F2FE');
    pxRect(ctx, x + halfW - 22, y + 66, 6, 6, '#BAE6FD');

    const fx = x + halfW + 8;
    pxRect(ctx, fx, y + 4, halfW, h - 4, '#334155');
    pxRect(ctx, fx + 8, y + 12, halfW - 16, h - 36, '#082F49');
    pxRect(ctx, fx + 12, y + 36, halfW - 24, 4, '#38BDF8');
    pxRect(ctx, fx + 12, y + 64, halfW - 24, 4, '#38BDF8');
    pxRect(ctx, fx + 16, y + 20, 10, 16, '#F59E0B');
    pxRect(ctx, fx + 18, y + 16, 6, 4, '#F8FAFC');
    pxRect(ctx, fx + 32, y + 20, 10, 16, '#10B981');
    pxRect(ctx, fx + 34, y + 16, 6, 4, '#F8FAFC');
    pxRect(ctx, fx + 48, y + 20, 10, 16, '#E2E8F0');
    pxRect(ctx, fx + 20, y + 48, 12, 16, '#38BDF8');
    pxRect(ctx, fx + 40, y + 48, 12, 16, '#F43F5E');
    pxRect(ctx, fx, y + h - 20, halfW, 16, '#1E293B');
  } else if (st.id === 'media_bench') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#1E293B');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#0F172A');
    pxRect(ctx, x + 8, y + 10, w - 16, 2, 'rgba(255,255,255,0.08)');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#111827');

    const bottles = [
      { bx: 24, color: '#D97706', cap: '#38BDF8' },
      { bx: 56, color: '#93C5FD', cap: '#E2E8F0' },
      { bx: 88, color: '#BE185D', cap: '#F8FAFC' },
    ];
    for (const b of bottles) {
      pxRect(ctx, x + b.bx, y + 20, 24, 36, b.color);
      pxRect(ctx, x + b.bx + 4, y + 28, 10, 2, 'rgba(255,255,255,0.45)');
      pxRect(ctx, x + b.bx + 4, y + 36, 10, 2, 'rgba(255,255,255,0.45)');
      pxRect(ctx, x + b.bx + 6, y + 14, 12, 6, b.cap);
    }

    pxRect(ctx, x + 140, y + 20, 48, 32, '#334155');
    pxRect(ctx, x + 148, y + 24, 8, 24, '#06B6D4');
    pxRect(ctx, x + 162, y + 24, 8, 24, '#10B981');
    pxRect(ctx, x + 176, y + 24, 8, 24, '#F59E0B');

    pxRect(ctx, x + 208, y + 24, 36, 28, '#22D3EE');
    pxRect(ctx, x + 212, y + 28, 28, 20, '#0E7490');

    // Bunsen burner base (animated flame drawn on Layer 3)
    pxRect(ctx, x + 264, y + 40, 28, 20, '#475569');
  } else if (st.id === 'shaking_incubator') {
    const running = rc.shakingIncubator.powerOn;
    pxRect(ctx, x + 4, y + 4, w - 8, h - 4, '#475569');
    pxRect(ctx, x + 8, y + 8, w - 16, h - 28, '#CBD5E1');
    pxRect(ctx, x + 20, y + 24, w - 40, h - 56, '#09111E');
    if (running) {
      pxRect(ctx, x + 24, y + 28, w - 48, h - 64, '#1C1917');
    }
    // Animated flasks inside window are rendered on Layer 3
    pxRect(ctx, x + 12, y + h - 24, w - 24, 20, '#0F172A');
    const labelStr = `${rc.shakingIncubator.targetTempC.toFixed(0)}°C · ${rc.shakingIncubator.rpm}rpm`;
    const readoutColor = running ? '#F59E0B' : '#64748B';
    const readoutSprite = getCachedTextSprite(
      `txt:shk:${labelStr}:${readoutColor}`,
      labelStr,
      '700 11px "JetBrains Mono", monospace',
      readoutColor,
      'left'
    );
    ctx.drawImage(readoutSprite, (x + 16) | 0, (y + h - 25) | 0);
    pxRect(ctx, x + w - 38, y + h - 19, 18, 10, running ? '#10B981' : '#EF4444');
  } else if (st.id === 'static_incubator') {
    const running = rc.staticIncubator.powerOn;
    pxRect(ctx, x + 4, y + 4, w - 8, h - 4, '#334155');
    pxRect(ctx, x + 8, y + 8, w - 16, h - 28, '#94A3B8');
    pxRect(ctx, x + 20, y + 20, w - 40, h - 52, '#0F172A');
    pxRect(ctx, x + 24, y + 44, w - 48, 4, '#475569');
    pxRect(ctx, x + 24, y + 68, w - 48, 4, '#475569');

    let drawn = 0;
    for (let i = 0; i < rc.vessels.length && drawn < 6; i++) {
      const v = rc.vessels[i];
      if (v.location.zone !== 'equipment' || v.location.stationId !== 'static_incubator') continue;
      const row = Math.floor(drawn / 3);
      const col = drawn % 3;
      const px = x + 32 + col * 40;
      const py = y + 32 + row * 24;
      const dishColor = v.mediaId === 'macconkey_agar' ? '#BE185D' : '#FDE68A';
      pxRect(ctx, px, py, 28, 10, dishColor);
      pxRect(ctx, px + 4, py - 2, 20, 4, '#E2E8F0');
      drawn++;
    }

    pxRect(ctx, x + 12, y + h - 24, w - 24, 20, '#0F172A');
    const labelStr = `${rc.staticIncubator.targetTempC.toFixed(1)}°C`;
    const readoutColor = running ? '#FB923C' : '#64748B';
    const readoutSprite = getCachedTextSprite(
      `txt:stc:${labelStr}:${readoutColor}`,
      labelStr,
      '700 11px "JetBrains Mono", monospace',
      readoutColor,
      'left'
    );
    ctx.drawImage(readoutSprite, (x + 16) | 0, (y + h - 25) | 0);
    pxRect(ctx, x + w - 38, y + h - 19, 18, 10, running ? '#10B981' : '#EF4444');
  } else if (st.id === 'microscope') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    const mx = x + 56;
    const my = y + 16;
    pxRect(ctx, mx, my + 48, 56, 24, '#CBD5E1');
    pxRect(ctx, mx + 20, my + 36, 16, 12, '#22D3EE');
    pxRect(ctx, mx + 8, my + 24, 40, 12, '#0F172A');
    pxRect(ctx, mx + 20, my + 26, 20, 8, '#BAE6FD');
    pxRect(ctx, mx + 36, my + 4, 16, 48, '#94A3B8');
    pxRect(ctx, mx + 16, my - 4, 28, 12, '#334155');
    pxRect(ctx, mx + 22, my + 10, 12, 12, '#06B6D4');

    pxRect(ctx, x + 132, y + 32, 36, 36, '#334155');
    pxRect(ctx, x + 138, y + 38, 8, 24, '#7E22CE');
    pxRect(ctx, x + 152, y + 38, 8, 24, '#E11D48');
  } else if (st.id === 'spectrophotometer') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    pxRect(ctx, x + 28, y + 20, w - 56, 64, '#E2E8F0');
    pxRect(ctx, x + 36, y + 26, 56, 32, '#0F172A');
    pxRect(ctx, x + 56, y + 34, 16, 16, '#06B6D4');
    pxRect(ctx, x + 100, y + 26, 52, 32, '#082F49');
    pxRect(ctx, x + 106, y + 46, 10, 6, '#22D3EE');
    pxRect(ctx, x + 116, y + 40, 10, 12, '#22D3EE');
    pxRect(ctx, x + 126, y + 32, 16, 20, '#10B981');
  } else if (st.id === 'centrifuge_miniprep') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    pxRect(ctx, x + 18, y + 16, 84, 68, '#CBD5E1');
    pxRect(ctx, x + 26, y + 22, 68, 40, '#0F172A');
    pxRect(ctx, x + 46, y + 30, 28, 24, '#1E293B');
    // Animated rotor indicator rendered on Layer 3
    pxRect(ctx, x + 26, y + 68, 68, 10, '#1E293B');
    pxRect(ctx, x + 32, y + 70, 24, 6, '#38BDF8');

    pxRect(ctx, x + 114, y + 24, 60, 52, '#334155');
    pxRect(ctx, x + 122, y + 32, 10, 24, '#38BDF8');
    pxRect(ctx, x + 138, y + 32, 10, 24, '#10B981');
    pxRect(ctx, x + 154, y + 32, 10, 24, '#E2E8F0');
  } else if (st.id === 'pcr_cycler') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    pxRect(ctx, x + 28, y + 16, w - 56, 68, '#E2E8F0');
    pxRect(ctx, x + 38, y + 22, w - 76, 26, '#334155');
    pxRect(ctx, x + 44, y + 26, w - 88, 12, '#0F172A');
    // Animated cycling status LED rendered on Layer 3

    pxRect(ctx, x + 40, y + 54, w - 80, 24, '#0B1726');
    pxRect(ctx, x + 46, y + 60, 18, 12, '#F43F5E');
    pxRect(ctx, x + 66, y + 64, 18, 8, '#A855F7');
    pxRect(ctx, x + 86, y + 58, 18, 14, '#10B981');
    const pcrTxt = getCachedTextSprite(
      'txt:PCR',
      'PCR',
      '700 10px "JetBrains Mono", monospace',
      '#E2E8F0',
      'right'
    );
    ctx.drawImage(pcrTxt, (x + w - 42 - pcrTxt.width) | 0, (y + 56) | 0);
  } else if (st.id === 'restriction_bench') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    pxRect(ctx, x + 20, y + 24, 68, 48, '#0284C7');
    pxRect(ctx, x + 26, y + 30, 56, 36, '#BAE6FD');
    pxRect(ctx, x + 32, y + 36, 8, 18, '#14B8A6');
    pxRect(ctx, x + 46, y + 36, 8, 18, '#F59E0B');
    pxRect(ctx, x + 60, y + 36, 8, 18, '#EC4899');

    pxRect(ctx, x + 104, y + 22, 68, 52, '#475569');
    pxRect(ctx, x + 112, y + 28, 52, 26, '#1E293B');
    pxRect(ctx, x + 116, y + 58, 44, 10, '#0F172A');
    const temp37Txt = getCachedTextSprite(
      'txt:37C',
      '37°C',
      '700 10px "JetBrains Mono", monospace',
      '#14B8A6',
      'center'
    );
    ctx.drawImage(temp37Txt, (x + 138 - temp37Txt.width / 2) | 0, (y + 52) | 0);
  } else if (st.id === 'gel_electrophoresis') {
    pxRect(ctx, x + 2, y + 4, w - 4, h - 24, '#263244');
    pxRect(ctx, x + 8, y + 10, w - 16, h - 36, '#1E293B');
    pxRect(ctx, x + 2, y + h - 20, w - 4, 20, '#0F172A');

    pxRect(ctx, x + 20, y + 20, 92, 60, '#0F172A');
    pxRect(ctx, x + 26, y + 26, 80, 48, '#082F49');
    for (let lane = 0; lane < 5; lane++) {
      const lx = x + 32 + lane * 14;
      pxRect(ctx, lx, y + 30, 10, 4, '#38BDF8');
      pxRect(ctx, lx, y + 44 + (lane % 2) * 8, 10, 3, '#22D3EE');
      pxRect(ctx, lx, y + 58, 10, 3, '#67E8F9');
    }
    pxRect(ctx, x + 22, y + 16, 12, 4, '#1E293B');
    pxRect(ctx, x + 98, y + 16, 12, 4, '#EF4444');

    pxRect(ctx, x + 124, y + 26, 48, 48, '#CBD5E1');
    pxRect(ctx, x + 130, y + 32, 36, 18, '#0F172A');
    const vTxt = getCachedTextSprite(
      'txt:100V',
      '100V',
      '700 10px "JetBrains Mono", monospace',
      '#3B82F6',
      'center'
    );
    ctx.drawImage(vTxt, (x + 148 - vTxt.width / 2) | 0, (y + 30) | 0);
  } else if (st.id === 'autoclave') {
    pxRect(ctx, x + 8, y + 4, w - 16, h - 4, '#475569');
    pxRect(ctx, x + 16, y + 12, w - 32, h - 32, '#94A3B8');
    pxRect(ctx, x + 44, y + 20, w - 88, h - 48, '#334155');
    pxRect(ctx, x + 56, y + 32, w - 112, h - 72, '#1E293B');
    pxRect(ctx, x + 24, y + 20, 12, 12, '#F43F5E');
    pxRect(ctx, x + w - 36, y + 20, 12, 12, '#F59E0B');
    pxRect(ctx, x + 12, y + h - 20, w - 24, 16, '#0F172A');
  }

  // Vessel slot indicator pips
  let pipCount = 0;
  if (st.id !== 'cold_storage') {
    for (let i = 0; i < rc.vessels.length && pipCount < 6; i++) {
      const v = rc.vessels[i];
      if (v.location.zone === 'equipment' && v.location.stationId === st.id) {
        pxRect(ctx, x + w - 20 - pipCount * 12, y + 8, 8, 8, st.accentColor);
        pipCount++;
      }
    }
  }

  setBoundedSprite(key, canvas);
  return canvas;
}

const stationCountsCache = new Map<StationId, number>();

export function computeWorkstationsDirtyKey(rc: WorkstationLayerContext): string {
  stationCountsCache.clear();
  let staticPlateKey = '';
  for (let i = 0; i < rc.vessels.length; i++) {
    const v = rc.vessels[i];
    if (v.location.zone !== 'equipment') continue;
    const sid = v.location.stationId;
    if (sid === 'cold_storage') continue;
    const prev = stationCountsCache.get(sid) ?? 0;
    if (prev < 6) {
      stationCountsCache.set(sid, prev + 1);
    }
    if (sid === 'static_incubator') {
      staticPlateKey += v.mediaId === 'macconkey_agar' ? 'm' : 'n';
    }
  }

  let countsKey = '';
  for (let i = 0; i < LAB_STATIONS.length; i++) {
    const sid = LAB_STATIONS[i].id;
    countsKey += `${stationCountsCache.get(sid) ?? 0},`;
  }

  return `${rc.hoveredStationId ?? ''}|${rc.nearbyStationId ?? ''}|${rc.activeStationId ?? ''}|${
    rc.shakingIncubator.powerOn ? 1 : 0
  }:${rc.shakingIncubator.targetTempC.toFixed(0)}:${rc.shakingIncubator.rpm}|${
    rc.staticIncubator.powerOn ? 1 : 0
  }:${rc.staticIncubator.targetTempC.toFixed(1)}|${countsKey}|${staticPlateKey}`;
}

export function renderWorkstationsLayer(
  ctx: CanvasRenderingContext2D,
  rc: WorkstationLayerContext
) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (let i = 0; i < LAB_STATIONS.length; i++) {
    const st = LAB_STATIONS[i];
    const x = st.tx * TILE_SIZE;
    const y = st.ty * TILE_SIZE;
    const w = st.widthTiles * TILE_SIZE;
    const h = st.heightTiles * TILE_SIZE;

    let stationSig = '0';
    if (st.id === 'static_incubator') {
      let sig = '';
      let cnt = 0;
      for (let j = 0; j < rc.vessels.length && cnt < 6; j++) {
        const v = rc.vessels[j];
        if (v.location.zone === 'equipment' && v.location.stationId === 'static_incubator') {
          sig += v.mediaId === 'macconkey_agar' ? 'M' : 'N';
          cnt++;
        }
      }
      stationSig = `${cnt}:${sig}`;
    } else if (st.id !== 'cold_storage') {
      let cnt = 0;
      for (let j = 0; j < rc.vessels.length && cnt < 6; j++) {
        const v = rc.vessels[j];
        if (v.location.zone === 'equipment' && v.location.stationId === st.id) {
          cnt++;
        }
      }
      stationSig = String(cnt);
    }

    const baseSprite = getStationBaseSprite(st, rc, stationSig);
    ctx.drawImage(baseSprite, x | 0, y | 0);

    const isHovered = rc.hoveredStationId === st.id;
    const isNearby = rc.nearbyStationId === st.id;
    const isActive = rc.activeStationId === st.id;

    if (isHovered || isNearby || isActive) {
      const strokeColor = isActive
        ? '#22D3EE'
        : isNearby
        ? st.accentColor
        : 'rgba(226, 232, 240, 0.8)';
      const glowSprite = getStationHighlightSprite(w, h, strokeColor, isNearby || isActive);
      ctx.drawImage(glowSprite, (x - 6) | 0, (y - 6) | 0);
    }

    // Draw static / hover station labels on Layer 2.
    // The active `[E] ShortLabel` prompt is rendered on Layer 3 so interaction prompts stay crisp.
    if (rc.nearbyStationId !== st.id) {
      const badge = getStationBadgeSprite(st.id, st.shortLabel, st.accentColor, isHovered, false);
      const cx = (st.tx + st.widthTiles / 2) * TILE_SIZE;
      const topY = st.ty * TILE_SIZE - 16;
      ctx.drawImage(badge, (cx - badge.width / 2) | 0, (topY - badge.height / 2) | 0);
    }
  }
}

// ============================================================================
// Layer 3: Dynamic 60 FPS Layer (Player, Path Target, Animated Sub-Effects, [E])
// ============================================================================

export function createEmptyDynamicLayerDirtyState(): DynamicLayerDirtyState {
  return {
    px: -9999,
    py: -9999,
    facing: 'down',
    isMoving: false,
    stride: 0,
    hasHeld: false,
    nearbyStationId: null,
    activeStationId: null,
    clickTx: -1,
    clickTy: -1,
    pathLen: 0,
    pathHeadX: -1,
    pathHeadY: -1,
    pathTailX: -1,
    pathTailY: -1,
    flicker: 0,
    shakeOffset: 0,
    spinStep: 0,
    pcrPhase: 1,
    shkFlaskMask: 0,
  };
}

export function extractDynamicLayerDirtyState(
  rc: DynamicLayerContext,
  out: DynamicLayerDirtyState
): void {
  const p = rc.player;
  const activeStation = rc.activeStationId ?? null;
  const simSpeed = rc.simSpeed ?? 1;

  out.px = Math.round(p.x) - PLAYER_PIVOT_X;
  out.py = Math.round(p.y) - PLAYER_PIVOT_Y;
  out.facing = p.facing;
  out.isMoving = p.isMoving;
  out.stride = p.isMoving ? Math.round(Math.sin(p.walkFrame * 0.45) * 4) : 0;

  let hasHeld = false;
  let shkCount = 0;
  let odBits = 0;
  for (let i = 0; i < rc.vessels.length; i++) {
    const v = rc.vessels[i];
    if (!hasHeld && v.location.zone === 'belt') {
      hasHeld = true;
    }
    if (
      shkCount < 4 &&
      v.location.zone === 'equipment' &&
      v.location.stationId === 'shaking_incubator'
    ) {
      if (v.od600 > 0.3) {
        odBits |= 1 << shkCount;
      }
      shkCount++;
    }
  }
  out.hasHeld = hasHeld;
  out.shkFlaskMask = (shkCount & 0x7) | (odBits << 3);

  out.nearbyStationId = rc.nearbyStationId;
  out.activeStationId = activeStation;

  if (rc.clickTargetTile) {
    out.clickTx = rc.clickTargetTile.tx;
    out.clickTy = rc.clickTargetTile.ty;
  } else {
    out.clickTx = -1;
    out.clickTy = -1;
  }

  const q = p.pathQueue;
  out.pathLen = q.length;
  if (q.length > 0) {
    out.pathHeadX = Math.round(q[0].x);
    out.pathHeadY = Math.round(q[0].y);
    const tail = q[q.length - 1];
    out.pathTailX = Math.round(tail.x);
    out.pathTailY = Math.round(tail.y);
  } else {
    out.pathHeadX = -1;
    out.pathHeadY = -1;
    out.pathTailX = -1;
    out.pathTailY = -1;
  }

  out.flicker =
    activeStation === 'media_bench' ? (Math.sin(rc.animTimeSec * 12) > 0 ? 2 : 0) : 0;

  const isShaking =
    simSpeed > 0 && rc.shakingIncubator.powerOn && rc.shakingIncubator.rpm > 0;
  out.shakeOffset = isShaking
    ? Math.round(Math.sin(rc.animTimeSec * (rc.shakingIncubator.rpm / 28)) * 5)
    : 0;

  out.spinStep =
    activeStation === 'centrifuge_miniprep' ? Math.floor(rc.animTimeSec * 8) % 4 : 0;

  out.pcrPhase =
    activeStation === 'pcr_cycler' ? Math.floor(rc.animTimeSec * 1.4) % 3 : 1;
}

export function areDynamicStatesEqual(
  a: DynamicLayerDirtyState,
  b: DynamicLayerDirtyState
): boolean {
  return (
    a.px === b.px &&
    a.py === b.py &&
    a.facing === b.facing &&
    a.isMoving === b.isMoving &&
    a.stride === b.stride &&
    a.hasHeld === b.hasHeld &&
    a.nearbyStationId === b.nearbyStationId &&
    a.activeStationId === b.activeStationId &&
    a.clickTx === b.clickTx &&
    a.clickTy === b.clickTy &&
    a.pathLen === b.pathLen &&
    a.pathHeadX === b.pathHeadX &&
    a.pathHeadY === b.pathHeadY &&
    a.pathTailX === b.pathTailX &&
    a.pathTailY === b.pathTailY &&
    a.flicker === b.flicker &&
    a.shakeOffset === b.shakeOffset &&
    a.spinStep === b.spinStep &&
    a.pcrPhase === b.pcrPhase &&
    a.shkFlaskMask === b.shkFlaskMask
  );
}

export function copyDynamicState(
  dst: DynamicLayerDirtyState,
  src: DynamicLayerDirtyState
): void {
  dst.px = src.px;
  dst.py = src.py;
  dst.facing = src.facing;
  dst.isMoving = src.isMoving;
  dst.stride = src.stride;
  dst.hasHeld = src.hasHeld;
  dst.nearbyStationId = src.nearbyStationId;
  dst.activeStationId = src.activeStationId;
  dst.clickTx = src.clickTx;
  dst.clickTy = src.clickTy;
  dst.pathLen = src.pathLen;
  dst.pathHeadX = src.pathHeadX;
  dst.pathHeadY = src.pathHeadY;
  dst.pathTailX = src.pathTailX;
  dst.pathTailY = src.pathTailY;
  dst.flicker = src.flicker;
  dst.shakeOffset = src.shakeOffset;
  dst.spinStep = src.spinStep;
  dst.pcrPhase = src.pcrPhase;
  dst.shkFlaskMask = src.shkFlaskMask;
}

const scratchDynState = createEmptyDynamicLayerDirtyState();

export function renderDynamicEntitiesLayer(
  ctx: CanvasRenderingContext2D,
  rc: DynamicLayerContext,
  precomputed?: DynamicLayerDirtyState
) {
  let ds = precomputed;
  if (!ds) {
    extractDynamicLayerDirtyState(rc, scratchDynState);
    ds = scratchDynState;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // 1. Movement click target & waypoint path indicator
  if (rc.clickTargetTile) {
    const tx = (rc.clickTargetTile.tx * TILE_SIZE) | 0;
    const ty = (rc.clickTargetTile.ty * TILE_SIZE) | 0;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.72)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tx + 12, ty + 12, TILE_SIZE - 24, TILE_SIZE - 24);
  }

  const queue = rc.player.pathQueue;
  if (queue.length > 1) {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.42)';
    for (let i = 0; i < queue.length - 1; i++) {
      const wp = queue[i];
      ctx.fillRect((wp.x - 3) | 0, (wp.y - 3) | 0, 6, 6);
    }
  }

  // 2. Equipment sub-elements (only animate when running/active; zero allocations)
  // 2a. Media Bench Bunsen flame
  const mbX = 7 * TILE_SIZE;
  const mbY = 1 * TILE_SIZE;
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect((mbX + 274) | 0, (mbY + 24 - ds.flicker) | 0, 8, 16 + ds.flicker);
  ctx.fillStyle = '#E0F2FE';
  ctx.fillRect((mbX + 276) | 0, (mbY + 28) | 0, 4, 8);

  // 2b. Shaking Incubator orbital flasks
  const shkX = 14 * TILE_SIZE;
  const shkY = 1 * TILE_SIZE;
  const shakeOffset = ds.shakeOffset;
  let shkCount = 0;
  for (let i = 0; i < rc.vessels.length && shkCount < 4; i++) {
    const v = rc.vessels[i];
    if (v.location.zone !== 'equipment' || v.location.stationId !== 'shaking_incubator') continue;
    const fx = (shkX + 32 + shkCount * 32 + shakeOffset) | 0;
    const fy = (shkY + 44) | 0;
    const liquidColor = v.od600 > 0.3 ? '#FDE68A' : '#D97706';
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(fx + 6, fy - 8, 8, 8);
    ctx.fillStyle = liquidColor;
    ctx.fillRect(fx, fy, 20, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(fx + 4, fy + 4, 4, 10);
    shkCount++;
  }
  if (shkCount === 0) {
    const fx = (shkX + 32 + shakeOffset) | 0;
    const fy = (shkY + 44) | 0;
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(fx + 6, fy - 8, 8, 8);
    ctx.fillStyle = '#334155';
    ctx.fillRect(fx, fy, 20, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(fx + 4, fy + 4, 4, 10);
  }

  // 2c. Centrifuge rotor indicator
  const cfgX = 2 * TILE_SIZE;
  const cfgY = 11 * TILE_SIZE;
  const spinStep = ds.spinStep;
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(
    (cfgX + 54 + (spinStep === 1 ? 6 : spinStep === 3 ? -6 : 0)) | 0,
    (cfgY + 36 + (spinStep === 2 ? 4 : 0)) | 0,
    10,
    10
  );

  // 2d. PCR Cycler phase LED
  const pcrX = 7 * TILE_SIZE;
  const pcrY = 11 * TILE_SIZE;
  const pcrW = 3 * TILE_SIZE;
  const phase = ds.pcrPhase;
  ctx.fillStyle = phase === 0 ? '#F43F5E' : phase === 1 ? '#06B6D4' : '#F59E0B';
  ctx.fillRect((pcrX + pcrW - 58) | 0, (pcrY + 28) | 0, 12, 8);

  // 3. Player sprite blit (cached per facing / stride / held count)
  const playerSprite = getPlayerSprite(ds.facing, ds.stride, ds.hasHeld);
  ctx.drawImage(playerSprite, ds.px | 0, ds.py | 0);

  // 4. Active [E] proximity interaction prompt badge
  if (ds.nearbyStationId) {
    for (let i = 0; i < LAB_STATIONS.length; i++) {
      const st = LAB_STATIONS[i];
      if (st.id !== ds.nearbyStationId) continue;
      const badge = getStationBadgeSprite(
        st.id,
        `[E] ${st.shortLabel}`,
        st.accentColor,
        true,
        true
      );
      const cx = (st.tx + st.widthTiles / 2) * TILE_SIZE;
      const topY = st.ty * TILE_SIZE - 16;
      ctx.drawImage(badge, (cx - badge.width / 2) | 0, (topY - badge.height / 2) | 0);
      break;
    }
  }
}

/**
 * Backward-compatible single-call helper (composes static, workstation, and dynamic layers).
 */
export function renderLabWorld(ctx: CanvasRenderingContext2D, rc: RenderWorldContext) {
  renderStaticEnvironmentLayer(ctx);
  renderWorkstationsLayer(ctx, {
    vessels: rc.vessels,
    shakingIncubator: rc.shakingIncubator,
    staticIncubator: rc.staticIncubator,
    hoveredStationId: rc.hoveredStationId,
    nearbyStationId: rc.nearbyStationId,
    activeStationId: rc.activeStationId,
  });
  // Draw dynamic layer directly onto shared ctx without clearing Layer 1 & 2
  if (!fallbackCompositeCanvas) {
    fallbackCompositeCanvas = createOffscreenCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  }
  const tCtx = fallbackCompositeCanvas.getContext('2d');
  if (tCtx) {
    renderDynamicEntitiesLayer(tCtx, {
      player: rc.player,
      vessels: rc.vessels,
      shakingIncubator: rc.shakingIncubator,
      hoveredStationId: rc.hoveredStationId,
      nearbyStationId: rc.nearbyStationId,
      activeStationId: rc.activeStationId,
      animTimeSec: rc.animTimeSec,
      clickTargetTile: rc.clickTargetTile,
    });
    ctx.drawImage(fallbackCompositeCanvas, 0, 0);
  }
}
