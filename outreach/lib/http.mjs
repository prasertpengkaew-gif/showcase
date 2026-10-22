// Polite page fetching: identifies itself, obeys robots.txt, waits between requests to the same host,
// caps page size, and decodes Thai pages that are not UTF-8.
export const USER_AGENT = 'TheNerdStudioOutreach/1.0 (+https://www.thenerdstudio.space; thenerdstudio@gmail.com)';
const UA_TOKEN = 'thenerdstudiooutreach';

const lastRequest = new Map(); // host -> time of the last request
const robotsCache = new Map(); // origin -> rules or null (fetch failed: stay away)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function wait(host, delayMs) {
  const next = (lastRequest.get(host) ?? 0) + delayMs;
  const ms = next - Date.now();
  lastRequest.set(host, Math.max(Date.now(), next));
  if (ms > 0) await sleep(ms);
}

/** Turns the lines of a robots.txt into the Allow/Disallow rules that apply to us. */
export function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'user-agent') {
      if (!lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(m[2].trim().toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (current && (key === 'allow' || key === 'disallow') && m[2].trim() !== '') current.rules.push({ allow: key === 'allow', path: m[2].trim() });
    if (current && key === 'disallow' && m[2].trim() === '') current.rules.push({ allow: true, path: '/' });
  }
  const ours = groups.find((g) => g.agents.some((a) => a !== '*' && UA_TOKEN.includes(a.replace(/\/.*$/, '')))) ?? groups.find((g) => g.agents.includes('*'));
  return ours?.rules ?? [];
}

const toRegex = (path) => new RegExp('^' + path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));

/** The longest matching rule wins; Allow beats Disallow when they are equally specific. */
export function isAllowed(rules, pathAndQuery) {
  let best = null;
  for (const r of rules) {
    if (!toRegex(r.path).test(pathAndQuery)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

async function rulesFor(origin, delayMs) {
  if (robotsCache.has(origin)) return robotsCache.get(origin);
  let rules = null;
  try {
    await wait(new URL(origin).host, delayMs);
    const res = await fetch(origin + '/robots.txt', { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(10000), redirect: 'follow' });
    if (res.ok) rules = parseRobots(await res.text());
    else if (res.status >= 400 && res.status < 500) rules = []; // no robots.txt: everything is allowed
  } catch {
    rules = null;
  }
  robotsCache.set(origin, rules);
  return rules;
}

function decode(buffer, contentType) {
  const head = Buffer.from(buffer.slice(0, 3000)).toString('latin1');
  const charset = (contentType.match(/charset=([\w-]+)/i) ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i) ?? [])[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset.toLowerCase().replace('tis-620', 'windows-874')).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

/**
 * Fetches an HTML page. Returns { url, status, html } or { skipped: 'reason' }.
 * Never throws for network problems, so one bad site cannot stop a scan.
 */
export async function fetchPage(url, { delayMs = 2500, timeoutMs = 15000, maxBytes = 1_500_000 } = {}) {
  let target;
  try {
    target = new URL(url);
  } catch {
    return { skipped: 'bad url' };
  }
  if (!/^https?:$/.test(target.protocol)) return { skipped: 'not http' };
  const rules = await rulesFor(target.origin, delayMs);
  if (rules === null) return { skipped: 'robots.txt unreachable' };
  if (!isAllowed(rules, target.pathname + target.search)) return { skipped: 'blocked by robots.txt' };
  try {
    await wait(target.host, delayMs);
    const res = await fetch(target, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml', 'accept-language': 'th,en;q=0.8' }, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return { skipped: `HTTP ${res.status}` };
    if (!/html/i.test(type)) return { skipped: 'not html' };
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > maxBytes) return { skipped: 'page too large' };
    return { url: res.url, status: res.status, html: decode(buffer, type) };
  } catch (e) {
    return { skipped: e.name === 'TimeoutError' ? 'timeout' : 'network error' };
  }
}
