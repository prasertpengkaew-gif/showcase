// Creates the restaurant coaster artwork and compiles it as a MindAR image target.
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/restaurant-ar');
const SIZE = 1400;

const art = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:${SIZE}px;height:${SIZE}px;background:#f4ead7;display:grid;place-items:center;font-family:Arial,sans-serif;color:#173d35}
.coaster{width:1280px;height:1280px;border-radius:50%;border:18px solid #173d35;outline:8px solid #c98b3c;outline-offset:-42px;background:radial-gradient(circle at 50% 43%,#fff9ec 0 44%,#f1dfbd 44.2% 45%,#fff9ec 45.3%);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.ring{position:absolute;inset:78px;border:3px dashed #b16d35;border-radius:50%;opacity:.8}.ring:before,.ring:after{content:'✦  •  ✦  •  ✦  •  ✦  •  ✦';position:absolute;left:0;right:0;text-align:center;color:#b16d35;font-size:34px;letter-spacing:17px}.ring:before{top:-18px}.ring:after{bottom:-18px}
.content{text-align:center;width:790px}.leaf{font-size:68px;color:#62825b;line-height:1}.brand{font-size:34px;font-weight:700;letter-spacing:8px;margin-top:24px}.rule{width:310px;height:3px;background:#c98b3c;margin:27px auto}.dish{font-family:Georgia,serif;font-weight:700;font-size:82px;line-height:1.02;letter-spacing:-2px}.thai{font-size:38px;margin-top:18px;color:#8d542d}.scan{margin:45px auto 0;background:#173d35;color:#fff9ec;border-radius:999px;padding:21px 42px;font-size:27px;font-weight:700;letter-spacing:3px;width:max-content}.footer{font-size:23px;color:#53675b;margin-top:25px;letter-spacing:2px}
.dot{position:absolute;width:20px;height:20px;border-radius:50%;background:#c98b3c}.d1{top:290px;left:340px}.d2{top:360px;right:270px;width:13px;height:13px}.d3{bottom:290px;right:350px;width:16px;height:16px}.d4{bottom:370px;left:270px;width:12px;height:12px}
</style></head><body><div class="coaster"><div class="ring"></div><i class="dot d1"></i><i class="dot d2"></i><i class="dot d3"></i><i class="dot d4"></i><div class="content"><div class="leaf">❧</div><div class="brand">BASIL &amp; BOWL</div><div class="rule"></div><div class="dish">MANGO<br>STICKY RICE</div><div class="thai">ข้าวเหนียวมะม่วง</div><div class="scan">SCAN FOR A TASTE</div><div class="footer">A LITTLE EXTRA WITH YOUR MEAL</div></div></div></body></html>`;

const compiler = `<!doctype html><html><body><script type="module">
import { Compiler } from '/__mindar/mindar-image.prod.js';
window.compile = async (src) => { const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; }); const c = new Compiler(); await c.compileImageTargets([img], (p) => { window.progress = p; }); return Array.from(new Uint8Array(await c.exportData())); };
window.ready = true;
</script></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost').pathname;
  try {
    if (url === '/art') return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(art);
    if (url === '/compile') return res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(compiler);
    const file = url.startsWith('/__mindar/')
      ? path.join(root, 'src/vendor/mindar', url.slice('/__mindar/'.length))
      : path.join(root, 'public', path.normalize(url));
    const type = path.extname(file) === '.js' ? 'text/javascript' : path.extname(file) === '.png' ? 'image/png' : 'application/octet-stream';
    return res.writeHead(200, { 'content-type': type }).end(await readFile(file));
  } catch { return res.writeHead(404).end(); }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
  await page.goto(`${base}/art`, { waitUntil: 'networkidle' });
  await mkdir(outDir, { recursive: true });
  await page.screenshot({ path: path.join(outDir, 'coaster.png') });
  await page.goto(`${base}/compile`);
  await page.waitForFunction(() => window.ready);
  const bytes = await page.evaluate(() => window.compile('/restaurant-ar/coaster.png'));
  await writeFile(path.join(outDir, 'coaster.mind'), Buffer.from(bytes));
  console.log(`coaster.png and coaster.mind written (${bytes.length} target bytes)`);
} finally {
  await browser.close();
  server.close();
}
