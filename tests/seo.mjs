/** Checks the built site (run `npm run build` first): static HTML per page, sitemap, robots,
 *  Thai at the existing URLs and English at /en, with hreflang, canonical and share images.
 *  The static server mirrors production: a real file, else spa.html for /booth/:slug and /p/:code,
 *  else 404.html with status 404. It must not fall back to the prerendered homepage. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { chromium } from 'playwright';

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) failed++;
};

const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));
const privateSources = ['/booth/:slug', '/booth/:slug/', '/p/:code', '/p/:code/'];
const rewrites = vercel.rewrites ?? [];
check(
  rewrites.length === privateSources.length &&
    rewrites.every((rule, i) => rule.source === privateSources[i] && rule.destination === '/spa.html'),
  'vercel.json rewrites only /booth/:slug and /p/:code to /spa.html',
);
check(
  !rewrites.some((rule) => rule.destination === '/index.html'),
  'vercel.json does not rewrite anything to the homepage',
);
for (const source of privateSources) {
  const value = (vercel.headers ?? [])
    .find((block) => block.source === source)
    ?.headers?.find((header) => header.key === 'X-Robots-Tag')?.value;
  check(value === 'noindex, nofollow', `vercel.json sets X-Robots-Tag on ${source}`);
}
const redirectRules = (await readFile('public/_redirects', 'utf8'))
  .split('\n')
  .map((line) => line.replace(/#.*/, '').trim())
  .filter(Boolean)
  .map((line) => line.split(/\s+/));
check(
  redirectRules.length === privateSources.length &&
    privateSources.every((source) => redirectRules.some(([src, dest, code]) => src === source && dest === '/spa.html' && code === '200')),
  '_redirects rewrites only the private routes to /spa.html (no catch-all to /index.html)',
);

// Keep these patterns in sync with the sources above. Files win, then these rewrites, then 404.html.
const privateRoutes = [
  [/^\/booth\/[^/]+$/, true],
  [/^\/booth\/[^/]+\/$/, true],
  [/^\/p\/[^/]+$/, true],
  [/^\/p\/[^/]+\/$/, true],
];
const distRoot = join(process.cwd(), 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.wasm': 'application/wasm' };

async function existingFile(pathname) {
  const rel = pathname === '/' ? '' : normalize(pathname).replace(/^[/\\]+/, '');
  if (rel.split(/[/\\]/).includes('..')) return null;
  const base = join(distRoot, rel);
  if (base !== distRoot && !base.startsWith(distRoot + sep)) return null;
  for (const file of [base, join(base, 'index.html')]) {
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = await existingFile(pathname);
  const send = async (status, bodyFile, extra = {}) => {
    res.writeHead(status, { 'content-type': types[extname(bodyFile)] ?? 'application/octet-stream', ...extra });
    res.end(await readFile(bodyFile));
  };
  if (file) return send(200, file);
  if (privateRoutes.some(([re]) => re.test(pathname))) {
    return send(200, join(distRoot, 'spa.html'), { 'x-robots-tag': 'noindex, nofollow' });
  }
  const missing = join(distRoot, '404.html');
  try {
    if ((await stat(missing)).isFile()) return send(404, missing);
  } catch {
    // fall through
  }
  res.writeHead(404, { 'content-type': 'text/plain' }).end('missing 404.html');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const site = (await readFile('dist/robots.txt', 'utf8')).match(/Sitemap: (\S+)\/sitemap\.xml/)[1];
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(site, '') || '/');
const contentPath = (path) => (path === '/en' ? '/' : path.startsWith('/en/') ? path.slice(3) : path);
const isEnglish = (path) => path === '/en' || path.startsWith('/en/');
const thaiPaths = paths.filter((path) => !isEnglish(path));
const englishPaths = new Set(paths.filter(isEnglish));
check(paths.length >= 50 && paths.length === thaiPaths.length * 2, `sitemap lists ${paths.length} pages in both languages`);
check(!/\/(booth|p)\//.test(sitemap), 'sitemap leaves out booth and guest-photo pages');
check(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'sitemap declares the xhtml namespace');
for (const path of thaiPaths) {
  const en = path === '/' ? '/en' : `/en${path}`;
  check(englishPaths.has(en), `sitemap includes the English URL ${en}`);
}
for (const block of sitemap.split('<url>').slice(1)) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '';
  const path = loc.replace(site, '') || '/';
  const bare = contentPath(path);
  const thUrl = site + (bare === '/' ? '/' : bare);
  const enUrl = site + (bare === '/' ? '/en' : `/en${bare}`);
  const links = Object.fromEntries([...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  check(
    links.th === thUrl && links.en === enUrl && links['x-default'] === thUrl,
    `sitemap alternates for ${path}`,
  );
}

function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') {
    return { type: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const length = buf.readUInt16BE(offset + 2);
      const isFrame = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcf);
      if (isFrame) return { type: 'image/jpeg', height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
  }
  return null;
}

const decode = (value) => value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const shareByPage = new Map();

const titles = new Set();
const descriptions = new Set();
const pageTexts = new Map();
let homeTitle = '';
let homeHtml = '';
for (const path of paths) {
  const res = await fetch(base + path);
  const html = await res.text();
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  if (path === '/') {
    homeTitle = title;
    homeHtml = html;
  }
  const english = isEnglish(path);
  const bare = contentPath(path);
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const thUrl = site + (bare === '/' ? '/' : bare);
  const enUrl = site + (bare === '/' ? '/en' : `/en${bare}`);
  const expectedCanonical = english ? enUrl : thUrl;
  const alternates = Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
  );
  const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';
  const twitterImage = html.match(/<meta name="twitter:image" content="([^"]*)"/)?.[1] ?? '';
  const ogWidth = Number(html.match(/<meta property="og:image:width" content="(\d+)"/)?.[1] ?? 0);
  const ogHeight = Number(html.match(/<meta property="og:image:height" content="(\d+)"/)?.[1] ?? 0);
  const ogType = html.match(/<meta property="og:image:type" content="([^"]*)"/)?.[1] ?? '';
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const problems = [];
  if (res.status !== 200) problems.push(`status ${res.status}`);
  if (!html.includes(`<html lang="${english ? 'en' : 'th'}">`)) problems.push(`lang is not ${english ? 'en' : 'th'}`);
  if ((html.match(/<h1>/g) ?? []).length !== 1) problems.push('needs exactly one h1');
  if (english) {
    if (/[฀-๿]/.test(title) || title.length < 10 || title.length > 75) problems.push(`title: ${title}`);
  } else if (!/[฀-๿]/.test(title) || title.length > 75) problems.push(`title: ${title}`);
  if (desc.length < 50 || desc.length > 220) problems.push(`description length ${desc.length}`);
  if (canonical !== expectedCanonical) problems.push(`canonical ${canonical}`);
  if (html.match(/<meta property="og:url" content="([^"]*)"/)?.[1] !== expectedCanonical) problems.push('og:url');
  if (alternates.th !== thUrl || alternates.en !== enUrl || alternates['x-default'] !== thUrl) problems.push(`hreflang ${JSON.stringify(alternates)}`);
  if (html.match(/<meta property="og:locale" content="([^"]*)"/)?.[1] !== (english ? 'en_US' : 'th_TH')) problems.push('og:locale');
  if (!ogImage.startsWith(`${site}/`) || twitterImage !== ogImage) problems.push(`share image ${ogImage}`);
  if (ogWidth < 1200 || ogHeight < 630) problems.push(`share image ${ogWidth}x${ogHeight}`);
  const imagePath = ogImage.replace(site, '');
  let imageFile;
  try {
    imageFile = await readFile(join('dist', imagePath.replace(/^\//, '')));
  } catch {
    problems.push(`missing image file ${imagePath}`);
  }
  if (imageFile) {
    const size = imageSize(imageFile);
    if (!size || size.width !== ogWidth || size.height !== ogHeight || size.type !== ogType) {
      problems.push(`image file ${size ? `${size.type} ${size.width}x${size.height}` : 'unreadable'} vs ${ogType} ${ogWidth}x${ogHeight}`);
    }
    if (imagePath === '/og-image.png' && size?.type !== 'image/png') problems.push('default share image is not a PNG');
    if (imagePath !== '/og-image.png' && size?.type !== 'image/jpeg') problems.push('generated share image is not a JPEG');
  }
  const previousImage = shareByPage.get(bare);
  if (previousImage && previousImage !== ogImage) problems.push(`share image differs from the other language (${previousImage})`);
  shareByPage.set(bare, ogImage);
  if (titles.has(title)) problems.push('duplicate title');
  if (descriptions.has(desc)) problems.push('duplicate description');
  titles.add(title);
  descriptions.add(desc);
  try {
    if (ld.length !== 1) throw new Error('need one JSON-LD block');
    JSON.parse(ld[0][1]);
  } catch (e) {
    problems.push(`JSON-LD: ${e.message}`);
  }
  if (!html.includes('og:image') || !html.includes('twitter:card')) problems.push('missing share tags');
  if (!/^\/(?:booth|p)(?:\/|$)/.test(path)) {
    const main = html.match(/<main>([\s\S]*?)<h2 id="prerender-menu">/);
    const pageText = (main?.[1] ?? '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
    const hasH2 = /<h[23]/.test(main?.[1] ?? '');
    check(pageText.length >= 500, `page text before menu has at least 500 characters: ${path}${pageText.length < 500 ? ` (${pageText.length})` : ''}`);
    check(hasH2, `page text before menu has a subheading (h2 or h3): ${path}`);
    const previous = pageTexts.get(pageText);
    check(!previous, `page text is unique: ${path}${previous ? ` duplicates ${previous}` : ''}`);
    pageTexts.set(pageText, path);
  }
  check(problems.length === 0, `static HTML ${path}${problems.length ? ' — ' + problems.join('; ') : ''}`);
}
const home = await (await fetch(base + '/')).text();
check(home.includes('"@type":"ProfessionalService"') && home.includes('"@type":"WebSite"'), 'home has Organization and WebSite data');
const enHome = await (await fetch(base + '/en')).text();
check(enHome.includes('"@type":"ProfessionalService"') && enHome.includes('"inLanguage":"en"'), 'English home has Organization and WebSite data');
check((await (await fetch(base + '/services')).text()).includes('"@type":"Service"'), 'services page lists Service data');
check(shareByPage.get('/')?.endsWith('/og-image.png'), 'home keeps the default share image');
check(shareByPage.get('/stamp-rally')?.endsWith('/og-image.png'), 'a demo without its own image keeps the default share image');
check(shareByPage.get('/ar-playground')?.endsWith('.jpg') && !shareByPage.get('/ar-playground')?.endsWith('/og-image.png'), 'AR playground uses its own share image');
check(shareByPage.get('/projects/lounge-chair-configurator')?.endsWith('.jpg'), 'a project page uses its cover as the share image');
check(!/404\.html|spa\.html/.test(sitemap), 'sitemap omits the noindex shells');

async function unindexed(path, status, { robotsHeader = false } = {}) {
  const res = await fetch(base + path);
  const html = await res.text();
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const robots = [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1]);
  const problems = [];
  if (res.status !== status) problems.push(`status ${res.status}, want ${status}`);
  if (robots.length !== 1 || robots[0] !== 'noindex, nofollow') problems.push(`robots ${JSON.stringify(robots)}`);
  if (html.includes('rel="canonical"')) problems.push('has a canonical link');
  if (html.includes('index, follow')) problems.push('says index, follow');
  if (title === homeTitle) problems.push('uses the homepage title');
  if (html === homeHtml) problems.push('is the homepage file');
  if (!html.includes('<script type="module"')) problems.push('does not load the app');
  if (robotsHeader && res.headers.get('x-robots-tag') !== 'noindex, nofollow') problems.push('missing X-Robots-Tag');
  check(problems.length === 0, `${path} is not indexed as the homepage${problems.length ? ' — ' + problems.join('; ') : ''}`);
  return html;
}

const missingHtml = await unindexed('/does-not-exist', 404);
check(missingHtml.includes('<h1>ไม่พบหน้านี้</h1>'), 'unknown address HTML says the page was not found');
await unindexed('/does-not-exist/', 404);
await unindexed('/booth/x/extra', 404);
await unindexed('/projects/does-not-exist', 404);
await unindexed('/en/does-not-exist', 404);
await unindexed('/en/projects/does-not-exist', 404);
await unindexed('/en/no/such/page', 404);
await unindexed('/booth/x', 200, { robotsHeader: true });
await unindexed('/booth/x/', 200, { robotsHeader: true });
await unindexed('/booth/demo?k=secret', 200, { robotsHeader: true });
await unindexed('/p/abcdefghijkl', 200, { robotsHeader: true });
await unindexed('/p/abcdefghijkl/', 200, { robotsHeader: true });
const shell = await unindexed('/spa.html', 200);
check(!shell.includes('rel="canonical"'), 'spa.html itself has no canonical');
const notFoundFile = await (await fetch(base + '/404.html')).text();
check(
  notFoundFile.includes('noindex, nofollow') && !notFoundFile.includes('rel="canonical"'),
  '404.html itself is noindex and has no canonical',
);

const browser = await chromium.launch();
const crawler = await browser.newContext({
  userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  locale: 'en-US',
});
const page = await crawler.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const path of ['/', '/event-booth', '/projects/lounge-chair-configurator', '/en', '/en/event-booth', '/en/projects/lounge-chair-configurator']) {
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root header, #root nav', { timeout: 60000 });
  await page.waitForSelector('#root [role="status"]', { state: 'detached', timeout: 60000 }).catch(() => {});
  const state = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content,
    text: document.querySelector('#root')?.innerText ?? '',
  }));
  const staticTitle = (await (await fetch(base + path)).text()).match(/<title>([^<]*)<\/title>/)[1].replace(/&amp;/g, '&');
  const english = path === '/en' || path.startsWith('/en/');
  const head = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    alternates: Object.fromEntries([...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((el) => [el.getAttribute('hreflang'), el.getAttribute('href')])),
    image: document.querySelector('meta[property="og:image"]')?.content ?? '',
    twitter: document.querySelector('meta[name="twitter:image"]')?.content ?? '',
  }));
  const staticHtml = await (await fetch(base + path)).text();
  const staticCanonical = staticHtml.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? '';
  const staticImage = staticHtml.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? '';
  if (english) {
    check(state.lang === 'en' && (state.text.match(/[A-Za-z]/g) ?? []).length > 40, `crawler sees English after the app starts: ${path}`);
    check(!/[\u0E00-\u0E7F]/.test(state.title), `English title stays English: ${path}`);
  } else {
    check(state.lang === 'th' && (state.text.match(/[\u0E00-\u0E7F]/g) ?? []).length > 40, `crawler sees Thai after the app starts: ${path}`);
  }
  check(state.title === staticTitle, `title stays the same when the app starts: ${path}`);
  check((state.desc ?? '').length > 50, `description present at run time: ${path}`);
  check(head.canonical === staticCanonical && head.image === staticImage && head.twitter === staticImage, `canonical and share image stay put when the app starts: ${path}`);
  check(head.alternates.th && head.alternates.en && head.alternates['x-default'] === head.alternates.th, `hreflang stays in the live document: ${path}`);
}
const missing = await page.goto(base + '/no-such-page', { waitUntil: 'domcontentloaded' });
check(missing?.status() === 404, 'unknown address returns HTTP 404 to the browser');
await page.waitForSelector('#root h1', { timeout: 60000 });
const missingState = await page.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('#root h1')?.textContent ?? '',
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content') ?? ''),
}));
check(missingState.h1.includes('ไม่พบหน้านี้'), 'unknown address boots the not-found page');
check(missingState.robots.length > 0 && missingState.robots.every((value) => value.includes('noindex')), 'unknown address stays noindex after the app starts');
check(missingState.canonical === '', 'unknown address has no canonical after the app starts');
const staticMissingTitle = missingHtml.match(/<title>([^<]*)<\/title>/)[1].replace(/&amp;/g, '&');
check(missingState.title === staticMissingTitle, 'not-found title stays the same when the app starts');

const unknownProject = await page.goto(base + '/projects/does-not-exist', { waitUntil: 'domcontentloaded' });
check(unknownProject?.status() === 404, 'unknown project returns HTTP 404');
await page.waitForSelector('#root h1', { timeout: 60000 });
check((await page.locator('#root h1').innerText()).includes('ไม่พบโปรเจกต์'), 'unknown project boots the project not-found page');

const enMissingPage = await page.goto(base + '/en/no-such-page', { waitUntil: 'domcontentloaded' });
check(enMissingPage?.status() === 404, 'unknown English address returns HTTP 404 to the browser');
await page.waitForFunction(() => document.querySelector('#root h1')?.textContent?.includes('Page not found'), null, { timeout: 60000 });
const enMissingState = await page.evaluate(() => ({
  lang: document.documentElement.lang,
  h1: document.querySelector('#root h1')?.textContent ?? '',
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content') ?? ''),
}));
check(enMissingState.lang === 'en' && enMissingState.h1.includes('Page not found'), 'unknown /en address boots the English not-found page');
check(enMissingState.robots.length > 0 && enMissingState.robots.every((value) => value.includes('noindex')), 'unknown /en address stays noindex after the app starts');
check(enMissingState.canonical === '', 'unknown /en address has no canonical after the app starts');

const booth = await page.goto(base + '/booth/x', { waitUntil: 'domcontentloaded' });
check(booth?.status() === 200, 'booth link stays HTTP 200');
await page.getByText('ลิงก์ตู้ถ่ายรูปนี้ใช้ไม่ได้').waitFor({ timeout: 60000 });
const boothState = await page.evaluate(() => ({
  title: document.title,
  canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  robots: [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute('content') ?? ''),
}));
check(boothState.title !== homeTitle, 'booth link does not keep the homepage title');
check(boothState.canonical === '', 'booth link has no canonical after the app starts');
check(boothState.robots.length > 0 && boothState.robots.every((value) => value.includes('noindex')), 'booth link stays noindex after the app starts');
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);

// The URL chooses the language. An English browser still sees Thai at the existing URLs.
const en = await browser.newContext({ locale: 'en-US' });
const ep = await en.newPage();
await ep.goto(base + '/', { waitUntil: 'domcontentloaded' });
await ep.waitForSelector('#root header, #root nav', { timeout: 60000 });
check((await ep.evaluate(() => document.documentElement.lang)) === 'th', 'English browsers still get Thai at /');
await ep.goto(base + '/en', { waitUntil: 'domcontentloaded' });
await ep.waitForSelector('#root header, #root nav', { timeout: 60000 });
check((await ep.evaluate(() => document.documentElement.lang)) === 'en', 'English browsers get English at /en');
await browser.close();
server.close();
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll SEO checks passed.');
process.exit(failed ? 1 : 0);
