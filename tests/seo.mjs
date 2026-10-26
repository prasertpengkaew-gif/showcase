/** Checks the built site (run `npm run build` first): static HTML per page, sitemap, robots, Thai for crawlers. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

let failed = 0;
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) failed++;
};

// Serves dist/ the way Vercel does: a file if there is one, else <path>/index.html, else the app shell.
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.wasm': 'application/wasm' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const root = join(process.cwd(), 'dist');
  const candidates = [join(root, normalize(pathname)), join(root, normalize(pathname), 'index.html'), join(root, 'index.html')];
  for (const file of candidates) {
    if (!file.startsWith(root)) continue;
    try {
      if (!(await stat(file)).isFile()) continue;
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
      return;
    } catch {
      // try the next candidate
    }
  }
  res.writeHead(404).end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const site = (await readFile('dist/robots.txt', 'utf8')).match(/Sitemap: (\S+)\/sitemap\.xml/)[1];
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(site, '') || '/');
check(paths.length >= 25, `sitemap lists ${paths.length} pages`);
check(!/\/(booth|p)\//.test(sitemap), 'sitemap leaves out booth and guest-photo pages');

const titles = new Set();
const descriptions = new Set();
const pageTexts = new Map();
for (const path of paths) {
  const res = await fetch(base + path);
  const html = await res.text();
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const problems = [];
  if (res.status !== 200) problems.push(`status ${res.status}`);
  if (!html.includes('<html lang="th">')) problems.push('lang is not th');
  if ((html.match(/<h1>/g) ?? []).length !== 1) problems.push('needs exactly one h1');
  if (!/[฀-๿]/.test(title) || title.length > 75) problems.push(`title: ${title}`);
  if (desc.length < 50 || desc.length > 220) problems.push(`description length ${desc.length}`);
  if (canonical !== site + (path === '/' ? '/' : path)) problems.push(`canonical ${canonical}`);
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
    const main = html.match(/<main>([\s\S]*?)<h2>เมนู<\/h2>/);
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
check((await (await fetch(base + '/services')).text()).includes('"@type":"Service"'), 'services page lists Service data');

const browser = await chromium.launch();
const crawler = await browser.newContext({
  userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  locale: 'en-US',
});
const page = await crawler.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const path of ['/', '/event-booth', '/projects/lounge-chair-configurator']) {
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
  check(state.lang === 'th' && (state.text.match(/[\u0E00-\u0E7F]/g) ?? []).length > 40, `crawler sees Thai after the app starts: ${path}`);
  check(state.title === staticTitle, `title stays the same when the app starts: ${path}`);
  check((state.desc ?? '').length > 50, `description present at run time: ${path}`);
}
await page.goto(base + '/no-such-page', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('meta[name="robots"][content*="noindex"]', { state: 'attached', timeout: 60000 });
check(true, 'unknown address asks not to be indexed');
check(errors.length === 0, `no page errors${errors.length ? ': ' + errors[0] : ''}`);

// A real English-language visitor still gets English.
const en = await browser.newContext({ locale: 'en-US' });
const ep = await en.newPage();
await ep.goto(base + '/', { waitUntil: 'domcontentloaded' });
await ep.waitForSelector('#root header, #root nav', { timeout: 60000 });
check((await ep.evaluate(() => document.documentElement.lang)) === 'en', 'English browsers still get English');
await browser.close();
server.close();
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll SEO checks passed.');
process.exit(failed ? 1 : 0);
