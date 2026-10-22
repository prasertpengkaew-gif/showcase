// Checks the retrieval and access control behind the enterprise knowledge-assistant demo (no browser needed).
//   npm run test:rag
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
  const { DOCS, ROLES, search, visibleDocs } = await server.ssrLoadModule('/src/lib/rag.ts');
  const top = (q, role, lang) => search(q, role, lang)[0]?.doc.id;

  ok(DOCS.every((d) => d.passages.th.length === d.passages.en.length && d.passages.th.length > 0), 'every document has matching Thai and English passages');
  ok(ROLES.every((r) => visibleDocs(r).length >= 3), 'every role can read the shared documents');

  ok(top('How many days of annual leave do I get?', 'employee', 'en') === 'leave', 'English leave question finds the leave policy');
  ok(top('ลาพักร้อนได้กี่วัน', 'employee', 'th') === 'leave', 'Thai leave question finds the leave policy');
  ok(top('hotel limit per night', 'employee', 'en') === 'expense', 'English travel question finds the expense policy');
  ok(top('ลืมโน้ตบุ๊กหาย ต้องแจ้งใคร', 'employee', 'th') === 'security', 'Thai laptop question finds the security policy');

  // Access control: restricted documents are never searched for the wrong role.
  ok(top('salary band for level 3 engineers', 'hr', 'en') === 'salary', 'HR can find salary bands');
  ok(search('salary band for level 3 engineers', 'employee', 'en').every((h) => h.doc.id !== 'salary'), 'an employee never gets the HR-only document');
  ok(search('เงินเดือนวิศวกรระดับ 3', 'finance', 'th').every((h) => h.doc.id !== 'salary'), 'finance never gets the HR-only document');
  ok(top('Q3 revenue', 'finance', 'en') === 'results', 'Finance can find Q3 results');
  ok(search('Q3 revenue operating margin', 'hr', 'en').every((h) => h.doc.id !== 'results'), 'HR never gets the finance-only document');

  // The sample questions shown on the page must behave as the page promises, in both languages.
  for (const lang of ['th', 'en']) {
    const { default: _d, ...mod } = await server.ssrLoadModule(`/src/i18n/${lang}.ts`);
    const [leave, hotel, salary, revenue] = mod[lang].rag.samples;
    ok(top(leave, 'employee', lang) === 'leave', `[${lang}] sample 1 finds the leave policy`);
    ok(top(hotel, 'employee', lang) === 'expense', `[${lang}] sample 2 finds the expense policy`);
    ok(top(salary, 'hr', lang) === 'salary' && search(salary, 'employee', lang).length === 0, `[${lang}] sample 3 is answered for HR and refused for an employee`);
    ok(top(revenue, 'finance', lang) === 'results' && search(revenue, 'employee', lang).length === 0, `[${lang}] sample 4 is answered for Finance and refused for an employee`);
  }

  ok(search('recipe for pad thai', 'employee', 'en').length === 0, 'an off-topic question returns nothing');
  ok(search('   ', 'employee', 'en').length === 0, 'an empty question returns nothing');
} finally {
  await server.close();
}
if (failures) {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All checks passed');
