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
  const v = await server.ssrLoadModule('/src/lib/gestureVote.ts');
  const up = { gesture: 'Thumb_Up', score: 0.9 };
  const down = { gesture: 'Thumb_Down', score: 0.9 };
  // The camera delivers a frame every few tens of milliseconds; feed frames 100 ms apart (inside the grace period).
  const run = (state, obs, from, to) => {
    let cur = state;
    let voted = null;
    for (let t = from; t <= to; t += 100) {
      const r = v.step(cur, obs, t);
      cur = r.state;
      voted = r.voted ?? voted;
    }
    return { state: cur, voted };
  };
  let s = v.createVoteState();
  ok(run(s, up, 0, v.HOLD_MS - 100).voted === null, 'no vote before HOLD_MS');
  const cast = run(s, up, 0, v.HOLD_MS);
  ok(cast.voted === 'up' && cast.state.up === 1, 'exactly one vote at HOLD_MS');
  ok(run(cast.state, up, v.HOLD_MS + 100, v.HOLD_MS + 1000).state.up === 1, 'a thumb that stays up is not counted twice');
  s = v.step(v.createVoteState(), up, 0).state;
  ok(v.step(s, down, 1000).voted === null && v.step(s, down, 1000).state.heldSince === 1000, 'changing gesture restarts the hold');
  ok(v.step(v.createVoteState(), { gesture: 'Thumb_Up', score: v.MIN_SCORE - 0.001 }, 0).state.held === null, 'score below MIN_SCORE is ignored');
  ok(v.step(v.createVoteState(), { gesture: 'Open_Palm', score: 1 }, 0).state.held === null, 'unrelated gesture is ignored');
  s = run(v.createVoteState(), up, 0, 100).state;
  const flicker = v.step(s, null, 250).state;
  ok(v.step(flicker, up, 350).state.heldSince === 0, 'brief flicker preserves hold');
  const lost = v.step(s, null, 401).state;
  ok(v.step(lost, up, 402).state.heldSince === 402, 'long loss clears hold');
  s = v.step(v.createVoteState(), up, 0).state;
  const resumed = v.step(s, up, 5000);
  ok(resumed.voted === null && resumed.state.heldSince === 5000, 'the same gesture after a long gap starts a fresh hold');
  s = cast.state;
  ok(v.step(s, down, s.cooldownUntil - 1).voted === null && v.step(s, down, s.cooldownUntil).state.held === 'down', 'cooldown blocks gestures and then allows them');
  const original = v.createVoteState();
  v.step(original, up, 0);
  ok(original.held === null && original.up === 0, 'step does not mutate input');
  s = v.castVote(original, 'up', 0);
  ok(v.castVote(s, 'down', 100) === s && s.up === 1 && s.down === 0, 'button cooldown blocks a double click');
  const shareState = { ...original, up: 1, down: 2 };
  ok(v.shares(shareState).up + v.shares(shareState).down === 100, 'shares round 1/2 to 100');
  ok(v.shares({ ...original, up: 1, down: 2 }).up === 33 && v.shares({ ...original, up: 1, down: 2 }).down === 67, 'largest remainder gives 33/67');
  ok(v.shares({ ...original, up: 1, down: 1 }).up + v.shares({ ...original, up: 1, down: 1 }).down === 100, 'equal split rounds to 100');
  ok(v.shares(original).up === 0 && v.shares(original).down === 0, 'no votes share zero');
  ok(v.resetVotes({ ...s, down: 4 }).up === 0 && v.resetVotes({ ...s, down: 4 }).down === 0 && v.resetVotes(s).cooldownUntil === 0, 'reset clears totals, hold and cooldown');
} finally {
  await server.close();
}
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('All checks passed');
