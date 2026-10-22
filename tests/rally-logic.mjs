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
  const r = await server.ssrLoadModule('/src/lib/stampRally.ts');
  let s = r.createRally();
  s = r.scan(r.scan(s, 'a'), 'a');
  ok(s.stamps.length === 1, 'scanning the same booth twice counts once');
  ok(!r.hasReward(s), 'one stamp is not enough for the prize');
  for (const b of ['b', 'c', 'd']) s = r.scan(s, b);
  ok(r.hasReward(s), `${r.REWARD_AT} stamps win the prize`);
  ok(r.addLead(s, 'a', 'Nok', 'nok@example.com', false, 1) === s, 'no lead without consent');
  ok(r.addLead(s, 'a', 'Nok', 'not-an-email', true, 1) === s, 'no lead with a bad email');
  ok(r.addLead(s, 'a', '  ', 'nok@example.com', true, 1) === s, 'no lead without a name');
  let l = r.addLead(s, 'a', 'Nok', ' Nok@Example.com ', true, 1);
  ok(l.leads.length === 1 && l.leads[0].email === 'nok@example.com', 'lead is trimmed and lower-cased');
  ok(r.addLead(l, 'a', 'Nok', 'nok@example.com', true, 2) === l, 'same email at the same booth is not added twice');
  l = r.addLead(l, 'b', 'Nok', 'nok@example.com', true, 3);
  ok(r.leadsPerBooth(l).a === 1 && r.leadsPerBooth(l).b === 1 && r.leadsPerBooth(l).c === 0, 'leads are counted per booth');
  const csv = r.leadsCsv(r.addLead(r.createRally(), 'a', '=HYPERLINK("x")', 'x@y.co', true, 0), (b) => `Booth ${b}`);
  ok(csv.includes(`"'=HYPERLINK(""x"")"`), 'CSV neutralises spreadsheet formulas and doubles quotes');
} finally {
  await server.close();
}
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('All checks passed');
