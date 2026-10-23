export type AssistLang = 'en' | 'th' | 'zh';
export const ASSIST_LANGS: AssistLang[] = ['en', 'th', 'zh'];

export interface Faq {
  id: 'schedule' | 'parking' | 'speakers' | 'wifi' | 'food' | 'registration';
  /** Words people might type, in any of the languages. */
  tags: string[];
  answer: Record<AssistLang, string>;
}

export const FAQS: Faq[] = [
  { id: 'schedule', tags: ['schedule', 'agenda', 'time', 'start', 'program', 'ตาราง', 'กี่โมง', 'เริ่ม', '日程', '几点', '开始'], answer: { en: 'Doors open at 09:00. Keynote 10:00, workshops 13:00, closing 16:30.', th: 'เปิดประตู 09:00 น. Keynote 10:00 น. เวิร์กช็อป 13:00 น. ปิดงาน 16:30 น.', zh: '09:00 开门，10:00 主题演讲，13:00 工作坊，16:30 闭幕。' } },
  { id: 'parking', tags: ['parking', 'park', 'car', 'ที่จอด', 'จอดรถ', '停车', '车'], answer: { en: 'Parking is in basement B1–B3, free for 4 hours with the event QR code.', th: 'จอดรถได้ที่ชั้นใต้ดิน B1–B3 ฟรี 4 ชั่วโมงเมื่อแสดง QR code ของงาน', zh: '停车场在地下 B1–B3，出示活动二维码可免费停 4 小时。' } },
  { id: 'speakers', tags: ['speaker', 'speakers', 'who', 'keynote', 'วิทยากร', 'ผู้พูด', 'ใครพูด', '讲者', '演讲'], answer: { en: 'Keynote by the CEO of Acme; workshops led by the product and data teams.', th: 'Keynote โดย CEO ของ Acme เวิร์กช็อปนำโดยทีมผลิตภัณฑ์และทีมข้อมูล', zh: '主题演讲由 Acme 首席执行官主讲，工作坊由产品和数据团队带领。' } },
  { id: 'wifi', tags: ['wifi', 'wi-fi', 'internet', 'password', 'ไวไฟ', 'อินเทอร์เน็ต', 'รหัส', '无线', '网络', '密码'], answer: { en: 'Connect to “Acme-Guest”. The password is on your badge.', th: 'เชื่อมต่อ “Acme-Guest” รหัสผ่านอยู่บนบัตรผู้เข้างาน', zh: '连接 “Acme-Guest”，密码在您的胸牌上。' } },
  { id: 'food', tags: ['food', 'lunch', 'eat', 'halal', 'vegetarian', 'อาหาร', 'มื้อเที่ยง', 'ฮาลาล', 'มังสวิรัติ', '午餐', '吃', '清真', '素食'], answer: { en: 'Lunch is served 12:00–13:00 on level 2. Halal and vegetarian options are available.', th: 'บริการอาหารกลางวัน 12:00–13:00 น. ชั้น 2 มีอาหารฮาลาลและมังสวิรัติ', zh: '午餐 12:00–13:00 在 2 楼，提供清真和素食选项。' } },
  { id: 'registration', tags: ['register', 'registration', 'check-in', 'badge', 'ลงทะเบียน', 'เช็กอิน', 'บัตร', '注册', '签到', '胸牌'], answer: { en: 'Check in at the lobby desk with the QR code from your email.', th: 'เช็กอินที่โต๊ะล็อบบี้ด้วย QR code จากอีเมลของคุณ', zh: '请凭邮件中的二维码在大堂登记台签到。' } },
];

/** The FAQ whose tags appear most often in the question, or null when nothing matches. */
export const answerFor = (question: string): Faq | null => {
  const q = question.toLowerCase();
  let best: Faq | null = null;
  let bestScore = 0;
  for (const faq of FAQS) {
    const score = faq.tags.filter((t) => q.includes(t)).length;
    if (score > bestScore) { best = faq; bestScore = score; }
  }
  return best;
};
