// End-to-end and accessibility checks in headless Chromium.
//
//   npx playwright install chromium   # once
//   npm run test:e2e
//
// Starts two Vite dev servers — one with no contact settings and one with a (mocked)
// form endpoint — then exercises every page. Exits non-zero on any failure.
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, devices } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { AR } from '../src/vendor/aruco/aruco.js';
import { ANON_KEY, startMockSupabase } from './mock-supabase.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOCK_ENDPOINT = 'https://forms.example.test/submit';
const ROUTES = [
  '/',
  '/projects',
  '/projects/lounge-chair-configurator',
  '/projects/interactive-brand-mascot',
  '/ar-playground',
  '/vr-showroom',
  '/face-ar',
  '/print-ar',
  '/hand-gestures',
  '/try-on',
  '/event-booth',
  '/ar-hunt',
  '/motion-game',
  '/marker-chem',
  '/ar-cube',
  '/machine-tags',
  '/virtual-tour',
  '/digital-twin',
  '/map-3d',
  '/demos',
  '/services',
  '/web-apps',
  '/event-ar',
  '/app-design',
  '/cold-room',
  '/gesture-vote',
  '/tms',
  '/enterprise-ai',
  '/about',
  '/contact',
  '/does-not-exist',
];

const markerDict = new AR.Dictionary('ARUCO_MIP_36h12');

/**
 * Replaces the camera with a canvas stream that draws real markers, so the whole tracking
 * pipeline runs without a physical camera. Each marker: { id, cx, cy, edge (px), angle (deg) }.
 */
async function fakeMarkerCamera(page, markers) {
  await page.addInitScript(
    ({ codes, size, markers }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      let n = 0;
      const draw = () => {
        n++;
        ctx.fillStyle = n % 2 ? '#8a8a80' : '#8b8b81'; // changes every frame so the stream keeps producing frames
        ctx.fillRect(0, 0, 1280, 720);
        for (const m of markers) {
          const cell = m.edge / (size + 2);
          ctx.save();
          ctx.translate(m.cx, m.cy);
          ctx.rotate((m.angle * Math.PI) / 180);
          const total = (size + 4) * cell;
          ctx.fillStyle = '#fff';
          ctx.fillRect(-total / 2, -total / 2, total, total);
          ctx.fillStyle = '#000';
          ctx.fillRect(-m.edge / 2, -m.edge / 2, m.edge, m.edge);
          ctx.fillStyle = '#fff';
          const bits = codes[m.id];
          for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++)
              if (bits[r * size + c] === '1') ctx.fillRect(-m.edge / 2 + (c + 1) * cell - 0.3, -m.edge / 2 + (r + 1) * cell - 0.3, cell + 0.6, cell + 0.6);
          ctx.restore();
        }
      };
      draw();
      setInterval(draw, 33);
      const stream = canvas.captureStream(30);
      navigator.mediaDevices.getUserMedia = async () => stream;
    },
    { codes: markerDict.codeList, size: markerDict.markSize - 2, markers },
  );
}

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
};
const passes = (promise) => promise.then(() => true, () => false);

// Each server reads env from an empty directory so a developer's .env.local can't change results.
const emptyEnvDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-env-'));
async function startServer(env) {
  for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key];
  Object.assign(process.env, env);
  const server = await createServer({ root, envDir: emptyEnvDir, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  return { server, url: server.resolvedUrls.local[0].replace(/\/$/, '') };
}

const plain = await startServer({});
const configured = await startServer({
  VITE_FORM_ENDPOINT: MOCK_ENDPOINT,
  VITE_CONTACT_EMAIL: 'hello@example.test',
  VITE_CONTACT_PHONE: '+66 2 123 4567',
});
// A third server connected to a mock Supabase, for the photo booth platform.
const mock = await startMockSupabase();
const live = await startServer({ VITE_SUPABASE_URL: mock.url, VITE_SUPABASE_ANON_KEY: ANON_KEY, VITE_BOOTH_RETRY_MS: '400' });
const B = plain.url;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
// Don't wait for third-party resources (web fonts) to finish; the app renders without them.
const go = (url) => page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('does-not-exist') && r.url() !== MOCK_ENDPOINT) pageErrors.push(`HTTP ${r.status()} ${r.url()}`);
});

const viewer = () => page.locator('model-viewer');
const waitForModel = () =>
  page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 45000 });
const viewerProp = (prop) => page.evaluate((p) => document.querySelector('model-viewer')[p], prop);

try {
  // --- AR Playground ---------------------------------------------------------
  await go(B + '/ar-playground');
  await viewer().scrollIntoViewIfNeeded();
  await waitForModel();
  ok(await passes(page.waitForFunction(() => !document.querySelector('[role=toolbar] button')?.disabled)), 'viewer toolbar enables after load');
  await page.getByText('Peacock Velvet').click();
  await page.waitForTimeout(300);
  ok((await viewerProp('variantName')) === 'Peacock Velvet', 'chair finish switches variant');
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click({ timeout: 120000 });

  await page.getByText('Service Robot', { exact: true }).click();
  await page.waitForTimeout(500);
  await waitForModel();
  ok((await viewerProp('src')).endsWith('/models/robot.glb'), 'robot model selected');
  await page.locator('label', { hasText: 'Wave' }).click();
  await page.waitForTimeout(500);
  ok((await viewerProp('animationName')) === 'Wave', 'robot animation switches to Wave');
  const animations = await viewerProp('availableAnimations');
  ok(['Idle', 'Wave', 'Walking', 'Dance', 'ThumbsUp', 'Yes', 'No', 'Jump'].every((a) => animations.includes(a)), 'listed robot animations exist in the GLB');

  await page.getByText('Scale Model Car', { exact: true }).click();
  await page.waitForTimeout(500);
  await waitForModel();
  ok((await viewerProp('src')).endsWith('/models/car.glb'), 'car model selected');
  ok(await page.getByText('Open this page on a phone or tablet to use AR').isVisible(), 'desktop AR notice shown');
  ok(await passes(page.locator('[aria-label^="QR code"] svg').first().waitFor()), 'desktop AR notice has a QR code');

  // --- Project details: variants / animations match the data -----------------
  const expectations = {
    'lounge-chair-configurator': { variants: ['Mango Velvet', 'Peacock Velvet'] },
    'furnished-unit-staging': { variants: ['Champagne', 'Navy', 'Gray', 'Black', 'Pale Pink'] },
    'sneaker-launch-experience': { variants: ['midnight', 'beach', 'street'] },
    'wildlife-field-lesson': { animations: ['Survey', 'Walk', 'Run'] },
  };
  for (const [slug, expected] of Object.entries(expectations)) {
    await go(`${B}/projects/${slug}`);
    await viewer().scrollIntoViewIfNeeded();
    await waitForModel();
    if (expected.variants) {
      const v = await viewerProp('availableVariants');
      ok(expected.variants.every((x) => v.includes(x)), `${slug}: variants present`);
    } else {
      const a = await viewerProp('availableAnimations');
      ok(expected.animations.every((x) => a.includes(x)), `${slug}: animations present`);
    }
    ok(await page.getByRole('heading', { name: 'Related projects' }).isVisible(), `${slug}: related projects`);
    ok((await page.locator('video').count()) === 1, `${slug}: has demo video`);
  }

  // --- Video and lightbox ----------------------------------------------------
  await go(B + '/projects/robotic-workcell-preview');
  const video = page.locator('video');
  await video.scrollIntoViewIfNeeded();
  await video.evaluate((el) => {
    el.preload = 'auto';
    el.load();
  });
  ok(await passes(page.waitForFunction(() => document.querySelector('video').readyState >= 2, null, { timeout: 15000 })), 'demo video loads');
  await page.getByRole('button', { name: /Enlarge image 2/ }).click();
  ok(await page.locator('dialog[open]').isVisible(), 'gallery lightbox opens');
  await page.keyboard.press('ArrowRight');
  ok((await page.locator('dialog figcaption').textContent()).includes('3 / 4'), 'lightbox arrow-key navigation');
  await page.keyboard.press('Escape');
  ok((await page.locator('dialog[open]').count()) === 0, 'lightbox closes on Escape');

  // --- "Test it yourself" projects -------------------------------------------
  for (const slug of ['scale-model-showroom', 'interactive-brand-mascot', 'stem-robotics-lesson', 'velvet-sofa-product-page']) {
    await go(`${B}/projects/${slug}`);
    await page.getByText('Test it yourself').waitFor();
    ok((await page.locator('video').count()) === 0, `${slug}: shows "Test it yourself" instead of a video`);
    ok(await passes(page.locator('#try-title ~ * [aria-label^="QR code"] svg, section[aria-labelledby="try-title"] [aria-label^="QR code"] svg').first().waitFor()), `${slug}: QR code rendered`);
  }
  await page.getByRole('link', { name: /Go to the 3D viewer/ }).click();
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => Math.abs(document.getElementById('viewer').getBoundingClientRect().top) < 120), '"Go to the 3D viewer" scrolls to the viewer');

  // --- VR Showroom -----------------------------------------------------------
  await go(B + '/vr-showroom');
  ok(await passes(page.locator('[aria-label^="Virtual showroom"] canvas').waitFor({ timeout: 20000 })), 'VR showroom renders a 3D canvas');
  ok(await passes(page.getByText('No VR headset detected').waitFor({ timeout: 10000 })), 'VR status explains no headset is present');
  ok(await page.getByRole('button', { name: 'Enter VR' }).isDisabled(), '"Enter VR" is disabled without a headset');
  ok(await passes(page.locator('[aria-label="QR code that opens the VR Showroom"] svg').waitFor()), 'VR page shows a QR code');

  // --- Face AR ---------------------------------------------------------------
  await go(B + '/face-ar');
  ok(await passes(page.getByText('Camera is off').waitFor()), 'Face AR starts with the camera off');
  // Headless Chromium has no camera permission: the page must explain, not fail silently.
  await page.getByRole('button', { name: 'Start camera' }).click();
  ok(
    await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
    'Face AR explains when the camera is unavailable',
  );
  // A photo without a face runs the real model and reports "no face".
  await page.locator('input[type=file]').setInputFiles(path.join(root, 'public/images/projects/lounge-chair-configurator/cover.webp'));
  ok(await passes(page.getByText('No face was found in that photo').waitFor({ timeout: 60000 })), 'Face AR runs the model on a photo');
  ok(await page.getByRole('button', { name: 'Save photo' }).isDisabled(), 'Save photo is disabled when no face was found');
  await page.getByRole('button', { name: 'Full screen' }).click();
  ok(await passes(page.getByRole('button', { name: 'Exit full screen' }).waitFor()), 'Face AR enters full screen');
  ok((await page.getByRole('button', { name: 'Sunglasses' }).count()) === 1, 'full screen shows effect controls');
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  ok(await passes(page.getByRole('button', { name: 'Full screen' }).waitFor()), 'Face AR leaves full screen');

  // --- Demos hub ---------------------------------------------------------------
  await go(B + '/demos');
  await page.locator('main article').first().waitFor();
  ok((await page.locator('main article').count()) === 19, 'demos hub lists 19 demos');
  ok((await page.getByRole('link', { name: 'Demos' }).first().getAttribute('aria-current')) === 'page', 'Demos nav item is current');

  // --- Print AR --------------------------------------------------------------
  await go(B + '/print-ar');
  ok(await passes(page.getByRole('img', { name: /Sample AR card/ }).waitFor()), 'Print AR shows the sample card');
  ok((await page.getByRole('link', { name: 'Download card (PNG)' }).getAttribute('download')) !== null, 'card can be downloaded');
  await page.getByRole('button', { name: 'Start camera' }).click();
  ok(
    await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
    'Print AR explains when the camera is unavailable',
  );

  // --- Hand gestures -----------------------------------------------------------
  await go(B + '/hand-gestures');
  await page.getByRole('button', { name: 'Start camera' }).click();
  ok(
    await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
    'Hand gestures explains when the camera is unavailable',
  );
  await page.locator('input[type=file]').setInputFiles(path.join(root, 'public/images/projects/lounge-chair-configurator/cover.webp'));
  ok(await passes(page.getByText('No hand gesture was recognised').waitFor({ timeout: 90000 })), 'gesture model runs on a photo');

  // --- Virtual try-on ----------------------------------------------------------
  await go(B + '/try-on');
  await page.getByRole('button', { name: 'Start camera' }).click();
  ok(
    await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
    'Try-on explains when the camera is unavailable',
  );
  await page.locator('input[type=file]').setInputFiles(path.join(root, 'public/images/projects/lounge-chair-configurator/cover.webp'));
  ok(await passes(page.getByText('No person was found in that photo').waitFor({ timeout: 90000 })), 'pose model runs on a photo');
  ok(await page.getByRole('button', { name: 'Save photo' }).isDisabled(), 'try-on Save photo disabled without a person');
  await page.getByRole('button', { name: 'Full screen' }).click();
  ok(await passes(page.getByRole('button', { name: 'Exit full screen' }).waitFor()), 'Try-on enters full screen');
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  ok(await page.getByRole('radio', { name: 'Navy' }).isDisabled(), 'shirt colour is disabled until the T-shirt is selected');
  await page.locator('label', { hasText: 'T-shirt' }).click();
  ok(await page.getByRole('radio', { name: 'Navy' }).isEnabled(), 'selecting the T-shirt enables colours');

  // --- Event photo booth -------------------------------------------------------
  await go(B + '/event-booth');
  ok(await page.getByRole('button', { name: 'Take photo' }).isDisabled(), 'booth shutter disabled before the camera starts');
  await page.locator('input[type=file]').setInputFiles(path.join(root, 'public/images/projects/lounge-chair-configurator/cover.webp'));
  await page.getByRole('button', { name: 'Take photo' }).and(page.locator(':enabled')).first().waitFor({ timeout: 90000 });
  await page.getByLabel('Event name').fill('Acme Expo');
  await page.getByRole('button', { name: 'Take photo' }).first().click();
  ok(await passes(page.getByRole('img', { name: /Acme Expo frame/ }).waitFor({ timeout: 15000 })), 'booth takes a framed photo');
  ok((await page.getByText('Photos taken (this session)').locator('..').textContent())?.includes('1'), 'booth counts photos');
  const boothDl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  ok((await boothDl).suggestedFilename().endsWith('.jpg'), 'booth photo downloads as JPEG');
  await page.getByRole('button', { name: 'Take another' }).click();

  // --- AR scavenger hunt --------------------------------------------------------
  await go(B + '/ar-hunt');
  await page.locator('a[download^="ar-hunt-poster-"]').first().waitFor();
  ok((await page.getByRole('img', { name: /Hunt poster, station/ }).count()) === 3, 'hunt shows three posters');
  ok((await page.locator('a[download^="ar-hunt-poster-"]').count()) === 3, 'hunt posters can be downloaded');
  ok(await passes(page.getByText('0 / 3').waitFor()), 'hunt starts with no stamps');
  await page.getByRole('button', { name: 'Start camera' }).click();
  ok(
    await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
    'hunt explains when the camera is unavailable',
  );

  // --- Motion game -------------------------------------------------------------
  await go(B + '/motion-game');
  await page.getByRole('button', { name: 'Play with mouse or touch' }).click();
  await page.getByRole('button', { name: 'Start round' }).first().click();
  ok(await passes(page.getByText(/^Time: 2\d$/).waitFor({ timeout: 10000 })), 'motion game round starts and the timer runs');
  await page.getByRole('button', { name: 'Stop' }).click();
  ok(await passes(page.getByRole('button', { name: 'Start camera' }).waitFor()), 'motion game can be stopped');
  ok((await page.getByRole('region', { name: 'Open in your browser' }).count()) === 0, 'no in-app browser notice in a normal browser');

  // --- Marker AR (camera replaced by a canvas that draws real markers) ----------
  const markerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const chemPage = await markerCtx.newPage();
  // H, H and O cards touching, slightly tilted: a water molecule.
  await fakeMarkerCamera(chemPage, [
    { id: 4, cx: 640, cy: 420, edge: 170, angle: 8 },
    { id: 0, cx: 430, cy: 250, edge: 170, angle: -10 },
    { id: 1, cx: 850, cy: 250, edge: 170, angle: 15 },
  ]);
  await chemPage.goto(B + '/marker-chem', { waitUntil: 'domcontentloaded' });
  await chemPage.getByRole('button', { name: 'Start camera' }).click();
  ok(await passes(chemPage.getByText('Water', { exact: true }).waitFor({ timeout: 60000 })), 'chemistry cards: H + H + O is recognised as water');
  ok((await chemPage.getByText('H₂O').count()) > 0, 'chemistry cards: the formula is shown');
  const chemDl = chemPage.waitForEvent('download');
  await chemPage.getByRole('button', { name: 'Download printable sheet' }).click();
  ok((await chemDl).suggestedFilename().endsWith('.png'), 'chemistry cards: printable sheet downloads');
  await markerCtx.close();

  const cubeCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const cubePage = await cubeCtx.newPage();
  await fakeMarkerCamera(cubePage, [{ id: 21, cx: 640, cy: 360, edge: 220, angle: 20 }]); // the cube's right face
  await cubePage.goto(B + '/ar-cube', { waitUntil: 'domcontentloaded' });
  await cubePage.getByRole('button', { name: 'Start camera' }).click();
  ok(await passes(cubePage.getByText('Right visible').waitFor({ timeout: 60000 })), 'AR cube: a single face is tracked');
  ok((await cubePage.getByText('Front not visible').count()) === 1, 'AR cube: other faces are reported as not visible');
  const cubeDl = cubePage.waitForEvent('download');
  await cubePage.getByRole('button', { name: 'Download printable sheet' }).click();
  ok((await cubeDl).suggestedFilename().endsWith('.png'), 'AR cube: printable net downloads');
  await cubeCtx.close();

  const tagCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tagPage = await tagCtx.newPage();
  await fakeMarkerCamera(tagPage, [{ id: 33, cx: 640, cy: 420, edge: 200, angle: -6 }]); // sticker on the press
  await tagPage.goto(B + '/machine-tags', { waitUntil: 'domcontentloaded' });
  ok(await passes(tagPage.getByText('Simulated data').first().waitFor()), 'machine tags: data is labelled as simulated');
  await tagPage.getByRole('button', { name: 'Start camera' }).click();
  ok(await passes(tagPage.getByRole('listitem').filter({ hasText: 'PRS-01' }).first().waitFor({ timeout: 60000 })), 'machine tags: the sticker is matched to its machine');
  await tagPage.getByRole('button', { name: 'Trigger a fault (demo)' }).click();
  ok(await passes(tagPage.getByRole('heading', { name: 'Service steps' }).waitFor({ timeout: 10000 })), 'machine tags: a fault shows service steps');
  await tagCtx.close();

  for (const route of ['/marker-chem', '/ar-cube', '/machine-tags']) {
    await go(B + route);
    await page.getByRole('button', { name: 'Start camera' }).click();
    ok(
      await passes(page.getByRole('alert').filter({ hasText: /Camera access was blocked|No camera found/ }).waitFor({ timeout: 20000 })),
      `${route} explains when the camera is unavailable`,
    );
  }

  // --- Photo booth platform: kiosk → upload → QR → guest page (mock Supabase) ------
  const V = live.url;
  const axeSerious = async (pg) => {
    const found = (await new AxeBuilder({ page: pg }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()).violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    for (const v of found) console.log(`     [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    return found;
  };
  const boothCtx = await browser.newContext({ viewport: { width: 1180, height: 820 }, permissions: ['camera'] });
  const kiosk = await boothCtx.newPage();
  await fakeMarkerCamera(kiosk, []); // a plain camera picture; the shutter works without a face
  const ev = mock.event;

  await kiosk.goto(`${V}/booth/acme-launch?k=wrong`, { waitUntil: 'domcontentloaded' });
  ok(await passes(kiosk.getByRole('heading', { name: 'This booth link doesn’t work' }).waitFor({ timeout: 20000 })), 'booth: a wrong kiosk token is refused');
  ok((await axeSerious(kiosk)).length === 0, 'booth: the error screen passes axe');

  await kiosk.goto(`${V}/booth/acme-launch?k=${ev.kiosk_token}`, { waitUntil: 'domcontentloaded' });
  ok(await passes(kiosk.getByRole('heading', { name: 'Acme Launch Night' }).waitFor({ timeout: 20000 })), 'booth: the event loads with the right token');
  ok((await axeSerious(kiosk)).length === 0, 'booth: the setup screen passes axe');
  await kiosk.getByRole('button', { name: 'Start booth' }).click();
  await kiosk.getByRole('button', { name: 'Take photo' }).waitFor({ timeout: 90000 });
  await kiosk.getByRole('button', { name: 'Take photo' }).click();
  ok(await passes(kiosk.getByText('Ready — scan now').waitFor({ timeout: 30000 })), 'booth: a photo is taken and uploaded');
  const linkText = await kiosk.locator('p.break-all').textContent();
  const code = linkText.match(/\/p\/([a-z2-7]{12})$/)?.[1];
  const stored = mock.state.photos.find((p) => p.code === code);
  ok(stored?.status === 'ready', 'booth: the photo is registered, uploaded and confirmed on the server');
  const bytes = mock.state.objects.get(`photos/${stored?.path}`)?.bytes;
  ok(bytes && bytes[0] === 0xff && bytes[1] === 0xd8, 'booth: the uploaded file is a JPEG');
  ok(linkText.startsWith(V + '/p/'), 'booth: the QR link points at the guest page');

  const guestCtx = await browser.newContext({ ...devices['iPhone 13'] });
  const guest = await guestCtx.newPage();
  await guest.goto(linkText, { waitUntil: 'domcontentloaded' });
  await guest.getByRole('link', { name: 'Download' }).waitFor({ timeout: 20000 });
  ok((await guest.getByRole('link', { name: 'Download' }).getAttribute('href')).includes('download='), 'guest: the download link saves the file');
  ok(await passes(guest.waitForFunction(() => [...document.images].some((i) => i.complete && i.naturalWidth > 100), null, { timeout: 15000 })), 'guest: the photo is shown');
  ok(!(await guest.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'guest: no horizontal scroll on a phone');
  ok((await axeSerious(guest)).length === 0, 'guest: the photo page passes axe');
  ok((await guest.getByText('Available until').count()) === 1, 'guest: the expiry date is shown');
  await guest.getByRole('button', { name: 'Delete my photo' }).click();
  await guest.getByRole('button', { name: 'Yes, delete' }).click();
  ok(await passes(guest.getByText('Your photo was deleted.').waitFor({ timeout: 10000 })), 'guest: deleting the photo works');
  ok(mock.state.photos.find((p) => p.code === code)?.status === 'deleted', 'guest: the server marks it deleted');
  await guest.reload({ waitUntil: 'domcontentloaded' });
  ok(await passes(guest.getByRole('heading', { name: 'We can’t find this photo' }).waitFor({ timeout: 10000 })), 'guest: a deleted photo is gone');
  await guest.goto(`${V}/p/aaaaaaaaaaaa`, { waitUntil: 'domcontentloaded' });
  ok(await passes(guest.getByRole('heading', { name: 'We can’t find this photo' }).waitFor({ timeout: 10000 })), 'guest: an unknown code says so');
  ok((await axeSerious(guest)).length === 0, 'guest: the not-found page passes axe');

  // No connection: the photo is kept and uploaded once the connection is back.
  await kiosk.getByRole('button', { name: 'Done' }).click();
  mock.state.failUploads = true;
  await kiosk.getByRole('button', { name: 'Take photo' }).click();
  ok(await passes(kiosk.getByText(/Waiting for the connection/).waitFor({ timeout: 30000 })), 'booth: with no connection the guest is told the QR will work in a moment');
  const code2 = (await kiosk.locator('p.break-all').textContent()).match(/\/p\/([a-z2-7]{12})$/)[1];
  await guest.goto(`${V}/p/${code2}`, { waitUntil: 'domcontentloaded' });
  ok(await passes(guest.getByRole('heading', { name: 'Your photo is almost ready' }).waitFor({ timeout: 10000 })), 'guest: an unfinished upload shows "almost ready"');
  mock.state.failUploads = false;
  ok(await passes(kiosk.getByText('Ready — scan now').waitFor({ timeout: 30000 })), 'booth: the queued photo uploads by itself when the connection returns');
  ok(await passes(guest.getByRole('link', { name: 'Download' }).waitFor({ timeout: 30000 })), 'guest: the page picks the photo up without a reload');

  // Photo limit reached: staff are told, the photo is kept, and it uploads once the limit is raised.
  await kiosk.getByRole('button', { name: 'Done' }).click();
  mock.event.max_photos = mock.state.photos.filter((p) => p.event_id === ev.id && p.status !== 'deleted').length;
  await kiosk.getByRole('button', { name: 'Take photo' }).click();
  await kiosk.getByText(/Waiting for the connection/).waitFor({ timeout: 30000 });
  await kiosk.keyboard.press('Shift+S');
  ok(await passes(kiosk.getByText(/photo limit for this event is used up/).waitFor({ timeout: 15000 })), 'booth: staff see that the photo limit is used up');
  ok((await axeSerious(kiosk)).length === 0, 'booth: the staff panel passes axe');
  mock.event.max_photos = null;
  ok(await passes(kiosk.getByText('All photos saved').first().waitFor({ timeout: 30000 })), 'booth: once the limit is raised the waiting photo uploads');
  await kiosk.getByRole('button', { name: 'Stop booth' }).click();
  ok(await passes(kiosk.getByRole('button', { name: 'Start booth' }).waitFor()), 'booth: staff can stop the booth');

  // A customer's own frame image, and a frame that cannot be loaded.
  ev.config.frame = { kind: 'image', url: `${mock.url}/storage/v1/object/public/branding/frame.png` };
  await kiosk.goto(`${V}/booth/acme-launch?k=${ev.kiosk_token}`, { waitUntil: 'domcontentloaded' });
  await kiosk.getByRole('button', { name: 'Start booth' }).click();
  await kiosk.getByRole('button', { name: 'Take photo' }).waitFor({ timeout: 90000 });
  ok(mock.state.requests.includes('GET /storage/v1/object/public/branding/frame.png'), 'booth: the customer frame image is loaded');
  await kiosk.keyboard.press('Shift+S');
  ok((await kiosk.getByText(/custom frame could not be loaded/).count()) === 0, 'booth: a valid frame raises no warning');
  ev.config.frame = { kind: 'image', url: `${mock.url}/storage/v1/object/public/branding/missing.png` };
  await kiosk.goto(`${V}/booth/acme-launch?k=${ev.kiosk_token}`, { waitUntil: 'domcontentloaded' });
  await kiosk.getByRole('button', { name: 'Start booth' }).click();
  await kiosk.getByRole('button', { name: 'Take photo' }).waitFor({ timeout: 90000 });
  await kiosk.keyboard.press('Shift+S');
  ok(await passes(kiosk.getByText(/custom frame could not be loaded/).waitFor({ timeout: 10000 })), 'booth: a frame that cannot be loaded is reported to staff');
  await boothCtx.close();
  await guestCtx.close();

  // Demo mode (no Supabase): photos stay on the device and the pages say so.
  const demoCtx = await browser.newContext({ viewport: { width: 1180, height: 820 }, permissions: ['camera'] });
  const demo = await demoCtx.newPage();
  await fakeMarkerCamera(demo, []);
  await demo.goto(`${B}/booth/demo`, { waitUntil: 'domcontentloaded' });
  ok(await passes(demo.getByText(/Demo mode: photos stay on this device/).waitFor({ timeout: 20000 })), 'demo booth: says photos stay on the device');
  ok((await axeSerious(demo)).length === 0, 'demo booth: the setup screen passes axe');
  await demo.getByRole('button', { name: 'Start booth' }).click();
  await demo.getByRole('button', { name: 'Take photo' }).waitFor({ timeout: 90000 });
  await demo.getByRole('button', { name: 'Take photo' }).click();
  ok(await passes(demo.getByText('Ready — scan now').waitFor({ timeout: 30000 })), 'demo booth: a photo is "uploaded" on the device');
  const demoLink = await demo.locator('p.break-all').textContent();
  await demo.goto(demoLink, { waitUntil: 'domcontentloaded' });
  ok(await passes(demo.getByText(/Demo mode: this photo exists only on the device/).waitFor({ timeout: 20000 })), 'demo guest page: says the photo exists only on this device');
  await demo.goto(`${B}/booth/other`, { waitUntil: 'domcontentloaded' });
  ok(await passes(demo.getByRole('heading', { name: 'This booth link doesn’t work' }).waitFor({ timeout: 10000 })), 'demo booth: other event names are not valid');
  await demoCtx.close();

  // --- In-app browsers -----------------------------------------------------------
  const lineUA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 Line/14.10.0';
  const lineCtx = await browser.newContext({ userAgent: lineUA, viewport: { width: 390, height: 844 } });
  const lp = await lineCtx.newPage();
  await lp.goto(B + '/face-ar', { waitUntil: 'domcontentloaded' });
  const notice = lp.getByRole('region', { name: 'Open in your browser' });
  ok(await passes(notice.waitFor()), 'LINE in-app browser shows the notice');
  ok((await notice.getByRole('link', { name: /Open in browser/ }).getAttribute('href'))?.includes('openExternalBrowser=1'), 'LINE link opens the external browser');
  await notice.getByRole('button', { name: 'Close' }).click();
  ok((await notice.count()) === 0, 'in-app notice can be dismissed');
  await lineCtx.close();
  const fbCtx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]',
    viewport: { width: 390, height: 844 },
  });
  const fp = await fbCtx.newPage();
  await fp.goto(B + '/', { waitUntil: 'domcontentloaded' });
  const fbNotice = fp.getByRole('region', { name: 'Open in your browser' });
  ok(await passes(fbNotice.getByRole('button', { name: 'Copy link' }).waitFor()), 'Facebook on iPhone offers to copy the link');
  ok((await fbNotice.getByRole('link').count()) === 0, 'no broken "open" link on iOS Facebook');
  await fbCtx.close();

  // --- Digital twin ------------------------------------------------------------
  await go(B + '/digital-twin');
  ok(await passes(page.getByText('Simulated data').first().waitFor()), 'twin labels its data as simulated');
  ok(await passes(page.getByText('Line output').first().waitFor()), 'twin shows KPI tiles');
  const twinRows = page.locator('table tbody tr');
  await twinRows.first().waitFor();
  ok((await twinRows.count()) === 6, 'twin table lists 6 machines');
  await page.getByRole('button', { name: 'Inspect PCK-01' }).click();
  ok(await passes(page.getByRole('heading', { name: 'PCK-01 temperature, last 60 s' }).waitFor()), 'Inspect selects a machine');

  // --- 3D map ---------------------------------------------------------------------
  await go(B + '/map-3d');
  ok(await passes(page.getByText('Nerd City is made up').waitFor()), '3D map: says the city is a sample');
  await page.locator('canvas[aria-label]').waitFor({ timeout: 60000 });
  const places = page.getByRole('list', { name: 'Places' }).getByRole('button');
  ok((await places.count()) === 21, '3D map: lists all 21 places');
  await page.getByRole('searchbox', { name: 'Search places' }).fill('museum');
  ok((await places.count()) === 1 && (await places.first().textContent()).includes('City Museum'), '3D map: search filters the places');
  await page.getByRole('searchbox', { name: 'Search places' }).fill('พิพิธภัณฑ์');
  ok((await places.count()) === 1, '3D map: search also finds Thai names');
  await page.getByRole('searchbox', { name: 'Search places' }).fill('');
  await page.getByRole('button', { name: 'Parks', exact: true }).click();
  ok((await places.count()) === 18 && (await page.getByRole('button', { name: 'Parks', exact: true }).getAttribute('aria-pressed')) === 'false', '3D map: a category can be switched off');
  await page.getByRole('button', { name: 'Parks', exact: true }).click();
  await places.filter({ hasText: 'Skyline Hotel' }).click();
  ok(await passes(page.getByRole('heading', { name: 'Skyline Hotel', level: 2 }).waitFor()), '3D map: selecting a place opens its card');
  ok(await passes(page.getByText(/\d+ m · about \d+ min on foot · \d+ min by car/).waitFor()), '3D map: shows the route length and times from the start');
  ok(await passes(page.getByRole('heading', { name: 'Within a 10-minute walk' }).waitFor()), '3D map: lists what is within a 10-minute walk');
  const routeText = await page.getByText(/\d+ m · about \d+ min on foot/).textContent();
  await page.getByRole('button', { name: 'Use as start' }).click();
  ok(await passes(page.getByText('This is the start point.').waitFor()), '3D map: a place can be made the start point');
  ok((await page.getByText(/\d+ m · about \d+ min on foot/).count()) === 0 && routeText.length > 0, '3D map: the route disappears when the place is the start');
  await page.getByRole('button', { name: 'Hide walking time' }).click();
  ok((await page.getByRole('button', { name: 'Walking time', exact: true }).getAttribute('aria-pressed')) === 'false', '3D map: walking time can be hidden');
  const nightBtn = page.getByRole('button', { name: 'Time of day: Day' });
  await nightBtn.click();
  ok(await passes(page.getByRole('button', { name: 'Time of day: Night' }).waitFor()), '3D map: switches to night');
  ok((await page.getByRole('button', { name: 'Reset view' }).count()) === 1 && (await page.getByRole('button', { name: /Mini-map/ }).count()) === 1, '3D map: view controls and the mini-map are there');
  await page.getByRole('button', { name: 'Zoom in' }).click({ timeout: 120000 });
  await page.getByRole('button', { name: '2D' }).click({ timeout: 120000 });
  await page.getByRole('button', { name: /Mini-map/ }).click({ position: { x: 40, y: 40 }, timeout: 120000 });
  ok(await passes(page.locator('canvas[aria-label]').waitFor()), '3D map: the view can be zoomed, flattened and moved from the mini-map');

  // --- Virtual tour ------------------------------------------------------------
  await go(B + '/virtual-tour');
  const tour = page.locator('[aria-label^="Interactive 360° panorama"]');
  await tour.scrollIntoViewIfNeeded();
  ok(await passes(page.getByText('Loading panorama').waitFor({ state: 'hidden', timeout: 60000 })), 'tour panorama loads');
  // The door may be outside the current view; trigger its (hidden) label directly.
  await page.getByRole('button', { name: 'Go to Creative studio', includeHidden: true }).dispatchEvent('click');
  ok(await passes(page.locator('[aria-label="Interactive 360° panorama: Creative studio"]').waitFor({ timeout: 10000 })), 'door hotspot moves to the next room');
  // The new room's hotspots mount once its panorama has loaded.
  await page.getByText('Loading panorama').waitFor({ state: 'hidden', timeout: 60000 }).catch(() => {});
  const robotSpot = page.getByRole('button', { name: 'Service robot', includeHidden: true });
  await robotSpot.waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
  await robotSpot.dispatchEvent('click');
  ok(await passes(page.getByRole('dialog').getByRole('link', { name: 'Open in 3D & AR' }).waitFor({ timeout: 5000 })), 'info hotspot opens a product card');
  await page.getByRole('button', { name: /Car showroom/ }).last().click();
  ok(await passes(page.locator('[aria-label="Interactive 360° panorama: Car showroom"]').waitFor({ timeout: 10000 })), 'room list switches rooms');

  // --- Language toggle -------------------------------------------------------
  await go(B + '/projects');
  await page.getByRole('button', { name: 'เปลี่ยนเป็นภาษาไทย' }).click();
  ok((await page.evaluate(() => document.documentElement.lang)) === 'th', 'language toggle sets <html lang="th">');
  ok(await passes(page.getByRole('heading', { name: 'ผลงานที่เปิด หมุน และวางได้จริง' }).waitFor({ timeout: 5000 })), 'page text switches to Thai');
  ok(await passes(page.getByRole('button', { name: /อสังหาริมทรัพย์/ }).waitFor({ timeout: 5000 })), 'category filters are translated');
  await page.reload();
  ok((await page.evaluate(() => document.documentElement.lang)) === 'th', 'language choice persists after reload');
  for (const route of ['/', '/projects/interactive-brand-mascot', '/vr-showroom', '/contact']) {
    await go(B + route);
    await page.locator('footer').waitFor();
    await page.waitForTimeout(800);
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    ok(serious.length === 0, `axe (Thai) ${route}: ${serious.length} serious/critical`);
    for (const v of serious) console.log(`     [${v.impact}] ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  await page.getByRole('button', { name: 'Switch to English' }).click();
  ok((await page.evaluate(() => document.documentElement.lang)) === 'en', 'toggle switches back to English');

  // --- Projects filter -------------------------------------------------------
  const cards = page.locator('main ul.grid > li');
  await go(B + '/projects');
  await cards.first().waitFor();
  ok((await cards.count()) === 9, 'all 9 projects listed');
  await page.getByRole('button', { name: /Real Estate/ }).click();
  await page.waitForTimeout(300);
  ok(page.url().includes('category=real-estate'), 'filter is saved in the URL');
  ok((await cards.count()) === 1, 'Real Estate filter shows 1 project');
  ok((await page.getByRole('button', { name: /Real Estate/ }).getAttribute('aria-pressed')) === 'true', 'active filter has aria-pressed');
  await go(B + '/projects?category=education');
  await cards.first().waitFor();
  ok((await cards.count()) === 2, 'deep link ?category=education shows 2 projects');
  await cards.first().locator('a').click();
  ok(await passes(page.waitForURL(/\/projects\/[a-z-]+$/)), 'project card opens its detail page');

  // --- 404s ------------------------------------------------------------------
  await go(B + '/projects/does-not-exist');
  ok(await passes(page.getByRole('heading', { name: 'Project not found' }).waitFor()), 'unknown project shows not-found');
  await go(B + '/does-not-exist');
  ok(await passes(page.getByRole('heading', { name: 'Page not found' }).waitFor()), 'unknown route shows 404');

  // --- Internal links all resolve -------------------------------------------
  const links = new Set();
  for (const route of ROUTES.slice(0, -1)) {
    await go(B + route);
    await page.locator('footer').waitFor();
    for (const href of await page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')))) {
      links.add(href.split('#')[0].split('?')[0]);
    }
  }
  for (const href of links) {
    await go(B + href);
    const notFound = await page
      .getByRole('heading', { name: /not found/i })
      .waitFor({ timeout: 1500 })
      .then(() => true, () => false);
    ok(!notFound, `internal link ${href} resolves`);
  }

  // --- Contact form: default email only (mailto) -----------------------------
  await go(B + '/contact');
  ok(await passes(page.getByText('How this form works').waitFor()), 'email-only form explains it opens the email app');
  ok(await page.locator('a[href="mailto:thenerdstudio@gmail.com"]').first().isVisible(), 'default contact email is shown');
  await page.getByLabel('Work email').fill('bad');
  await page.getByLabel('Work email').blur();
  ok(await page.getByText('Enter an email address like').isVisible(), 'email validated on blur');
  ok((await page.getByLabel('Work email').getAttribute('aria-invalid')) === 'true', 'invalid field has aria-invalid');
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Work email').fill('ada@example.com');
  await page.getByLabel('Project type').selectOption('Product');
  await page.getByLabel('Project details').fill('We want a chair configurator with AR on our product pages.');
  await page.getByRole('button', { name: 'Open in my email app' }).click();
  ok(await passes(page.getByText('Check your email app').waitFor()), 'mailto submit says nothing is sent until the visitor presses send');

  // --- Contact form: endpoint configured (mocked) ---------------------------
  let posted = null;
  let failNext = false;
  await page.route(MOCK_ENDPOINT, async (route) => {
    posted = JSON.parse(route.request().postData());
    await route.fulfill(
      failNext
        ? { status: 500, body: 'error' }
        : { status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'access-control-allow-origin': '*' } },
    );
  });
  const fill = async () => {
    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Work email').fill('ada@example.com');
    await page.getByLabel('Project type').selectOption('Product');
    await page.getByLabel('Project details').fill('We want a chair configurator with AR on our product pages.');
  };
  await go(configured.url + '/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  ok(await page.getByText(/Please fix these 4 fields/).isVisible(), 'empty submit shows an error summary');
  ok((await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'alert', 'error summary receives focus');
  await fill();
  await page.getByRole('button', { name: 'Send message' }).click();
  ok(await passes(page.getByText('Message sent').waitFor()), 'successful POST shows "Message sent"');
  ok(posted?.email === 'ada@example.com' && posted?.projectType === 'Product', 'form posts the expected JSON');
  failNext = true;
  await fill();
  await page.getByRole('button', { name: 'Send message' }).click();
  ok(await passes(page.getByText(/wasn't sent/).waitFor()), 'server error is reported, not hidden');
  ok((await page.locator('a[href="tel:+6621234567"]').count()) > 0, 'configured phone becomes a tel: link');

  // --- Mobile layout ---------------------------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await go(B + '/services');
  await page.getByRole('button', { name: 'Open menu' }).click();
  ok(await page.locator('#mobile-menu').isVisible(), 'mobile menu opens');
  await page.keyboard.press('Escape');
  ok(await page.locator('#mobile-menu').isHidden(), 'mobile menu closes on Escape');
  for (const route of ROUTES) {
    await go(B + route);
    await page.waitForTimeout(600);
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `no horizontal scroll at 390px: ${route}`);
  }

  // --- AR on phones -----------------------------------------------------------
  // Regression: `ar=""` was set as a property (false) by React 19, so AR never activated.
  // (iOS Quick Look needs real Safari's <a rel="ar"> support, so it can't be emulated here.)
  for (const [name, device] of [['Android', 'Pixel 7']]) {
    const phone = await browser.newContext({ ...devices[device] });
    const pp = await phone.newPage();
    await pp.goto(B + '/ar-playground', { waitUntil: 'domcontentloaded' });
    ok(await passes(pp.getByText('AR is available on this device').waitFor({ timeout: 60000 })), `${name}: AR is offered`);
    await phone.close();
  }
  const anim = await browser.newPage();
  await anim.goto(B + '/projects/interactive-brand-mascot', { waitUntil: 'domcontentloaded' });
  await anim.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 45000 });
  ok(await anim.locator('model-viewer').evaluate((e) => e.autoplay === true), 'animated model autoplays');
  await anim.close();

  // --- Reduced motion --------------------------------------------------------
  const reduced = await browser.newContext({ reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  await rp.goto(B + '/ar-playground');
  await rp.locator('model-viewer').scrollIntoViewIfNeeded();
  await rp.waitForFunction(() => document.querySelector('model-viewer')?.loaded, null, { timeout: 45000 });
  ok(!(await rp.locator('model-viewer').evaluate((e) => e.hasAttribute('auto-rotate'))), 'reduced motion: no auto-rotate');
  ok(await rp.getByRole('button', { name: /auto-rotate/ }).isDisabled(), 'reduced motion: auto-rotate toggle disabled');
  await reduced.close();

  // --- No WebGL fallback ----------------------------------------------------
  const noGL = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const np = await noGL.newPage();
  await np.goto(B + '/');
  await np.waitForTimeout(1500);
  ok((await np.locator('section[aria-labelledby="hero-title"] img').count()) === 1, 'no WebGL: hero shows a still image');
  await np.goto(B + '/ar-playground');
  ok(await passes(np.getByText(/WebGL turned off/).waitFor({ timeout: 10000 })), 'no WebGL: viewer explains why');
  await np.goto(B + '/map-3d');
  ok(await passes(np.getByText(/3D graphics are not available/).waitFor({ timeout: 10000 })), 'no WebGL: the 3D map explains why it cannot be shown');
  ok((await np.getByRole('list', { name: 'Places' }).getByRole('button').count()) === 21, 'no WebGL: the list of places still works');
  await noGL.close();

  // --- Accessibility (axe-core, WCAG 2.2 A/AA) -------------------------------
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ROUTES) {
    await go(B + route);
    await page.locator('footer').waitFor();
    await page.waitForTimeout(1000);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    ok(serious.length === 0, `axe ${route}: ${serious.length} serious/critical, ${violations.length - serious.length} minor`);
    for (const v of violations) {
      console.log(`     [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
  }

  ok(pageErrors.length === 0, `no uncaught page errors or failed requests${pageErrors.length ? ':\n  ' + [...new Set(pageErrors)].join('\n  ') : ''}`);
} catch (err) {
  failures++;
  console.error('FAIL unexpected error:', err);
} finally {
  await browser.close();
  await plain.server.close();
  await configured.server.close();
  await live.server.close();
  await mock.close();
  await rm(emptyEnvDir, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
