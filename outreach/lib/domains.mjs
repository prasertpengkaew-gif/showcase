import { existsSync, readFileSync } from 'node:fs';

/** "https://www.Acme.co.th/path" -> "acme.co.th" */
export function domainOf(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Sites that show up in search results but are not event companies: social media, job boards,
// directories, news and shops. Add more, one domain per line, in outreach/data/blocklist.txt.
const BLOCKED = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'line.me', 'lin.ee',
  'google.com', 'goo.gl', 'bing.com', 'wikipedia.org', 'pantip.com', 'medium.com', 'blogspot.com', 'wordpress.com', 'tumblr.com', 'reddit.com',
  'jobthai.com', 'jobsdb.com', 'jobbkk.com', 'jobtopgun.com', 'indeed.com', 'glassdoor.com', 'workventure.com', 'jobnorththailand.com',
  'yellowpages.co.th', 'thaiyellowpages.com', 'trueyellow.com', 'globallinker.com', 'kompass.com', 'alibaba.com', 'made-in-china.com',
  'shopee.co.th', 'lazada.co.th', 'amazon.com', 'ebay.com', 'canva.com', 'freepik.com', 'shutterstock.com',
  'bangkokpost.com', 'nationthailand.com', 'thairath.co.th', 'sanook.com', 'kapook.com', 'marketingoops.com', 'brandage.com', 'positioningmag.com',
  'marketeeronline.co', 'infoquest.co.th', 'tripadvisor.com', 'booking.com', 'agoda.com', 'themuse.com', 'ttgmice.com', 'eventbrite.com', 'fastwork.co', 'top10thai.com', 'lnwshop.com', 'tophitthailand.com', 'fiverr.com', 'upwork.com',
];
const BLOCKED_SUFFIX = ['.go.th', '.ac.th', '.edu', '.gov', '.mi.th'];

export function loadList(file) {
  return existsSync(file)
    ? readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim().toLowerCase()).filter(Boolean)
    : [];
}

export function isBlocked(domain, extra = []) {
  const all = [...BLOCKED, ...extra];
  return !domain || BLOCKED_SUFFIX.some((s) => domain.endsWith(s)) || all.some((b) => domain === b || domain.endsWith('.' + b));
}
