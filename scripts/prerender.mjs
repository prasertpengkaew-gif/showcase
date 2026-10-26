/**
 * Runs after `vite build`. Writes a real HTML file for every public page, in Thai and in English
 * (dist/<path>/index.html and dist/en/<path>/index.html), with its own title, description,
 * canonical link, hreflang alternates, social-share tags, structured data and a plain-text
 * version of the page, then writes sitemap.xml and robots.txt.
 *
 * Thai keeps the existing URLs. English is the same path under /en (`/` → `/en`).
 *
 * Why: the site is a single-page app, so without this every URL returns the same empty shell and
 * search engines have to run the JavaScript before they can read anything. Public pages are real
 * files, so the host serves them as-is. React replaces the text as soon as the app starts.
 *
 * index.html is the Thai homepage after this step. It must not be the fallback for other URLs: an
 * unknown path would then be HTTP 200 with the homepage canonical and `index, follow` (a soft
 * 404). Instead we also write:
 *   - dist/404.html — noindex shell for missing paths, including unknown /en/* (Vercel serves it with status 404)
 *   - dist/spa.html — the same kind of shell for /booth/:slug and /p/:code (rewritten, status 200)
 * Both still load the built app, so the browser shows NotFound, the booth, or the guest photo.
 *
 * Share images: pages that have a demo preview or a project cover get a 1200×630 JPEG under
 * dist/og/. Facebook, LinkedIn and Slack still want PNG or JPEG for og:image, so the WebP
 * sources are not advertised directly. Pages without their own image keep /og-image.png.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { createServer, loadEnv } from 'vite';

const root = process.cwd();
const dist = join(root, 'dist');
const snapshots = join(root, 'src/seo/snapshots');
const env = loadEnv('production', root, 'VITE_');

const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
let pages, th, svc, ui, paths, share, alternates, site;
try {
  pages = await server.ssrLoadModule('/src/seo/pages.ts');
  th = await server.ssrLoadModule('/src/i18n/content.th.ts');
  svc = await server.ssrLoadModule('/src/data/services.ts');
  ui = await server.ssrLoadModule('/src/i18n/th.ts');
  paths = await server.ssrLoadModule('/src/i18n/paths.ts');
  share = await server.ssrLoadModule('/src/seo/shareImage.ts');
  alternates = await server.ssrLoadModule('/src/seo/alternates.ts');
  site = await server.ssrLoadModule('/src/seo/site.ts');
} finally {
  await server.close();
}

const SITE_URL = (env.VITE_SITE_URL || process.env.VITE_SITE_URL || site.SITE_URL).replace(/\/+$/, '');
const template = await readFile(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const url = (path) => SITE_URL + (path === '/' ? '/' : path);

/** SPA shell with no homepage canonical and no `index, follow`. `rootInner` null keeps #root empty. */
function noindexShell({ title, description, rootInner }) {
  let html = template
    .replace(/<html lang="[^"]*">/, '<html lang="th">')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/\n\s*<\/head>/, `\n    <meta name="robots" content="noindex, nofollow" />\n  </head>`)
    .replace(
      /<noscript>[\s\S]*?<\/noscript>/,
      '<noscript>เว็บนี้ต้องเปิด JavaScript เพื่อแสดงเนื้อหา 3D และ AR แบบโต้ตอบ</noscript>',
    );
  if (rootInner != null) html = html.replace(/<div id="root"><\/div>/, `<div id="root">${rootInner}</div>`);
  if (!html.includes('<meta name="robots" content="noindex, nofollow" />')) {
    throw new Error('prerender: noindex shell is missing the robots tag');
  }
  if (html.includes('rel="canonical"') || html.includes('index, follow')) {
    throw new Error('prerender: noindex shell must not advertise the homepage');
  }
  if (!html.includes('<script type="module"')) throw new Error('prerender: noindex shell is missing the app script');
  return html;
}

const notFound = ui.th.notFound;
await writeFile(
  join(dist, '404.html'),
  noindexShell({
    title: `${notFound.title} — ${pages.SITE_NAME}`,
    description: notFound.text,
    rootInner:
      `<div style="min-height:100vh;background:#0B1220;color:#e6ecf8;padding:24px;font-family:'Noto Sans Thai',Inter,system-ui,sans-serif;line-height:1.7">` +
      `<main><h1>${esc(notFound.title)}</h1><p>${esc(notFound.text)}</p></main></div>`,
  }),
);
// Booth and guest-photo URLs are real app routes, so they stay HTTP 200, but they are private.
await writeFile(
  join(dist, 'spa.html'),
  noindexShell({
    title: `หน้าส่วนตัว — ${pages.SITE_NAME}`,
    description: 'หน้าส่วนตัวสำหรับตู้ถ่ายรูป AR และรูปของแขก ไม่แสดงในผลการค้นหา',
    rootInner: null,
  }),
);
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const shortName = (p, lang) => p[lang].title.split(/ [—|] /)[0];
// Keep this filename rule in sync with scripts/snapshot-pages.mjs.
const snapshotName = (path) => `${path === '/' ? 'home' : path.slice(1).replace(/\//g, '__')}.html`;
const socials = ['VITE_FACEBOOK_URL', 'VITE_LINKEDIN_URL', 'VITE_INSTAGRAM_URL', 'VITE_GITHUB_URL', 'VITE_LINE_URL']
  .map((k) => env[k])
  .filter((v) => v && /^https:\/\//.test(v));
const email = env.VITE_CONTACT_EMAIL || 'thenerdstudio@gmail.com';

const organization = {
  '@type': 'ProfessionalService',
  '@id': `${SITE_URL}/#org`,
  name: pages.SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.svg`,
  image: `${SITE_URL}/og-image.png`,
  description: pages.staticPages[0].th.description,
  email,
  ...(env.VITE_CONTACT_PHONE ? { telephone: env.VITE_CONTACT_PHONE } : {}),
  ...(socials.length ? { sameAs: socials } : {}),
  areaServed: { '@type': 'Country', name: 'Thailand' },
  knowsLanguage: ['th', 'en'],
};

function structuredData(page, lang) {
  const text = page[lang];
  const pageUrl = url(paths.withLang(page.path, lang));
  const homeUrl = url(paths.withLang('/', lang));
  const graph = [];
  if (page.path === '/') {
    graph.push(
      lang === 'th' ? organization : { ...organization, description: page.en.description },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: homeUrl,
        name: pages.SITE_NAME,
        inLanguage: lang,
        publisher: { '@id': `${SITE_URL}/#org` },
      },
    );
  } else {
    const homeName = lang === 'th' ? 'หน้าแรก' : 'Home';
    const projectsName = lang === 'th' ? 'ผลงาน' : 'Projects';
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeName, item: homeUrl },
        ...(page.path.startsWith('/projects/')
          ? [{ '@type': 'ListItem', position: 2, name: projectsName, item: url(paths.withLang('/projects', lang)) }]
          : []),
        { '@type': 'ListItem', position: page.path.startsWith('/projects/') ? 3 : 2, name: shortName(page, lang), item: pageUrl },
      ],
    });
  }
  if (page.path === '/services') {
    graph.push({
      '@type': 'ItemList',
      itemListElement: svc.services.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Service',
          name: lang === 'th' ? (th.servicesTh[s.id]?.title ?? s.title) : s.title,
          description: lang === 'th' ? (th.servicesTh[s.id]?.summary ?? s.summary) : s.summary,
          provider: { '@id': `${SITE_URL}/#org` },
          areaServed: 'TH',
        },
      })),
    });
  }
  if (page.path.startsWith('/projects/')) {
    graph.push({
      '@type': 'CreativeWork',
      name: text.title.split(' — ')[0],
      description: text.description,
      inLanguage: lang,
      url: pageUrl,
      creator: { '@id': `${SITE_URL}/#org` },
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

const copy = {
  th: {
    menu: 'เมนู',
    projects: 'ผลงาน',
    services: 'บริการ',
    noscript: 'เว็บนี้ต้องเปิด JavaScript เพื่อแสดงเนื้อหา 3D และ AR แบบโต้ตอบ',
  },
  en: {
    menu: 'Menu',
    projects: 'Projects',
    services: 'Services',
    noscript: 'This site needs JavaScript enabled to show interactive 3D and AR content.',
  },
};

async function body(page, lang) {
  const strings = copy[lang];
  const links = (list) =>
    `<ul>${list
      .map((p) => `<li><a href="${paths.withLang(p.path, lang)}">${esc(shortName(p, lang))}</a></li>`)
      .join('')}</ul>`;
  const nav = pages.staticPages.filter((p) => p.path !== page.path);
  let snapshot = '';
  const snapshotPath = join(snapshots, lang === 'en' ? 'en' : '', snapshotName(page.path));
  try {
    snapshot = await readFile(snapshotPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const projectsBlock =
    page.path === '/' || page.path === '/projects' ? `<h2>${strings.projects}</h2>${links(pages.projectPages)}` : '';
  const services =
    page.path === '/' || page.path === '/services'
      ? `<h2>${strings.services}</h2><ul>${svc.services
          .map((s) => {
            const title = lang === 'th' ? (th.servicesTh[s.id]?.title ?? s.title) : s.title;
            const summary = lang === 'th' ? (th.servicesTh[s.id]?.summary ?? s.summary) : s.summary;
            return `<li><strong>${esc(title)}</strong> — ${esc(summary)}</li>`;
          })
          .join('')}</ul>`
      : '';
  const other = lang === 'th' ? 'en' : 'th';
  const otherLabel = other === 'en' ? 'English' : 'ภาษาไทย';
  return (
    `<div style="min-height:100vh;background:#0B1220;color:#e6ecf8;padding:24px;font-family:'Noto Sans Thai',Inter,system-ui,sans-serif;line-height:1.7">` +
    `<main>${snapshot || `<h1>${esc(shortName(page, lang))}</h1><p>${esc(page[lang].description)}</p>${services}${projectsBlock}`}` +
    `<h2 id="prerender-menu">${strings.menu}</h2>${links(nav)}` +
    `<p><a href="${paths.withLang(page.path, other)}" hreflang="${other}" lang="${other}">${otherLabel}</a></p>` +
    `</main>` +
    `<noscript><p>${strings.noscript}</p></noscript></div>`
  );
}

const writtenImages = new Map();
async function shareMeta(contentPath) {
  const image = share.shareImageFor(contentPath);
  if (image.source && !writtenImages.has(image.src)) {
    const input = join(root, 'public', image.source.replace(/^\//, ''));
    const output = join(dist, image.src.replace(/^\//, ''));
    await mkdir(dirname(output), { recursive: true });
    await sharp(input)
      .resize(image.width, image.height, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 82 })
      .toFile(output);
    writtenImages.set(image.src, true);
  }
  return image;
}

async function render(page, lang) {
  const text = page[lang];
  const route = paths.withLang(page.path, lang);
  const canonical = url(route);
  const image = await shareMeta(page.path);
  const imageUrl = `${SITE_URL}${image.src}`;
  const hreflang = alternates
    .languageAlternates(page.path)
    .map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
    .join('\n    ');
  if (!hreflang.includes(SITE_URL)) throw new Error('prerender: hreflang is missing the canonical origin');
  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    hreflang,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}" />`,
    `<meta property="og:site_name" content="${pages.SITE_NAME}" />`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'th_TH'}" />`,
    `<meta property="og:locale:alternate" content="${lang === 'en' ? 'th_TH' : 'en_US'}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${esc(text.title)}" />`,
    `<meta property="og:description" content="${esc(text.description)}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:image:width" content="${image.width}" />`,
    `<meta property="og:image:height" content="${image.height}" />`,
    `<meta property="og:image:type" content="${image.type}" />`,
    `<meta property="og:image:alt" content="${esc(text.title)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(text.title)}" />`,
    `<meta name="twitter:description" content="${esc(text.description)}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
    `<script type="application/ld+json">${json(structuredData(page, lang))}</script>`,
  ].join('\n    ');

  let html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(text.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(text.description)}" />`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>${copy[lang].noscript}</noscript>`)
    .replace('</head>', `    ${head}\n  </head>`);
  const pageBody = await body(page, lang);
  html = html.replace(/<div id="root"><\/div>\s*<noscript>[\s\S]*?<\/noscript>/, () => `<div id="root">${pageBody}</div>`);
  if (!html.includes('<h1>')) throw new Error(`prerender: could not place the page text for ${route}`);
  if (!html.includes('hreflang="en"') || !html.includes('hreflang="th"') || !html.includes('hreflang="x-default"')) {
    throw new Error(`prerender: missing hreflang for ${route}`);
  }
  if (lang === 'en' && route === '/') throw new Error('prerender: English home must not replace the Thai homepage');
  return html;
}

let count = 0;
let withSnapshots = 0;
let withoutSnapshots = 0;
for (const page of pages.allPages) {
  for (const lang of ['th', 'en']) {
    const route = paths.withLang(page.path, lang);
    const file = route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html');
    await mkdir(dirname(file), { recursive: true });
    const rendered = await render(page, lang);
    await writeFile(file, rendered);
    const snapshotPath = join(snapshots, lang === 'en' ? 'en' : '', snapshotName(page.path));
    try {
      const snapshot = await readFile(snapshotPath, 'utf8');
      if (rendered.includes(snapshot)) withSnapshots++;
      else withoutSnapshots++;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      withoutSnapshots++;
    }
    count++;
  }
}

const today = new Date().toISOString().slice(0, 10);
const hreflangXml = (page) =>
  alternates
    .languageAlternates(page.path)
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
    .join('\n');
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
  [...pages.allPages]
    .sort((a, b) => b.priority - a.priority || a.path.localeCompare(b.path))
    .flatMap((p) => ['th', 'en'].map((lang) => {
      const loc = url(paths.withLang(p.path, lang));
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.priority}</priority>\n${hreflangXml(p)}\n  </url>`;
    }))
    .join('\n') +
  `\n</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /booth/\nDisallow: /p/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
console.log(
  `prerender: ${count} pages (${withSnapshots} with page text, ${withoutSnapshots} without), ${writtenImages.size} share images, 404.html, spa.html, sitemap.xml and robots.txt for ${SITE_URL}`,
);
if (process.env.REQUIRE_SNAPSHOTS === '1' && withoutSnapshots) process.exitCode = 1;
