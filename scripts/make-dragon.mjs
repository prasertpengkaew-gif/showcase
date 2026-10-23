// Builds public/models/dragon.glb: a stylised Chinese dragon made of basic shapes (our own model, no licence needed).
//   node scripts/make-dragon.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 5198, strictPort: true } });
await server.listen();
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto('http://localhost:5198/scripts/dragon.html');
  await page.waitForFunction(() => window.__glb || window.__glbError, null, { timeout: 60000 });
  const error = await page.evaluate(() => window.__glbError);
  if (error) throw new Error(error);
  const glb = Buffer.from(await page.evaluate(() => window.__glb), 'base64');
  mkdirSync(path.join(root, 'public/models'), { recursive: true });
  writeFileSync(path.join(root, 'public/models/dragon.glb'), glb);
  console.log(`public/models/dragon.glb  ${(glb.length / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
  await server.close();
}
