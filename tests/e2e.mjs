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
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOCK_ENDPOINT = 'https://forms.example.test/submit';
const ROUTES = [
  '/',
  '/projects',
  '/projects/lounge-chair-configurator',
  '/projects/interactive-brand-mascot',
  '/ar-playground',
  '/services',
  '/about',
  '/contact',
  '/does-not-exist',
];

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
const B = plain.url;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
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
  await page.goto(B + '/ar-playground');
  await viewer().scrollIntoViewIfNeeded();
  await waitForModel();
  ok(await passes(page.waitForFunction(() => !document.querySelector('[role=toolbar] button')?.disabled)), 'viewer toolbar enables after load');
  await page.getByText('Peacock Velvet').click();
  await page.waitForTimeout(300);
  ok((await viewerProp('variantName')) === 'Peacock Velvet', 'chair finish switches variant');
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();

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
    await page.goto(`${B}/projects/${slug}`);
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
  await page.goto(B + '/projects/robotic-workcell-preview');
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
    await page.goto(`${B}/projects/${slug}`);
    await page.getByText('Test it yourself').waitFor();
    ok((await page.locator('video').count()) === 0, `${slug}: shows "Test it yourself" instead of a video`);
    ok(await passes(page.locator('#try-title ~ * [aria-label^="QR code"] svg, section[aria-labelledby="try-title"] [aria-label^="QR code"] svg').first().waitFor()), `${slug}: QR code rendered`);
  }
  await page.getByRole('link', { name: /Go to the 3D viewer/ }).click();
  await page.waitForTimeout(800);
  ok(await page.evaluate(() => Math.abs(document.getElementById('viewer').getBoundingClientRect().top) < 120), '"Go to the 3D viewer" scrolls to the viewer');

  // --- Projects filter -------------------------------------------------------
  const cards = page.locator('main ul.grid > li');
  await page.goto(B + '/projects');
  await cards.first().waitFor();
  ok((await cards.count()) === 9, 'all 9 projects listed');
  await page.getByRole('button', { name: /Real Estate/ }).click();
  await page.waitForTimeout(300);
  ok(page.url().includes('category=real-estate'), 'filter is saved in the URL');
  ok((await cards.count()) === 1, 'Real Estate filter shows 1 project');
  ok((await page.getByRole('button', { name: /Real Estate/ }).getAttribute('aria-pressed')) === 'true', 'active filter has aria-pressed');
  await page.goto(B + '/projects?category=education');
  await cards.first().waitFor();
  ok((await cards.count()) === 2, 'deep link ?category=education shows 2 projects');
  await cards.first().locator('a').click();
  ok(await passes(page.waitForURL(/\/projects\/[a-z-]+$/)), 'project card opens its detail page');

  // --- 404s ------------------------------------------------------------------
  await page.goto(B + '/projects/does-not-exist');
  ok(await passes(page.getByRole('heading', { name: 'Project not found' }).waitFor()), 'unknown project shows not-found');
  await page.goto(B + '/does-not-exist');
  ok(await passes(page.getByRole('heading', { name: 'Page not found' }).waitFor()), 'unknown route shows 404');

  // --- Internal links all resolve -------------------------------------------
  const links = new Set();
  for (const route of ROUTES.slice(0, -1)) {
    await page.goto(B + route);
    await page.locator('footer').waitFor();
    for (const href of await page.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')))) {
      links.add(href.split('#')[0].split('?')[0]);
    }
  }
  for (const href of links) {
    await page.goto(B + href);
    const notFound = await page
      .getByRole('heading', { name: /not found/i })
      .waitFor({ timeout: 1500 })
      .then(() => true, () => false);
    ok(!notFound, `internal link ${href} resolves`);
  }

  // --- Contact form: default email only (mailto) -----------------------------
  await page.goto(B + '/contact');
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
  await page.goto(configured.url + '/contact');
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
  await page.goto(B + '/services');
  await page.getByRole('button', { name: 'Open menu' }).click();
  ok(await page.locator('#mobile-menu').isVisible(), 'mobile menu opens');
  await page.keyboard.press('Escape');
  ok(await page.locator('#mobile-menu').isHidden(), 'mobile menu closes on Escape');
  for (const route of ROUTES) {
    await page.goto(B + route);
    await page.waitForTimeout(600);
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `no horizontal scroll at 390px: ${route}`);
  }

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
  await noGL.close();

  // --- Accessibility (axe-core, WCAG 2.2 A/AA) -------------------------------
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ROUTES) {
    await page.goto(B + route);
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
  await rm(emptyEnvDir, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
