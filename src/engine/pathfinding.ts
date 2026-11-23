export interface GridPoint {
  tx: number;
  ty: number;
}

const ASTAR_DIRS = [
  { dx: 1, dy: 0, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 1, cost: 1.414 },
  { dx: -1, dy: 1, cost: 1.414 },
  { dx: 1, dy: -1, cost: 1.414 },
  { dx: -1, dy: -1, cost: 1.414 },
] as const;

/**
 * Lightweight 4-directional / 8-directional A* grid pathfinding on the laboratory floor.
 */
export function findTilePath(
  start: GridPoint,
  goal: GridPoint,
  isWalkable: (tx: number, ty: number) => boolean,
  cols: number,
  rows: number
): GridPoint[] {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v));
  const sx = clamp(start.tx, cols);
  const sy = clamp(start.ty, rows);
  let gx = clamp(goal.tx, cols);
  let gy = clamp(goal.ty, rows);

  // If the clicked tile is an obstacle (e.g., user clicked directly on a machine),
  // snap goal to the nearest adjacent walkable tile.
  if (!isWalkable(gx, gy)) {
    let bestX = -1;
    let bestY = -1;
    let bestDistSq = Infinity;
    for (let radius = 1; radius <= 3; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && isWalkable(nx, ny)) {
            const distSq = (nx - sx) * (nx - sx) + (ny - sy) * (ny - sy);
            if (distSq < bestDistSq) {
              bestDistSq = distSq;
              bestX = nx;
              bestY = ny;
            }
          }
        }
      }
      if (bestX !== -1) break;
    }
    if (bestX === -1) return [];
    gx = bestX;
    gy = bestY;
  }

  if (sx === gx && sy === gy) return [];

  const totalTiles = cols * rows;
  const startIdx = sy * cols + sx;
  const goalIdx = gy * cols + gx;

  const gScore = new Float32Array(totalTiles);
  gScore.fill(Infinity);
  const fScore = new Float32Array(totalTiles);
  fScore.fill(Infinity);
  const cameFrom = new Int16Array(totalTiles);
  cameFrom.fill(-1);
  const closedSet = new Uint8Array(totalTiles);
  const inOpenSet = new Uint8Array(totalTiles);

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.abs(gx - sx) + Math.abs(gy - sy);
  const open: number[] = [startIdx];
  inOpenSet[startIdx] = 1;

  while (open.length > 0) {
    let bestPos = 0;
    let bestF = fScore[open[0]];
    for (let i = 1; i < open.length; i++) {
      const f = fScore[open[i]];
      if (f < bestF) {
        bestF = f;
        bestPos = i;
      }
    }

    const currIdx = open[bestPos];
    open[bestPos] = open[open.length - 1];
    open.pop();
    inOpenSet[currIdx] = 0;

    if (currIdx === goalIdx) {
      const path: GridPoint[] = [];
      let trace = currIdx;
      while (trace !== -1 && trace !== startIdx) {
        path.push({ tx: trace % cols, ty: (trace / cols) | 0 });
        trace = cameFrom[trace];
      }
      path.reverse();
      return path;
    }

    closedSet[currIdx] = 1;
    const cx = currIdx % cols;
    const cy = (currIdx / cols) | 0;
    const currG = gScore[currIdx];

    for (let d = 0; d < ASTAR_DIRS.length; d++) {
      const dir = ASTAR_DIRS[d];
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (!isWalkable(nx, ny)) continue;
      // Prevent diagonal corner cutting through obstacles
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isWalkable(cx + dir.dx, cy) || !isWalkable(cx, cy + dir.dy)) {
          continue;
        }
      }

      const nIdx = ny * cols + nx;
      if (closedSet[nIdx]) continue;

      const tentativeG = currG + dir.cost;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = currIdx;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(gx - nx, gy - ny);
        if (!inOpenSet[nIdx]) {
          open.push(nIdx);
          inOpenSet[nIdx] = 1;
        }
      }
    }
  }

  return [];
}
