/**
 * Captures readable Thai page content as minimal HTML for static prerendering.
 * Re-run after changing page text so crawlers receive the updated content.
 *
 * It opens the built site (`npm run build` first), not the dev server: the dev server compiles
 * modules on demand, which makes every page take tens of seconds and use a lot of memory.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

const root = process.cwd();
if (!existsSync(join(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
// The dev server is only used to read the page list, then closed.
const lister = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
const { allPages } = await lister.ssrLoadModule('/src/seo/pages.ts').finally(() => lister.close());
const server = await preview({ root, logLevel: 'error', preview: { port: 5201, strictPort: true } });
let browser;
let failed = false;
try {
  const filters = process.argv.slice(2);
  const pages = filters.length ? allPages.filter((page) => filters.includes(page.path)) : allPages;
  browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ locale: 'th-TH', viewport: { width: 1280, height: 900 } });
  await context.addInitScript(() => localStorage.setItem('lang', 'th'));
  await mkdir(join(root, 'src/seo/snapshots'), { recursive: true });

  for (const pageInfo of pages) {
    try {
      const page = await context.newPage();
      await page.goto(`http://localhost:5201${pageInfo.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // The prerendered placeholder <main> has no id; the real app's <main id="main"> appears once React has mounted.
      await page.waitForSelector('main#main h1', { timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const result = await page.locator('main').evaluate((main) => {
        if (!main) return null;
        const allowed = new Set(['H1','H2','H3','H4','P','UL','OL','LI','A','STRONG','EM','TABLE','THEAD','TBODY','TR','TH','TD','DL','DT','DD','BLOCKQUOTE']);
        const dropped = new Set(['SCRIPT','STYLE','SVG','CANVAS','VIDEO','AUDIO','IFRAME','IMG','PICTURE','MODEL-VIEWER','INPUT','SELECT','TEXTAREA','BUTTON','NOSCRIPT']);
        const esc = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const attr = (value) => esc(value).replace(/"/g, '&quot;');
        const hidden = (el) => {
          const style = getComputedStyle(el);
          return el.getAttribute('aria-hidden') === 'true' || el.hidden || style.display === 'none' || style.visibility === 'hidden' || el.classList.contains('sr-only');
        };
        const render = (node) => {
          if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, ' ').trim();
          if (node.nodeType !== Node.ELEMENT_NODE) return '';
          const el = node;
          if (dropped.has(el.tagName) || hidden(el)) return '';
          const children = [...el.childNodes].map(render).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
          if (!children) return '';
          if (!allowed.has(el.tagName)) return children;
          const tag = el.tagName.toLowerCase();
          const href = tag === 'a' && (/^\//.test(el.getAttribute('href') || '') || /^https:\/\//.test(el.getAttribute('href') || ''))
            ? ` href="${attr(el.getAttribute('href'))}"` : '';
          return `<${tag}${href}>${children}</${tag}>`;
        };
        const blocks = [...main.childNodes].map(render).filter(Boolean);
        // Pages put a small eyebrow line above the h1, so the h1 only has to be present, not first.
        if (!blocks.some((block) => block.includes('<h1>'))) return { error: 'page has no h1' };
        let html = '';
        for (const block of blocks) {
          if (html.length + block.length > 60000) break;
          html += block;
        }
        return { html, h2: (html.match(/<h2>/g) || []).length, chars: html.replace(/<[^>]*>/g, '').length };
      });
      if (!result) throw new Error('page has no main element');
      if (result.error) throw new Error(result.error);
      const name = pageInfo.path === '/' ? 'home' : pageInfo.path.slice(1).replace(/\//g, '__'); // Must match the naming rule in prerender.mjs.
      await writeFile(join(root, 'src/seo/snapshots', `${name}.html`), result.html, 'utf8');
      console.log(`${pageInfo.path} ${result.chars} text characters ${result.h2} h2`);
      await page.close();
    } catch (error) {
      failed = true;
      console.warn(`snapshot warning ${pageInfo.path}: ${error.message}`);
    }
  }
} finally {
  if (browser) await browser.close();
  server.httpServer.closeAllConnections?.();
  server.httpServer.close();
}
if (failed) process.exitCode = 1;
