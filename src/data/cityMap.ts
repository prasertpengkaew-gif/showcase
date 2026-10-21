/**
 * "Nerd City": a made-up city of 1.6 km × 1.6 km used by the 3D map demo. Everything here is
 * generated from a fixed seed, so the city is the same on every visit. Units are metres.
 * None of the places exist. For a real project the same scene is fed with your site data.
 */
export type Category = 'transit' | 'food' | 'shopping' | 'culture' | 'health' | 'park' | 'education' | 'stay';

export const CATEGORIES: Category[] = ['transit', 'food', 'shopping', 'culture', 'health', 'education', 'stay', 'park'];

export const CATEGORY_COLOR: Record<Category, string> = {
  transit: '#2563EB',
  food: '#F59E0B',
  shopping: '#EC4899',
  culture: '#7C3AED',
  health: '#EF4444',
  park: '#16A34A',
  education: '#0EA5E9',
  stay: '#14B8A6',
};

export interface Localized {
  en: string;
  th: string;
}

export interface Poi {
  id: string;
  category: Category;
  /** Cell of the street grid (0–15 each way) the place sits in. */
  cell: [number, number];
  name: Localized;
  desc: Localized;
  /** Centre of the place, in metres. */
  x: number;
  z: number;
  /** Graph node where the place meets the street. */
  door: number;
}

export interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** Base height (for roofs, canopies and upper tower sections). */
  y0?: number;
  /** Accent-coloured part (roof stripe, dome). */
  accent?: boolean;
}

export interface Lot extends Box {
  tone: number;
}

export interface Edge {
  a: number;
  b: number;
  len: number;
  avenue: boolean;
  /** Crosses the river. */
  bridge: boolean;
  horizontal: boolean;
}

export interface GraphNode {
  x: number;
  z: number;
}

export interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface City {
  half: number;
  lines: number[];
  nodes: GraphNode[];
  edges: Edge[];
  lots: Lot[];
  landmarks: { poi: string; category: Category; parts: Box[] }[];
  parks: Rect[];
  plazas: Rect[];
  trees: { x: number; z: number; s: number }[];
  pois: Poi[];
}

export const STEP = 100;
export const HALF = 800;
export const LINES = Array.from({ length: 17 }, (_, i) => -HALF + i * STEP);
export const RIVER_HALF = 42;
/** Distance from the building door to the kerb, in metres. */
export const ACCESS = 30;

/** Centre line of the river (z for a given x). */
export const riverZ = (x: number) => 330 + 45 * Math.sin(x / 170 + 0.6);
export const inRiver = (x: number, z: number, margin = 0) => Math.abs(z - riverZ(x)) < RIVER_HALF + margin;

const roadHalf = (lineIndex: number) => (lineIndex % 2 === 0 ? 10 : 5);
const cellCentre = (i: number) => -HALF + STEP / 2 + i * STEP;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PoiSeed = Omit<Poi, 'x' | 'z' | 'door'>;

const POI_SEEDS: PoiSeed[] = [
  { id: 'central-station', category: 'transit', cell: [7, 7], name: { en: 'Central Station', th: 'สถานีกลาง' }, desc: { en: 'The main rail and metro interchange, a few minutes from the business district.', th: 'จุดเชื่อมต่อรถไฟและรถไฟฟ้าหลัก ห่างจากย่านธุรกิจไม่กี่นาที' } },
  { id: 'riverside-station', category: 'transit', cell: [5, 12], name: { en: 'Riverside Station', th: 'สถานีริมน้ำ' }, desc: { en: 'A metro stop on the south bank, next to the river walk.', th: 'สถานีรถไฟฟ้าฝั่งใต้ ติดทางเดินริมแม่น้ำ' } },
  { id: 'north-terminal', category: 'transit', cell: [12, 2], name: { en: 'North Bus Terminal', th: 'สถานีขนส่งเหนือ' }, desc: { en: 'Intercity buses and local shuttles.', th: 'รถโดยสารระหว่างเมืองและรถรับส่งในเมือง' } },
  { id: 'skyline-hotel', category: 'stay', cell: [8, 8], name: { en: 'Skyline Hotel', th: 'โรงแรมสกายไลน์' }, desc: { en: 'The tallest tower in the city, with a rooftop bar and a view of the river.', th: 'ตึกที่สูงที่สุดในเมือง มีบาร์ดาดฟ้าและวิวแม่น้ำ' } },
  { id: 'lantern-inn', category: 'stay', cell: [2, 8], name: { en: 'Lantern Inn', th: 'ลันเทิร์น อินน์' }, desc: { en: 'A small hotel in the quiet western quarter.', th: 'โรงแรมขนาดเล็กในย่านตะวันตกที่เงียบสงบ' } },
  { id: 'grand-mall', category: 'shopping', cell: [6, 9], name: { en: 'Grand Mall', th: 'แกรนด์ มอลล์' }, desc: { en: 'Shops, a cinema and a food court under one roof.', th: 'ร้านค้า โรงภาพยนตร์ และฟู้ดคอร์ตในอาคารเดียว' } },
  { id: 'riverside-plaza', category: 'shopping', cell: [12, 13], name: { en: 'Riverside Plaza', th: 'ริเวอร์ไซด์ พลาซ่า' }, desc: { en: 'Open-air shopping along the south bank.', th: 'ย่านช้อปปิ้งกลางแจ้งริมฝั่งใต้' } },
  { id: 'night-bazaar', category: 'food', cell: [9, 6], name: { en: 'Night Bazaar', th: 'ไนท์ บาซาร์' }, desc: { en: 'Street food and market stalls, busiest after sunset.', th: 'อาหารริมทางและตลาดนัด คึกคักที่สุดหลังพระอาทิตย์ตก' } },
  { id: 'riverside-market', category: 'food', cell: [4, 9], name: { en: 'Riverside Market', th: 'ตลาดริมน้ำ' }, desc: { en: 'Fresh produce in the morning, small restaurants at night.', th: 'ผักผลไม้สดตอนเช้า ร้านอาหารเล็ก ๆ ตอนค่ำ' } },
  { id: 'noodle-street', category: 'food', cell: [10, 8], name: { en: 'Noodle Street', th: 'ถนนก๋วยเตี๋ยว' }, desc: { en: 'A block of noodle shops that stay open late.', th: 'ย่านร้านก๋วยเตี๋ยวที่เปิดดึก' } },
  { id: 'city-museum', category: 'culture', cell: [5, 5], name: { en: 'City Museum', th: 'พิพิธภัณฑ์เมือง' }, desc: { en: 'The history of the city and its river, with a large domed hall.', th: 'ประวัติศาสตร์ของเมืองและแม่น้ำ พร้อมหอโดมขนาดใหญ่' } },
  { id: 'opera-house', category: 'culture', cell: [10, 9], name: { en: 'Opera House', th: 'โรงละครโอเปร่า' }, desc: { en: 'Concerts and theatre close to the river.', th: 'คอนเสิร์ตและละครเวทีใกล้แม่น้ำ' } },
  { id: 'old-town-shrine', category: 'culture', cell: [13, 8], name: { en: 'Old Town Shrine', th: 'ศาลเจ้าเมืองเก่า' }, desc: { en: 'A quiet shrine in the oldest part of the city.', th: 'ศาลเจ้าเงียบสงบในย่านเมืองเก่า' } },
  { id: 'city-arena', category: 'culture', cell: [14, 3], name: { en: 'City Arena', th: 'ซิตี้ อารีนา' }, desc: { en: 'Sports and events for thousands of visitors.', th: 'สนามกีฬาและงานอีเวนต์สำหรับผู้เข้าชมหลายพันคน' } },
  { id: 'sunrise-hospital', category: 'health', cell: [12, 6], name: { en: 'Sunrise Hospital', th: 'โรงพยาบาลซันไรส์' }, desc: { en: 'The main hospital, with an emergency department.', th: 'โรงพยาบาลหลัก มีแผนกฉุกเฉิน' } },
  { id: 'city-clinic', category: 'health', cell: [3, 7], name: { en: 'City Clinic', th: 'คลินิกซิตี้' }, desc: { en: 'Neighbourhood clinic for check-ups.', th: 'คลินิกชุมชนสำหรับตรวจสุขภาพ' } },
  { id: 'tech-university', category: 'education', cell: [2, 4], name: { en: 'Tech University', th: 'มหาวิทยาลัยเทค' }, desc: { en: 'Engineering and design campus beside Lotus Park.', th: 'วิทยาเขตวิศวกรรมและการออกแบบ ติดสวนบัว' } },
  { id: 'central-library', category: 'education', cell: [7, 4], name: { en: 'Central Library', th: 'ห้องสมุดกลาง' }, desc: { en: 'Reading rooms and a maker space.', th: 'ห้องอ่านหนังสือและพื้นที่เมกเกอร์' } },
  { id: 'lotus-park', category: 'park', cell: [3, 3], name: { en: 'Lotus Park', th: 'สวนบัว' }, desc: { en: 'The biggest park in the city, with a lotus pond.', th: 'สวนสาธารณะที่ใหญ่ที่สุดในเมือง มีสระบัว' } },
  { id: 'meadow-green', category: 'park', cell: [11, 5], name: { en: 'Meadow Green', th: 'ทุ่งหญ้าเขียว' }, desc: { en: 'Open lawns for picnics and sport.', th: 'สนามหญ้าโล่งสำหรับปิกนิกและเล่นกีฬา' } },
  { id: 'south-gardens', category: 'park', cell: [8, 13], name: { en: 'South Gardens', th: 'สวนใต้' }, desc: { en: 'Formal gardens on the south bank.', th: 'สวนจัดแต่งบนฝั่งใต้' } },
];

const PARK_CELLS: [number, number][] = [
  [3, 3],
  [4, 3],
  [11, 5],
  [8, 13],
  [9, 13],
];

const key = (i: number, j: number) => `${i},${j}`;

function generate(): City {
  const rng = mulberry32(20261021);
  const nodes: GraphNode[] = [];
  for (const z of LINES) for (const x of LINES) nodes.push({ x, z });
  const n = LINES.length;
  const nodeAt = (ix: number, iz: number) => iz * n + ix;

  // --- road graph --------------------------------------------------------------------------
  const crossesRiver = (x1: number, z1: number, x2: number, z2: number) => {
    for (let t = 0; t <= 1.0001; t += 0.1) if (inRiver(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, 4)) return true;
    return false;
  };
  const edges: Edge[] = [];
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      if (ix < n - 1) {
        const a = nodeAt(ix, iz);
        const b = nodeAt(ix + 1, iz);
        if (!crossesRiver(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z)) edges.push({ a, b, len: STEP, avenue: iz % 2 === 0, bridge: false, horizontal: true });
      }
      if (iz < n - 1) {
        const a = nodeAt(ix, iz);
        const b = nodeAt(ix, iz + 1);
        const wet = crossesRiver(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z);
        // Only the avenues have bridges.
        if (!wet || ix % 2 === 0) edges.push({ a, b, len: STEP, avenue: ix % 2 === 0, bridge: wet, horizontal: false });
      }
    }
  }

  // --- places: each gets a door node that splits one of the streets around its block ----------
  const parkSet = new Set(PARK_CELLS.map(([i, j]) => key(i, j)));
  const poiSet = new Set(POI_SEEDS.map((p) => key(p.cell[0], p.cell[1])));
  const findEdge = (a: number, b: number) => edges.findIndex((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const pois: Poi[] = POI_SEEDS.map((seed) => {
    const [i, j] = seed.cell;
    const corners = [nodeAt(i, j), nodeAt(i + 1, j), nodeAt(i + 1, j + 1), nodeAt(i, j + 1)];
    // Sides of the block: south (z low), east, north, west. Prefer the side facing the city centre.
    const sides: [number, number][] = [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[3], corners[2]],
      [corners[0], corners[3]],
    ];
    const cx = cellCentre(i);
    const cz = cellCentre(j);
    const facing = sides
      .map(([a, b], k) => ({ k, mx: (nodes[a].x + nodes[b].x) / 2, mz: (nodes[a].z + nodes[b].z) / 2 }))
      .sort((p, q) => Math.hypot(p.mx, p.mz) - Math.hypot(q.mx, q.mz));
    for (const { k } of facing) {
      const [a, b] = sides[k];
      const ei = findEdge(a, b);
      if (ei < 0) continue;
      const e = edges[ei];
      const door = nodes.length;
      nodes.push({ x: (nodes[a].x + nodes[b].x) / 2, z: (nodes[a].z + nodes[b].z) / 2 });
      edges.splice(ei, 1, { ...e, a, b: door, len: e.len / 2 }, { ...e, a: door, b, len: e.len / 2 });
      return { ...seed, x: cx, z: cz, door };
    }
    throw new Error(`No street around ${seed.id}`);
  });

  // --- blocks ------------------------------------------------------------------------------
  const lots: Lot[] = [];
  const parks: Rect[] = [];
  const plazas: Rect[] = [];
  const landmarks: City['landmarks'] = [];
  const trees: City['trees'] = [];

  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const x0 = LINES[i] + roadHalf(i) + 4;
      const x1 = LINES[i + 1] - roadHalf(i + 1) - 4;
      const z0 = LINES[j] + roadHalf(j) + 4;
      const z1 = LINES[j + 1] - roadHalf(j + 1) - 4;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const rect = { x: cx, z: cz, w: x1 - x0, d: z1 - z0 };
      if (parkSet.has(key(i, j))) {
        parks.push(rect);
        for (let t = 0; t < 26; t++) {
          const tx = x0 + 6 + rng() * (x1 - x0 - 12);
          const tz = z0 + 6 + rng() * (z1 - z0 - 12);
          trees.push({ x: tx, z: tz, s: 0.8 + rng() * 0.9 });
        }
        continue;
      }
      if (poiSet.has(key(i, j))) {
        plazas.push(rect);
        continue;
      }
      const dc = Math.hypot(cx, cz);
      const core = Math.exp(-((dc / 450) ** 2));
      const nx = 1 + Math.floor(rng() * (2.2 + core * 2.2));
      const nz = 1 + Math.floor(rng() * (2.2 + core * 2.2));
      const lw = (x1 - x0) / nx;
      const ld = (z1 - z0) / nz;
      for (let a = 0; a < nx; a++) {
        for (let b = 0; b < nz; b++) {
          const inset = 2 + rng() * 4;
          const w = Math.max(14, lw - inset * 2 - rng() * 4);
          const d = Math.max(14, ld - inset * 2 - rng() * 4);
          const lx = x0 + lw * (a + 0.5);
          const lz = z0 + ld * (b + 0.5);
          // No buildings on the river.
          const corners: [number, number][] = [
            [lx, lz],
            [lx - w / 2, lz - d / 2],
            [lx + w / 2, lz - d / 2],
            [lx - w / 2, lz + d / 2],
            [lx + w / 2, lz + d / 2],
          ];
          if (corners.some(([px, pz]) => inRiver(px, pz, 8))) continue;
          const dist = Math.hypot(lx, lz);
          const c = Math.exp(-((dist / 450) ** 2));
          let h = 7 + rng() * 10 + c ** 1.2 * (22 + rng() * 105);
          if (nx * nz > 4) h *= 0.75;
          if (rng() < 0.08 && c > 0.3) h *= 1.4;
          h = Math.min(150, h);
          lots.push({ x: lx, z: lz, w, d, h, tone: rng() });
          if (h > 80) {
            // A tower on a podium.
            const podium = h * 0.42;
            lots[lots.length - 1] = { x: lx, z: lz, w, d, h: podium, tone: rng() };
            lots.push({ x: lx, z: lz, w: w * 0.62, d: d * 0.62, h, y0: podium, tone: rng() });
          }
        }
      }
    }
  }

  // --- landmarks ---------------------------------------------------------------------------
  for (const poi of pois) {
    const { x, z, category } = poi;
    const parts: Box[] = [];
    const tall = poi.id === 'skyline-hotel';
    switch (category) {
      case 'transit':
        parts.push({ x, z, w: 82, d: 42, h: 13 }, { x, z, w: 84, d: 44, h: 1.6, y0: 13, accent: true }, { x, z: z + 28, w: 70, d: 8, h: 1.2, y0: 7, accent: true });
        break;
      case 'food':
        parts.push({ x: x - 18, z: z - 14, w: 30, d: 26, h: 9 }, { x: x + 18, z: z - 14, w: 30, d: 26, h: 9 }, { x: x, z: z + 16, w: 44, d: 24, h: 11 }, { x: x - 18, z: z - 14, w: 32, d: 28, h: 1.2, y0: 9, accent: true }, { x: x + 18, z: z - 14, w: 32, d: 28, h: 1.2, y0: 9, accent: true }, { x, z: z + 16, w: 46, d: 26, h: 1.2, y0: 11, accent: true });
        break;
      case 'shopping':
        parts.push({ x, z, w: 78, d: 66, h: 26 }, { x, z, w: 80, d: 68, h: 2, y0: 26, accent: true });
        break;
      case 'culture':
        parts.push({ x, z, w: 56, d: 52, h: 20 }, { x, z, w: 36, d: 36, h: 14, y0: 20, accent: true });
        break;
      case 'health':
        parts.push({ x, z, w: 72, d: 44, h: 38 }, { x: x - 20, z, w: 22, d: 46, h: 14, y0: 38 }, { x, z, w: 74, d: 46, h: 2.4, y0: 38, accent: true });
        break;
      case 'education':
        parts.push({ x: x - 16, z: z - 10, w: 44, d: 30, h: 24 }, { x: x + 16, z: z + 18, w: 52, d: 26, h: 20 }, { x: x - 16, z: z - 10, w: 46, d: 32, h: 1.6, y0: 24, accent: true });
        break;
      case 'stay':
        parts.push(tall ? { x, z, w: 44, d: 44, h: 130 } : { x, z, w: 38, d: 36, h: 34 }, tall ? { x, z, w: 30, d: 30, h: 58, y0: 130 } : { x, z, w: 40, d: 38, h: 2, y0: 34, accent: true });
        if (tall) parts.push({ x, z, w: 32, d: 32, h: 3, y0: 188, accent: true });
        break;
      case 'park':
        break;
    }
    if (parts.length) landmarks.push({ poi: poi.id, category, parts });
  }

  // --- street trees --------------------------------------------------------------------------
  for (const e of edges) {
    if (!e.avenue || e.bridge) continue;
    const a = nodes[e.a];
    const b = nodes[e.b];
    const steps = Math.floor(e.len / 26);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const px = a.x + (b.x - a.x) * t;
      const pz = a.z + (b.z - a.z) * t;
      for (const side of [-1, 1]) {
        const tx = e.horizontal ? px : px + side * 14;
        const tz = e.horizontal ? pz + side * 14 : pz;
        if (!inRiver(tx, tz, 6)) trees.push({ x: tx, z: tz, s: 0.7 + rng() * 0.5 });
      }
    }
  }

  return { half: HALF, lines: LINES, nodes, edges, lots, landmarks, parks, plazas, trees, pois };
}

export const city: City = generate();
export const poiById = new Map(city.pois.map((p) => [p.id, p]));
