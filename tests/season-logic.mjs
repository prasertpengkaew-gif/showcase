import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  if (!cond) failures++;
};

const server = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const season = await server.ssrLoadModule('/src/lib/season.ts');
  const data = await server.ssrLoadModule('/src/data/seasons.ts');
  const demos = await server.ssrLoadModule('/src/data/demos.ts');
  const face = await server.ssrLoadModule('/src/lib/seasonFace.ts');
  const seo = await server.ssrLoadModule('/src/seo/pages.ts');

  ok(season.monthDay(new Date('2026-10-26T16:30:00Z')) === '10-26', 'a time before midnight in Bangkok stays on that date');
  ok(season.monthDay(new Date('2026-10-26T17:30:00Z')) === '10-27', 'midnight in Bangkok rolls the calendar date');
  ok(season.isMonthDay('02-29') && !season.isMonthDay('02-30') && !season.isMonthDay('13-01') && !season.isMonthDay('1-1'), 'month-day rejects impossible dates');

  const halloween = { id: 'halloween', startsOn: '10-01', endsOn: '11-02' };
  const loy = { id: 'loy-krathong', startsOn: '11-08', endsOn: '11-30' };
  const christmas = { id: 'christmas', startsOn: '12-01', endsOn: '01-15' };
  ok(season.seasonIsOpen(halloween, '10-26') && season.seasonIsOpen(halloween, '11-02') && !season.seasonIsOpen(halloween, '11-03'), 'halloween covers October through 2 November');
  ok(season.seasonIsOpen(loy, '11-24') && !season.seasonIsOpen(loy, '11-05'), 'loy krathong is a November window');
  ok(season.seasonIsOpen(christmas, '12-25') && season.seasonIsOpen(christmas, '01-05') && !season.seasonIsOpen(christmas, '01-16'), 'christmas crosses New Year and closes in January');

  const year = [halloween, loy, christmas];
  ok(season.activeSeasonId(year, '10-26') === 'halloween', '26 October shows Halloween');
  ok(season.activeSeasonId(year, '11-24') === 'loy-krathong', 'Loy Krathong night shows that season');
  ok(season.activeSeasonId(year, '12-25') === 'christmas' && season.activeSeasonId(year, '01-02') === 'christmas', 'Christmas and early January show the New Year season');
  ok(season.activeSeasonId(year, '11-05') === 'loy-krathong', 'a gap shows the next season, not a blank page');
  ok(season.seasonStatus(loy, '11-05', 'loy-krathong') === 'upcoming', 'the next season is marked coming up while it is still closed');
  ok(season.seasonStatus(halloween, '11-05', 'loy-krathong') === 'past', 'a season that just ended is marked past');
  ok(season.activeSeasonId(year, '02-01') === 'halloween', 'after New Year the next season is Halloween');
  ok(season.activeSeasonId([], '10-26') === null && season.activeSeasonId([{ id: 'bad', startsOn: '13-40', endsOn: '10-01' }], '10-26') === null, 'no usable window means no season');

  const overlap = [
    { id: 'early', startsOn: '10-01', endsOn: '10-20' },
    { id: 'late', startsOn: '10-10', endsOn: '10-31' },
  ];
  ok(season.activeSeasonId(overlap, '10-15') === 'late', 'when two seasons are open, the one that started later wins');
  ok(season.activeSeasonId(overlap, '10-05') === 'early', 'before the second season opens, the first one wins');
  const wrap = [
    { id: 'ny', startsOn: '12-15', endsOn: '01-10' },
    { id: 'late', startsOn: '01-05', endsOn: '01-20' },
  ];
  ok(season.seasonIsOpen(wrap[0], '01-07') && season.activeSeasonId(wrap, '01-07') === 'late', 'a New Year overlap still prefers the season that started more recently');

  ok(season.formatWindow(halloween, 'en') === '1 Oct – 2 Nov', 'english window reads month then day');
  ok(season.formatWindow(halloween, 'th') === '1 ต.ค. – 2 พ.ย.', 'thai window uses thai month names');
  ok(season.seasonPath() === '/season' && season.seasonPath('halloween') === '/season/halloween', 'calendar page and fixed season page have stable paths');
  ok(season.findSeason(year, 'loy-krathong')?.id === 'loy-krathong' && season.findSeason(year, 'nope') === undefined, 'lookup is by id');

  const shipped = data.seasons;
  const ids = shipped.map((item) => item.id);
  ok(ids.length >= 3 && new Set(ids).size === ids.length, 'shipped seasons have unique ids');
  ok(ids.includes('halloween') && ids.includes('loy-krathong') && ids.includes('christmas'), 'halloween, loy krathong and christmas are shipped');
  const demoIds = new Set(demos.demos.map((item) => item.id));
  const themes = new Set(season.SEASON_THEMES);
  const floors = new Set(season.FLOOR_KINDS);
  for (const item of shipped) {
    ok(season.isMonthDay(item.startsOn) && season.isMonthDay(item.endsOn), `${item.id}: date window is a real month-day`);
    ok(themes.has(item.theme) && floors.has(item.floor) && ['neon', 'gold', 'fest'].includes(item.frame), `${item.id}: theme, floor and frame are known`);
    ok(item.demos.length > 0 && item.demos.every((id) => demoIds.has(id)), `${item.id}: featured demos exist`);
    ok((face.SEASON_LOOKS[item.theme] ?? []).length > 0, `${item.id}: the theme has face looks`);
    for (const lang of ['th', 'en']) {
      const copy = item[lang];
      ok(copy.name && copy.heroTitle && copy.heroText && copy.pitch && copy.ctaLabel, `${item.id}: ${lang} hero copy is filled in`);
      ok(copy.contactDraft.trim().length >= 20, `${item.id}: ${lang} contact draft is long enough to send`);
      const looks = face.SEASON_LOOKS[item.theme];
      ok(looks.every((look) => copy.looks[look]), `${item.id}: ${lang} names every look`);
    }
  }
  let sharedDay = false;
  for (let month = 1; month <= 12; month++) {
    const last = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
    for (let day = 1; day <= last; day++) {
      const key = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (shipped.filter((item) => season.seasonIsOpen(item, key)).length > 1) sharedDay = true;
    }
  }
  ok(!sharedDay, 'shipped seasons do not overlap, so the booth page changes on a single day');
  ok(season.activeSeasonId(shipped, season.monthDay(new Date('2026-10-26T12:00:00Z'))) === 'halloween', '26 October 2026 in Bangkok is the Halloween landing');

  const pages = seo.allPages.filter((page) => page.path === '/season' || page.path.startsWith('/season/'));
  ok(pages.length === shipped.length + 1, 'sitemap source has the calendar page and one page per season');
  const titles = seo.allPages.map((page) => page.th.title);
  const descriptions = seo.allPages.map((page) => page.th.description);
  ok(new Set(titles).size === titles.length, 'thai titles stay unique across the site');
  ok(new Set(descriptions).size === descriptions.length, 'thai descriptions stay unique across the site');
  for (const page of pages) {
    ok(/[\u0E00-\u0E7F]/.test(page.th.title) && page.th.title.length <= 75, `thai title length ${page.th.title.length}: ${page.path}`);
    ok(page.th.description.length >= 50 && page.th.description.length <= 220, `thai description length ${page.th.description.length}: ${page.path}`);
    ok(page.en.title.length > 10 && page.en.description.length >= 50 && page.en.description.length <= 220, `english seo length: ${page.path} (${page.en.description.length})`);
  }
} finally {
  await server.close();
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll season checks passed.');
