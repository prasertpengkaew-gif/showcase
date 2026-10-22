// Pulls company facts out of a web page: name, description, contact details, and what kind of events they do.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** Visible text of a page: no scripts, styles or tags. */
export function visibleText(html) {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export function metaContent(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i);
    if (content) return decodeEntities(content[1] ?? content[2]).trim();
  }
  return '';
}

export function pageTitle(html) {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return t ? decodeEntities(t).replace(/\s+/g, ' ').trim() : '';
}

/** A short company name from og:site_name or the page title ("Acme | Home" -> "Acme"). */
export function companyName(html, domain) {
  const raw = metaContent(html, 'og:site_name') || pageTitle(html);
  const parts = raw
    .split(/\s+[|\-–—:·»]\s+|\s*[|–—»]\s*/)
    .map((p) => p.replace(/^[\s\-–—:|·»]+|[\s\-–—:|·»]+$/g, ''))
    .filter((p) => p.length >= 3 && !/^(home|หน้าแรก|welcome|index|main|untitled|elementor|template|wordpress|just another)\b/i.test(p) && !/\.(com|co\.th|net|org|in\.th)$/i.test(p));
  return parts.sort((a, b) => a.length - b.length)[0] ?? domain;
}

// ---- contact details ------------------------------------------------------------------------
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const BAD_EMAIL = /\.(png|jpe?g|gif|webp|svg|css|js)$|^(example|test|user|name|email|your|yourname|you|someone)@|@(example|domain|email|sentry|wixpress|sentry-next|yourdomain|your-domain|mysite)\./i;
const FREEMAIL = /@(gmail|hotmail|outlook|yahoo|live|icloud|msn|me|protonmail)\./i;
const ROLE = /^(info|contact|contacts|hello|hi|sales|marketing|market|mkt|event|events|booking|bookings|inquiry|inquiries|enquiry|enquiries|service|services|support|admin|office|biz|business|project|projects|pr|media|team|mail|cs|customer|customerservice|reservation|quotation|quote)(?:[._-]?[a-z]{0,12})?@/i;

export function classifyEmail(address) {
  const free = FREEMAIL.test(address);
  const role = ROLE.test(address);
  return { kind: role ? 'role' : free ? 'freemail' : 'named', freemail: free };
}

export function extractEmails(html) {
  const found = new Set();
  const add = (s) => {
    const e = s.toLowerCase().replace(/[.,;:]+$/, '');
    if (EMAIL.test(e) && !BAD_EMAIL.test(e)) found.add(e);
    EMAIL.lastIndex = 0;
  };
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) add(decodeURIComponent(decodeEntities(m[1])));
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' '));
  for (const m of text.matchAll(EMAIL)) add(m[0]);
  // "name [at] domain [dot] com" and "name (at) domain.com"
  for (const m of text.matchAll(/([A-Za-z0-9._-]+)\s*[\[(]\s*at\s*[\])]\s*([A-Za-z0-9.-]+(?:\s*[\[(]\s*dot\s*[\])]\s*[A-Za-z0-9.-]+)*)/gi)) {
    add(`${m[1]}@${m[2].replace(/\s*[\[(]\s*dot\s*[\])]\s*/gi, '.')}`);
  }
  return [...found].map((address) => ({ address, ...classifyEmail(address) }));
}

export function extractPhones(text) {
  const found = new Set();
  for (const m of text.matchAll(/(?:\+66[\s-]?|0)(?:[1-9]\d?)[\s-]?\d{3}[\s-]?\d{3,4}/g)) {
    const digits = m[0].replace(/[^\d+]/g, '').replace(/^\+66/, '0');
    if (digits.length === 9) found.add(digits.replace(/^(0\d)(\d{3})(\d{4})$/, '$1-$2-$3')); // 02-123-4567
    else if (digits.length === 10) found.add(digits.replace(/^(0\d{2})(\d{3})(\d{4})$/, '$1-$2-$3')); // 081-234-5678
  }
  return [...found];
}

export function extractLine(html) {
  const found = new Set();
  for (const m of html.matchAll(/(?:line\.me\/R\/ti\/p\/|line\.me\/ti\/p\/|lin\.ee\/)(@?[\w.-]+)/gi)) found.add(m[0].replace(/^.*?(line\.me|lin\.ee)/i, '$1'));
  return [...found];
}

export function extractSocials(html) {
  const out = {};
  const patterns = { facebook: /https?:\/\/(?:www\.)?facebook\.com\/[\w.\-/]+/i, instagram: /https?:\/\/(?:www\.)?instagram\.com\/[\w.]+/i, youtube: /https?:\/\/(?:www\.)?youtube\.com\/[\w@./-]+/i, tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+/i, linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/company\/[\w-]+/i };
  for (const [k, re] of Object.entries(patterns)) {
    // the first link that is a page, not a share button
    const m = [...html.matchAll(new RegExp(re.source, 'gi'))].find((x) => !/sharer|share\.php|\/plugins\/|\/share/i.test(x[0]));
    if (m) out[k] = m[0].replace(/[/.]+$/, '');
  }
  return out;
}

// ---- links to follow ------------------------------------------------------------------------
export function pageLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(decodeEntities(m[1]), base);
      if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '') || !/^https?:$/.test(u.protocol)) continue;
      if (/\.(pdf|jpe?g|png|gif|webp|zip|mp4)$/i.test(u.pathname)) continue;
      u.hash = '';
      out.set(u.href, (out.get(u.href) ?? '') + ' ' + visibleText(m[2]));
    } catch {
      /* ignore malformed links */
    }
  }
  return out;
}

const PAGE_HINTS = [/contact|ติดต่อ|contactus/i, /about|เกี่ยวกับ|เกี่ยวกับเรา|who-we-are/i, /service|บริการ|what-we-do|solution/i, /portfolio|work|ผลงาน|project|case/i];

/** Picks a few pages worth reading: contact first, then about, services and portfolio. */
export function pickPages(links, max) {
  const picked = [];
  for (const hint of PAGE_HINTS) {
    for (const [href, label] of links) {
      if (picked.length >= max) return picked;
      if (!picked.includes(href) && (hint.test(decodeURIComponent(href)) || hint.test(label))) {
        picked.push(href);
        break;
      }
    }
  }
  return picked;
}

// ---- what kind of events they do ------------------------------------------------------------
const CORE = /อีเวนต์|อีเว้นท์|อีเวนท์|\bevents?\b|จัดงาน|ออร์?แกไนซ์|ออแกไนเซอร์|organi[sz]er|exhibition|นิทรรศการ|งานแสดงสินค้า|activation|\bMICE\b|conference|สัมมนา|บูธ|\bbooth|งานเปิดตัว|product launch|experiential/gi;

export const SERVICE_TAGS = {
  exhibition: { th: 'งานแสดงสินค้าและนิทรรศการ', re: /นิทรรศการ|งานแสดงสินค้า|exhibition|trade ?show|\bbooth|บูธ|expo\b/gi },
  launch: { th: 'งานเปิดตัวสินค้า', re: /เปิดตัวสินค้า|เปิดตัว|แถลงข่าว|product launch|press conference|launch event/gi },
  activation: { th: 'งาน Activation และโรดโชว์', re: /activation|experiential|roadshow|โรดโชว์|sampling|ซัมปลิ้ง|กิจกรรมการตลาด|promotion/gi },
  conference: { th: 'งานสัมมนาและงานประชุม', re: /สัมมนา|ประชุม|conference|seminar|convention|\bMICE\b|forum/gi },
  concert: { th: 'คอนเสิร์ตและเทศกาล', re: /คอนเสิร์ต|concert|เทศกาล|festival|fan ?meeting|music event/gi },
  wedding: { th: 'งานแต่งงานและงานเลี้ยง', re: /งานแต่ง|wedding|งานเลี้ยง|ปาร์ตี้|birthday|งานวันเกิด/gi },
  corporate: { th: 'งานองค์กร', re: /งานองค์กร|corporate event|team ?building|ทีมบิลดิ้ง|annual (?:dinner|party)|company trip|กิจกรรมองค์กร|งานกีฬาสี/gi },
};

/** Which kinds of events appear in the text, with how often, and a 0-100 "is this an event company" score. */
export function classifyCompany(text, headline = '') {
  const tags = Object.entries(SERVICE_TAGS)
    .map(([tag, { re }]) => ({ tag, count: (text.match(re) ?? []).length }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
  const core = (text.match(CORE) ?? []).length;
  const perThousand = core / Math.max(1, text.length / 1000);
  const inHeadline = (headline.match(CORE) ?? []).length > 0;
  const score = Math.min(100, Math.round(perThousand * 9 + (inHeadline ? 30 : 0) + Math.min(core, 5) * 2));
  return { services: tags.map((t) => t.tag), score };
}

/** Rough language of a page: "th" when Thai letters dominate the letters on the page. */
export function pageLanguage(text) {
  const thai = (text.match(/[฀-๿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return thai > latin * 0.3 ? 'th' : 'en';
}
