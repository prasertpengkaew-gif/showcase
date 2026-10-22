// Finds company websites by running search queries, and adds new ones to data/sites.txt.
//
//   node outreach/discover.mjs                       uses queries.txt
//   node outreach/discover.mjs "รับจัดงานอีเวนต์ ภูเก็ต"   one extra query
//   node outreach/discover.mjs --source=ddg|brave --pages=2
//
// Sources
//   brave  Brave Search API (official, free tier). Set BRAVE_API_KEY. Used automatically when the key exists.
//   ddg    DuckDuckGo's plain HTML results, no key. Their terms discourage automated use, so it is slow on purpose
//          (several seconds between queries), takes few pages, and stops as soon as it is asked to prove you are human.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainOf, isBlocked, loadList } from './lib/domains.mjs';
import { searchBrave, searchDuckDuckGo } from './lib/search.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
mkdirSync(dataDir, { recursive: true });

const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const extraQueries = args.filter((a) => !a.startsWith('--'));
const source = opt('source', process.env.BRAVE_API_KEY ? 'brave' : 'ddg');
const pages = Number(opt('pages', 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const queries = extraQueries.length ? extraQueries : readFileSync(path.join(root, 'queries.txt'), 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
const blocklist = loadList(path.join(dataDir, 'blocklist.txt'));
const sitesFile = path.join(dataDir, 'sites.txt');
const known = new Set(loadList(sitesFile).map(domainOf));

let added = 0;
console.log(`Source: ${source}. ${queries.length} queries, ${pages} page(s) each.`);
for (const query of queries) {
  let fresh = 0;
  try {
    for (let page = 0; page < pages; page++) {
      const urls = source === 'brave' ? await searchBrave(query, page) : await searchDuckDuckGo(query, page);
      for (const url of urls) {
        const domain = domainOf(url);
        if (isBlocked(domain, blocklist) || known.has(domain)) continue;
        known.add(domain);
        appendFileSync(sitesFile, `${new URL(/^https?:/i.test(url) ? url : 'https://' + url).origin}  # ${query}\n`);
        fresh++;
        added++;
      }
      if (page + 1 < pages) await sleep(source === 'ddg' ? 6000 : 1100);
    }
    console.log(`  ${String(fresh).padStart(2)} new  ${query}`);
  } catch (e) {
    console.error(`  stopped at "${query}": ${e.message}`);
    break;
  }
  await sleep(source === 'ddg' ? 6000 : 1100);
}
console.log(`Added ${added} sites to ${path.relative(process.cwd(), sitesFile)} (${known.size} in total). Next: node outreach/scan.mjs`);
