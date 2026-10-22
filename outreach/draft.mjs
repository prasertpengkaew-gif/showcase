// Writes a draft email for every scanned company worth writing to, and a page to review them in.
//
//   node outreach/draft.mjs                       drafts for new companies
//   node outreach/draft.mjs --min-score=40        only companies that clearly do events
//   node outreach/draft.mjs --include-named       also write to personal-looking addresses (off by default)
//   node outreach/draft.mjs --limit=20            at most 20 drafts
//
// Output: data/review.html (open it in a browser), data/drafts/<domain>.txt, data/drafts.csv.
// Skipped on purpose: companies already emailed (data/sent.txt), people who opted out (data/suppress.txt),
// and companies whose site only shows a personal address.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBlocked, loadList } from './lib/domains.mjs';
import { compose, reviewPage } from './lib/mail.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const config = JSON.parse(readFileSync(path.join(root, 'config.json'), 'utf8'));
const companiesFile = path.join(dataDir, 'companies.json');
if (!existsSync(companiesFile)) {
  console.error('No data/companies.json yet. Run: node outreach/discover.mjs, then node outreach/scan.mjs');
  process.exit(1);
}
const companies = Object.values(JSON.parse(readFileSync(companiesFile, 'utf8')));

const args = process.argv.slice(2);
const opt = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const minScore = Number(opt('min-score', config.minScore));
const limit = Number(opt('limit', Infinity));
const includeNamed = args.includes('--include-named');

const sent = new Set(loadList(path.join(dataDir, 'sent.txt')));
const suppressed = new Set(loadList(path.join(dataDir, 'suppress.txt')));
const blocklist = loadList(path.join(dataDir, 'blocklist.txt'));

const skipped = { notNew: 0, lowScore: 0, sent: 0, optedOut: 0, noEmail: 0, blocked: 0 };
const items = [];
for (const company of companies.sort((a, b) => b.score - a.score)) {
  if (company.skipped || company.status !== 'new') { skipped.notNew++; continue; }
  if (isBlocked(company.domain, blocklist)) { skipped.blocked++; continue; }
  if (company.ai?.isEventCompany === 'no') { skipped.blocked++; continue; }
  if (company.score < minScore) { skipped.lowScore++; continue; }
  if (sent.has(company.domain)) { skipped.sent++; continue; }
  if (suppressed.has(company.domain) || company.emails?.some((e) => suppressed.has(e.address))) { skipped.optedOut++; continue; }
  const draft = compose(company, config, { includeNamed });
  if (!draft) { skipped.noEmail++; continue; }
  if (suppressed.has(draft.to)) { skipped.optedOut++; continue; }
  items.push({ company, draft });
  if (items.length >= limit) break;
}

mkdirSync(path.join(dataDir, 'drafts'), { recursive: true });
for (const { company, draft } of items) {
  writeFileSync(path.join(dataDir, 'drafts', `${company.domain}.txt`), `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}\n`);
}
const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
writeFileSync(path.join(dataDir, 'drafts.csv'), '﻿domain,name,score,email,subject\n' + items.map(({ company, draft }) => [company.domain, company.name, company.score, draft.to, draft.subject].map(q).join(',')).join('\n') + '\n');
writeFileSync(path.join(dataDir, 'review.html'), reviewPage(items));

console.log(`${items.length} drafts written.  Open: ${path.join(dataDir, 'review.html')}`);
console.log(`Left out: ${skipped.lowScore} low relevance, ${skipped.noEmail} no usable email, ${skipped.sent} already emailed, ${skipped.optedOut} opted out, ${skipped.blocked} not companies (blocklist), ${skipped.notNew} not new.`);
if (!config.sender.name) console.log('Tip: set sender.name in outreach/config.json so the signature is filled in.');
