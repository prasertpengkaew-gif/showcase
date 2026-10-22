// Checks the shipment status, delay and KPI logic behind the TMS demo (no browser needed).
//   npm run test:tms
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
  const t = await server.ssrLoadModule('/src/lib/tms.ts');
  const S = t.SAMPLE_SHIPMENTS;
  const byId = (list, id) => list.find((s) => s.id === id);
  const status = (list, id) => t.statusOf(byId(list, id));

  ok(new Set(S.map((s) => s.id)).size === S.length, 'shipment ids are unique');
  ok(S.every((s) => Object.values(s.origin).every(Boolean) && Object.values(s.via).every(Boolean) && Object.values(s.destination).every(Boolean)), 'every place has Thai and English names');
  ok(t.STATUSES.every((st) => S.some((s) => t.statusOf(s) === st)), 'the starting board shows every status');

  // Starting state
  ok(status(S, 'TH-1001') === 'inTransit' && t.delayMinutes(byId(S, 'TH-1001')) === 18, 'a trip 18 minutes behind is still in transit');
  ok(status(S, 'TH-1002') === 'delayed' && t.delayMinutes(byId(S, 'TH-1002')) === 60, 'a trip an hour behind is delayed');
  ok(status(S, 'TH-1003') === 'delivered' && t.progress(byId(S, 'TH-1003')) === 1, 'a finished trip is delivered at 100%');
  ok(status(S, 'TH-1004') === 'scheduled' && t.progress(byId(S, 'TH-1004')) === 0, 'a trip that has not left is scheduled at 0%');
  ok(S.every((s) => t.progress(s) >= 0 && t.progress(s) <= 1), 'progress stays between 0 and 1');

  // The delay threshold is inclusive at 30 minutes
  const edge = { ...byId(S, 'TH-1005'), speed: 0.9, elapsedH: 5 };
  ok(t.delayMinutes(edge) === 30 && t.statusOf(edge) === 'delayed', 'exactly 30 minutes behind counts as delayed');

  // Starting KPIs: two delivered, both on time
  const k0 = t.kpis(S);
  ok(k0.delivered === 2 && k0.onTimeRate === 100, `starting on-time rate is 100% (${k0.onTimeRate})`);
  ok(k0.active === 4 && k0.delayed === 1, `4 active, 1 delayed (${k0.active}, ${k0.delayed})`);
  ok(t.kpis([]).onTimeRate === null, 'on-time rate is empty when nothing is delivered');

  // Time passes
  const later = t.advance(S, 3);
  ok(S[0].elapsedH === 6, 'advance does not change the original list');
  ok(status(later, 'TH-1004') === 'inTransit', 'a scheduled trip departs once its start time passes');
  ok(status(later, 'TH-1002') === 'delayed', 'a late trip is still on the road after 3 hours');
  const later5 = t.advance(S, 5);
  ok(status(later5, 'TH-1002') === 'delivered' && t.delayMinutes(byId(later5, 'TH-1002')) === 130, 'a late trip arrives late (130 min)');
  const k1 = t.kpis(later5);
  ok(k1.onTimeRate !== null && k1.onTimeRate < 100, `a late arrival lowers the on-time rate (${k1.onTimeRate}%)`);
  ok(t.progress(byId(t.advance(S, 100), 'TH-1001')) === 1 && t.delayMinutes(byId(t.advance(S, 100), 'TH-1001')) === t.delayMinutes(byId(t.advance(S, 200), 'TH-1001')), 'a delivered trip stops changing');
  ok(t.etaHours(byId(S, 'TH-1003')) === 0, 'a delivered trip has no time left');
} finally {
  await server.close();
}
if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All checks passed');
