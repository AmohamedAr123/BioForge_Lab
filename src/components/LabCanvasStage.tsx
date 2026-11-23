import React, { useEffect, useRef, useState } from 'react';
import {
  getNearbyStation,
  getStationAtTile,
  isTileWalkable,
  LAB_STATIONS,
  MAP_COLS,
  MAP_ROWS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../engine/labMap';
import { findTilePath } from '../engine/pathfinding';
import {
  areDynamicStatesEqual,
  computeWorkstationsDirtyKey,
  copyDynamicState,
  createEmptyDynamicLayerDirtyState,
  DynamicLayerContext,
  DynamicLayerDirtyState,
  extractDynamicLayerDirtyState,
  renderDynamicEntitiesLayer,
  renderStaticEnvironmentLayer,
  renderWorkstationsLayer,
} from '../engine/pixelRenderer';
import {
  CultureVessel,
  LabPlayerState,
  ShakingIncubatorConfig,
  StaticIncubatorConfig,
  StationId,
} from '../types/lab';

interface LabCanvasStageProps {
  vessels: CultureVessel[];
  vesselsLiveRef?: React.RefObject<CultureVessel[]>;
  simSpeed?: number;
  shakingIncubator: ShakingIncubatorConfig;
  staticIncubator: StaticIncubatorConfig;
  activeStationId: StationId | null;
  initialPlayer: { x: number; y: number; facing: 'up' | 'down' | 'left' | 'right' };
  onPlayerMovePersist: (player: {
    x: number;
    y: number;
    facing: 'up' | 'down' | 'left' | 'right';
  }) => void;
  onPlayerWalked?: () => void;
  onOpenStation: (stationId: StationId) => void;
  topRightHud?: React.ReactNode;
}

const LabCanvasStageComponent: React.FC<LabCanvasStageProps> = ({
  vessels,
  vesselsLiveRef,
  simSpeed = 1,
  shakingIncubator,
  staticIncubator,
  activeStationId,
  initialPlayer,
  onPlayerMovePersist,
  onPlayerWalked,
  onOpenStation,
  topRightHud,
}) => {
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const layer1CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layer2CanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layer3CanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: 960,
    h: 600,
  });

  const playerRef = useRef<LabPlayerState>({
    x: initialPlayer.x,
    y: initialPlayer.y,
    facing: initialPlayer.facing,
    isMoving: false,
    walkFrame: 0,
    pathQueue: [],
  });

  const lastPersistedPlayerRef = useRef<{
    x: number;
    y: number;
    facing: 'up' | 'down' | 'left' | 'right';
  }>({
    x: Math.round(initialPlayer.x),
    y: Math.round(initialPlayer.y),
    facing: initialPlayer.facing,
  });

  const keysRef = useRef<Set<string>>(new Set());
  const hoveredStationRef = useRef<StationId | null>(null);
  const lastNearbyIdRef = useRef<StationId | null>(null);
  const pendingStationOpenRef = useRef<StationId | null>(null);
  const clickTargetTileRef = useRef<{ tx: number; ty: number } | null>(null);
  const lastLayer2DirtyKeyRef = useRef<string>('');
  const layer3DirtyValidRef = useRef<boolean>(false);
  const lastLayer3StateRef = useRef<DynamicLayerDirtyState>(createEmptyDynamicLayerDirtyState());
  const currLayer3StateRef = useRef<DynamicLayerDirtyState>(createEmptyDynamicLayerDirtyState());

  const [nearbyStationId, setNearbyStationId] = useState<StationId | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<StationId | null>(null);

  const notifiedWalkRef = useRef<boolean>(false);

  // Sync latest React props into refs for 60 FPS canvas loop without recreating RAF
  const propsRef = useRef({
    vessels,
    vesselsLiveRef,
    simSpeed,
    shakingIncubator,
    staticIncubator,
    activeStationId,
    onOpenStation,
    onPlayerMovePersist,
    onPlayerWalked,
  });
  propsRef.current = {
    vessels,
    vesselsLiveRef,
    simSpeed,
    shakingIncubator,
    staticIncubator,
    activeStationId,
    onOpenStation,
    onPlayerMovePersist,
    onPlayerWalked,
  };

  // Synchronized ResizeObserver computing fitted 16:10 CSS viewport size
  useEffect(() => {
    const el = viewportContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const aspect = WORLD_WIDTH / WORLD_HEIGHT;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) {
        h = rect.height;
        w = h * aspect;
      }
      const nextW = Math.max(320, Math.floor(w));
      const nextH = Math.max(200, Math.floor(h));
      setStageSize((prev) =>
        prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }
      );
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Synchronize DPI scaling, backing dimensions, and Layer 1 static environment render
  useEffect(() => {
    const c1 = layer1CanvasRef.current;
    const c2 = layer2CanvasRef.current;
    const c3 = layer3CanvasRef.current;
    if (!c1 || !c2 || !c3) return;

    const syncCanvases = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const backingW = Math.max(1, Math.round(stageSize.w * dpr));
      const backingH = Math.max(1, Math.round(stageSize.h * dpr));
      const scaleX = backingW / WORLD_WIDTH;
      const scaleY = backingH / WORLD_HEIGHT;

      const canvases = [c1, c2, c3];
      for (let i = 0; i < canvases.length; i++) {
        const c = canvases[i];
        if (c.width !== backingW || c.height !== backingH) {
          c.width = backingW;
          c.height = backingH;
        }
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
          ctx.imageSmoothingEnabled = false;
        }
      }

      // Layer 1: Static Environment rendered ONCE on mount / resize / DPR change (0% CPU per tick)
      const ctx1 = c1.getContext('2d');
      if (ctx1) {
        renderStaticEnvironmentLayer(ctx1);
      }
      // Mark Layer 2 & Layer 3 dirty so they redraw immediately on the next frame
      lastLayer2DirtyKeyRef.current = '';
      layer3DirtyValidRef.current = false;
    };

    syncCanvases();
    window.addEventListener('resize', syncCanvases);
    return () => window.removeEventListener('resize', syncCanvases);
  }, [stageSize]);

  // Update player position when reset/imported externally
  useEffect(() => {
    const dist = Math.hypot(
      playerRef.current.x - initialPlayer.x,
      playerRef.current.y - initialPlayer.y
    );
    if (dist > TILE_SIZE * 4) {
      playerRef.current.x = initialPlayer.x;
      playerRef.current.y = initialPlayer.y;
      playerRef.current.facing = initialPlayer.facing;
      playerRef.current.pathQueue = [];
      lastPersistedPlayerRef.current = {
        x: Math.round(initialPlayer.x),
        y: Math.round(initialPlayer.y),
        facing: initialPlayer.facing,
      };
      layer3DirtyValidRef.current = false;
    }
  }, [initialPlayer.x, initialPlayer.y, initialPlayer.facing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysRef.current.add(k);
        playerRef.current.pathQueue = [];
        pendingStationOpenRef.current = null;
        clickTargetTileRef.current = null;
      }

      if (k === 'e' && !propsRef.current.activeStationId) {
        const near = getNearbyStation(playerRef.current.x, playerRef.current.y);
        if (near) {
          e.preventDefault();
          propsRef.current.onOpenStation(near.id);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let persistTimer = 0;

    const dynContext: DynamicLayerContext = {
      player: playerRef.current,
      vessels: propsRef.current.vessels,
      shakingIncubator: propsRef.current.shakingIncubator,
      hoveredStationId: hoveredStationRef.current,
      nearbyStationId: lastNearbyIdRef.current,
      activeStationId: propsRef.current.activeStationId,
      simSpeed: propsRef.current.simSpeed,
      animTimeSec: 0,
      clickTargetTile: clickTargetTileRef.current,
    };

    const canOccupyPx = (px: number, py: number): boolean => {
      const radius = 16;
      const corners = [
        { x: px - radius, y: py - radius + 8 },
        { x: px + radius, y: py - radius + 8 },
        { x: px - radius, y: py + radius },
        { x: px + radius, y: py + radius },
      ];
      for (let i = 0; i < corners.length; i++) {
        const tx = Math.floor(corners[i].x / TILE_SIZE);
        const ty = Math.floor(corners[i].y / TILE_SIZE);
        if (!isTileWalkable(tx, ty)) return false;
      }
      return true;
    };

    const loop = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const p = playerRef.current;
      const moveSpeedPxPerSec = 270;
      let dx = 0;
      let dy = 0;

      if (!propsRef.current.activeStationId) {
        const keys = keysRef.current;
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;

        if (Math.abs(dx) > Math.abs(dy)) {
          p.facing = dx < 0 ? 'left' : 'right';
        } else {
          p.facing = dy < 0 ? 'up' : 'down';
        }

        const stepX = dx * moveSpeedPxPerSec * dtSec;
        const stepY = dy * moveSpeedPxPerSec * dtSec;
        if (canOccupyPx(p.x + stepX, p.y)) p.x += stepX;
        if (canOccupyPx(p.x, p.y + stepY)) p.y += stepY;

        p.isMoving = true;
        p.walkFrame += dtSec * 22;
        if (!notifiedWalkRef.current) {
          notifiedWalkRef.current = true;
          propsRef.current.onPlayerWalked?.();
        }
      } else if (p.pathQueue.length > 0) {
        if (!notifiedWalkRef.current) {
          notifiedWalkRef.current = true;
          propsRef.current.onPlayerWalked?.();
        }
        const nextWp = p.pathQueue[0];
        const vx = nextWp.x - p.x;
        const vy = nextWp.y - p.y;
        const dist = Math.hypot(vx, vy);

        if (dist <= 6) {
          p.x = nextWp.x;
          p.y = nextWp.y;
          p.pathQueue.shift();

          if (p.pathQueue.length === 0) {
            p.isMoving = false;
            clickTargetTileRef.current = null;
            if (pendingStationOpenRef.current) {
              const targetId = pendingStationOpenRef.current;
              pendingStationOpenRef.current = null;
              propsRef.current.onOpenStation(targetId);
            }
          }
        } else {
          const nx = vx / dist;
          const ny = vy / dist;
          if (Math.abs(nx) > Math.abs(ny)) {
            p.facing = nx < 0 ? 'left' : 'right';
          } else {
            p.facing = ny < 0 ? 'up' : 'down';
          }
          const step = Math.min(dist, moveSpeedPxPerSec * dtSec);
          p.x += nx * step;
          p.y += ny * step;
          p.isMoving = true;
          p.walkFrame += dtSec * 22;
        }
      } else {
        p.isMoving = false;
      }

      // Periodic lightweight player position persist ONLY when coordinates or facing changed
      persistTimer += dtSec;
      if (persistTimer > 1.2) {
        persistTimer = 0;
        const rx = Math.round(p.x);
        const ry = Math.round(p.y);
        const last = lastPersistedPlayerRef.current;
        if (last.x !== rx || last.y !== ry || last.facing !== p.facing) {
          lastPersistedPlayerRef.current = { x: rx, y: ry, facing: p.facing };
          propsRef.current.onPlayerMovePersist({ x: rx, y: ry, facing: p.facing });
        }
      }

      const near = getNearbyStation(p.x, p.y);
      const nearId = near?.id ?? null;
      if (lastNearbyIdRef.current !== nearId) {
        lastNearbyIdRef.current = nearId;
        setNearbyStationId(nearId);
      }

      const liveVessels =
        propsRef.current.vesselsLiveRef?.current ?? propsRef.current.vessels;

      // Layer 2: Workstations & Semi-Static Layer (dirty-flagged; 0 work when unchanged)
      const dirtyKey = computeWorkstationsDirtyKey({
        vessels: liveVessels,
        shakingIncubator: propsRef.current.shakingIncubator,
        staticIncubator: propsRef.current.staticIncubator,
        hoveredStationId: hoveredStationRef.current,
        nearbyStationId: nearId,
        activeStationId: propsRef.current.activeStationId,
      });
      if (dirtyKey !== lastLayer2DirtyKeyRef.current) {
        const c2 = layer2CanvasRef.current;
        const ctx2 = c2?.getContext('2d');
        if (ctx2) {
          renderWorkstationsLayer(ctx2, {
            vessels: liveVessels,
            shakingIncubator: propsRef.current.shakingIncubator,
            staticIncubator: propsRef.current.staticIncubator,
            hoveredStationId: hoveredStationRef.current,
            nearbyStationId: nearId,
            activeStationId: propsRef.current.activeStationId,
          });
          lastLayer2DirtyKeyRef.current = dirtyKey;
        }
      }

      // Layer 3: Dynamic 60 FPS Layer with idle dirty-checking (0 commits when idle)
      dynContext.player = p;
      dynContext.vessels = liveVessels;
      dynContext.shakingIncubator = propsRef.current.shakingIncubator;
      dynContext.hoveredStationId = hoveredStationRef.current;
      dynContext.nearbyStationId = nearId;
      dynContext.activeStationId = propsRef.current.activeStationId;
      dynContext.simSpeed = propsRef.current.simSpeed;
      dynContext.animTimeSec = now / 1000;
      dynContext.clickTargetTile = clickTargetTileRef.current;

      extractDynamicLayerDirtyState(dynContext, currLayer3StateRef.current);
      if (
        !layer3DirtyValidRef.current ||
        !areDynamicStatesEqual(currLayer3StateRef.current, lastLayer3StateRef.current)
      ) {
        const c3 = layer3CanvasRef.current;
        const ctx3 = c3?.getContext('2d');
        if (ctx3) {
          renderDynamicEntitiesLayer(ctx3, dynContext, currLayer3StateRef.current);
          copyDynamicState(lastLayer3StateRef.current, currLayer3StateRef.current);
          layer3DirtyValidRef.current = true;
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const getWorldCoordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = layer3CanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = WORLD_WIDTH / rect.width;
    const scaleY = WORLD_HEIGHT / rect.height;
    const wx = (e.clientX - rect.left) * scaleX;
    const wy = (e.clientY - rect.top) * scaleY;
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    return { wx, wy, tx, ty };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getWorldCoordsFromEvent(e);
    if (!coords) return;
    const st = getStationAtTile(coords.tx, coords.ty);
    const nextHover = st?.id ?? null;
    if (hoveredStationRef.current !== nextHover) {
      hoveredStationRef.current = nextHover;
      setHoveredStationId(nextHover);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getWorldCoordsFromEvent(e);
    if (!coords) return;

    const p = playerRef.current;
    const clickedStation = getStationAtTile(coords.tx, coords.ty);

    if (clickedStation) {
      const near = getNearbyStation(p.x, p.y);
      if (near?.id === clickedStation.id) {
        onOpenStation(clickedStation.id);
        return;
      }

      const startTile = {
        tx: Math.floor(p.x / TILE_SIZE),
        ty: Math.floor(p.y / TILE_SIZE),
      };
      const tilePath = findTilePath(
        startTile,
        clickedStation.interactTile,
        isTileWalkable,
        MAP_COLS,
        MAP_ROWS
      );
      p.pathQueue = tilePath.map((pt) => ({
        x: pt.tx * TILE_SIZE + TILE_SIZE / 2,
        y: pt.ty * TILE_SIZE + TILE_SIZE / 2,
      }));
      pendingStationOpenRef.current = clickedStation.id;
      clickTargetTileRef.current = clickedStation.interactTile;
      return;
    }

    pendingStationOpenRef.current = null;
    const startTile = {
      tx: Math.floor(p.x / TILE_SIZE),
      ty: Math.floor(p.y / TILE_SIZE),
    };
    const tilePath = findTilePath(
      startTile,
      { tx: coords.tx, ty: coords.ty },
      isTileWalkable,
      MAP_COLS,
      MAP_ROWS
    );
    if (tilePath.length > 0) {
      p.pathQueue = tilePath.map((pt) => ({
        x: pt.tx * TILE_SIZE + TILE_SIZE / 2,
        y: pt.ty * TILE_SIZE + TILE_SIZE / 2,
      }));
      clickTargetTileRef.current = tilePath[tilePath.length - 1];
    }
  };

  const nearbyStation = nearbyStationId
    ? LAB_STATIONS.find((s) => s.id === nearbyStationId) ?? null
    : null;

  return (
    <div className="relative flex-1 bg-[#080B12] flex items-center justify-center overflow-hidden p-3">
      <div
        ref={viewportContainerRef}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Synchronized 3-Layer Canvas Stack */}
        <div
          style={{ width: `${stageSize.w}px`, height: `${stageSize.h}px` }}
          className="relative rounded-lg border border-slate-800 bg-[#0F172A] overflow-hidden shrink-0"
        >
          {/* Layer 1: Static Environment (Floor, walls, static benches/props) */}
          <canvas
            ref={layer1CanvasRef}
            className="pixelated absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          />

          {/* Layer 2: Workstations & Semi-Static (Dirty-flagged offscreen sprite blits) */}
          <canvas
            ref={layer2CanvasRef}
            className="pixelated absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          />

          {/* Layer 3: Dynamic 60 FPS Entities (Player, paths, animations, [E] prompt) */}
          <canvas
            ref={layer3CanvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => {
              hoveredStationRef.current = null;
              setHoveredStationId(null);
            }}
            onClick={handleCanvasClick}
            className={`pixelated absolute inset-0 w-full h-full ${
              hoveredStationId ? 'cursor-pointer' : 'cursor-crosshair'
            }`}
          />
        </div>

        {/* Quick Station Teleport / Proximity Action Bar */}
        <div className="absolute top-3 left-3 max-w-[calc(100%-22rem)] flex flex-wrap items-center gap-1 bg-[#0B0E17]/95 border border-slate-800 rounded-md px-2.5 py-1.5">
          <span className="text-[11px] text-slate-400 mr-1 whitespace-nowrap">Stations:</span>
          {LAB_STATIONS.map((st) => {
            const isNear = nearbyStationId === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onOpenStation(st.id)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isNear
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent'
                }`}
              >
                {st.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Collapsible Goal Tracker HUD */}
        {topRightHud && (
          <div className="absolute top-3 right-3 z-20">{topRightHud}</div>
        )}

        {/* Proximity Prompt */}
        {nearbyStation && !activeStationId && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0B0E17]/95 border border-cyan-500/50 rounded-md px-3.5 py-2">
            <div className="text-xs text-slate-200">
              <span className="font-semibold text-white">{nearbyStation.name}</span>
              <span className="text-slate-400 ml-2 hidden sm:inline">
                {nearbyStation.description}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenStation(nearbyStation.id)}
              className="px-2.5 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open (E)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const LabCanvasStage = React.memo(
  LabCanvasStageComponent,
  (prev, next) =>
    (next.vesselsLiveRef ? true : prev.vessels === next.vessels) &&
    prev.vesselsLiveRef === next.vesselsLiveRef &&
    prev.simSpeed === next.simSpeed &&
    prev.shakingIncubator === next.shakingIncubator &&
    prev.staticIncubator === next.staticIncubator &&
    prev.activeStationId === next.activeStationId &&
    prev.initialPlayer.x === next.initialPlayer.x &&
    prev.initialPlayer.y === next.initialPlayer.y &&
    prev.initialPlayer.facing === next.initialPlayer.facing &&
    prev.onPlayerMovePersist === next.onPlayerMovePersist &&
    prev.onPlayerWalked === next.onPlayerWalked &&
    prev.onOpenStation === next.onOpenStation &&
    prev.topRightHud === next.topRightHud
);
