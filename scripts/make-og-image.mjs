/** Renders public/og-image.png (1200×630), the preview card shown when a link is shared. */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const cover = async (slug) =>
  `data:image/webp;base64,${(await readFile(`public/images/projects/${slug}/cover.webp`)).toString('base64')}`;
const [a, b, c] = await Promise.all(
  ['lounge-chair-configurator', 'sneaker-launch-experience', 'robotic-workcell-preview'].map(cover),
);
const html = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:radial-gradient(circle at 85% 10%,#1e3a8a 0,#0B1220 55%);color:#fff;font:600 24px system-ui,sans-serif;position:relative;overflow:hidden}
.t{position:absolute;left:72px;top:92px;width:520px}
.k{color:#7aa2ff;letter-spacing:.18em;font-size:22px;font-weight:700}
h1{font:800 76px/1.05 system-ui,sans-serif;margin:22px 0}
p{color:#c5d2ee;font-weight:500;font-size:28px;line-height:1.4}
.c{position:absolute;border-radius:20px;border:2px solid #ffffff22;box-shadow:0 24px 60px #0008;object-fit:cover}
</style>
<div class="t"><div class="k">WEBAR · VR · 3D</div><h1>TheNerdStudio</h1><p>AR, VR and 3D that opens from a link. No app needed.</p></div>
<img class="c" src="${a}" style="left:660px;top:50px;width:440px;height:293px;transform:rotate(3deg)">
<img class="c" src="${b}" style="left:720px;top:300px;width:400px;height:267px;transform:rotate(-3deg)">
<img class="c" src="${c}" style="left:600px;top:380px;width:300px;height:200px;transform:rotate(-6deg)">`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og-image.png' });
await browser.close();
console.log('wrote public/og-image.png');
