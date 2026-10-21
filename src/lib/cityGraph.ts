import { ACCESS, city, poiById, type City, type Poi } from '../data/cityMap';

/** Walking speed (m per minute) and driving speed used for the estimates on the sample city. */
export const WALK_M_PER_MIN = 80;
export const DRIVE_M_PER_MIN = 500;

interface Link {
  to: number;
  len: number;
}

export interface Graph {
  adjacency: Link[][];
}

export function buildGraph(c: City = city): Graph {
  const adjacency: Link[][] = c.nodes.map(() => []);
  for (const e of c.edges) {
    adjacency[e.a].push({ to: e.b, len: e.len });
    adjacency[e.b].push({ to: e.a, len: e.len });
  }
  return { adjacency };
}

export const graph = buildGraph();

export interface Paths {
  dist: number[];
  prev: number[];
}

/** Shortest distances (metres) from `source` along the streets (Dijkstra; the graph is small). */
export function shortestPaths(source: number, offset = 0, g: Graph = graph): Paths {
  const n = g.adjacency.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[source] = offset;
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true;
    for (const { to, len } of g.adjacency[u]) {
      if (dist[u] + len < dist[to]) {
        dist[to] = dist[u] + len;
        prev[to] = u;
      }
    }
  }
  return { dist, prev };
}

export interface Route {
  /** Total length in metres, including the walk from each front door to the street. */
  meters: number;
  walkMin: number;
  driveMin: number;
  /** Points to draw: from the start place, along the streets, to the end place. */
  points: { x: number; z: number }[];
}

/**
 * Route between two places over the street network, or null if they are not connected.
 * `paths`, if given, must be shortestPaths(from.door) (offset 0), so one search can serve several calls.
 */
export function route(fromId: string, toId: string, paths?: Paths): Route | null {
  const from = poiById.get(fromId);
  const to = poiById.get(toId);
  if (!from || !to) return null;
  const sp = paths ?? shortestPaths(from.door);
  if (!Number.isFinite(sp.dist[to.door])) return null;
  const chain: number[] = [];
  for (let at = to.door; at !== -1; at = sp.prev[at]) chain.push(at);
  chain.reverse();
  const meters = from.id === to.id ? 0 : sp.dist[to.door] + 2 * ACCESS;
  const points = [
    { x: from.x, z: from.z },
    ...chain.map((i) => ({ x: city.nodes[i].x, z: city.nodes[i].z })),
    { x: to.x, z: to.z },
  ];
  return { meters, walkMin: meters / WALK_M_PER_MIN, driveMin: meters / DRIVE_M_PER_MIN, points };
}

export interface NearbyPlace {
  poi: Poi;
  meters: number;
  walkMin: number;
}

/** Places within `maxMin` minutes' walk of a place, nearest first. `paths` as for route(). */
export function nearby(fromId: string, maxMin: number, paths?: Paths): NearbyPlace[] {
  const from = poiById.get(fromId);
  if (!from) return [];
  const sp = paths ?? shortestPaths(from.door);
  const out: NearbyPlace[] = [];
  for (const poi of city.pois) {
    if (poi.id === fromId) continue;
    const d = sp.dist[poi.door];
    if (!Number.isFinite(d)) continue;
    const meters = d + 2 * ACCESS;
    if (meters / WALK_M_PER_MIN <= maxMin) out.push({ poi, meters, walkMin: meters / WALK_M_PER_MIN });
  }
  return out.sort((a, b) => a.meters - b.meters);
}

export const WALK_BANDS = [5, 10, 15] as const;

export interface WalkPiece {
  x: number;
  z: number;
  horizontal: boolean;
  /** 0 = within 5 minutes, 1 = within 10, 2 = within 15. */
  band: number;
}

/**
 * Street pieces coloured by walking time from a place: for every street, 5 m pieces tagged with the
 * band (0 = within 5 min, 1 = within 10, 2 = within 15) they fall in. Pieces beyond 15 minutes are left out.
 */
export function walkshed(fromId: string): WalkPiece[] {
  const from = poiById.get(fromId);
  if (!from) return [];
  const sp = shortestPaths(from.door, ACCESS);
  const maxM = WALK_BANDS[WALK_BANDS.length - 1] * WALK_M_PER_MIN;
  const pieces: WalkPiece[] = [];
  const PIECE = 5;
  for (const e of city.edges) {
    const dA = sp.dist[e.a];
    const dB = sp.dist[e.b];
    if (!Number.isFinite(dA) && !Number.isFinite(dB)) continue;
    const a = city.nodes[e.a];
    const b = city.nodes[e.b];
    const count = Math.max(1, Math.round(e.len / PIECE));
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      const s = t * e.len;
      const d = Math.min(dA + s, dB + (e.len - s));
      if (d > maxM) continue;
      const band = WALK_BANDS.findIndex((m) => d / WALK_M_PER_MIN <= m);
      pieces.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, horizontal: e.horizontal, band });
    }
  }
  return pieces;
}
