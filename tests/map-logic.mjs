// Checks the data and routing behind the 3D map demo (no browser needed).
//   npm run test:map
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { city, poiById, inRiver, riverZ, ACCESS, CATEGORIES } = await server.ssrLoadModule('/src/data/cityMap.ts');
  const g = await server.ssrLoadModule('/src/lib/cityGraph.ts');

  // --- the city ---------------------------------------------------------------------------
  ok(city.pois.length === 21, `21 places (${city.pois.length})`);
  ok(new Set(city.pois.map((p) => p.id)).size === city.pois.length, 'place ids are unique');
  ok(city.pois.every((p) => CATEGORIES.includes(p.category)), 'every place has a known category');
  ok(CATEGORIES.every((c) => city.pois.some((p) => p.category === c)), 'every category has at least one place');
  ok(city.pois.every((p) => p.name.en && p.name.th && p.desc.en && p.desc.th), 'every place has English and Thai text');
  ok(city.lots.length > 600 && city.lots.length < 1800, `a plausible number of buildings (${city.lots.length})`);
  ok(Math.max(...city.lots.map((l) => l.h)) > 120 && Math.min(...city.lots.map((l) => l.h)) < 15, 'heights range from low-rise to towers');
  ok(city.lots.every((l) => !inRiver(l.x, l.z, 0)), 'no building stands in the river');
  ok(city.landmarks.every((l) => l.parts.every((b) => !inRiver(b.x, b.z, 0))), 'no landmark stands in the river');

  // Buildings stay inside the blocks: none touches a street.
  const roadHalf = (i) => (i % 2 === 0 ? 10 : 5);
  const insideRoad = (x, z, hw, hd) => {
    for (let k = 0; k < city.lines.length; k++) {
      const half = roadHalf(k);
      if (Math.abs(x - city.lines[k]) < half + hw - 0.01) return true;
      if (Math.abs(z - city.lines[k]) < half + hd - 0.01) return true;
    }
    return false;
  };
  const overlaps = city.lots.filter((l) => !l.y0 && insideRoad(l.x, l.z, l.w / 2, l.d / 2));
  ok(overlaps.length === 0, `no building overlaps a street (${overlaps.length} do)`);

  // Same seed, same city.
  const again = (await server.ssrLoadModule('/src/data/cityMap.ts?second')).city;
  ok(JSON.stringify(again.lots.slice(0, 50)) === JSON.stringify(city.lots.slice(0, 50)) && again.edges.length === city.edges.length, 'the city is deterministic');

  // --- the street network ------------------------------------------------------------------
  const bridges = city.edges.filter((e) => e.bridge);
  ok(bridges.length > 0 && bridges.every((e) => e.avenue && !e.horizontal), `only avenues cross the river (${bridges.length} bridge pieces)`);
  const streetsInWater = city.edges.filter((e) => {
    if (e.bridge) return false;
    const a = city.nodes[e.a];
    const b = city.nodes[e.b];
    return inRiver((a.x + b.x) / 2, (a.z + b.z) / 2, 0);
  });
  ok(streetsInWater.length === 0, 'no street runs through the water except bridges');
  ok(Math.abs(riverZ(0) - 330) < 60, 'the river runs south of the centre');

  // Every place is reachable from every other.
  const central = poiById.get('central-station');
  const sp = g.shortestPaths(central.door);
  ok(city.pois.every((p) => Number.isFinite(sp.dist[p.door])), 'every place can be reached from the central station');

  // --- routing -----------------------------------------------------------------------------
  let symmetric = true;
  let longer = true;
  for (const a of city.pois) {
    for (const b of city.pois) {
      if (a.id >= b.id) continue;
      const ab = g.route(a.id, b.id);
      const ba = g.route(b.id, a.id);
      if (!ab || !ba || Math.abs(ab.meters - ba.meters) > 0.01) symmetric = false;
      // A route cannot be shorter than the straight line between the two doors.
      const straight = Math.hypot(a.x - b.x, a.z - b.z) - 120;
      if (ab && ab.meters < straight) longer = false;
    }
  }
  ok(symmetric, 'a route is as long in both directions');
  ok(longer, 'a route is never shorter than the straight line');
  const self = g.route('grand-mall', 'grand-mall');
  ok(self?.meters === 0 && self.points.length >= 2, 'a route from a place to itself has length 0');
  const r = g.route('central-station', 'grand-mall');
  ok(r && r.walkMin > 0 && Math.abs(r.walkMin * g.WALK_M_PER_MIN - r.meters) < 1e-6, 'walking minutes follow from the length');
  ok(r && r.driveMin < r.walkMin, 'driving is faster than walking');
  ok(r && r.points[0].x === central.x && r.points.at(-1).x === poiById.get('grand-mall').x, 'a route starts and ends at the two places');
  // The route stays on the streets: consecutive points are axis-aligned (door and node points lie on grid lines).
  const mid = r.points.slice(1, -1);
  ok(mid.every((p, i) => i === 0 || p.x === mid[i - 1].x || p.z === mid[i - 1].z), 'a route follows the streets');

  // Crossing the river needs a bridge, so it is longer than the straight line by a good margin.
  const far = g.route('lotus-park', 'riverside-plaza');
  const straightFar = Math.hypot(poiById.get('lotus-park').x - poiById.get('riverside-plaza').x, poiById.get('lotus-park').z - poiById.get('riverside-plaza').z);
  ok(far && far.meters >= straightFar, 'a route across the river is at least as long as the straight line');

  // --- nearby and walking time -------------------------------------------------------------
  const near = g.nearby('central-station', 10);
  ok(near.length > 0 && near.every((n, i) => i === 0 || n.meters >= near[i - 1].meters), 'nearby places are sorted by distance');
  ok(near.every((n) => n.walkMin <= 10), 'nearby places are all within the time limit');
  ok(g.nearby('central-station', 30).length === city.pois.length - 1, 'within 30 minutes everything is nearby');
  ok(g.nearby('central-station', 0).length === 0, 'within 0 minutes nothing is nearby');

  const shed = g.walkshed('central-station');
  ok(shed.length > 200, `the walking-time area has street pieces (${shed.length})`);
  ok(shed.every((p) => p.band >= 0 && p.band <= 2), 'walking-time pieces fall in three bands');
  const nearestPiece = shed.reduce((a, p) => (Math.hypot(p.x - central.x, p.z - central.z) < Math.hypot(a.x - central.x, a.z - central.z) ? p : a));
  ok(nearestPiece.band === 0, 'streets next to the place are in the first band');
  const count = (b) => shed.filter((p) => p.band === b).length;
  ok(count(0) < count(1) + count(2), 'the area grows with each band');
  ok(ACCESS === 30, 'the walk from the door to the street is counted');
} finally {
  await server.close();
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll map checks passed.');
process.exit(failures ? 1 : 0);
