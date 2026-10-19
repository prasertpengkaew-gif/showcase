// Builds the printable "scan me" card for the Print AR page and compiles it into a
// MindAR image target. Outputs:
//   public/ar-card/card.png       — the card people print or show on a screen
//   public/ar-card/card.mind      — compiled tracking data for that exact image
// Usage: node scripts/make-ar-card.mjs   (needs `npx playwright install chromium`)
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/ar-card');
const W = 1600;
const H = 1000;

const cardHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${W}px; height: ${H}px; font-family: Inter, sans-serif; background: #0B1220; color: #fff; overflow: hidden; }
  .card { position: relative; width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; }
  .photo { position: relative; background: url(/images/projects/lounge-chair-configurator/cover.webp) center/cover; }
  .photo::after { content: ''; position: absolute; inset: 0; background:
      repeating-linear-gradient(45deg, rgba(11,18,32,.0) 0 22px, rgba(11,18,32,.06) 22px 24px); }
  .panel { position: relative; padding: 90px 80px; display: flex; flex-direction: column; justify-content: space-between;
      background: radial-gradient(70% 60% at 85% 10%, rgba(37,99,235,.45), transparent 70%), #0B1220; }
  .dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.18) 2px, transparent 2.5px);
      background-size: 36px 36px; mask-image: linear-gradient(to bottom left, #000, transparent 70%); }
  .logo { display: flex; align-items: center; gap: 22px; font-size: 44px; font-weight: 700; position: relative; }
  h1 { font-size: 92px; line-height: 1.02; letter-spacing: -2px; font-weight: 800; position: relative; }
  h1 span { color: #5b8ef5; }
  p { font-size: 34px; color: #cbd5e1; line-height: 1.4; position: relative; }
  .tags { display: flex; gap: 14px; position: relative; }
  .tags b { border: 2px solid rgba(255,255,255,.35); border-radius: 999px; padding: 12px 26px; font-size: 26px; font-weight: 600; }
  .frame { position: absolute; width: 120px; height: 120px; border: 10px solid #2563EB; }
  .f1 { left: 40px; top: 40px; border-right: 0; border-bottom: 0; }
  .f2 { right: 40px; bottom: 40px; border-left: 0; border-top: 0; }
</style></head><body><div class="card">
  <div class="photo"><div class="frame f1"></div></div>
  <div class="panel"><div class="dots"></div>
    <div class="logo"><svg width="84" height="84" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#ffffff" fill-opacity=".1"/><path d="M10 22V10l12 12V10" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24.5" cy="24.5" r="1.8" fill="#fff"/></svg>TheNerdStudio</div>
    <div><h1>Point your<br/>camera <span>here.</span></h1><p style="margin-top:28px">Open the Print AR page and aim at this card to see it come to life in 3D.</p></div>
    <div class="tags"><b>WebAR</b><b>VR</b><b>Face AR</b><b>3D</b></div>
    <div class="frame f2"></div>
  </div>
</div></body></html>`;

const compileHtml = `<!doctype html><html><body><script type="module">
  import { Compiler } from '/__mindar/mindar-image.prod.js';
  window.compile = async (src) => {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const compiler = new Compiler();
    await compiler.compileImageTargets([img], (p) => { window.progress = p; });
    const data = await compiler.exportData();
    return Array.from(new Uint8Array(data));
  };
  window.ready = true;
</script></body></html>`;

const types = { '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    if (url === '/card') return res.writeHead(200, { 'content-type': 'text/html' }).end(cardHtml);
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
await page.goto(base + '/card', { waitUntil: 'networkidle' });
await mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, 'card.png') });
console.log('card.png written');

await page.goto(base + '/compile');
await page.waitForFunction(() => window.ready);
const bytes = await page.evaluate(() => window.compile('/ar-card/card.png'));
await writeFile(path.join(outDir, 'card.mind'), Buffer.from(bytes));
console.log(`card.mind written (${bytes.length} bytes)`);

await browser.close();
server.close();
