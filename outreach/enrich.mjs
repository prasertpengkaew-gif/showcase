// Lets the AI server read the saved text of each scanned website and judge the company:
// does it really organise events, which kinds, a one-line Thai summary, and a quote from its own site to refer to.
//
//   node outreach/enrich.mjs                 companies that have no AI result yet
//   node outreach/enrich.mjs --force         read everything again (after changing the prompt or the model)
//   node outreach/enrich.mjs acme.co.th      only this one
//
// The server address is `llm.baseUrl` in config.json. Needs scan.mjs to have run first (it saves the page text).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainOf } from './lib/domains.mjs';
import { analyzeCompany } from './lib/llm.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const config = JSON.parse(readFileSync(path.join(root, 'config.json'), 'utf8'));
const file = path.join(dataDir, 'companies.json');
if (!existsSync(file)) {
  console.error('No data/companies.json yet. Run discover.mjs and scan.mjs first.');
  process.exit(1);
}
const companies = JSON.parse(readFileSync(file, 'utf8'));
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--')).map(domainOf);

const todo = Object.values(companies).filter((c) => !c.skipped && existsSync(path.join(dataDir, 'pages', `${c.domain}.txt`)) && (only.length ? only.includes(c.domain) : force || !c.ai || c.ai.error));
console.log(`${todo.length} companies to read with ${config.llm.model}`);
let done = 0;
for (const c of todo) {
  const started = Date.now();
  const ai = await analyzeCompany(readFileSync(path.join(dataDir, 'pages', `${c.domain}.txt`), 'utf8'), config.llm);
  c.ai = ai.error ? { error: ai.error } : ai;
  writeFileSync(file, JSON.stringify(companies, null, 2));
  done++;
  const secs = ((Date.now() - started) / 1000).toFixed(0).padStart(3);
  console.log(ai.error ? `  ${secs}s  ${c.domain.padEnd(30)} ERROR ${ai.error}` : `  ${secs}s  ${c.domain.padEnd(30)} ${ai.isEventCompany.padEnd(5)} ${ai.eventTypes.join(',') || '-'}  ${ai.evidence ? '"' + ai.evidence.slice(0, 50) + '…"' : '(no quote)'}`);
  if (ai.error && /unreachable/.test(ai.error)) {
    console.error('The AI server did not answer, stopping. Check llm.baseUrl in outreach/config.json.');
    break;
  }
}
console.log(`Read ${done} companies. Next: node outreach/draft.mjs`);
