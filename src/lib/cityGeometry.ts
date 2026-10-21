import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CATEGORY_COLOR, city, riverZ, RIVER_HALF, type Box, type Category, type Rect } from '../data/cityMap';
import type { WalkPiece } from './cityGraph';

/** Small deterministic PRNG for textures and colour variation. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- window textures -------------------------------------------------------------------------
/** One tile = 4 windows across by 4 floors = 16 m × 14 m of façade. */
export const TILE_W = 16;
export const TILE_H = 14;

/** Daytime façade (dark glass in a pale wall) and night-time glow (lit windows) from the same layout. */
export function makeWindowTextures(): { map: Texture; emissive: Texture } {
  const size = 256;
  const cell = size / 4;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    return canvas;
  };
  const wall = make();
  const glow = make();
  const w = wall.getContext('2d')!;
  const g = glow.getContext('2d')!;
  w.fillStyle = '#ffffff';
  w.fillRect(0, 0, size, size);
  g.fillStyle = '#000000';
  g.fillRect(0, 0, size, size);
  const rng = mulberry32(7);
  const lit = ['#ffe6b3', '#ffdca0', '#fff0d6', '#d5eaff'];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * cell + cell * 0.22;
      const y = r * cell + cell * 0.26;
      w.fillStyle = '#a3b4cc';
      w.fillRect(x, y, cell * 0.56, cell * 0.44);
      if (rng() < 0.3) {
        g.fillStyle = lit[Math.floor(rng() * lit.length)];
        g.fillRect(x, y, cell * 0.56, cell * 0.44);
      }
    }
  }
  const finish = (canvas: HTMLCanvasElement) => {
    const t = new CanvasTexture(canvas);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { map: finish(wall), emissive: finish(glow) };
}

// --- buildings -------------------------------------------------------------------------------
const BODY: Record<Category, string> = {
  transit: '#e3eaf5',
  food: '#fbebc8',
  shopping: '#f6d3e4',
  culture: '#e4daf6',
  health: '#ffffff',
  education: '#d3eaf8',
  stay: '#cdeee9',
  park: '#ffffff',
};

function box(b: Box, color: Color, rng: () => number): BufferGeometry {
  const g = new BoxGeometry(b.w, b.h, b.d);
  const uv = g.attributes.uv;
  const du = rng();
  const dv = rng();
  // Faces come as +x, -x, +y, -y, +z, -z with four vertices each. Walls repeat the window tile;
  // roofs and floors all sample one blank corner of it so they stay plain and unlit.
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      if (f < 2) uv.setXY(i, (uv.getX(i) * b.d) / TILE_W + du, (uv.getY(i) * b.h) / TILE_H + dv);
      else if (f < 4) uv.setXY(i, 0, 0);
      else uv.setXY(i, (uv.getX(i) * b.w) / TILE_W + du, (uv.getY(i) * b.h) / TILE_H + dv);
    }
  }
  g.translate(b.x, (b.y0 ?? 0) + b.h / 2, b.z);
  const count = g.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}

/** Every building of the city as one mesh (about 800 boxes), coloured by height and by kind of landmark. */
export function buildBuildings(): BufferGeometry {
  const rng = mulberry32(11);
  const parts: BufferGeometry[] = [];
  const low = new Color('#e4e9f1');
  const high = new Color('#b4c3da');
  for (const lot of city.lots) {
    const c = low.clone().lerp(high, Math.min(1, lot.h / 150));
    c.offsetHSL(0, 0, (lot.tone - 0.5) * 0.06);
    parts.push(box(lot, c, rng));
  }
  for (const lm of city.landmarks) {
    const body = new Color(BODY[lm.category]);
    const accent = new Color(CATEGORY_COLOR[lm.category]);
    for (const part of lm.parts) parts.push(box(part, part.accent ? accent : body, rng));
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  merged.computeBoundingSphere();
  return merged;
}

// --- flat things: roads, markings, water, parks ---------------------------------------------------
class Flat {
  positions: number[] = [];
  colors: number[] = [];
  /** An axis-aligned rectangle at height y. */
  rect(x0: number, z0: number, x1: number, z1: number, y: number, color?: Color) {
    const p = this.positions;
    p.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    if (color) for (let i = 0; i < 6; i++) this.colors.push(color.r, color.g, color.b);
  }
  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    if (this.colors.length) g.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    g.computeVertexNormals();
    return g;
  }
}

const roadWidth = (avenue: boolean) => (avenue ? 20 : 10);

export interface RoadGeometry {
  roads: BufferGeometry;
  bridges: BufferGeometry;
  parapets: BufferGeometry;
  markings: BufferGeometry;
}

export function buildRoads(): RoadGeometry {
  const roads = new Flat();
  const bridges = new Flat();
  const markings = new Flat();
  const parapets: BufferGeometry[] = [];
  for (const e of city.edges) {
    const a = city.nodes[e.a];
    const b = city.nodes[e.b];
    const w = roadWidth(e.avenue) / 2;
    const x0 = Math.min(a.x, b.x) - (e.horizontal ? w : w);
    const x1 = Math.max(a.x, b.x) + w;
    const z0 = Math.min(a.z, b.z) - w;
    const z1 = Math.max(a.z, b.z) + w;
    if (e.bridge) {
      bridges.rect(Math.min(a.x, b.x) - w, Math.min(a.z, b.z), Math.max(a.x, b.x) + w, Math.max(a.z, b.z), 1.4);
      for (const side of [-1, 1]) {
        const rail = new BoxGeometry(1.2, 1.4, e.len);
        rail.translate(a.x + side * w, 1.4 + 0.7, (a.z + b.z) / 2);
        parapets.push(rail);
      }
    } else {
      roads.rect(x0, z0, x1, z1, 0.4);
    }
    // Dashed centre line on the avenues.
    if (e.avenue) {
      const len = e.len;
      for (let s = 6; s + 7 <= len - 4; s += 16) {
        const t0 = s / len;
        const t1 = (s + 7) / len;
        const ax = a.x + (b.x - a.x) * t0;
        const az = a.z + (b.z - a.z) * t0;
        const bx = a.x + (b.x - a.x) * t1;
        const bz = a.z + (b.z - a.z) * t1;
        const y = e.bridge ? 1.5 : 0.55;
        if (e.horizontal) markings.rect(Math.min(ax, bx), az - 0.45, Math.max(ax, bx), az + 0.45, y);
        else markings.rect(ax - 0.45, Math.min(az, bz), ax + 0.45, Math.max(az, bz), y);
      }
    }
  }
  return {
    roads: roads.geometry(),
    bridges: bridges.geometry(),
    parapets: parapets.length ? mergeGeometries(parapets, false) : new BufferGeometry(),
    markings: markings.geometry(),
  };
}

/** The river as a strip that follows its centre line, extended beyond the city so it runs off into the fog. */
export function buildWater(): BufferGeometry {
  const pos: number[] = [];
  const step = 24;
  for (let x = -1400; x < 1400; x += step) {
    const x2 = x + step;
    const za = riverZ(x);
    const zb = riverZ(x2);
    pos.push(x, 0.15, za - RIVER_HALF, x, 0.15, za + RIVER_HALF, x2, 0.15, zb + RIVER_HALF, x, 0.15, za - RIVER_HALF, x2, 0.15, zb + RIVER_HALF, x2, 0.15, zb - RIVER_HALF);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function buildRects(rects: Rect[], y: number): BufferGeometry {
  const f = new Flat();
  for (const r of rects) f.rect(r.x - r.w / 2, r.z - r.d / 2, r.x + r.w / 2, r.z + r.d / 2, y);
  return f.geometry();
}

const BAND_COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6'];

/** The streets within walking distance, coloured by minutes. */
export function buildWalkshed(pieces: WalkPiece[]): BufferGeometry {
  const f = new Flat();
  const colors = BAND_COLORS.map((c) => new Color(c));
  for (const p of pieces) {
    const half = 3.4;
    const len = 2.7;
    const c = colors[p.band];
    if (p.horizontal) f.rect(p.x - len, p.z - half, p.x + len, p.z + half, 0.9, c);
    else f.rect(p.x - half, p.z - len, p.x + half, p.z + len, 0.9, c);
  }
  return f.geometry();
}
