import { StationId } from '../types/lab';

export const TILE_SIZE = 64;
export const MAP_COLS = 24;
export const MAP_ROWS = 15;
export const WORLD_WIDTH = MAP_COLS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

export interface StationDefinition {
  id: StationId;
  name: string;
  shortLabel: string;
  description: string;
  tx: number;
  ty: number;
  widthTiles: number;
  heightTiles: number;
  interactTile: { tx: number; ty: number };
  slotCapacity: number;
  accentColor: string;
}

export interface LabBenchProp {
  tx: number;
  ty: number;
  widthTiles: number;
  heightTiles: number;
  kind: 'bench_dark' | 'bench_steel' | 'cabinet_tall' | 'sink' | 'biosafety_shell';
  label?: string;
}

export const LAB_STATIONS: StationDefinition[] = [
  {
    id: 'cold_storage',
    name: 'Cold Storage (-80 °C / 4 °C)',
    shortLabel: 'Cold Storage',
    description: 'Retrieve frozen bacterial glycerol stocks and refrigerate active plates or broth cultures.',
    tx: 2,
    ty: 1,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 3, ty: 3 },
    slotCapacity: 12,
    accentColor: '#38BDF8',
  },
  {
    id: 'media_bench',
    name: 'Media & Inoculation Bench',
    shortLabel: 'Media Bench',
    description: 'Formulate broth or agar vessels, run serial dilutions, add antibiotics, and inoculate strains.',
    tx: 7,
    ty: 1,
    widthTiles: 5,
    heightTiles: 2,
    interactTile: { tx: 9, ty: 3 },
    slotCapacity: 4,
    accentColor: '#10B981',
  },
  {
    id: 'shaking_incubator',
    name: 'Orbital Shaking Incubator',
    shortLabel: 'Shaking Inc.',
    description: 'Aerated liquid broth cultivation with controllable temperature (15–50 °C) and orbital RPM.',
    tx: 14,
    ty: 1,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 15, ty: 3 },
    slotCapacity: 6,
    accentColor: '#F59E0B',
  },
  {
    id: 'static_incubator',
    name: 'Static Plate Incubator',
    shortLabel: 'Static Inc.',
    description: 'Temperature-controlled chamber for agar Petri plates and unshaken liquid tubes.',
    tx: 18,
    ty: 1,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 19, ty: 3 },
    slotCapacity: 6,
    accentColor: '#FB923C',
  },
  {
    id: 'microscope',
    name: 'Compound & Phase Microscope',
    shortLabel: 'Microscope',
    description: 'Inspect cell morphology, Gram stain reaction, motility, and density at 100x–1000x oil immersion.',
    tx: 5,
    ty: 6,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 6, ty: 5 },
    slotCapacity: 1,
    accentColor: '#06B6D4',
  },
  {
    id: 'spectrophotometer',
    name: 'Spectrophotometer & NanoDrop',
    shortLabel: 'Spec / NanoDrop',
    description: 'Measure culture OD600 turbidity or NanoDrop A260/A280 DNA yield and purity.',
    tx: 11,
    ty: 6,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 12, ty: 5 },
    slotCapacity: 1,
    accentColor: '#22D3EE',
  },
  {
    id: 'centrifuge_miniprep',
    name: 'Microcentrifuge & DNA Extraction',
    shortLabel: 'Centrifuge / DNA',
    description: 'Pellet bacterial cells at high RCF (×g), lyse, wash, and elute purified DNA.',
    tx: 2,
    ty: 11,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 3, ty: 10 },
    slotCapacity: 2,
    accentColor: '#38BDF8',
  },
  {
    id: 'pcr_cycler',
    name: 'PCR Thermal Cycler',
    shortLabel: 'PCR Cycler',
    description: 'Inspect A/T/G/C genes, calculate primer Tm, and amplify DNA across 30 thermal cycles.',
    tx: 7,
    ty: 11,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 8, ty: 10 },
    slotCapacity: 2,
    accentColor: '#A855F7',
  },
  {
    id: 'restriction_bench',
    name: 'Restriction Enzyme Digest Bench',
    shortLabel: 'Restriction Cut',
    description: 'Cleave plasmids or PCR amplicons at 37 °C with EcoRI, BamHI, HindIII, PstI, or SalI.',
    tx: 11,
    ty: 11,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 12, ty: 10 },
    slotCapacity: 2,
    accentColor: '#14B8A6',
  },
  {
    id: 'gel_electrophoresis',
    name: 'Agarose Gel Rig & UV Gel Doc',
    shortLabel: 'Gel & UV Doc',
    description: 'Separate DNA fragments by base-pair size alongside a ladder and capture UV gel photos.',
    tx: 15,
    ty: 11,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 16, ty: 10 },
    slotCapacity: 2,
    accentColor: '#3B82F6',
  },
  {
    id: 'autoclave',
    name: 'Steam Autoclave & Disposal',
    shortLabel: 'Autoclave',
    description: 'Sterilize biohazard waste and safely decontaminate spent culture vessels at 121 °C.',
    tx: 19,
    ty: 11,
    widthTiles: 3,
    heightTiles: 2,
    interactTile: { tx: 20, ty: 10 },
    slotCapacity: 2,
    accentColor: '#F43F5E',
  },
];

/** Non-interactive structural lab benches and equipment islands */
export const LAB_PROPS: LabBenchProp[] = [
  // Top wall filler benches
  { tx: 1, ty: 1, widthTiles: 1, heightTiles: 2, kind: 'cabinet_tall' },
  { tx: 5, ty: 1, widthTiles: 2, heightTiles: 2, kind: 'bench_dark' },
  { tx: 12, ty: 1, widthTiles: 2, heightTiles: 2, kind: 'bench_dark' },
  { tx: 17, ty: 1, widthTiles: 1, heightTiles: 2, kind: 'bench_dark' },
  { tx: 21, ty: 1, widthTiles: 2, heightTiles: 2, kind: 'sink' },

  // Center analytical bench island
  { tx: 4, ty: 6, widthTiles: 1, heightTiles: 2, kind: 'bench_dark' },
  { tx: 8, ty: 6, widthTiles: 3, heightTiles: 2, kind: 'bench_dark' },
  { tx: 14, ty: 6, widthTiles: 2, heightTiles: 2, kind: 'bench_steel' },
  { tx: 18, ty: 6, widthTiles: 4, heightTiles: 2, kind: 'biosafety_shell', label: 'BSL-2 Clean Suite' },

  // Lower Molecular Bay connector benches
  { tx: 5, ty: 11, widthTiles: 2, heightTiles: 2, kind: 'bench_dark' },
  { tx: 10, ty: 11, widthTiles: 1, heightTiles: 2, kind: 'bench_steel' },
  { tx: 14, ty: 11, widthTiles: 1, heightTiles: 2, kind: 'bench_steel' },
];

const WALKABILITY_GRID = new Uint8Array(MAP_COLS * MAP_ROWS);
for (let ty = 1; ty < MAP_ROWS - 1; ty++) {
  for (let tx = 1; tx < MAP_COLS - 1; tx++) {
    WALKABILITY_GRID[ty * MAP_COLS + tx] = 1;
  }
}
for (const st of LAB_STATIONS) {
  for (let ty = st.ty; ty < st.ty + st.heightTiles; ty++) {
    for (let tx = st.tx; tx < st.tx + st.widthTiles; tx++) {
      if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
        WALKABILITY_GRID[ty * MAP_COLS + tx] = 0;
      }
    }
  }
}
for (const prop of LAB_PROPS) {
  for (let ty = prop.ty; ty < prop.ty + prop.heightTiles; ty++) {
    for (let tx = prop.tx; tx < prop.tx + prop.widthTiles; tx++) {
      if (tx >= 0 && tx < MAP_COLS && ty >= 0 && ty < MAP_ROWS) {
        WALKABILITY_GRID[ty * MAP_COLS + tx] = 0;
      }
    }
  }
}

const STATION_BY_ID = new Map<StationId, StationDefinition>(
  LAB_STATIONS.map((s) => [s.id, s])
);

export function isTileWalkable(tx: number, ty: number): boolean {
  if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) {
    return false;
  }
  return WALKABILITY_GRID[ty * MAP_COLS + tx] === 1;
}

export function getStationAtTile(tx: number, ty: number): StationDefinition | null {
  for (const st of LAB_STATIONS) {
    if (
      tx >= st.tx &&
      tx < st.tx + st.widthTiles &&
      ty >= st.ty &&
      ty < st.ty + st.heightTiles
    ) {
      return st;
    }
  }
  return null;
}

export function getStationById(id: StationId): StationDefinition {
  return STATION_BY_ID.get(id) ?? LAB_STATIONS[0];
}

export function getNearbyStation(playerPxX: number, playerPxY: number): StationDefinition | null {
  const playerCenterX = playerPxX;
  const playerCenterY = playerPxY;

  let best: StationDefinition | null = null;
  let bestDist = Infinity;

  for (const st of LAB_STATIONS) {
    const minX = st.tx * TILE_SIZE;
    const maxX = (st.tx + st.widthTiles) * TILE_SIZE;
    const minY = st.ty * TILE_SIZE;
    const maxY = (st.ty + st.heightTiles) * TILE_SIZE;

    const clampedX = Math.max(minX, Math.min(maxX, playerCenterX));
    const clampedY = Math.max(minY, Math.min(maxY, playerCenterY));
    const dist = Math.hypot(playerCenterX - clampedX, playerCenterY - clampedY);

    if (dist <= TILE_SIZE * 1.45 && dist < bestDist) {
      bestDist = dist;
      best = st;
    }
  }

  return best;
}
