import { USER_AGENT } from './http.mjs';

/** Result URLs from DuckDuckGo's HTML page; their links are redirects with the real address in `uddg`. */
export function parseDuckDuckGo(html) {
  const urls = [];
  for (const tag of html.match(/<a\b[^>]*result__a[^>]*>/g) ?? []) {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const real = new URL(href.replace(/&amp;/g, '&'), 'https://duckduckgo.com').searchParams.get('uddg');
    urls.push(real ?? href);
  }
  return urls;
}

export async function searchDuckDuckGo(query, page) {
  const res = await fetch('https://html.duckduckgo.com/html/', {
    method: 'POST',
    headers: { 'user-agent': USER_AGENT, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ q: query, kl: 'th-th', ...(page > 0 ? { s: String(page * 30) } : {}) }),
    signal: AbortSignal.timeout(20000),
  });
  const html = await res.text();
  if (res.status === 202 || /anomaly|captcha|unusual traffic/i.test(html)) throw new Error('DuckDuckGo asked for proof that you are human; stopping. Try again later or use BRAVE_API_KEY.');
  if (!res.ok) throw new Error(`DuckDuckGo answered HTTP ${res.status}`);
  return parseDuckDuckGo(html);
}

export async function searchBrave(query, page) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.search = new URLSearchParams({ q: query, count: '20', offset: String(page), country: 'TH', search_lang: 'th' });
  const res = await fetch(url, { headers: { accept: 'application/json', 'x-subscription-token': process.env.BRAVE_API_KEY }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Brave Search answered HTTP ${res.status}`);
  return ((await res.json()).web?.results ?? []).map((r) => r.url);
}
