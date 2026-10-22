// Reads each website in data/sites.txt (home page plus a few contact/about/service pages) and saves what it finds
// to data/companies.json: name, description, contact details, and what kind of events the company does.
//
//   node outreach/scan.mjs                  scan every site not scanned in the last 30 days
//   node outreach/scan.mjs acme.co.th ...   scan only these
//   node outreach/scan.mjs --force          rescan everything
//
// Only pages the site allows in robots.txt are read, one request every few seconds per site.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainOf, loadList } from './lib/domains.mjs';
import { scanSite } from './lib/site.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
mkdirSync(dataDir, { recursive: true });
const config = JSON.parse(readFileSync(path.join(root, 'config.json'), 'utf8'));
const companiesFile = path.join(dataDir, 'companies.json');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--')).map(domainOf);
const companies = existsSync(companiesFile) ? JSON.parse(readFileSync(companiesFile, 'utf8')) : {};
const DAY = 86400000;

const sites = (only.length ? only : loadList(path.join(dataDir, 'sites.txt')).map(domainOf)).filter(Boolean);
console.log(`${sites.length} sites to look at`);

{
  let done = 0;
  for (const domain of sites) {
    const old = companies[domain];
    if (!force && !only.length && old?.scannedAt && Date.now() - Date.parse(old.scannedAt) < 30 * DAY) continue;
    const result = await scanSite(domain, { maxPages: config.maxPagesPerSite, delayMs: config.delayMs });
    done++;
    if (result.skipped) {
      companies[domain] = { ...old, domain, skipped: result.skipped, scannedAt: new Date().toISOString(), status: old?.status ?? 'skipped' };
      console.log(`  skip  ${domain}  (${result.skipped})`);
    } else {
      const { text, ...record } = result;
      mkdirSync(path.join(dataDir, 'pages'), { recursive: true });
      writeFileSync(path.join(dataDir, 'pages', `${domain}.txt`), text);
      // keep what a person wrote (status, notes) when the site is scanned again
      companies[domain] = { domain, status: old?.status && old.status !== 'skipped' ? old.status : 'new', notes: old?.notes ?? '', ai: old?.ai, ...record, scannedAt: new Date().toISOString() };
      const usable = result.emails.filter((e) => e.kind !== 'named').length;
      console.log(`  ${String(result.score).padStart(3)}  ${domain.padEnd(32)} ${String(usable).padStart(2)} emails  ${result.services.join(',') || '-'}`);
    }
    writeFileSync(companiesFile, JSON.stringify(companies, null, 2));
  }
  console.log(`Scanned ${done} sites. ${Object.values(companies).filter((c) => !c.skipped).length} companies saved in ${path.relative(process.cwd(), companiesFile)}. Next: node outreach/draft.mjs`);
}
