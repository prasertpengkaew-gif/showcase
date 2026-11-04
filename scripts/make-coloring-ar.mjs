// Render ten printable Cozy Thailand pages and compile them into one MindAR target file.
// Run with: npm run make:coloring-ar
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/coloring-ar');
const pagesDir = path.join(outDir, 'pages');
const W = 2000;
const H = 2828;

const mascot = `<g transform="translate(500 635) scale(.72)" fill="none" stroke="#171717" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <path d="M-55-68c-43-47-35-82 4-95-3 28 12 38 34 49m72 46c43-47 35-82-4-95 3 28-12 38-34 49"/>
  <path d="M-88-34c0-67 38-107 88-107s88 40 88 107v31c0 59-36 94-88 94s-88-35-88-94z"/>
  <path d="M-75-6c-27 4-41 23-35 43 13-8 26-7 39 2m142-45c27 4 41 23 35 43-13-8-26-7-39 2"/>
  <path d="M-52-27c13-13 28-13 40 0m24 0c13-13 28-13 40 0"/><ellipse cx="-31" cy="-14" rx="7" ry="10" fill="#171717"/><ellipse cx="31" cy="-14" rx="7" ry="10" fill="#171717"/>
  <path d="M-18 25c10 11 26 11 36 0m-18-9v9m-31 19c9 8 18 8 27 0m20 0c9 8 18 8 27 0M-55 91c-38 49-43 116-7 145 28 23 74 11 83-19 7-23-9-41-29-36-17 5-19 24-5 34m40-106c38 25 47 60 26 86-13 16-35 18-49 6"/>
  <path d="M-53 109c19 9 39 10 58 4m-70 24c20 9 41 10 62 4"/>
</g>`;

const scenes = [
  {
    id: 'morning-market',
    art: `<circle cx="790" cy="225" r="62"/><path d="M790 135v-25m0 230v-25m90-90h26m-232 0h26M135 285c-8-28 17-51 44-45 9-39 64-42 77-6 33-8 57 22 43 51zm520-83c-7-23 12-42 34-37 7-32 54-36 65-5 27-6 47 20 36 42z"/>
    <path d="M84 520V350l120-88 120 88v170m356-12V355l105-76 105 76v153M64 520h280m326-12h265M112 392h55v60h-55zm120 0h55v60h-55zm400-2h48v54h-48zm80 0h48v54h-48z"/>
    ${mascot}
    <path d="M220 774c112 34 446 37 560-4-40 108-121 162-281 164-153 1-239-47-279-160zM255 802c130 33 365 35 490-2M345 885c54 20 108 29 154 29s99-9 153-29M702 774l170-83m-170 83 192-20M96 668h174l-15 86c-42 25-98 25-143 0zm33 0c4-42 71-42 75 0m-89 24h142m-120 23h96m443-42h174l-15 86c-42 25-98 25-143 0zm33 0c4-42 71-42 75 0m-89 24h142m-120 23h96"/>
    <path d="M92 970c70-24 130-24 200 0m420 0c70-24 130-24 200 0M92 1050c70-24 130-24 200 0m420 0c70-24 130-24 200 0M168 1106c22-36 64-42 95-19-26 5-39 17-45 34m516-15c22-36 64-42 95-19-26 5-39 17-45 34"/>`,
  },
  {
    id: 'canal-tea-shop',
    art: `<path d="M120 390h760M160 390V275l160-110 160 110v115m40 0V275l160-110 160 110v115M135 275l185-130 185 130m-10 0 185-130 185 130M210 315h62v75h-62zm170 0h62v75h-62zm170 0h62v75h-62zm170 0h62v75h-62z"/>
    <path d="M168 470c90-45 180-45 270 0m-260 42h250m-220 35h195M535 470c90-45 180-45 270 0m-260 42h250m-220 35h195"/>
    ${mascot}
    <path d="M225 790h550m-480 0v128m410-128v128M260 918h460M392 783v-75h85v75m36 0v-75h85v75M405 682c0-38 70-38 70 0zm112 0c0-38 70-38 70 0zm-18-75c4-50 95-50 100 0m-77-47c-13-24 14-38 25-13 17-27 42-10 21 14"/>
    <path d="M90 1030c80-28 150-28 230 0m360 0c80-28 150-28 230 0M130 1110h180m380 0h180M250 1190h500"/>`,
  },
  {
    id: 'rainy-sweet-shop',
    art: `<path d="M245 270c-10-42 27-77 69-67 13-58 99-65 120-10 47-11 81 32 61 77zm365 3c-8-30 18-55 47-49 9-42 69-46 83-7 36-8 62 25 47 56zM255 390l245-145 245 145M285 390v194h430V390M250 390h500M315 450h65v70h-65zm115 0h65v70h-65zM625 450h65v70h-65z"/>
    <path d="M288 415h424m-400 170v52h372v-52M310 619c60-29 110-29 170 0m40 0c60-29 110-29 170 0"/>
    ${mascot}
    <path d="M198 767c-3-73 53-124 117-116 66 8 89 67 71 123m-166-7c-26 15-30 48-8 64 19-20 41-23 63-8m30-56c14-12 32-12 46 0m-34 22c13 14 29 14 42 0m-78 28c33 16 65 16 98 0m-270 168 22 66m70-67 20 69m650-68-22 66m-70-67-20 69M150 1050c78-26 146-26 224 0m252 0c78-26 146-26 224 0"/>
    <path d="M750 698c35-21 71-22 108 0m-96 36c31-15 61-15 92 0m-475 94c-26-26-20-64 13-76 4 30 21 45 51 46-30 8-48 17-64 30z"/>`,
  },
  {
    id: 'tuk-tuk-ride',
    art: `<path d="M140 495V300h166l97 98v97M140 300l106-98 114 98m-36 0h-91v98h91zm400 195V300h166l97 98v97M624 300l106-98 114 98m-36 0h-91v98h91zM95 520h810M130 540h740"/>
    ${mascot}
    <path d="M165 800h670l-37 164H214zm83 0v-98h119v98m142 0v-98h119v98M214 964c-3 67 89 67 91 0m355 0c3 67 95 67 91 0M130 800l38-91h207l49 91m225 0 38-91h207l49 91M170 854h657M205 906h588"/>
    <path d="M115 1080c120-37 220-37 340 0m90 0c120-37 220-37 340 0M208 1150h140m304 0h140M450 1080c7-43 87-43 94 0"/>`,
  },
  {
    id: 'loy-krathong',
    art: `<path d="M735 226a76 76 0 1 0 76 132 87 87 0 0 1-76-132zM102 520h796M145 520l105-135 105 135m290 0 105-135 105 135M160 520v140m680-140v140M210 430h90m490 0h90"/>
    <path d="M88 735c74-26 138-26 212 0s138 26 212 0 138-26 212 0 138 26 212 0M88 830c74-26 138-26 212 0s138 26 212 0 138-26 212 0 138 26 212 0"/>
    ${mascot}
    <path d="M244 790c46-39 100-40 148 0-44 47-99 47-148 0zm446 0c46-39 100-40 148 0-44 47-99 47-148 0zM316 770l75-42m-23 55 45-28m349 15-75-42m23 55-45-28M400 922h200m-170 42h140M120 1030c80-28 150-28 230 0m300 0c80-28 150-28 230 0M180 1110h140m360 0h140"/>
    <path d="M490 776c0-35 20-64 10-98 32 29 36 62 10 98m-28 0h46m-40 18h34"/>`,
  },
  {
    id: 'mango-garden',
    art: `<path d="M115 540c-20-75 41-126 105-112 21-89 137-99 171-15 71-16 123 49 93 117zm396-30c-18-63 32-109 88-97 18-77 120-85 150-13 62-14 108 43 82 101zM500 430v260m0-170-100-90m101 52 110-104"/>
    <path d="M280 420c-34-34-17-77 22-70 17-42 62-26 50 12 44-18 62 22 24 45m220-32c-28-31-8-69 28-61 18-36 58-16 44 17 39-14 51 23 16 43"/>
    ${mascot}
    <path d="M170 830c84-45 170-45 254 0m-222 38h190M576 830c84-45 170-45 254 0m-222 38h190M220 930h560m-480 0-45 130h500l-45-130m-335 45h260m-220 38h180M112 1110h190m396 0h190M380 1080c0-54 75-54 75 0m90 0c0-54 75-54 75 0"/>
    <path d="M330 700c-18-25-8-52 18-57 4 23 16 34 38 35-23 7-39 13-56 22m275 0c18-25 8-52-18-57-4 23-16 34-38 35 23 7 39 13 56 22"/>`,
  },
  {
    id: 'wooden-canal-house',
    art: `<path d="M105 455h790M150 455V300l350-200 350 200v155M115 300l385-230 385 230M220 310h92v100h-92zm150 0h92v100h-92zm306 0h92v100h-92zm-480 146v140m608-140v140M205 600h590M250 600v186m500-186v186M180 790h640M235 825h530m-466 0v90m402-90v90"/>
    ${mascot}
    <path d="M100 1000c80-27 150-27 230 0m340 0c80-27 150-27 230 0M138 1070h190m344 0h190M260 1140h480M315 1210h370"/>
    <path d="M95 905h160m490 0h160m-750 0 50-65 50 65m490 0 50-65 50 65"/>`,
  },
  {
    id: 'evening-market',
    art: `<path d="M95 470h810M150 470V280h700v190M120 280h760l-50-90H170zM205 280l50-90m100 90 20-90m95 90v-90m95 90-20-90m120 90-50-90M180 330h640M185 470v76m630-76v76M220 360h90v86h-90zm160 0h90v86h-90zm160 0h90v86h-90zm160 0h90v86h-90z"/>
    <path d="M220 175v-65m280 65v-76m280 76v-65m-20-15h40m-320-18h40m-320 18h40"/>
    ${mascot}
    <path d="M180 800h640M245 800v130m510-130v130M210 930h580M310 800c0-44 68-44 68 0zm155 0c0-44 68-44 68 0zm155 0c0-44 68-44 68 0zm-190-70h60m-30-30v60m200-34h60m-30-30v60M100 1050h240m320 0h240m-670 78h170m430 0h170"/>
    <path d="M380 1128c3-63 44-95 94-95s91 32 94 95m-140-40h92m-80 40v60m68-60v60"/>`,
  },
  {
    id: 'garden-stroll',
    art: `<path d="M92 885h816M155 885c35-130 105-194 210-194s175 64 210 194m-400-80h380M180 845c10-82 54-126 129-126s119 44 129 126"/>
    <path d="M120 500c-12-42 25-76 66-67 13-58 99-65 120-10 47-11 81 32 61 77zm520-55c-8-30 18-55 47-49 9-42 69-46 83-7 36-8 62 25 47 56z"/>
    ${mascot}
    <path d="M245 840c0-89 55-149 125-149s125 60 125 149m-218-30c-45 7-66 37-55 74 25-20 47-19 66 2m150-76c43 8 62 39 49 73-22-19-44-20-65-1M280 780h35m130 0h35m-250 150c15 32 15 64 0 96m76-100c14 35 14 69 0 104m544-100c-14 35-14 69 0 104m-76-100c-15 32-15 64 0 96M125 1050h180m390 0h180M260 1130h480"/>
    <path d="M630 850c44-65 102-81 162-52-49 13-75 36-89 68m-31-17c32-34 66-47 105-40"/>`,
  },
  {
    id: 'temple-fair',
    art: `<path d="M115 520h770M150 520V365l150-115 150 115v155M120 365l180-135 180 135m-270 0h180m-155 50h55v70h-55zm100 0h55v70h-55zM570 520V365l140-105 140 105v155M545 365l165-125 165 125m-260 0h190"/>
    <circle cx="500" cy="415" r="120"/><circle cx="500" cy="415" r="22"/><path d="M500 295v98m0 44v98m-120-120h98m44 0h98m-205-85 69 69m32 32 69 69m0-170-69 69m-32 32-69 69"/>
    ${mascot}
    <path d="M95 825h810M180 825v120m640-120v120M145 945h710M190 825l70-90h150l70 90m110 0 70-90h150l70 90M240 860h100m320 0h100m-450 44h100m320 0h100"/>
    <path d="M220 1060c76-28 142-28 218 0m124 0c76-28 142-28 218 0M280 1130h170m100 0h170M360 1210c0-48 140-48 140 0m40 0c0-48 140-48 140 0"/>
    <path d="M170 620v-55m-20 20h40m520 35v-55m-20 20h40m120 35v-55m-20 20h40"/>`,
  },
];

const border = `<rect x="34" y="34" width="932" height="1346" rx="34"/><path d="M82 110h52m-26-26v52M866 110h52m-26-26v52M82 1304h52m-26-26v52M866 1304h52m-26-26v52"/>`;
const pageSvg = (scene) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" role="img" aria-labelledby="title desc"><title id="title">Cozy Thailand — ${scene.id}</title><desc id="desc">Printable black-and-white Cozy Thailand coloring page: ${scene.id.replaceAll('-', ' ')}.</desc><rect width="1000" height="1414" fill="#fff"/><g fill="none" stroke="#171717" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${border}${scene.art}</g></svg>`;
const html = (scene) => `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:#fff}img{display:block;width:${W}px;height:${H}px}</style></head><body><img src="/pages/${scene.id}.svg"></body></html>`;
const bookHtml = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;page-break-after:always}img:last-child{page-break-after:auto}</style></head><body>${scenes.map(({ id }) => `<img src="/pages/${id}.svg">`).join('')}</body></html>`;
const compileHtml = `<!doctype html><html><body><script type="module">
  import { Compiler } from '/__mindar/mindar-image.prod.js';
  window.compile = async (sources) => {
    const images = await Promise.all(sources.map((src) => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; })));
    const compiler = new Compiler();
    await compiler.compileImageTargets(images, (p) => { window.progress = p; });
    return Array.from(new Uint8Array(await compiler.exportData()));
  };
  window.ready = true;
</script></body></html>`;

await mkdir(pagesDir, { recursive: true });
for (const scene of scenes) await writeFile(path.join(pagesDir, `${scene.id}.svg`), pageSvg(scene));

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  try {
    if (url.startsWith('/render/')) {
      const scene = scenes.find(({ id }) => id === url.slice('/render/'.length));
      if (scene) return res.writeHead(200, { 'content-type': 'text/html' }).end(html(scene));
    }
    if (url === '/book') return res.writeHead(200, { 'content-type': 'text/html' }).end(bookHtml);
    if (url === '/compile') return res.writeHead(200, { 'content-type': 'text/html' }).end(compileHtml);
    if (url.startsWith('/__mindar/')) {
      const file = path.join(root, 'src/vendor/mindar', url.slice('/__mindar/'.length));
      const type = file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      return res.writeHead(200, { 'content-type': type }).end(await readFile(file));
    }
    if (url.startsWith('/pages/')) {
      const file = path.join(pagesDir, path.basename(url));
      const type = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
      return res.writeHead(200, { 'content-type': type }).end(await readFile(file));
    }
    res.writeHead(404).end();
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  for (const scene of scenes) {
    await page.goto(`${base}/render/${scene.id}`, { waitUntil: 'networkidle' });
    await page.locator('img').evaluate((img) => img.decode());
    await page.screenshot({ path: path.join(pagesDir, `${scene.id}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`${base}/book`, { waitUntil: 'networkidle' });
  await page.locator('img').last().evaluate((img) => img.decode());
  await page.pdf({ path: path.join(outDir, 'cozy-thailand-coloring-book.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });

  await page.goto(`${base}/compile`);
  await page.waitForFunction(() => window.ready);
  const bytes = await page.evaluate((ids) => window.compile(ids.map((id) => `/pages/${id}.png`)), scenes.map(({ id }) => id));
  const target = Buffer.from(bytes);
  await writeFile(path.join(outDir, 'pages.mind'), target);
  const first = scenes[0];
  await Promise.all([
    writeFile(path.join(outDir, 'page.svg'), pageSvg(first)),
    writeFile(path.join(outDir, 'page.png'), await readFile(path.join(pagesDir, `${first.id}.png`))),
    writeFile(path.join(outDir, 'page.mind'), target),
  ]);
  console.log(`Rendered ${scenes.length} Cozy Thailand coloring pages; compiled ${target.length} bytes of MindAR targets.`);
} finally {
  await browser.close();
  server.close();
}
