// Records what happened to a company, so it is not drafted again.
//
//   node outreach/mark.mjs sent acme.co.th other.com     you sent the email
//   node outreach/mark.mjs replied acme.co.th            they answered (stays out of new drafts)
//   node outreach/mark.mjs optout acme.co.th             they said not to write again (domain or full address)
//   node outreach/mark.mjs skip acme.co.th               not interested in them
//   node outreach/mark.mjs --profile=real-estate sent acme.co.th
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainOf } from './lib/domains.mjs';
import { profileDataDir, profileFromArgs } from './lib/profile.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const profile = profileFromArgs(args);
const dataDir = profileDataDir(root, profile);
const sharedDataDir = path.join(root, 'data');
const [action, ...targets] = args.filter((arg) => !arg.startsWith('--'));
const STATUS = { sent: 'sent', replied: 'replied', optout: 'optout', skip: 'skipped' };
if (!STATUS[action] || !targets.length) {
  console.error('Usage: node outreach/mark.mjs [--profile=events|real-estate] sent|replied|optout|skip <domain-or-email> ...');
  process.exit(1);
}
mkdirSync(dataDir, { recursive: true });
mkdirSync(sharedDataDir, { recursive: true });
const file = path.join(dataDir, 'companies.json');
const companies = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);

for (const target of targets) {
  const isEmail = target.includes('@');
  const domain = isEmail ? target.split('@')[1].toLowerCase() : domainOf(target);
  if (action === 'sent') appendFileSync(path.join(sharedDataDir, 'sent.txt'), `${domain}  # ${today}\n`);
  if (action === 'optout') appendFileSync(path.join(sharedDataDir, 'suppress.txt'), `${isEmail ? target.toLowerCase() : domain}  # ${today}\n`);
  if (companies[domain]) companies[domain].status = STATUS[action];
  console.log(`${action}: ${target}`);
}
writeFileSync(file, JSON.stringify(companies, null, 2));
