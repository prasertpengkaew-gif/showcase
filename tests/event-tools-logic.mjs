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
  const load = (f) => server.ssrLoadModule(`/src/lib/${f}.ts`);

  // Live Q&A
  const qa = await load('liveQa');
  let s = qa.ask(qa.createQa(), '  When does   the keynote start? ', 1);
  ok(s.questions[0].text === 'When does the keynote start?', 'qa: question is tidied');
  ok(qa.ask(s, 'when does the keynote start?', 2) === s, 'qa: the same question is not added twice');
  ok(qa.ask(s, '   ', 2) === s && qa.ask(s, 'x'.repeat(141), 2) === s, 'qa: empty and too-long questions are refused');
  s = qa.ask(s, 'Is there parking?', 2);
  s = qa.vote(qa.vote(s, 2, 'u1'), 2, 'u1');
  ok(s.questions[1].voters.length === 1, 'qa: one vote per person');
  ok(qa.ranked(s)[0].id === 2, 'qa: most voted question comes first');
  ok(qa.showOnScreen(s, 99) === s && qa.showOnScreen(s, 1).onScreen === 1, 'qa: only an existing question goes on screen');
  let th = qa.ask(qa.createQa(), 'ที่จอดรถอยู่ที่ไหน', 1);
  th = qa.ask(th, 'ที่จอดรถเต็มไหม', 2);
  const words = qa.wordCounts(th).map((w) => w.word);
  ok(words.includes('จอด') || words.includes('ที่จอด') || words.includes('จอดรถ'), 'qa: word cloud understands Thai text');
  ok(qa.wordCounts(qa.ask(qa.createQa(), 'the parking and the parking', 1))[0].word === 'parking', 'qa: stop words are dropped and the top word is counted');

  let weighted = qa.ask(qa.ask(qa.createQa(), 'parking', 1), 'keynote', 2);
  weighted = qa.vote(qa.vote(weighted, 2, 'a'), 2, 'b');
  ok(qa.wordCounts(weighted)[0].word === 'keynote', 'qa: votes make the words of a question bigger in the cloud');

  // Lucky draw
  const ld = await load('luckyDraw');
  let d = ld.checkIn(ld.checkIn(ld.checkIn(ld.createDraw(), 'Nok'), ' nok '), 'Ploy');
  ok(d.entrants.length === 2, 'draw: the same name checks in once');
  const first = ld.draw(d, () => 0);
  const second = ld.draw(first.state, () => 0.99);
  ok(first.winner === 'Nok' && second.winner === 'Ploy', 'draw: rng picks from the pool');
  ok(ld.draw(second.state, () => 0).winner === null, 'draw: nobody wins twice, and an empty pool gives null');
  ok(ld.draw(d, () => 1).winner === 'Ploy', 'draw: an rng of 1 cannot step outside the pool');

  // Photo wall
  const pw = await load('photoWall');
  ok(pw.photoOk('image/jpeg', 1000) && !pw.photoOk('image/svg+xml', 1000) && !pw.photoOk('image/png', 6 * 1024 * 1024), 'wall: only small jpeg, png and webp photos');
  let w = pw.post(pw.createWall(), { name: '', text: 'Congrats!', photo: null }, 1);
  ok(w.posts[0].name === 'Guest', 'wall: a missing name becomes Guest');
  ok(pw.post(w, { name: 'A', text: '', photo: null }, 2) === w && pw.post(w, { name: 'A', text: 'x'.repeat(121), photo: null }, 2) === w, 'wall: an empty or too-long post is refused');
  w = pw.post(w, { name: 'B', text: 'Second', photo: null }, 2);
  ok(pw.onWall(w)[0].text === 'Second', 'wall: newest post first');
  w = pw.setHidden(w, 2, true);
  ok(pw.onWall(w).every((p) => p.id !== 2), 'wall: a hidden post leaves the screen');

  // Team game
  const tg = await load('teamGame');
  let g = tg.createGame('Me', ['Bo', 'Al']);
  g = tg.tap(tg.tap(g, 'you'), 'you');
  ok(tg.rankOf(g, 'you') === 1, 'game: tapping moves you up');
  g = tg.botTick(g, () => 0);
  ok(g.filter((p) => p.bot).every((p) => p.score === 1) && g[0].score === 2, 'game: only bots score on a bot tick');
  ok(tg.botTick(g, () => 0.99) === g || tg.botTick(g, () => 0.99).every((p, i) => p.score === g[i].score), 'game: a high roll scores nothing');
  ok(tg.board(g).map((p) => p.name).join() === 'Me,Al,Bo', 'game: ties are ordered by name');

  // Event assistant
  const ea = await load('eventAssistant');
  ok(ea.answerFor('Where can I park my car?')?.id === 'parking', 'assistant: English question');
  ok(ea.answerFor('ที่จอดรถอยู่ตรงไหน')?.id === 'parking', 'assistant: Thai question');
  ok(ea.answerFor('哪里可以停车')?.id === 'parking', 'assistant: Chinese question');
  ok(ea.answerFor('what is the meaning of life') === null, 'assistant: an unknown question is not guessed');
  ok(ea.FAQS.every((f) => ea.ASSIST_LANGS.every((l) => f.answer[l].length > 0)), 'assistant: every answer exists in every language');

  // Motion
  const mo = await load('motion');
  const a = new Uint8ClampedArray(16 * 16);
  const b = new Uint8ClampedArray(16 * 16);
  for (let y = 0; y < 8; y++) for (let x = 8; x < 16; x++) b[y * 16 + x] = 200;
  const cells = mo.movingCells(a, b, 16, 16, 8, 24);
  ok(cells.length === 1 && cells[0].x === 0.75 && cells[0].y === 0.25, 'motion: finds the one cell that changed');
  ok(mo.movingCells(a, a, 16, 16).length === 0, 'motion: an unchanged frame gives no cells');
  ok(mo.toGrey(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]))[0] === 255, 'motion: white converts to full grey');

  // Dashboard numbers
  const st = await load('eventStats');
  ok(st.total(1) === 2350, 'stats: day 1 total check-ins');
  ok(st.peakHour(1).hour === 14 && st.peakHour(2).hour === 14, 'stats: busiest hour');
  ok(st.topActivity(1).activity === 'booth' && st.topActivity(2).activity === 'game', 'stats: top activity changes by day');
  ok(st.reportCsv(1, (x) => x).split('\n').length === 16, 'stats: CSV has every hour and activity');

  // AR floor placement
  const fl = await load('arFloor');
  const down = fl.floorHit({ x: 0, y: -1, z: -1 }, 1.4);
  ok(down.hit && Math.abs(down.z - -1.5) < 1e-9 && down.x === 0, 'floor: a 45 degree look-down puts the spot as far ahead as the phone is high, kept at 1.5 m minimum');
  const far = fl.floorHit({ x: 0, y: -0.1, z: -1 }, 1.4, 1.5, 8);
  ok(far.hit && far.z === -8, 'floor: a shallow look is capped at 8 m');
  ok(!fl.floorHit({ x: 0, y: 0.5, z: -1 }, 1.4).hit && fl.floorHit({ x: 0, y: 0.5, z: -1 }, 1.4).z === -3, 'floor: looking above the horizon guesses 3 m ahead');
  const moved = fl.floorHitFrom({ x: 2, y: 1.4, z: -1 }, { x: 0, y: -1, z: -1 }, 0);
  ok(moved.hit && Math.abs(moved.x - 2) < 1e-9 && Math.abs(moved.z - -2.5) < 1e-9, 'floor: a camera that has walked away from the origin keeps its own start point');
  ok(!fl.floorHitFrom({ x: 0, y: 0.1, z: 0 }, { x: 0, y: -1, z: -1 }, 0.5).hit, 'floor: a camera below the floor plane never hits it');
  const side = fl.floorHit({ x: 1, y: -0.5, z: 0 }, 1.5);
  ok(Math.abs(side.x - 3) < 1e-9 && Math.abs(side.z) < 1e-9, 'floor: sideways look keeps its direction');
  ok(Math.abs(fl.yawFacingOrigin(0, -3)) < 1e-9 && Math.abs(fl.yawFacingOrigin(3, 0) - -Math.PI / 2) < 1e-9, 'floor: the gate turns to face the camera');
  const cr = fl.coverRect(1920, 1080, 390, 800);
  ok(Math.abs(cr.sw / cr.sh - 390 / 800) < 1e-9 && cr.sx > 0 && cr.sy === 0, 'cover: a wide video is cropped at the sides to fill a tall screen');
} finally {
  await server.close();
}
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('All checks passed');
