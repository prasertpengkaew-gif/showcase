/**
 * Enterprise knowledge-assistant demo: the retrieval half of RAG, running in the browser on a
 * small fictional company's documents. Passages are ranked with BM25 and only documents the
 * chosen role may read are ever searched. The "answer" is the best passages quoted with their
 * sources; a real deployment hands the same passages to an LLM to write the reply.
 */
export type Role = 'employee' | 'hr' | 'finance';
export const ROLES: readonly Role[] = ['employee', 'hr', 'finance'];
export type Lang = 'th' | 'en';

export interface Doc {
  id: string;
  /** Who may read it: everyone, or only the named role. */
  access: 'all' | 'hr' | 'finance';
  title: Record<Lang, string>;
  passages: Record<Lang, string[]>;
}

export const DOCS: Doc[] = [
  {
    id: 'leave',
    access: 'all',
    title: { th: 'นโยบายการลา', en: 'Leave policy' },
    passages: {
      th: [
        'พนักงานมีสิทธิ์ลาพักร้อน 10 วันต่อปีหลังทำงานครบ 1 ปี และเพิ่มเป็น 15 วันเมื่อทำงานครบ 5 ปี ยื่นคำขอผ่านพอร์ทัล HR ล่วงหน้าอย่างน้อย 3 วันทำการ',
        'ลาป่วยได้สูงสุด 30 วันต่อปีโดยได้รับค่าจ้าง หากลาติดต่อกันตั้งแต่ 3 วันขึ้นไปต้องแนบใบรับรองแพทย์',
      ],
      en: [
        'Employees get 10 days of annual leave per year after one year of service, rising to 15 days after five years. Request leave in the HR portal at least 3 working days ahead.',
        'Sick leave is paid for up to 30 days per year. A medical certificate is required for 3 or more consecutive days.',
      ],
    },
  },
  {
    id: 'expense',
    access: 'all',
    title: { th: 'นโยบายค่าใช้จ่ายและการเดินทาง', en: 'Expense and travel policy' },
    passages: {
      th: [
        'เบิกค่าใช้จ่ายภายใน 30 วันพร้อมใบเสร็จ ค่าอาหารระหว่างเดินทางเบิกได้ไม่เกิน 500 บาทต่อวัน',
        'เดินทางด้วยเครื่องบินชั้นประหยัด ค่าที่พักในกรุงเทพฯ ไม่เกิน 2,500 บาทต่อคืน',
      ],
      en: [
        'Submit expense claims within 30 days with receipts. Meals on business trips are reimbursed up to 500 THB per day.',
        'Fly economy class. Hotels in Bangkok are reimbursed up to 2,500 THB per night.',
      ],
    },
  },
  {
    id: 'security',
    access: 'all',
    title: { th: 'นโยบายความปลอดภัยด้านไอที', en: 'IT security policy' },
    passages: {
      th: [
        'รหัสผ่านต้องยาวอย่างน้อย 14 ตัวอักษรและเปิดใช้การยืนยันตัวตนหลายขั้นตอน หากโน้ตบุ๊กหายต้องแจ้งไอทีภายใน 1 ชั่วโมง',
        'ห้ามส่งข้อมูลลูกค้าทางอีเมลส่วนตัวหรือใส่ในเครื่องมือ AI สาธารณะ',
      ],
      en: [
        'Passwords must be at least 14 characters and multi-factor authentication is required. Report a lost laptop to IT within 1 hour.',
        'Never send customer data through personal email or paste it into public AI tools.',
      ],
    },
  },
  {
    id: 'salary',
    access: 'hr',
    title: { th: 'โครงสร้างเงินเดือน (เฉพาะ HR)', en: 'Salary bands (HR only)' },
    passages: {
      th: [
        'วิศวกรระดับ 3 เงินเดือน 45,000 ถึง 65,000 บาทต่อเดือน โบนัสเป้าหมาย 10 เปอร์เซ็นต์ ของเงินเดือนประจำปี',
        'พิจารณาเลื่อนตำแหน่งปีละสองรอบ คือเดือนเมษายนและเดือนตุลาคม',
      ],
      en: [
        'Level 3 engineers earn 45,000 to 65,000 THB per month with a target bonus of 10 percent of annual salary.',
        'Promotion reviews happen twice a year, in April and in October.',
      ],
    },
  },
  {
    id: 'results',
    access: 'finance',
    title: { th: 'สรุปผลประกอบการไตรมาส 3 (เฉพาะการเงิน)', en: 'Q3 results (Finance only)' },
    passages: {
      th: [
        'รายได้ไตรมาส 3 อยู่ที่ 42.5 ล้านบาท เพิ่มขึ้น 12 เปอร์เซ็นต์จากปีก่อน อัตรากำไรจากการดำเนินงาน 18 เปอร์เซ็นต์',
        'ระงับการจ้างงานใหม่จนกว่าจะทบทวนงบประมาณในไตรมาส 1',
      ],
      en: [
        'Q3 revenue was 42.5 million THB, up 12 percent year on year, with an operating margin of 18 percent.',
        'New hiring is frozen until the budget review in Q1.',
      ],
    },
  },
];

export const canRead = (role: Role, doc: Doc): boolean => doc.access === 'all' || doc.access === role;
export const visibleDocs = (role: Role): Doc[] => DOCS.filter((d) => canRead(role, d));

/** Words only; Thai is split with the browser's word segmenter. */
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'is', 'are', 'in', 'for', 'and', 'or', 'what', 'how', 'do', 'does', 'can', 'i', 'we', 'my', 'get', 'ได้', 'คือ', 'และ', 'หรือ', 'ของ', 'ที่', 'ใน', 'มี', 'กี่', 'อะไร', 'ไหม', 'เท่าไร', 'เท่าไหร่']);

export function tokenize(text: string, lang: Lang): string[] {
  const lower = text.toLowerCase();
  const words =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? Array.from(new Intl.Segmenter(lang, { granularity: 'word' }).segment(lower))
          .filter((s) => s.isWordLike)
          .map((s) => s.segment)
      : lower.split(/[^\p{L}\p{N}]+/u);
  return words.filter((w) => w.length > 0 && !STOP.has(w));
}

export interface Hit {
  doc: Doc;
  /** Index into doc.passages[lang]. */
  passage: number;
  text: string;
  score: number;
}

/** A passage must score at least this to count as an answer, else "not found". */
export const MIN_SCORE = 1.5;

/** BM25 over the passages `role` may read. Returns hits best first, at most `limit`. */
export function search(query: string, role: Role, lang: Lang, limit = 2): Hit[] {
  const q = [...new Set(tokenize(query, lang))];
  if (!q.length) return [];
  const passages = visibleDocs(role).flatMap((doc) =>
    doc.passages[lang].map((text, passage) => ({ doc, passage, text, tokens: tokenize(text, lang) })),
  );
  const avgLen = passages.reduce((n, p) => n + p.tokens.length, 0) / passages.length;
  const k1 = 1.4;
  const b = 0.75;
  const hits = passages.map((p) => {
    let score = 0;
    for (const term of q) {
      const tf = p.tokens.filter((t) => t === term).length;
      if (!tf) continue;
      const df = passages.filter((o) => o.tokens.includes(term)).length;
      const idf = Math.log(1 + (passages.length - df + 0.5) / (df + 0.5));
      score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * p.tokens.length) / avgLen));
    }
    return { doc: p.doc, passage: p.passage, text: p.text, score };
  });
  return hits
    .filter((h) => h.score >= MIN_SCORE)
    .sort((a, c) => c.score - a.score)
    .slice(0, limit);
}
