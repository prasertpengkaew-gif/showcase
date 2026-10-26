// Demo-card covers for public/images, 1440×960 webp, same size as the other cards.
//
// Camera filters that draw on a canvas (the Halloween looks) are rendered by calling
// the demo's own drawing code on a painted mannequin — the same approach as face-ar
// and try-on in c847f66. The other cards are screenshots of the running page.
//
//   node scripts/render-demo-covers.mjs
//   node scripts/render-demo-covers.mjs --only=halloween-face,live-qa
//
// Requires Playwright Chromium (`npx playwright install chromium`) and ffmpeg libwebp.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/images');
const only = new Set(process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',').filter(Boolean) ?? []);
const want = (file) => only.size === 0 || only.has(file) || only.has(file.replace(/\.webp$/, ''));

const W = 1440;
const H = 960;

const vite = await createServer({
  root,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 4179, strictPort: true },
});
await vite.listen();
const base = 'http://127.0.0.1:4179';

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  locale: 'en-US',
});
await context.addInitScript(() => localStorage.setItem('lang', 'en'));

async function writeWebp(png, dest) {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'cover-'));
  const pngPath = path.join(tmp, 'in.png');
  await writeFile(pngPath, png);
  let chosen = 0;
  try {
    // Stay in the same weight band as the existing card covers (mostly 20–80 KB).
    for (const quality of [74, 64, 54, 46]) {
      execFileSync('ffmpeg', [
        '-y', '-loglevel', 'error', '-i', pngPath,
        '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6',
        '-pix_fmt', 'yuv420p',
        dest,
      ]);
      chosen = (await stat(dest)).size;
      if (chosen <= 80_000) break;
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  console.log(`${path.basename(dest)} ${chosen} bytes`);
}

async function renderHalloween(page) {
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  const png64 = await page.evaluate(async () => {
    const { drawHalloweenFaces, drawHalloweenFrame, HALLOWEEN_LOOKS } = await import('/src/lib/halloweenFace.ts');
    const W = 1440;
    const H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#140a22');
    sky.addColorStop(0.55, '#2a1244');
    sky.addColorStop(1, '#120814');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
    [[180, 80], [260, 140], [980, 70], [1240, 120], [1320, 210]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    });
    const moon = ctx.createRadialGradient(1160, 168, 8, 1160, 168, 78);
    moon.addColorStop(0, '#fff7d6');
    moon.addColorStop(1, 'rgba(253, 230, 138, 0)');
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(1160, 168, 78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(1148, 160, 46, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(W / 2, H * 0.72, 40, W / 2, H * 0.78, 620);
    glow.addColorStop(0, 'rgba(249, 115, 22, 0.28)');
    glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const spots = [
      { look: 'pumpkin', x: 220, shirt: '#3b0764' },
      { look: 'skull', x: 540, shirt: '#1c1917' },
      { look: 'witch', x: 860, shirt: '#14532d' },
      { look: 'vampire', x: 1180, shirt: '#4c0519' },
    ];
    // Short enough that the witch cone (about 1.4 face-heights above the chin) stays
    // under the bats and inside the frame on a 960-tall card.
    const cy = 478;
    const fw = 188;
    const fh = 210;

    const faceAt = (cx) => {
      const pts = Array.from({ length: 478 }, () => ({ x: cx / W, y: cy / H, z: 0 }));
      const set = (i, x, y) => { pts[i] = { x: x / W, y: y / H, z: 0 }; };
      set(10, cx, cy - fh / 2);
      set(152, cx, cy + fh / 2);
      set(234, cx - fw / 2, cy);
      set(454, cx + fw / 2, cy + fh * 0.02);
      set(33, cx - fw * 0.22, cy - fh * 0.05);
      set(133, cx - fw * 0.08, cy - fh * 0.05);
      set(362, cx + fw * 0.08, cy - fh * 0.05);
      set(263, cx + fw * 0.22, cy - fh * 0.05);
      set(468, cx - fw * 0.15, cy - fh * 0.05);
      set(473, cx + fw * 0.15, cy - fh * 0.05);
      set(159, cx - fw * 0.15, cy - fh * 0.09);
      set(145, cx - fw * 0.15, cy - fh * 0.01);
      set(386, cx + fw * 0.15, cy - fh * 0.09);
      set(374, cx + fw * 0.15, cy - fh * 0.01);
      set(61, cx - fw * 0.15, cy + fh * 0.14);
      set(291, cx + fw * 0.15, cy + fh * 0.14);
      set(13, cx, cy + fh * 0.11);
      set(14, cx, cy + fh * 0.18);
      set(1, cx, cy + fh * 0.02);
      const oval = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
      oval.forEach((i, n) => {
        const a = -Math.PI / 2 + (n / oval.length) * Math.PI * 2;
        if ([10, 152, 234, 454].includes(i)) return;
        set(i, cx + Math.cos(a) * fw * 0.48, cy + Math.sin(a) * fh * 0.5);
      });
      const lip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
      lip.forEach((i, n) => {
        const a = (n / lip.length) * Math.PI * 2;
        if (i === 61 || i === 291) return;
        set(i, cx + Math.cos(a) * fw * 0.13, cy + fh * 0.15 + Math.sin(a) * fh * 0.045);
      });
      [246, 161, 160, 158, 157, 173].forEach((i, n) => set(i, cx - fw * 0.24 + n * fw * 0.045, cy - fh * 0.16));
      [466, 388, 387, 385, 384, 398].forEach((i, n) => set(i, cx + fw * 0.02 + n * fw * 0.045, cy - fh * 0.16));
      const upper = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
      const lower = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];
      upper.forEach((i, n) => set(i, cx - fw * 0.1 + (n / (upper.length - 1)) * fw * 0.2, cy + fh * 0.12));
      lower.forEach((i, n) => set(i, cx - fw * 0.1 + (n / (lower.length - 1)) * fw * 0.2, cy + fh * 0.18));
      set(13, cx, cy + fh * 0.11);
      set(14, cx, cy + fh * 0.18);
      return pts;
    };

    for (const spot of spots) {
      ctx.fillStyle = spot.shirt;
      ctx.beginPath();
      ctx.ellipse(spot.x, cy + fh * 0.62, fw * 0.62, fh * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e7c3a5';
      ctx.fillRect(spot.x - fw * 0.1, cy + fh * 0.36, fw * 0.2, fh * 0.22);
      const skin = ctx.createRadialGradient(spot.x - fw * 0.12, cy - fh * 0.08, 10, spot.x, cy, fw * 0.55);
      skin.addColorStop(0, '#ffd8be');
      skin.addColorStop(1, '#e0aa84');
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(spot.x, cy, fw * 0.46, fh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b2414';
      ctx.beginPath();
      ctx.ellipse(spot.x, cy - fh * 0.22, fw * 0.48, fh * 0.28, 0, Math.PI, 0);
      ctx.fill();
    }

    spots.forEach((spot) => drawHalloweenFaces(ctx, [faceAt(spot.x)], spot.look));

    ctx.font = '700 22px Manrope, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const names = ['Pumpkin', 'Sugar skull', 'Witch hat', 'Vampire'];
    spots.forEach((spot, i) => {
      ctx.fillStyle = 'rgba(15, 10, 24, 0.55)';
      ctx.beginPath();
      ctx.roundRect(spot.x - 78, 668, 156, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#fde68a';
      ctx.fillText(names[i], spot.x, 686);
    });

    drawHalloweenFrame(ctx, 'Happy Halloween', 'TheNerdStudio', 900);
    if (HALLOWEEN_LOOKS.length !== 4) throw new Error('expected four looks');
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await writeWebp(Buffer.from(png64, 'base64'), path.join(outDir, 'halloween-face.webp'));
}

async function shoot(page, route, file, prepare) {
  await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('main#main h1', { timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  if (prepare) await prepare(page);
  await page.addStyleTag({
    content: 'header{display:none!important}*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}',
  });
  const anchor = page.locator('section.bg-surface .container-page > div').nth(1);
  await anchor.waitFor({ timeout: 15000 });
  const top = await anchor.evaluate((el) => Math.max(0, el.getBoundingClientRect().top + window.scrollY - 36));
  await page.evaluate((y) => window.scrollTo(0, y), top);
  await page.waitForTimeout(150);
  const png = await page.screenshot({ type: 'png' });
  if (png.length < 5000) throw new Error(`${file} screenshot looks empty`);
  await writeWebp(png, path.join(outDir, file));
}

const pages = [
  {
    file: 'stamp-rally.webp',
    route: '/stamp-rally',
    prepare: async (page) => {
      for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Scan booth QR (simulated)' }).first().click();
      await page.getByLabel('Name').fill('Mali S.');
      await page.getByLabel('Email').fill('mali@example.com');
      await page.getByRole('checkbox', { name: /contact me/ }).check();
    },
  },
  {
    file: 'live-qa.webp',
    route: '/live-qa',
    prepare: async (page) => {
      await page.getByText('Host', { exact: true }).click();
      await page.getByRole('button', { name: /Show on screen/ }).first().click();
    },
  },
  { file: 'lucky-draw.webp', route: '/lucky-draw' },
  {
    file: 'photo-wall.webp',
    route: '/photo-wall',
    prepare: async (page) => {
      const post = async (name, text) => {
        await page.getByLabel('Your name').fill(name);
        await page.getByLabel(/Message/).fill(text);
        await page.getByRole('button', { name: 'Post', exact: true }).click();
      };
      await post('Mali', 'The band was wonderful — thank you for tonight.');
      await post('Arun', 'Best view in the room, right from our table.');
    },
  },
  {
    file: 'team-game.webp',
    route: '/team-game',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Start the round' }).click();
      const tap = page.getByRole('button', { name: 'TAP!' });
      for (let i = 0; i < 6; i++) await tap.click();
      await page.waitForTimeout(400);
    },
  },
  {
    file: 'event-assistant.webp',
    route: '/event-assistant',
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Where can I park my car?' }).click();
    },
  },
  {
    file: 'motion-wall.webp',
    route: '/motion-wall',
    // The particle loop fades a little every animation frame, and headless Chromium
    // runs those frames as fast as it can, so a wave is gone before the screenshot.
    // Let the page render first, then hold further frames, wave, and paint once.
    prepare: async (page) => {
      const canvas = page.locator('canvas');
      await canvas.waitFor();
      await page.evaluate(() => {
        const queued = [];
        window.requestAnimationFrame = (cb) => {
          queued.push(cb);
          return queued.length;
        };
        window.__flushFrames = (n) => {
          for (let i = 0; i < n; i++) {
            const batch = queued.splice(0, queued.length);
            for (const cb of batch) cb(performance.now());
          }
        };
      });
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 40)));
      const box = await canvas.boundingBox();
      if (!box) throw new Error('motion wall canvas has no box');
      for (let i = 0; i < 48; i++) {
        const x = box.x + box.width * (0.06 + 0.88 * (i / 47));
        const y = box.y + box.height * (0.42 + Math.sin(i / 3.2) * 0.32);
        await page.mouse.move(x, y);
      }
      await page.evaluate(() => window.__flushFrames(2));
    },
  },
  { file: 'event-dashboard.webp', route: '/event-dashboard' },
];

try {
  await mkdir(outDir, { recursive: true });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  if (want('halloween-face.webp')) await renderHalloween(page);
  for (const shot of pages) {
    if (!want(shot.file)) continue;
    await shoot(page, shot.route, shot.file, shot.prepare);
  }
} finally {
  await browser.close();
  await vite.close();
}
