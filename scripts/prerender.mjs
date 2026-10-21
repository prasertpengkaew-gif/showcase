/**
 * Runs after `vite build`. Writes a real HTML file for every public page (dist/<path>/index.html)
 * with its own Thai title, description, canonical link, social-share tags, structured data and a
 * plain-text version of the page, then writes sitemap.xml and robots.txt.
 *
 * Why: the site is a single-page app, so without this every URL returns the same empty shell and
 * search engines have to run the JavaScript before they can read anything. Pages are served
 * as-is by Vercel/Netlify (files win over the catch-all rewrite). React replaces the text as
 * soon as the app starts.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createServer, loadEnv } from 'vite';

const root = process.cwd();
const dist = join(root, 'dist');
const env = loadEnv('production', root, 'VITE_');
const SITE_URL = (env.VITE_SITE_URL || process.env.VITE_SITE_URL || 'https://www.thenerdstudio.space').replace(/\/+$/, '');

const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'silent' });
let pages, th, svc;
try {
  pages = await server.ssrLoadModule('/src/seo/pages.ts');
  th = await server.ssrLoadModule('/src/i18n/content.th.ts');
  svc = await server.ssrLoadModule('/src/data/services.ts');
} finally {
  await server.close();
}

const template = await readFile(join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const url = (path) => SITE_URL + (path === '/' ? '/' : path);
const shortName = (p) => p.th.title.split(/ [—|] /)[0];
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

function structuredData(page) {
  const graph = [];
  if (page.path === '/') {
    graph.push(organization, {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#site`,
      url: `${SITE_URL}/`,
      name: pages.SITE_NAME,
      inLanguage: 'th',
      publisher: { '@id': `${SITE_URL}/#org` },
    });
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: `${SITE_URL}/` },
        ...(page.path.startsWith('/projects/')
          ? [{ '@type': 'ListItem', position: 2, name: 'ผลงาน', item: `${SITE_URL}/projects` }]
          : []),
        { '@type': 'ListItem', position: page.path.startsWith('/projects/') ? 3 : 2, name: shortName(page), item: url(page.path) },
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
          name: th.servicesTh[s.id]?.title ?? s.title,
          description: th.servicesTh[s.id]?.summary ?? s.summary,
          provider: { '@id': `${SITE_URL}/#org` },
          areaServed: 'TH',
        },
      })),
    });
  }
  if (page.path.startsWith('/projects/')) {
    graph.push({
      '@type': 'CreativeWork',
      name: page.th.title.split(' — ')[0],
      description: page.th.description,
      inLanguage: 'th',
      url: url(page.path),
      creator: { '@id': `${SITE_URL}/#org` },
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function body(page) {
  const links = (list) =>
    `<ul>${list.map((p) => `<li><a href="${p.path}">${esc(shortName(p))}</a></li>`).join('')}</ul>`;
  const nav = pages.staticPages.filter((p) => p.path !== page.path);
  const projects = page.path === '/' || page.path === '/projects' ? `<h2>ผลงาน</h2>${links(pages.projectPages)}` : '';
  const services =
    page.path === '/' || page.path === '/services'
      ? `<h2>บริการ</h2><ul>${svc.services
          .map((s) => `<li><strong>${esc(th.servicesTh[s.id]?.title ?? s.title)}</strong> — ${esc(th.servicesTh[s.id]?.summary ?? s.summary)}</li>`)
          .join('')}</ul>`
      : '';
  return (
    `<div style="min-height:100vh;background:#0B1220;color:#e6ecf8;padding:24px;font-family:'Noto Sans Thai',Inter,system-ui,sans-serif;line-height:1.7">` +
    `<main><h1>${esc(shortName(page))}</h1><p>${esc(page.th.description)}</p>${services}${projects}` +
    `<h2>เมนู</h2>${links(nav)}</main>` +
    `<noscript><p>เว็บนี้ต้องเปิด JavaScript เพื่อแสดงเนื้อหา 3D และ AR แบบโต้ตอบ</p></noscript></div>`
  );
}

function render(page) {
  const text = page.th;
  const canonical = url(page.path);
  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}" />`,
    `<meta property="og:site_name" content="${pages.SITE_NAME}" />`,
    `<meta property="og:locale" content="th_TH" />`,
    `<meta property="og:locale:alternate" content="en_US" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:title" content="${esc(text.title)}" />`,
    `<meta property="og:description" content="${esc(text.description)}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="TheNerdStudio — WebAR, VR และ 3D บนเว็บ" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(text.title)}" />`,
    `<meta name="twitter:description" content="${esc(text.description)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
    `<script type="application/ld+json">${json(structuredData(page))}</script>`,
  ].join('\n    ');

  let html = template
    .replace('<html lang="en">', '<html lang="th">')
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(text.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(text.description)}" />`)
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(/<div id="root"><\/div>\s*<noscript>[\s\S]*?<\/noscript>/, `<div id="root">${body(page)}</div>`);
  if (!html.includes('<h1>')) throw new Error(`prerender: could not place the page text for ${page.path}`);
  return html;
}

let count = 0;
for (const page of pages.allPages) {
  const file = page.path === '/' ? join(dist, 'index.html') : join(dist, page.path, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, render(page));
  count++;
}

const today = new Date().toISOString().slice(0, 10);
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  [...pages.allPages]
    .sort((a, b) => b.priority - a.priority)
    .map((p) => `  <url><loc>${url(p.path)}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`)
    .join('\n') +
  `\n</urlset>\n`;
await writeFile(join(dist, 'sitemap.xml'), sitemap);
await writeFile(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /booth/\nDisallow: /p/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
);
console.log(`prerender: ${count} pages, sitemap.xml and robots.txt for ${SITE_URL}`);
