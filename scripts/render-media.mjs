// Renders project images, model posters and turntable videos from the GLB files in
// public/models using headless Chromium + model-viewer.
//
// Requirements: `npm i -D playwright` (Chromium via `npx playwright install chromium`)
// and ffmpeg (with libx264 and libvpx-vp9) on PATH for the .mp4/.webm videos.
//
// Usage:
//   node scripts/render-media.mjs            # everything
//   node scripts/render-media.mjs --images   # stills only
//   node scripts/render-media.mjs --videos   # videos only
//   node scripts/render-media.mjs --only=lounge-chair-configurator
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const mvBundle = path.join(root, 'node_modules/@google/model-viewer/dist/model-viewer.min.js');

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const doImages = !args.includes('--videos');
const doVideos = !args.includes('--images');

const W = 1440;
const H = 960;

// Background gradients: [top, bottom]
const BG = {
  studio: ['#EEF2F7', '#D9E0EA'],
  warm: ['#F5EDE4', '#DCCAB7'],
  sage: ['#E8EFE6', '#C5D3C2'],
  navy: ['#1D2C4C', '#0B1220'],
  linen: ['#F6F4F0', '#DFDAD1'],
  graphite: ['#2E3540', '#12161D'],
  blue: ['#E3EBFB', '#AFC4EE'],
  teal: ['#E5EFF1', '#BED4D9'],
  white: ['#FFFFFF', '#E6EAF0'],
};

/** @type {{ slug: string, model: string, bg: keyof typeof BG, video?: boolean, shots: Array<{ file: string, orbit: string, variant?: string, animation?: string, time?: number, fov?: string }> }[]} */
const projects = [
  {
    slug: 'robotic-workcell-preview', model: 'robot', bg: 'studio', video: true,
    shots: [
      { file: 'cover', orbit: '25deg 80deg 5.2m', animation: 'Idle', time: 0.5 },
      { file: '1', orbit: '0deg 88deg 3.8m', animation: 'Standing', time: 0.3 },
      { file: '2', orbit: '40deg 45deg 4.6m', animation: 'Idle', time: 1 },
      { file: '3', orbit: '-20deg 80deg 2.2m', animation: 'Idle', time: 0.5, fov: '22deg' },
    ],
  },
  {
    slug: 'lounge-chair-configurator', model: 'chair', bg: 'warm', video: true,
    shots: [
      { file: 'cover', orbit: '35deg 75deg 2.3m', variant: 'Mango Velvet' },
      { file: '1', orbit: '90deg 82deg 2.3m', variant: 'Peacock Velvet' },
      { file: '2', orbit: '200deg 70deg 2.3m', variant: 'Mango Velvet' },
      { file: '3', orbit: '15deg 55deg 1.2m', variant: 'Peacock Velvet', fov: '24deg' },
    ],
  },
  {
    slug: 'wildlife-field-lesson', model: 'fox', bg: 'sage', video: true,
    shots: [
      { file: 'cover', orbit: '60deg 78deg 2.4m', animation: 'Survey', time: 1.2 },
      { file: '1', orbit: '90deg 85deg 2.4m', animation: 'Walk', time: 0.4 },
      { file: '2', orbit: '0deg 88deg 2.1m', animation: 'Survey', time: 2 },
      { file: '3', orbit: '30deg 30deg 2.6m', animation: 'Survey', time: 0.2 },
    ],
  },
  {
    slug: 'sneaker-launch-experience', model: 'sneaker', bg: 'navy', video: true,
    shots: [
      { file: 'cover', orbit: '-40deg 72deg 0.75m', variant: 'midnight' },
      { file: '1', orbit: '-90deg 85deg 0.75m', variant: 'beach' },
      { file: '2', orbit: '20deg 35deg 0.8m', variant: 'street' },
      { file: '3', orbit: '150deg 75deg 0.45m', variant: 'midnight', fov: '24deg' },
    ],
  },
  {
    slug: 'furnished-unit-staging', model: 'sofa', bg: 'linen', video: true,
    shots: [
      { file: 'cover', orbit: '25deg 76deg 5m', variant: 'Champagne' },
      { file: '1', orbit: '0deg 85deg 5m', variant: 'Navy' },
      { file: '2', orbit: '45deg 50deg 5.4m', variant: 'Gray' },
      { file: '3', orbit: '-15deg 70deg 2.2m', variant: 'Champagne', fov: '24deg' },
    ],
  },
  {
    slug: 'scale-model-showroom', model: 'car', bg: 'graphite',
    shots: [
      { file: 'cover', orbit: '45deg 72deg 1.45m' },
      { file: '1', orbit: '90deg 84deg 1.4m' },
      { file: '2', orbit: '-30deg 52deg 1.6m' },
      { file: '3', orbit: '20deg 72deg 0.75m', fov: '24deg' },
    ],
  },
  {
    slug: 'interactive-brand-mascot', model: 'robot', bg: 'blue',
    shots: [
      { file: 'cover', orbit: '-20deg 82deg 4.2m', animation: 'Wave', time: 0.6 },
      { file: '1', orbit: '15deg 82deg 4m', animation: 'ThumbsUp', time: 0.9 },
      { file: '2', orbit: '30deg 78deg 4.2m', animation: 'Dance', time: 1.1 },
      { file: '3', orbit: '10deg 100deg 3.4m', animation: 'Wave', time: 0.8 },
    ],
  },
  {
    slug: 'stem-robotics-lesson', model: 'robot', bg: 'teal',
    shots: [
      { file: 'cover', orbit: '35deg 80deg 4.2m', animation: 'Idle', time: 1.5 },
      { file: '1', orbit: '90deg 85deg 4.2m', animation: 'Walking', time: 0.3 },
      { file: '2', orbit: '20deg 80deg 4.4m', animation: 'Jump', time: 0.55 },
      { file: '3', orbit: '0deg 30deg 4.6m', animation: 'Idle', time: 0.5 },
    ],
  },
  {
    slug: 'velvet-sofa-product-page', model: 'sofa', bg: 'white',
    shots: [
      { file: 'cover', orbit: '-25deg 76deg 5m', variant: 'Navy' },
      { file: '1', orbit: '0deg 85deg 5m', variant: 'Pale Pink' },
      { file: '2', orbit: '-80deg 80deg 4.6m', variant: 'Black' },
      { file: '3', orbit: '30deg 95deg 1.8m', variant: 'Gray', fov: '26deg' },
    ],
  },
];

const posters = [
  { model: 'chair', orbit: '35deg 75deg auto' },
  { model: 'robot', orbit: '20deg 80deg auto', animation: 'Idle', time: 0.5 },
  { model: 'car', orbit: '45deg 70deg auto' },
  { model: 'fox', orbit: '60deg 75deg auto', animation: 'Survey', time: 1.2 },
  { model: 'sofa', orbit: '25deg 75deg auto' },
  { model: 'sneaker', orbit: '-40deg 75deg auto' },
];

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:transparent}model-viewer{width:${W}px;height:${H}px;display:block;background:transparent}</style>
<script type="module" src="/__mv.js"></script></head>
<body><model-viewer id="mv" environment-image="neutral" shadow-intensity="1" shadow-softness="0.9" exposure="1" interpolation-decay="1" disable-zoom></model-viewer>
<script>
  window.setup = async ({ src, orbit, variant, animation, time, fov }) => {
    await customElements.whenDefined('model-viewer');
    const mv = document.getElementById('mv');
    if (mv.getAttribute('src') !== src) {
      const loaded = new Promise((res, rej) => {
        mv.addEventListener('load', res, { once: true });
        mv.addEventListener('error', (e) => rej(new Error('load failed ' + src)), { once: true });
      });
      mv.setAttribute('src', src);
      await loaded;
    }
    mv.fieldOfView = fov || '30deg';
    mv.cameraOrbit = orbit;
    mv.cameraTarget = 'auto auto auto';
    mv.variantName = variant || null;
    if (animation) { mv.animationName = animation; mv.play(); await new Promise(r => setTimeout(r, 50)); mv.pause(); mv.currentTime = time || 0; }
    mv.jumpCameraToGoal();
    await new Promise(r => setTimeout(r, variant ? 700 : 250));
    for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r));
  };
  window.orbitTo = async (orbit) => {
    const mv = document.getElementById('mv');
    mv.cameraOrbit = orbit; mv.jumpCameraToGoal();
    for (let i = 0; i < 2; i++) await new Promise(r => requestAnimationFrame(r));
  };
  window.capture = async ({ bg, type, quality }) => {
    const mv = document.getElementById('mv');
    const blob = await mv.toBlob({ mimeType: 'image/png', idealAspect: false });
    const img = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = ${W}; c.height = ${H};
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, ${H});
    g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, ${W}, ${H});
    const v = ctx.createRadialGradient(${W / 2}, ${H * 0.45}, ${H * 0.2}, ${W / 2}, ${H * 0.5}, ${W * 0.75});
    v.addColorStop(0, 'rgba(255,255,255,0.10)'); v.addColorStop(1, 'rgba(0,0,0,0.10)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, ${W}, ${H});
    ctx.drawImage(img, 0, 0, ${W}, ${H});
    return c.toDataURL(type, quality);
  };
</script></body></html>`;

const mime = { '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.js': 'text/javascript', '.hdr': 'application/octet-stream' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
    if (url === '/__mv.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(await readFile(mvBundle)); }
    const file = path.join(publicDir, path.normalize(url));
    if (!file.startsWith(publicDir)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(base);

const saveDataUrl = async (dataUrl, outPath) => {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
};

const list = only ? projects.filter((p) => only.split(',').includes(p.slug)) : projects;

if (doImages) {
  if (!only) {
    for (const p of posters) {
      await page.evaluate((o) => window.setup(o), { src: `/models/${p.model}.glb`, ...p });
      const data = await page.evaluate((o) => window.capture(o), { bg: BG.studio, type: 'image/webp', quality: 0.82 });
      await saveDataUrl(data, path.join(publicDir, 'images/posters', `${p.model}.webp`));
      console.log('poster', p.model);
    }
  }
  for (const p of list) {
    for (const shot of p.shots) {
      await page.evaluate((o) => window.setup(o), { src: `/models/${p.model}.glb`, ...shot });
      const data = await page.evaluate((o) => window.capture(o), { bg: BG[p.bg], type: 'image/webp', quality: 0.82 });
      await saveDataUrl(data, path.join(publicDir, 'images/projects', p.slug, `${shot.file}.webp`));
      console.log('image', p.slug, shot.file);
    }
  }
}

if (doVideos) {
  const FRAMES = 150; // 5 s at 30 fps
  for (const p of list.filter((x) => x.video)) {
    const cover = p.shots[0];
    const [, phi, radius] = cover.orbit.split(' ');
    const start = parseFloat(cover.orbit);
    await page.evaluate((o) => window.setup(o), { src: `/models/${p.model}.glb`, ...cover });
    const tmp = path.join(os.tmpdir(), `frames-${p.slug}`);
    await rm(tmp, { recursive: true, force: true });
    await mkdir(tmp, { recursive: true });
    for (let i = 0; i < FRAMES; i++) {
      // Ease-in-out a single full turn
      const t = i / FRAMES;
      const theta = start + 360 * (0.5 - 0.5 * Math.cos(Math.PI * t));
      await page.evaluate((o) => window.orbitTo(o), `${theta}deg ${phi} ${radius}`);
      const data = await page.evaluate((o) => window.capture(o), { bg: BG[p.bg], type: 'image/jpeg', quality: 0.9 });
      await saveDataUrl(data, path.join(tmp, `f${String(i).padStart(4, '0')}.jpg`));
    }
    const outBase = path.join(publicDir, 'videos', p.slug);
    await mkdir(path.dirname(outBase), { recursive: true });
    const input = ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(tmp, 'f%04d.jpg'), '-vf', 'scale=1280:-2', '-an'];
    // H.264 MP4 for Safari/iOS and most browsers, VP9 WebM for open-source Chromium/Firefox builds.
    execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${outBase}.mp4`]);
    execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-pix_fmt', 'yuv420p', `${outBase}.webm`]);
    await rm(tmp, { recursive: true, force: true });
    console.log('video', p.slug);
  }
}

await browser.close();
server.close();
