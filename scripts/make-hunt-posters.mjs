// Builds the three printable posters for the AR Scavenger Hunt and compiles them into one
// MindAR target file (target index = station order). Outputs:
//   public/ar-hunt/poster-1.png … poster-3.png   — posters to print (A4 portrait ratio)
//   public/ar-hunt/hunt.mind                     — tracking data for all three
// Usage: node scripts/make-hunt-posters.mjs   (needs `npx playwright install chromium`)
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/ar-hunt');
const W = 1000;
const H = 1414;

// Each poster is mostly its own full-bleed photo, and the shared text is small and placed in a
// different corner on each one: posters that share a layout get confused by the tracker.
const STATIONS = [
  { n: 1, photo: '/images/projects/interactive-brand-mascot/cover.webp', accent: '#2563EB', label: 'Find the robot', corner: 'top: 56px; right: 56px;', angle: 35 },
  { n: 2, photo: '/images/projects/wildlife-field-lesson/2.webp', accent: '#f59e0b', label: 'Find the fox', corner: 'bottom: 56px; left: 56px;', angle: 115 },
  { n: 3, photo: '/images/projects/sneaker-launch-experience/cover.webp', accent: '#f43f5e', label: 'Find the sneaker', corner: 'top: 56px; left: 56px;', angle: 70 },
];

const posterHtml = ({ n, photo, accent, label, corner, angle }) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { position: relative; width: ${W}px; height: ${H}px; font-family: Inter, Manrope, sans-serif; color: #fff; overflow: hidden;
    background: url(${photo}) center/cover; }
  body::before { content: ''; position: absolute; inset: 0;
    background: repeating-linear-gradient(${angle}deg, transparent 0 34px, ${accent}33 34px 40px); }
  body::after { content: ''; position: absolute; inset: 28px; border: 14px solid ${accent}; border-radius: 30px; }
  .tag { position: absolute; ${corner} z-index: 1; display: flex; align-items: center; gap: 24px; padding: 22px 30px 22px 22px;
    border-radius: 28px; background: #0B1220; }
  .num { width: 120px; height: 120px; border-radius: 24px; background: ${accent}; display: grid; place-items: center;
    font-size: 88px; font-weight: 800; line-height: 1; }
  .kicker { font-size: 22px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; color: #94a3b8; }
  .label { margin-top: 8px; font-size: 44px; font-weight: 800; }
</style></head><body>
  <div class="tag"><div class="num">${n}</div><div><div class="kicker">AR Hunt · ${n} / 3</div><div class="label">${label}</div></div></div>
</body></html>`;

const compileHtml = `<!doctype html><html><body><script type="module">
  import { Compiler } from '/__mindar/mindar-image.prod.js';
  window.compile = async (srcs) => {
    const imgs = await Promise.all(srcs.map((src) => new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
    })));
    const compiler = new Compiler();
    await compiler.compileImageTargets(imgs, (p) => { window.progress = p; });
    return Array.from(new Uint8Array(await compiler.exportData()));
  };
  window.ready = true;
</script></body></html>`;

const types = { '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const poster = url.match(/^\/poster\/(\d)$/);
    if (poster) return res.writeHead(200, { 'content-type': 'text/html' }).end(posterHtml(STATIONS[Number(poster[1]) - 1]));
    if (url === '/compile') return res.writeHead(200, { 'content-type': 'text/html' }).end(compileHtml);
    const file = url.startsWith('/__mindar/')
      ? path.join(root, 'src/vendor/mindar', url.slice('/__mindar/'.length))
      : path.join(root, 'public', path.normalize(url));
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await mkdir(outDir, { recursive: true });
for (const s of STATIONS) {
  await page.goto(`${base}/poster/${s.n}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, `poster-${s.n}.png`) });
  console.log(`poster-${s.n}.png written`);
}
await page.goto(base + '/compile');
await page.waitForFunction(() => window.ready);
const bytes = await page.evaluate((srcs) => window.compile(srcs), STATIONS.map((s) => `/ar-hunt/poster-${s.n}.png`));
await writeFile(path.join(outDir, 'hunt.mind'), Buffer.from(bytes));
console.log(`hunt.mind written (${bytes.length} bytes)`);

await browser.close();
server.close();
