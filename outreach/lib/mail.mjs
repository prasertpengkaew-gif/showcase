// Turns a scanned company into a draft email, and a set of drafts into a review page.
import { SERVICE_TAGS } from './extract.mjs';

const PREFERRED = ['info', 'contact', 'hello', 'sales', 'marketing', 'event', 'events', 'booking', 'inquiry', 'enquiry', 'service', 'admin', 'office'];
const rank = (e) => {
  if (e.kind === 'role') {
    const i = PREFERRED.findIndex((p) => e.address.startsWith(p + '@') || e.address.startsWith(p));
    return i === -1 ? 20 : i;
  }
  return e.kind === 'freemail' ? 40 : 60;
};

/** The one address to write to: a shared company mailbox first; a named person only when asked for. */
export function pickEmail(company, { includeNamed = false } = {}) {
  const ok = (company.emails ?? []).filter((e) => includeNamed || e.kind !== 'named');
  return ok.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

// What we offer, by the kind of events the company does. Every item is something with a live demo on our site.
const PITCH = {
  exhibition: {
    th: ['AR บนโปสเตอร์หรือแบนเนอร์หน้าบูธ: แขกสแกนแล้วสินค้าลุกขึ้นมาเป็น 3 มิติ', 'เกมหน้าบูธที่เล่นด้วยการยกมือ ไม่ต้องสัมผัสจอ มีตารางคะแนนดึงคนเข้าบูธ'],
    en: ['AR on posters and banners at the booth: guests scan and the product stands up in 3D', 'A hands-free booth game with a leaderboard that draws a crowd'],
  },
  launch: {
    th: ['วางสินค้าใหม่ขนาดจริงด้วย AR บนมือถือของแขก', 'ตู้ถ่ายรูป AR พร้อมกรอบภาพของงาน แขกสแกน QR code เพื่อโหลดรูป'],
    en: ['Place the new product at real size with AR on guests’ own phones', 'An AR photo booth with the event’s frame; guests scan a QR code to download the photo'],
  },
  activation: {
    th: ['ล่าสมบัติ AR ทั่วสถานที่: สแกนโปสเตอร์ สะสมแสตมป์ แลกรางวัล', 'เกมขยับตัวสำหรับจอใหญ่หน้าบูธหรือเวที'],
    en: ['An AR treasure hunt around the venue: scan posters, collect stamps, win a reward', 'A body-controlled game for big screens at the booth or stage'],
  },
  conference: {
    th: ['ตู้ถ่ายรูป AR ที่เปลี่ยนกรอบภาพตามสปอนเซอร์หรือเซสชัน', 'โปสเตอร์ AR ของวิทยากรหรือสปอนเซอร์ สแกนแล้วเห็นสไลด์หรือโมเดล 3 มิติ'],
    en: ['An AR photo booth with a different frame for each sponsor or session', 'AR posters for speakers and sponsors that show slides or a 3D model when scanned'],
  },
  concert: {
    th: ['ล่าสมบัติ AR ทั่วงานเพื่อให้คนเดินทั่วพื้นที่', 'ฟิลเตอร์และพร็อพบนใบหน้าสำหรับเซลฟี่ของแฟนคลับ'],
    en: ['An AR treasure hunt across the grounds to keep the crowd moving', 'Face filters and props for fan selfies'],
  },
  wedding: {
    th: ['ตู้ถ่ายรูป AR ตามธีมงาน แขกสแกน QR code เพื่อโหลดรูปกลับบ้าน'],
    en: ['An AR photo booth in the event’s theme; guests scan a QR code to take their photo home'],
  },
  corporate: {
    th: ['ล่าสมบัติ AR สำหรับกิจกรรมทีมหรืองานเลี้ยงบริษัท', 'ตู้ถ่ายรูป AR พร้อมกรอบภาพของบริษัท'],
    en: ['An AR treasure hunt for team activities and company parties', 'An AR photo booth with the company’s frame'],
  },
  _default: {
    th: ['ตู้ถ่ายรูป AR พร้อมกรอบภาพของงาน แขกสแกน QR code เพื่อโหลดรูป', 'ล่าสมบัติ AR ทั่วสถานที่ และเกมขยับตัวสำหรับจอใหญ่'],
    en: ['An AR photo booth with the event’s frame; guests scan a QR code to download the photo', 'An AR treasure hunt around the venue and a body-controlled game for big screens'],
  },
};

const SUBJECT = {
  exhibition: { th: (n) => `AR หน้าบูธและงานแสดงสินค้า: ไอเดียสำหรับลูกค้าของ ${n}`, en: (n) => `AR for exhibition booths: ideas for ${n}'s clients` },
  launch: { th: (n) => `AR สำหรับงานเปิดตัวสินค้า: ไอเดียสำหรับลูกค้าของ ${n}`, en: (n) => `AR for product launches: ideas for ${n}'s clients` },
  _default: { th: (n) => `ไอเดีย AR สำหรับงานอีเวนต์ของ ${n}`, en: (n) => `AR ideas for ${n}'s events` },
};

const shortName = (name) => {
  if (/\.[a-z]{2,}$/i.test(name)) return name.split('.')[0].replace(/^./, (c) => c.toUpperCase());
  return name.length > 40 ? name.slice(0, 40).trim() + '…' : name;
};
const join = (items, and) => (items.length < 2 ? items[0] ?? '' : items.slice(0, -1).join(', ') + ` ${and} ` + items.at(-1));

/** Builds { to, subject, body, lang, warnings } for one company, or null when there is no usable address. */
export function compose(company, config, { includeNamed = false } = {}) {
  const email = pickEmail(company, { includeNamed });
  if (!email) return null;
  const lang = company.lang === 'en' ? 'en' : 'th';
  const th = lang === 'th';
  const name = shortName(company.name || company.domain);
  const tags = (company.ai?.eventTypes?.length ? company.ai.eventTypes : company.services ?? []).slice(0, 2);
  const s = config.sender;
  const p = config.polite || 'ครับ';

  const bullets = [...new Set(tags.flatMap((t) => PITCH[t]?.[lang] ?? []).concat(PITCH._default[lang]))].slice(0, 4);
  const labels = tags.map((t) => SERVICE_TAGS[t].th);
  const subjectKey = SUBJECT[tags[0]] ? tags[0] : '_default';
  const signature = [[s.name || (th ? '[ชื่อผู้ส่ง]' : '[Your name]'), s.role].filter(Boolean).join(' · '), s.company, [s.email, s.phone].filter(Boolean).join(' · '), s.website].join('\n');

  const body = th
    ? [
        `เรียน ทีมงาน ${name}`,
        '',
        `เราคือ ${s.company} สตูดิโอที่ทำ AR และเว็บแอปสำหรับงานอีเวนต์ เห็นว่า ${name} ${labels.length ? `รับจัดงานด้าน${labels.join(', ')}` : 'รับจัดงานอีเวนต์'} จึงขอแนะนำตัวสั้นๆ ${p}`,
        '',
        `งานของเราเปิดผ่านเบราว์เซอร์ได้เลย แขกไม่ต้องโหลดแอป แค่สแกน QR code ตัวอย่างที่ใช้ในงานอีเวนต์:`,
        ...bullets.map((b) => `• ${b}`),
        '',
        `ลองเดโมบนมือถือได้ที่ ${s.website}/event-ar (เดโมใช้ข้อมูลตัวอย่าง)`,
        '',
        `ถ้ามีงานที่กำลังวางแผนอยู่ บอกวันที่ สถานที่ และสิ่งที่อยากให้แขกทำ เราจะเสนอไอเดีย 2–3 แบบที่เหมาะกับงานและงบให้${p}`,
        '',
        `ขอบคุณ${p}`,
        signature,
        '',
        `— อีเมลนี้ส่งถึงที่อยู่ติดต่อที่เปิดเผยบนเว็บไซต์ ${company.domain} หากไม่ต้องการรับอีเมลจากเราอีก ตอบกลับว่า "ไม่รับ" เราจะไม่ส่งอีเมลหาท่านอีก`,
      ].join('\n')
    : [
        `Dear ${name} team,`,
        '',
        `We are ${s.company}, a studio building AR and web apps for events. We saw that ${name} ${labels.length ? `runs ${join(tags.map((t) => ({ exhibition: 'exhibitions', launch: 'product launches', activation: 'activations', conference: 'conferences', concert: 'concerts and festivals', wedding: 'weddings and parties', corporate: 'corporate events' })[t]), 'and')}` : 'organises events'}, so a short introduction.`,
        '',
        `Our work opens in the phone's browser: no app to install, guests just scan a QR code. Ideas that suit your events:`,
        ...bullets.map((b) => `• ${b}`),
        '',
        `You can try the demos on a phone at ${s.website}/event-ar (the demos use sample data).`,
        '',
        `If you are planning an event, tell us the date, venue and what you want guests to do, and we will suggest two or three ideas that fit the event and budget.`,
        '',
        'Thank you,',
        signature,
        '',
        `— This email was sent to the contact address published on ${company.domain}. If you do not want to hear from us again, reply "unsubscribe" and we will not write again.`,
      ].join('\n');

  const warnings = [];
  if (!s.name) warnings.push(th ? 'ยังไม่ได้ตั้งชื่อผู้ส่งใน config.json' : 'sender name not set in config.json');
  if (email.kind === 'named') warnings.push('อีเมลเป็นชื่อบุคคล (ข้อมูลส่วนบุคคล) ตรวจให้แน่ใจก่อนส่ง');
  if (email.kind === 'freemail') warnings.push('อีเมลฟรี (gmail ฯลฯ) ตรวจว่าเป็นอีเมลธุรกิจของบริษัท');
  if (!tags.length) warnings.push('ไม่พบประเภทงานที่ชัดเจนบนเว็บไซต์ ใช้ข้อความทั่วไป');
  return { to: email.address, subject: SUBJECT[subjectKey][lang](name), body, lang, warnings };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** One self-contained page: edit each draft, then copy it or open it in Gmail / your mail app. */
export function reviewPage(items) {
  const cards = items
    .map(
      ({ company, draft }, i) => `<article data-i="${i}">
  <header><h2>${esc(company.name)} <small>${esc(company.domain)}</small></h2>
    <p>ความเกี่ยวข้อง ${company.score}/100 · ${esc((company.services ?? []).join(', ') || 'ไม่พบประเภทงาน')} · ภาษา ${draft.lang}
    · <a href="${esc(company.url)}" target="_blank" rel="noopener noreferrer">เว็บไซต์</a>${company.phones?.[0] ? ' · ' + esc(company.phones[0]) : ''}${company.line?.[0] ? ' · LINE ' + esc(company.line[0]) : ''}</p>
    ${draft.warnings.map((w) => `<p class="warn">⚠ ${esc(w)}</p>`).join('')}
  </header>
  <label>ถึง <input class="to" value="${esc(draft.to)}"></label>
  <label>หัวข้อ <input class="subject" value="${esc(draft.subject)}"></label>
  <textarea class="body" rows="16">${esc(draft.body)}</textarea>
  <div class="actions"><button data-act="copy">คัดลอกเมล</button><button data-act="gmail">เปิดใน Gmail</button><button data-act="mailto">เปิดในแอปอีเมล</button>
    <code>node outreach/mark.mjs sent ${esc(company.domain)}</code></div>
</article>`,
    )
    .join('\n');
  return `<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ร่างเมล (${items.length})</title>
<style>body{font:15px/1.5 system-ui,'Noto Sans Thai',sans-serif;margin:0;background:#f1f5f9;color:#0f172a}main{max-width:860px;margin:0 auto;padding:24px 16px}
article{background:#fff;border-radius:12px;padding:16px 18px;margin:0 0 18px;box-shadow:0 1px 3px #0002}h2{margin:0;font-size:1.1rem}small{color:#64748b;font-weight:400}p{margin:4px 0;color:#475569}.warn{color:#b45309}
label{display:block;margin:10px 0 0;font-weight:600}input,textarea{width:100%;box-sizing:border-box;font:inherit;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-weight:400}
.actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}button{font:inherit;padding:8px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}code{margin-left:auto;color:#64748b;font-size:.8rem}</style>
<main><h1>ร่างเมล ${items.length} ฉบับ</h1><p>อ่านและแก้ได้ในช่อง แล้วกดส่งเองจาก Gmail หรือแอปอีเมลของคุณ ส่งแล้วบันทึกด้วยคำสั่งใต้ปุ่ม เพื่อไม่ให้ร่างซ้ำ</p>
${cards}</main>
<script>
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const a = b.closest('article'), to = a.querySelector('.to').value.trim(), su = a.querySelector('.subject').value, body = a.querySelector('.body').value;
  if (b.dataset.act === 'copy') { try { await navigator.clipboard.writeText('To: ' + to + '\\nSubject: ' + su + '\\n\\n' + body); b.textContent = 'คัดลอกแล้ว ✓'; } catch { a.querySelector('.body').select(); document.execCommand('copy'); } }
  if (b.dataset.act === 'gmail') window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(body), '_blank', 'noopener');
  if (b.dataset.act === 'mailto') location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(su) + '&body=' + encodeURIComponent(body);
});
</script></html>`;
}
