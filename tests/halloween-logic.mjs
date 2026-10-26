// Logic checks for the Halloween face filter.
//   npm run test:halloween
//
// The drawing runs against a mock 2D context (no browser, same as the other logic tests).
// The mock records device-space ink and the transform stack so a look that throws, leaks
// a save/restore, or a frame that misses the canvas fails here.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const multiply = (m1, m2) => {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

function mock2d(width, height) {
  const ctx = {
    canvas: { width, height },
    ctm: [1, 0, 0, 1, 0, 0],
    stack: [],
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    saves: 0,
    ink: [],
    texts: [],
    path: [],
  };
  const pt = (x, y) => {
    const [a, b, c, d, e, f] = ctx.ctm;
    return { x: a * x + c * y + e, y: b * x + d * y + f };
  };
  const mark = (x, y) => ctx.ink.push(pt(x, y));
  const apply = (m) => { ctx.ctm = multiply(ctx.ctm, m); };
  const gradient = () => ({
    addColorStop(offset) {
      if (!(offset >= 0 && offset <= 1)) throw new DOMException('The offset provided is out of range', 'IndexSizeError');
    },
  });
  Object.assign(ctx, {
    save() {
      ctx.saves++;
      ctx.stack.push({
        ctm: ctx.ctm.slice(),
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        lineCap: ctx.lineCap,
        lineJoin: ctx.lineJoin,
        font: ctx.font,
        textAlign: ctx.textAlign,
        textBaseline: ctx.textBaseline,
        globalAlpha: ctx.globalAlpha,
        globalCompositeOperation: ctx.globalCompositeOperation,
      });
    },
    restore() {
      const prev = ctx.stack.pop();
      if (!prev) throw new Error('restore without a matching save');
      ctx.ctm = prev.ctm;
      ctx.fillStyle = prev.fillStyle;
      ctx.strokeStyle = prev.strokeStyle;
      ctx.lineWidth = prev.lineWidth;
      ctx.lineCap = prev.lineCap;
      ctx.lineJoin = prev.lineJoin;
      ctx.font = prev.font;
      ctx.textAlign = prev.textAlign;
      ctx.textBaseline = prev.textBaseline;
      ctx.globalAlpha = prev.globalAlpha;
      ctx.globalCompositeOperation = prev.globalCompositeOperation;
    },
    beginPath() { ctx.path = []; },
    moveTo(x, y) { mark(x, y); ctx.path.push([x, y]); },
    lineTo(x, y) { mark(x, y); ctx.path.push([x, y]); },
    closePath() { if (ctx.path.length) mark(ctx.path[0][0], ctx.path[0][1]); },
    quadraticCurveTo(cpx, cpy, x, y) { mark(cpx, cpy); mark(x, y); },
    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { mark(cp1x, cp1y); mark(cp2x, cp2y); mark(x, y); },
    rect(x, y, w, h) { [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].forEach(([px, py]) => mark(px, py)); },
    fillRect(x, y, w, h) { ctx.rect(x, y, w, h); },
    strokeRect(x, y, w, h) { ctx.rect(x, y, w, h); },
    ellipse(x, y, rx, ry, rotation) {
      if (rx < 0 || ry < 0) throw new DOMException('The radius provided is negative', 'IndexSizeError');
      const c = Math.cos(rotation);
      const s = Math.sin(rotation);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const lx = Math.cos(a) * rx;
        const ly = Math.sin(a) * ry;
        mark(x + lx * c - ly * s, y + lx * s + ly * c);
      }
    },
    arc(x, y, r) {
      if (r < 0) throw new DOMException('The radius provided is negative', 'IndexSizeError');
      ctx.ellipse(x, y, r, r, 0);
    },
    fill() {},
    stroke() {},
    clip() {},
    translate(x, y) { apply([1, 0, 0, 1, x, y]); },
    rotate(a) { const c = Math.cos(a); const s = Math.sin(a); apply([c, s, -s, c, 0, 0]); },
    scale(x, y) { apply([x, 0, 0, y, 0, 0]); },
    setTransform(a, b, c, d, e, f) { ctx.ctm = [a, b, c, d, e, f]; },
    transform(a, b, c, d, e, f) { apply([a, b, c, d, e, f]); },
    createLinearGradient() { return gradient(); },
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      if (r0 < 0 || r1 < 0) throw new DOMException('The radius provided is negative', 'IndexSizeError');
      return gradient();
    },
    measureText(text) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? 16);
      return { width: [...String(text)].length * size * 0.56 };
    },
    fillText(text, x, y) {
      const width = ctx.measureText(text).width;
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(ctx.font)?.[1] ?? 16);
      let left = x;
      let top = y;
      if (ctx.textAlign === 'center') left -= width / 2;
      else if (ctx.textAlign === 'right' || ctx.textAlign === 'end') left -= width;
      if (ctx.textBaseline === 'middle') top -= size / 2;
      else if (ctx.textBaseline === 'bottom' || ctx.textBaseline === 'alphabetic') top -= size;
      const box = { left, top, right: left + width, bottom: top + size, text: String(text) };
      [[box.left, box.top], [box.right, box.top], [box.left, box.bottom], [box.right, box.bottom]].forEach(([px, py]) => mark(px, py));
      ctx.texts.push({ text: box.text, ctm: ctx.ctm.slice(), box });
    },
  });
  return ctx;
}

const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const OUTER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];

/** A dense face-mesh stand-in. Coordinates are normalised, the same way MediaPipe reports them. */
function makeFace(w, h, cx = 0.5, cy = 0.46, fw = 0.34, fh = 0.42) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: cy, z: 0 }));
  const set = (i, x, y) => { pts[i] = { x, y, z: 0 }; };
  OVAL.forEach((i, n) => {
    const a = -Math.PI / 2 + (n / OVAL.length) * Math.PI * 2;
    set(i, cx + Math.cos(a) * fw * 0.5, cy + Math.sin(a) * fh * 0.5);
  });
  const put = (i, tx, ty) => set(i, cx + tx * fw, cy + ty * fh);
  [[33, -0.22, -0.05], [133, -0.08, -0.05], [362, 0.08, -0.05], [263, 0.22, -0.05],
    [468, -0.15, -0.05], [473, 0.15, -0.05],
    [159, -0.15, -0.09], [145, -0.15, -0.01], [386, 0.15, -0.09], [374, 0.15, -0.01],
    [61, -0.16, 0.16], [291, 0.16, 0.16], [13, 0, 0.13], [14, 0, 0.2], [1, 0, 0.02],
  ].forEach(([i, tx, ty]) => put(i, tx, ty));
  [246, 161, 160, 158, 157, 173].forEach((i, n) => put(i, -0.26 + n * 0.04, -0.14));
  [466, 388, 387, 385, 384, 398].forEach((i, n) => put(i, 0.06 + n * 0.04, -0.14));
  OUTER_LIP.forEach((i, n) => {
    const a = -Math.PI / 2 + (n / OUTER_LIP.length) * Math.PI * 2;
    put(i, Math.cos(a) * 0.16, 0.16 + Math.sin(a) * 0.06);
  });
  // Keep the layout landmarks that the lip loop just moved.
  put(61, -0.16, 0.16);
  put(291, 0.16, 0.16);
  put(13, 0, 0.13);
  put(14, 0, 0.2);
  return pts;
}

function outside(ctx, w, h) {
  const pad = 1.5;
  return ctx.ink.filter((p) => p.x < -pad || p.y < -pad || p.x > w + pad || p.y > h + pad);
}

const sameMatrix = (a, b) => a.length === b.length && a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const v = await server.ssrLoadModule('/src/lib/halloweenFace.ts');
  ok(v.HALLOWEEN_LOOKS.join() === 'pumpkin,skull,witch,vampire', 'four switchable looks');

  const draw = (ctx, faces, look) => {
    ctx.saves = 0;
    ctx.ink = [];
    ctx.texts = [];
    v.drawHalloweenFaces(ctx, faces, look);
  };

  for (const look of v.HALLOWEEN_LOOKS) {
    const ctx = mock2d(1280, 720);
    let threw = false;
    try { draw(ctx, [makeFace(1280, 720)], look); } catch (error) { threw = true; console.log(`  ${look}: ${error.message}`); }
    ok(!threw && ctx.saves > 0 && ctx.stack.length === 0, `${look} draws one face without throwing or leaking save/restore`);
    ok(ctx.globalCompositeOperation === 'source-over', `${look} does not leave a punch-out composite behind`);
  }

  const portrait = mock2d(720, 1280);
  let threw = false;
  try { draw(portrait, [makeFace(720, 1280)], 'witch'); } catch { threw = true; }
  ok(!threw && portrait.stack.length === 0, 'a look draws on a portrait canvas');

  const one = mock2d(1280, 720);
  draw(one, [makeFace(1280, 720, 0.5, 0.46)], 'pumpkin');
  const two = mock2d(1280, 720);
  draw(two, [makeFace(1280, 720, 0.32, 0.42), makeFace(1280, 720, 0.7, 0.5)], 'pumpkin');
  const three = mock2d(1280, 720);
  draw(three, [makeFace(1280, 720, 0.25, 0.4), makeFace(1280, 720, 0.5, 0.48), makeFace(1280, 720, 0.75, 0.44)], 'skull');
  const singleSkull = mock2d(1280, 720);
  draw(singleSkull, [makeFace(1280, 720)], 'skull');
  ok(two.saves === one.saves * 2 && two.saves > 0, 'two faces draw twice what one face draws');
  ok(three.saves === singleSkull.saves * 3, 'three faces each get a look');

  const none = mock2d(1280, 720);
  draw(none, [], 'vampire');
  ok(none.saves === 0 && none.ink.length === 0, 'zero faces draws nothing and does not throw');

  const mixed = mock2d(1280, 720);
  const short = makeFace(1280, 720).slice(0, 100);
  const mesh468 = makeFace(1280, 720).slice(0, 468);
  draw(mixed, [short, mesh468, makeFace(1280, 720).slice(0, 467)], 'pumpkin');
  ok(mixed.saves === one.saves, 'faces with fewer than 468 landmarks are skipped, a 468-point mesh still draws');

  for (const [w, h] of [[0, 0], [1, 400], [400, 1]]) {
    const tiny = mock2d(w, h);
    let bad = false;
    try {
      v.drawHalloweenFaces(tiny, [makeFace(Math.max(w, 2), Math.max(h, 2))], 'pumpkin');
      v.drawHalloweenFrame(tiny, 'Happy Halloween', 'TheNerdStudio', 0);
    } catch { bad = true; }
    ok(!bad && tiny.saves === 0 && tiny.ink.length === 0, `a ${w}x${h} canvas is left untouched`);
  }

  const tilted = mock2d(800, 800);
  const face = makeFace(800, 800);
  const turned = face.map((p) => {
    const x = p.x - 0.5;
    const y = p.y - 0.5;
    const c = Math.cos(0.4);
    const s = Math.sin(0.4);
    return { x: 0.5 + x * c - y * s, y: 0.5 + x * s + y * c, z: 0 };
  });
  let tiltThrew = false;
  try { draw(tilted, [turned], 'vampire'); } catch { tiltThrew = true; }
  ok(!tiltThrew && tilted.saves > 0, 'a tilted face still draws');

  const flat = mock2d(900, 900);
  const collapsed = makeFace(900, 900).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
  let flatThrew = false;
  try { for (const look of v.HALLOWEEN_LOOKS) draw(flat, [collapsed], look); } catch { flatThrew = true; }
  ok(!flatThrew, 'a face with no area does not throw');

  const mirror = [-1, 0, 0, 1, 1280, 0];
  const mirrored = mock2d(1280, 720);
  mirrored.setTransform(...mirror);
  draw(mirrored, [makeFace(1280, 720)], 'witch');
  ok(sameMatrix(mirrored.ctm, mirror), 'face drawing leaves the selfie mirror transform in place');

  const captions = [
    ['Happy Halloween', 'TheNerdStudio'],
    ['สุขสันต์ฮาโลวีน', 'TheNerdStudio'],
    ['Happy Halloween at the Grand Riverside Ballroom', 'With our sponsors'],
  ];
  const sizes = [[1080, 1920], [720, 1280], [360, 640], [1920, 1080], [1280, 720], [640, 360]];
  const frameProblems = [];
  for (const [w, h] of sizes) {
    for (const [title, subtitle] of captions) {
      for (const timeMs of [0, 4800]) {
        const ctx = mock2d(w, h);
        const mirror = [-1, 0, 0, 1, w, 0];
        ctx.setTransform(...mirror);
        const label = `${w}x${h} ${h >= w ? 'portrait' : 'landscape'} ${timeMs ? 'moving' : 'still'} "${title}"`;
        try {
          v.drawHalloweenFrame(ctx, title, subtitle, timeMs);
        } catch (error) {
          frameProblems.push(`${label} threw ${error.message}`);
          continue;
        }
        const stray = outside(ctx, w, h);
        if (ctx.stack.length) frameProblems.push(`${label} leaked save/restore`);
        if (stray.length) frameProblems.push(`${label} drew outside the canvas at ${stray[0].x.toFixed(1)},${stray[0].y.toFixed(1)}`);
        const drawn = ctx.texts.map((t) => t.text);
        if (!drawn.includes(title) || !drawn.includes(subtitle)) frameProblems.push(`${label} missed a caption line`);
        if (!ctx.texts.every((t) => sameMatrix(t.ctm, [1, 0, 0, 1, 0, 0]))) frameProblems.push(`${label} caption was mirrored`);
        if (!sameMatrix(ctx.ctm, mirror)) frameProblems.push(`${label} did not restore the selfie mirror`);
        const titleBox = ctx.texts.find((t) => t.text === title)?.box;
        const lineBox = ctx.texts.find((t) => t.text === subtitle)?.box;
        if (titleBox && lineBox && titleBox.bottom > lineBox.top + 0.5) frameProblems.push(`${label} caption lines collide`);
      }
    }
  }
  if (frameProblems.length) console.log(frameProblems.map((p) => `  ${p}`).join('\n'));
  ok(frameProblems.length === 0, 'frame fits portrait and landscape, in English and Thai, with still and moving bats');

  const blank = mock2d(800, 600);
  let blankThrew = false;
  try { v.drawHalloweenFrame(blank, '', '', 0); } catch { blankThrew = true; }
  ok(!blankThrew && blank.texts.length === 2, 'an empty caption still lays the frame out');
} finally {
  await server.close();
}
if (failures) { console.log(`${failures} check(s) failed`); process.exit(1); }
console.log('All checks passed');
