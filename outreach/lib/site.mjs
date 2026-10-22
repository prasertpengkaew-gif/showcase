// Reads one company website: the home page plus a few contact/about/service pages.
import { classifyCompany, companyName, extractEmails, extractLine, extractPhones, extractSocials, metaContent, pageLanguage, pageLinks, pickPages, visibleText } from './extract.mjs';
import { fetchPage } from './http.mjs';

/** Reads one site and returns its record, or { skipped } with the reason. */
export async function scanSite(domain, { maxPages = 4, delayMs = 2500 } = {}) {
  let home = await fetchPage('https://' + domain + '/', { delayMs });
  if (home.skipped && !/robots/.test(home.skipped)) home = await fetchPage('https://www.' + domain + '/', { delayMs });
  if (home.skipped) return { skipped: home.skipped };

  const pages = [home];
  for (const url of pickPages(pageLinks(home.html, home.url), maxPages)) {
    const page = await fetchPage(url, { delayMs });
    if (!page.skipped) pages.push(page);
  }
  const text = pages.map((p) => visibleText(p.html)).join(' ');
  const allHtml = pages.map((p) => p.html).join('\n');
  const emails = new Map();
  pages.forEach((p) => {
    for (const e of extractEmails(p.html)) if (!emails.has(e.address)) emails.set(e.address, { ...e, source: p.url });
  });
  const headline = `${home.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''} ${metaContent(home.html, 'description')}`;
  return {
    name: companyName(home.html, domain),
    url: home.url,
    description: metaContent(home.html, 'og:description') || metaContent(home.html, 'description'),
    lang: pageLanguage(text),
    ...classifyCompany(text, headline),
    emails: [...emails.values()],
    phones: extractPhones(text).slice(0, 3),
    line: extractLine(allHtml).slice(0, 2),
    socials: extractSocials(allHtml),
    pages: pages.map((p) => p.url),
    text: text.slice(0, 12000),
  };
}
