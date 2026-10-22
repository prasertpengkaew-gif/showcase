// Checks the outreach tool's logic without touching the network.   node outreach/test.mjs
import assert from 'node:assert/strict';
import { domainOf, isBlocked } from './lib/domains.mjs';
import { classifyCompany, classifyEmail, companyName, extractEmails, extractLine, extractPhones, extractSocials, metaContent, pageLanguage, pageLinks, pickPages, visibleText } from './lib/extract.mjs';
import { isAllowed, parseRobots } from './lib/http.mjs';
import { compose, pickEmail, reviewPage } from './lib/mail.mjs';
import { parseDuckDuckGo } from './lib/search.mjs';
import { analyzeCompany, parseJsonReply, validateAnalysis } from './lib/llm.mjs';

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name}\n     ${e.message.split('\n')[0]}`);
  }
};

// ---- robots.txt -----------------------------------------------------------------------------
const robots = parseRobots('User-agent: *\nDisallow: /admin\nDisallow: /search?\nAllow: /admin/public\n\nUser-agent: badbot\nDisallow: /\n');
check('robots: blocks a disallowed path', () => assert.equal(isAllowed(robots, '/admin/users'), false));
check('robots: a longer Allow beats a Disallow', () => assert.equal(isAllowed(robots, '/admin/public/a'), true));
check('robots: other paths are allowed', () => assert.equal(isAllowed(robots, '/contact'), true));
check('robots: rules for other bots are ignored', () => assert.equal(isAllowed(parseRobots('User-agent: badbot\nDisallow: /\n'), '/contact'), true));
check('robots: our own group beats *', () => assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:\n\nUser-agent: TheNerdStudioOutreach\nDisallow: /\n'), '/contact'), false));
check('robots: wildcard and end anchor', () => assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /*.pdf$\n'), '/files/a.pdf'), false));
check('robots: empty Disallow allows everything', () => assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:\n'), '/anything'), true));

// ---- emails and phones ----------------------------------------------------------------------
const addr = (html) => extractEmails(html).map((e) => e.address).sort();
check('email: mailto link', () => assert.deepEqual(addr('<a href="mailto:Info@Acme.co.th?subject=hi">x</a>'), ['info@acme.co.th']));
check('email: plain text, trailing dot removed', () => assert.deepEqual(addr('<p>ติดต่อ sales@acme.com.</p>'), ['sales@acme.com']));
check('email: [at] and (dot) obfuscation', () => assert.deepEqual(addr('<p>hello [at] acme [dot] co [dot] th</p>'), ['hello@acme.co.th']));
check('email: image names and placeholders are not emails', () => assert.deepEqual(addr('<img src="logo@2x.png"> you@example.com name@domain.com'), []));
check('email: the same address twice counts once', () => assert.equal(extractEmails('a@x.com <a href="mailto:a@x.com">a@x.com</a>').length, 1));
check('email: role vs freemail vs named', () => {
  assert.equal(classifyEmail('info@acme.com').kind, 'role');
  assert.equal(classifyEmail('somchai@gmail.com').kind, 'freemail');
  assert.equal(classifyEmail('somchai.j@acme.com').kind, 'named');
});
check('phone: Thai formats', () => assert.deepEqual(extractPhones('โทร 02-123-4567 หรือ 081 234 5678 หรือ +66 89 123 4567'), ['02-123-4567', '081-234-5678', '089-123-4567']));
check('phone: random digits are not phones', () => assert.deepEqual(extractPhones('ปี 2024 ราคา 1500000'), []));
check('line: official account link', () => assert.deepEqual(extractLine('<a href="https://line.me/R/ti/p/@acme">'), ['line.me/R/ti/p/@acme']));
check('socials: share buttons are ignored', () => assert.deepEqual(extractSocials('<a href="https://www.facebook.com/sharer/sharer.php?u=1"> <a href="https://www.facebook.com/acmeevents/">'), { facebook: 'https://www.facebook.com/acmeevents' }));

// ---- page facts -----------------------------------------------------------------------------
check('text: scripts, styles and entities', () => assert.equal(visibleText('<style>a{}</style><p>A &amp; B</p><script>x()</script>'), 'A & B'));
check('meta: reads either attribute order', () => assert.equal(metaContent('<meta content="Hi &quot;there&quot;" name="description">', 'description'), 'Hi "there"'));
check('name: title with a separator', () => assert.equal(companyName('<title>Acme Events | Home</title>', 'acme.com'), 'Acme Events'));
check('name: og:site_name wins', () => assert.equal(companyName('<meta property="og:site_name" content="Acme"><title>Whatever - x</title>', 'acme.com'), 'Acme'));
check('classify: tags and score for an event company', () => {
  const c = classifyCompany('เรารับจัดงานอีเวนต์ งานแสดงสินค้า บูธ นิทรรศการ งานเปิดตัวสินค้า event organizer exhibition', 'Event Organizer');
  assert.ok(c.score >= 60, `score ${c.score}`);
  assert.ok(c.services.includes('exhibition') && c.services.includes('launch'));
});
check('classify: a big shop page that mentions events once scores low', () => assert.ok(classifyCompany('สินค้าลดราคา '.repeat(400) + 'ส่งไปงาน event ได้', 'ร้านค้า').score < 20));
check('name: template leftovers and stray dashes are dropped', () => {
  assert.equal(companyName('<title>Elementor Template</title>', 'acme.com'), 'acme.com');
  assert.equal(companyName('<meta property="og:site_name" content="- acme.com">', 'acme.com'), 'acme.com');
  assert.equal(companyName('<meta property="og:site_name" content="ZODA Agency - Full service Event Agency">', 'zoda.com'), 'ZODA Agency');
});
check('classify: "third party" is not a party', () => assert.ok(!classifyCompany('we use third party cookies and a third party host', '').services.includes('wedding')));
check('classify: an unrelated site scores low', () => assert.ok(classifyCompany('ร้านขายเครื่องสำอาง สินค้าลดราคา', 'ร้านเครื่องสำอาง').score < 20));
check('language: Thai vs English', () => {
  assert.equal(pageLanguage('เรารับจัดงานอีเวนต์ทุกประเภท'), 'th');
  assert.equal(pageLanguage('We organise events across Thailand'), 'en');
});
check('links: same site only, contact page picked first', () => {
  const links = pageLinks('<a href="/about">About</a><a href="/contact-us">Contact</a><a href="https://other.com/x">x</a><a href="/a.pdf">p</a>', 'https://acme.com/');
  assert.deepEqual([...links.keys()].sort(), ['https://acme.com/about', 'https://acme.com/contact-us']);
  assert.equal(pickPages(links, 1)[0], 'https://acme.com/contact-us');
});

// ---- search and domains ---------------------------------------------------------------------
check('duckduckgo: real address is read from the redirect', () => assert.deepEqual(parseDuckDuckGo('<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Facme.co.th%2Fabout&amp;rut=1">x</a>'), ['https://acme.co.th/about']));
check('domain: normalised', () => assert.equal(domainOf('HTTPS://www.Acme.co.th/path?q=1'), 'acme.co.th'));
check('domain: social, jobs and government are not companies', () => {
  assert.equal(isBlocked('facebook.com'), true);
  assert.equal(isBlocked('m.facebook.com'), true);
  assert.equal(isBlocked('jobthai.com'), true);
  assert.equal(isBlocked('tat.go.th'), true);
  assert.equal(isBlocked('acme.co.th'), false);
});

// ---- choosing the address and writing the mail ----------------------------------------------
const config = { sender: { name: 'สมชาย', role: 'ผู้ก่อตั้ง', company: 'TheNerdStudio', email: 'hi@nerd.test', phone: '', website: 'https://nerd.test' }, polite: 'ครับ' };
const company = { domain: 'acme.co.th', name: 'Acme Events', url: 'https://acme.co.th/', lang: 'th', score: 80, services: ['exhibition', 'launch'], emails: [{ address: 'somchai.j@acme.co.th', kind: 'named' }, { address: 'acme@gmail.com', kind: 'freemail' }, { address: 'info@acme.co.th', kind: 'role' }], phones: [], line: [] };
check('pick: a company mailbox beats a free or personal address', () => assert.equal(pickEmail(company).address, 'info@acme.co.th'));
check('pick: a personal address is never used by default', () => assert.equal(pickEmail({ emails: [{ address: 'a.b@x.com', kind: 'named' }] }), null));
check('pick: ...unless asked', () => assert.equal(pickEmail({ emails: [{ address: 'a.b@x.com', kind: 'named' }] }, { includeNamed: true }).address, 'a.b@x.com'));
check('mail: Thai draft mentions the company, its event types, the demo link and the opt-out', () => {
  const d = compose(company, config);
  assert.equal(d.to, 'info@acme.co.th');
  assert.match(d.subject, /Acme Events/);
  assert.match(d.body, /งานแสดงสินค้าและนิทรรศการ/);
  assert.match(d.body, /https:\/\/nerd\.test\/event-ar/);
  assert.match(d.body, /ไม่รับ/);
  assert.match(d.body, /acme\.co\.th/);
  assert.equal(d.warnings.length, 0);
});
check('mail: several event types are listed with commas', () => assert.match(compose(company, config).body, /รับจัดงานด้านงานแสดงสินค้าและนิทรรศการ, งานเปิดตัวสินค้า/));
check('mail: a name that is only a web address is shortened', () => assert.match(compose({ ...company, name: 'jandevents.com' }, config).body, /^เรียน ทีมงาน Jandevents/));
check('mail: the polite particle follows the config', () => assert.match(compose(company, { ...config, polite: 'ค่ะ' }).body, /ขอบคุณค่ะ/));
check('mail: English draft for English sites', () => {
  const d = compose({ ...company, lang: 'en' }, config);
  assert.match(d.body, /^Dear Acme Events team/);
  assert.match(d.body, /unsubscribe/);
});
check('mail: warns when the sender name is missing', () => assert.ok(compose(company, { ...config, sender: { ...config.sender, name: '' } }).warnings.some((w) => /config\.json/.test(w))));
check('mail: no address, no draft', () => assert.equal(compose({ ...company, emails: [] }, config), null));
check('mail: a company with no known event types still gets a sensible draft', () => assert.match(compose({ ...company, services: [] }, config).body, /รับจัดงานอีเวนต์/));
check('review page: company text cannot inject HTML', () => {
  const html = reviewPage([{ company: { ...company, name: '<script>alert(1)</script>' }, draft: compose(company, config) }]);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.match(html, /&lt;script&gt;alert\(1\)/);
});

const siteText = 'เรารับจัดงานแสดงสินค้าและงานเปิดตัวสินค้าครบวงจร พร้อมทีมงานมืออาชีพ';
const aiRaw = { is_event_company: 'yes', event_types: ['exhibition', 'bogus'], summary_th: 'รับจัดงาน', evidence: 'เรารับจัดงานแสดงสินค้าและงานเปิดตัวสินค้า', uses_tech: false };
check('llm: JSON is found inside fences and chatter', () => assert.deepEqual(parseJsonReply('ok ```json {"a":1} ``` done'), { a: 1 }));
check('llm: garbage reply gives null', () => assert.equal(parseJsonReply('no json here'), null));
check('llm: unknown event types are dropped, real quote kept', () => {
  const a = validateAnalysis(aiRaw, siteText);
  assert.deepEqual(a.eventTypes, ['exhibition']);
  assert.ok(a.evidence);
});
check('llm: a quote not on the site is thrown away', () => assert.equal(validateAnalysis({ ...aiRaw, evidence: 'เราคือบริษัทอีเวนต์อันดับหนึ่งของประเทศไทย' }, siteText).evidence, ''));
check('llm: bad verdict is rejected', () => assert.equal(validateAnalysis({ ...aiRaw, is_event_company: 'sure' }, siteText), null));
await check('llm: server error becomes { error }', async () => {
  const r = await analyzeCompany(siteText, { baseUrl: 'http://x/v1', model: 'm', fetchImpl: async () => ({ ok: false, status: 500 }) });
  assert.match(r.error, /500/);
});
check('mail: AI event types replace the guessed ones', () => assert.match(compose({ ...company, services: ['wedding'], ai: { eventTypes: ['exhibition'] } }, config).body, /งานแสดงสินค้า|นิทรรศการ/));

if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All checks passed');
