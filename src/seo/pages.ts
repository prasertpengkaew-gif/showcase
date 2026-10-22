/**
 * Search-engine copy for every public page, in Thai and English.
 *
 * Used at build time (scripts/prerender.mjs writes it into each page's static HTML, the
 * sitemap and the structured data) and at run time (useDocumentTitle keeps the tab title and
 * the meta description in step when the visitor navigates or switches language).
 *
 * Thai is the primary language: crawlers get the Thai version (see src/i18n/index.tsx).
 * Keep titles under about 60 characters and descriptions under about 160.
 */
import { projects } from '../data/projects';
import { projectsTh } from '../i18n/content.th';

export type SeoLang = 'th' | 'en';
export interface SeoText {
  title: string;
  description: string;
}
export interface SeoPage {
  path: string;
  th: SeoText;
  en: SeoText;
  /** Higher = listed first in the sitemap and the static page menu. */
  priority: number;
}

export const SITE_NAME = 'TheNerdStudio';

export const staticPages: SeoPage[] = [
  {
    path: '/',
    priority: 1,
    th: {
      title: 'TheNerdStudio — รับทำ AR, VR, 3D และ Web App ไม่ต้องโหลดแอป',
      description:
        'สตูดิโอรับทำ WebAR, VR, 3D และ Web app ตามสั่ง สำหรับสินค้า อีเวนต์ โลจิสติกส์ โรงงาน และการศึกษา เปิดได้จากลิงก์หรือ QR code ลองเดโมได้ฟรีบนเว็บนี้',
    },
    en: {
      title: 'TheNerdStudio — WebAR, VR, 3D & Web App Development',
      description:
        'A studio building WebAR, VR, 3D and custom web apps for products, events, logistics, factories and education. Opens from a link or QR code. Try the demos free.',
    },
  },
  {
    path: '/projects',
    priority: 0.8,
    th: {
      title: 'ผลงาน AR VR 3D — ตัวอย่างโปรเจกต์ | TheNerdStudio',
      description:
        'ตัวอย่างผลงาน AR, VR และ 3D ใน 6 อุตสาหกรรม ทั้งสินค้า อสังหาริมทรัพย์ โรงงาน การศึกษา และการตลาด เปิดดูและลอง AR ได้เอง',
    },
    en: {
      title: 'Portfolio — AR, VR and 3D Projects | TheNerdStudio',
      description: 'Sample AR, VR and 3D projects across six industries: product, real estate, industrial, education and marketing. Open them and try AR yourself.',
    },
  },
  {
    path: '/demos',
    priority: 0.9,
    th: {
      title: 'เดโม AR VR 3D ลองเล่นฟรี — ตู้ถ่ายรูป AR แผนที่ 3D Digital Twin',
      description:
        'รวมเดโมที่ลองได้จริงบนมือถือและคอม: ตู้ถ่ายรูป AR ล่าสมบัติ AR แผนที่ 3D Digital Twin โรงงาน ระบบขนส่ง TMS ห้องเย็น และผู้ช่วย AI ในองค์กร',
    },
    en: {
      title: 'Free AR, VR and 3D Demos — Photo Booth, 3D Map, Digital Twin',
      description: 'Working demos for phone and desktop: AR photo booth, AR scavenger hunt, 3D map, factory digital twin, TMS dispatch board, cold room and enterprise AI.',
    },
  },
  {
    path: '/event-booth',
    priority: 0.9,
    th: {
      title: 'AR Photo Booth ตู้ถ่ายรูป AR สำหรับงานอีเวนต์ เช่าได้',
      description:
        'ตู้ถ่ายรูป AR ที่ใช้ได้ทั้งแท็บเล็ตและโน้ตบุ๊ก ใส่กรอบและชื่องานของลูกค้า แขกสแกน QR รับรูปได้ทันที ไม่ต้องโหลดแอป เหมาะกับออแกไนซ์และงานแบรนด์',
    },
    en: {
      title: 'AR Photo Booth for Events — Frames, QR Download, Rental',
      description: 'An AR photo booth for tablets and laptops with your event frame and name. Guests scan a QR code to get their photo, no app needed. Built for event organisers.',
    },
  },
  {
    path: '/map-3d',
    priority: 0.9,
    th: {
      title: 'แผนที่ 3D แบบโต้ตอบ ค้นหาสถานที่ เส้นทาง พื้นที่เดินถึง | TheNerdStudio',
      description:
        'เดโมแผนที่ 3D บนเว็บ ค้นหาสถานที่ บินกล้องไปที่หมาย ดูเส้นทางและพื้นที่ที่เดินถึงใน 5-15 นาที สลับกลางวันกลางคืน เหมาะกับอสังหาฯ ห้างสรรพสินค้า ท่องเที่ยว นิคมอุตสาหกรรม',
    },
    en: {
      title: 'Interactive 3D Map — Search, Routes, Walking Areas | TheNerdStudio',
      description: 'A 3D map demo on the web: search places, fly the camera to them, see routes and what you can walk to in 5-15 minutes. For real estate, malls, tourism and industrial estates.',
    },
  },
  {
    path: '/digital-twin',
    priority: 0.9,
    th: {
      title: 'Digital Twin โรงงาน 3D แสดงสถานะเครื่องจักรแบบเรียลไทม์',
      description:
        'ตัวอย่าง Digital Twin ของสายการผลิต แสดงสถานะ อุณหภูมิ และการแจ้งเตือนของเครื่องจักรในแบบ 3D เชื่อมข้อมูลจริงจาก PLC, OPC UA หรือ MQTT ได้ (เดโมใช้ข้อมูลจำลอง)',
    },
    en: {
      title: 'Factory Digital Twin in 3D — Live Machine Status',
      description: 'A production-line digital twin with machine status, temperature and alerts in 3D. Connects to real data from PLC, OPC UA or MQTT (the demo uses simulated data).',
    },
  },
  {
    path: '/web-apps',
    priority: 0.8,
    th: {
      title: 'รับพัฒนา Web App ตามสั่ง แดชบอร์ด ตู้คีออสก์ ระบบหลังบ้าน',
      description:
        'รับพัฒนา web app บนเบราว์เซอร์ ทั้งแดชบอร์ดข้อมูลสด ตู้คีออสก์งานอีเวนต์ ระบบหลังบ้านและฐานข้อมูล ลองใช้แอปตัวอย่างที่ใช้งานจริงได้ฟรีบนเว็บนี้',
    },
    en: {
      title: 'Custom Web App Development — Dashboards, Kiosks, Admin Tools',
      description: 'We build browser-based web apps: live dashboards, event kiosks, back-office tools and databases. Try working example apps free on this site.',
    },
  },
  {
    path: '/enterprise-ai',
    priority: 0.8,
    th: {
      title: 'ผู้ช่วย AI ในองค์กร ตอบจากเอกสารบริษัทด้วย LLM และ RAG',
      description:
        'ตัวอย่างผู้ช่วย AI ที่ตอบจากเอกสารภายในองค์กร อ้างแหล่งที่มา และจำกัดตามสิทธิ์ของแต่ละตำแหน่ง รับพัฒนาระบบ LLM และ RAG เชื่อม SharePoint, Google Drive ได้ ลองเดโมฟรี',
    },
    en: {
      title: 'Enterprise AI Assistant — LLM and RAG on Company Documents',
      description: 'A sample AI assistant that answers from internal documents, cites its sources and respects each role’s access. We build LLM and RAG systems on SharePoint or Google Drive. Try the demo free.',
    },
  },
  {
    path: '/tms',
    priority: 0.8,
    th: {
      title: 'ระบบ TMS บริหารการขนส่ง ติดตามรถ แจ้งเตือนล่าช้า แอปคนขับ',
      description:
        'ตัวอย่างระบบบริหารการขนส่ง (TMS) กระดานจัดรถแสดงความคืบหน้าแบบสด แจ้งเตือนเที่ยวล่าช้า เวลาถึง และอัตราส่งตรงเวลา รับพัฒนา TMS ตามสั่ง พร้อมแอปคนขับ ลองเดโมฟรี',
    },
    en: {
      title: 'Transport Management System (TMS) — Dispatch, Tracking, Driver App',
      description: 'A sample TMS dispatch board with live trip progress, delay alerts, ETAs and on-time rate. We build custom transport management systems with driver apps. Try the demo free.',
    },
  },
  {
    path: '/cold-room',
    priority: 0.8,
    th: {
      title: 'ระบบจัดการห้องเย็น Cold Room Locator ตำแหน่งสต๊อก ลำดับการเบิก',
      description:
        'ตัวอย่างเว็บแอปจัดการห้องเย็นและคลังสินค้า บันทึกตำแหน่งพาเลท แนะนำลำดับการเบิกที่ย้ายของน้อยที่สุด ควบคุมยอดสต๊อกและประวัติย้อนหลัง รับพัฒนาตามสั่ง ลองเดโมฟรี',
    },
    en: {
      title: 'Cold Room Locator — Cold Storage Stock Location and Picking Order',
      description: 'A sample web app for cold rooms and warehouses: pallet locations, a picking order that moves the fewest pallets, stock control and audit history. Built to order. Try the demo free.',
    },
  },
  {
    path: '/gesture-vote',
    priority: 0.6,
    th: { title: 'ตู้โหวตด้วยท่ามือสำหรับงานอีเวนต์', description: 'เดโมคีออสก์รับความคิดเห็นในงาน โหวตด้วยท่ามือหน้ากล้องหรือกดปุ่ม คะแนนอยู่บนหน้าจอและไม่ถูกบันทึก' },
    en: { title: 'Gesture Vote Booth for Events', description: 'A sample event feedback kiosk. Vote with a thumbs-up or down gesture, or use the buttons. Votes stay on screen and are not saved.' },
  },
  {
    path: '/app-design',
    priority: 0.7,
    th: {
      title: 'รับออกแบบ UI/UX แอปมือถือ ต้นแบบที่กดได้ พร้อมส่งต่อนักพัฒนา',
      description:
        'รับออกแบบหน้าจอแอปมือถือสำหรับ iPhone และ Android ครบทุกหน้า มีต้นแบบที่กดใช้ได้และบันทึกส่งต่อนักพัฒนา ดูงานออกแบบแอปแฟชั่น AI และแอปดูแลสัตว์เลี้ยงของเรา',
    },
    en: {
      title: 'Mobile App UI/UX Design — Clickable Prototypes and Developer Hand-off',
      description: 'We design iPhone and Android app screens end to end, with a clickable prototype and developer hand-off notes. See our fashion AI and pet care app designs.',
    },
  },
  {
    path: '/event-ar',
    priority: 0.9,
    th: {
      title: 'ไอเดีย AR สำหรับงานอีเวนต์ ตู้ถ่ายรูป ล่าสมบัติ เกม และโปสเตอร์',
      description:
        'ไอเดีย AR สำหรับงานแสดงสินค้า เปิดตัวสินค้า งานแต่งงาน เทศกาล งานสัมมนา และงานเปิดบ้าน พร้อมเดโมที่ลองได้บนมือถือ ตู้ถ่ายรูป AR ล่าสมบัติ เกมขยับตัว และโปสเตอร์ AR',
    },
    en: {
      title: 'AR Ideas for Events — Photo Booth, Hunts, Games and Posters',
      description: 'AR ideas for trade shows, launches, weddings, festivals, conferences and open houses, with demos to try on your phone: AR photo booth, scavenger hunt, motion game and AR posters.',
    },
  },
  {
    path: '/ar-hunt',
    priority: 0.8,
    th: {
      title: 'ล่าสมบัติ AR สำหรับงานอีเวนต์และงานแฟร์ สแกนภาพบนโปสเตอร์',
      description: 'เกมล่าสมบัติ AR ให้แขกสแกนโปสเตอร์หลายจุดในงานเพื่อสะสมแต้ม ใช้ภาพของแบรนด์ได้ ทำงานบนเบราว์เซอร์ ไม่ต้องโหลดแอป',
    },
    en: {
      title: 'AR Scavenger Hunt for Events and Fairs — Scan Posters',
      description: 'An AR scavenger hunt: guests scan posters around the venue to collect points. Uses your brand imagery and runs in the browser.',
    },
  },
  {
    path: '/print-ar',
    priority: 0.8,
    th: {
      title: 'Print AR สแกนภาพบนนามบัตร โบรชัวร์ บรรจุภัณฑ์ ให้ขยับได้',
      description: 'ให้ภาพสิ่งพิมพ์ เช่น นามบัตร โบรชัวร์ เมนู และบรรจุภัณฑ์ มีโมเดล 3D ลอยขึ้นมาเมื่อสแกนด้วยกล้องมือถือ ผ่านเว็บโดยไม่ต้องโหลดแอป',
    },
    en: {
      title: 'Print AR — Make Cards, Brochures and Packaging Come Alive',
      description: 'Print a card, brochure, menu or package and a 3D model appears when scanned with a phone camera. Runs on the web, no app.',
    },
  },
  {
    path: '/face-ar',
    priority: 0.8,
    th: {
      title: 'Face AR ลองแว่นตาและฟิลเตอร์หน้า บนเว็บ ประมวลผลในเครื่อง',
      description: 'ลองแว่นกันแดดและฟิลเตอร์ใบหน้าผ่านกล้องบนเว็บ ติดตามใบหน้าในเครื่องของผู้ใช้ ไม่อัปโหลดภาพ ไม่ระบุตัวตน เหมาะกับแว่นตา เครื่องประดับ และความงาม',
    },
    en: {
      title: 'Face AR — Try Glasses and Face Filters on the Web',
      description: 'Try sunglasses and face filters through the camera. Face tracking runs on the device: no upload, no identification. For eyewear, accessories and beauty.',
    },
  },
  {
    path: '/try-on',
    priority: 0.7,
    th: {
      title: 'ลองสินค้าเสมือน หมวก สร้อย นาฬิกา เสื้อ ด้วยกล้องมือถือ',
      description: 'Virtual Try-On ลองหมวก สร้อยคอ นาฬิกา และเสื้อผ่านกล้อง ติดตามใบหน้าและลำตัวบนเว็บ ไม่ต้องโหลดแอป เหมาะกับร้านค้าออนไลน์และแฟชั่น',
    },
    en: {
      title: 'Virtual Try-On — Hats, Necklaces, Watches and Tops',
      description: 'Try hats, necklaces, watches and tops through the camera with face and body tracking on the web. For online stores and fashion.',
    },
  },
  {
    path: '/ar-playground',
    priority: 0.7,
    th: {
      title: 'ทดลอง AR วางเก้าอี้ขนาดจริงในห้องของคุณ ด้วยมือถือ',
      description: 'ลองวางโมเดล 3D ขนาดจริงในห้องผ่านมือถือ รองรับ Quick Look บน iPhone/iPad และ Scene Viewer / WebXR บน Android ไม่ต้องโหลดแอป',
    },
    en: {
      title: 'AR Playground — Place a True-Size Chair in Your Room',
      description: 'Place true-size 3D models in your room from a phone. Works with Quick Look on iPhone and iPad and Scene Viewer / WebXR on Android, no app.',
    },
  },
  {
    path: '/vr-showroom',
    priority: 0.7,
    th: {
      title: 'VR โชว์รูม เดินชมโชว์รูมเสมือนจริงบนเว็บ รองรับแว่น VR',
      description: 'โชว์รูม 3D ที่เดินชมได้บนเว็บ ใช้ได้ทั้งคอม มือถือ และแว่น VR เหมาะกับอสังหาริมทรัพย์ รถยนต์ และงานแสดงสินค้า',
    },
    en: {
      title: 'VR Showroom — Walk Through a Virtual Showroom on the Web',
      description: 'A 3D showroom you can walk through on the web, on desktop, phone or VR headset. For real estate, cars and trade shows.',
    },
  },
  {
    path: '/virtual-tour',
    priority: 0.7,
    th: {
      title: 'Virtual Tour 360° ทัวร์เสมือนจริง ดูพื้นที่จากที่บ้าน',
      description: 'ทัวร์ภาพ 360 องศาที่คลิกเดินไปทีละจุด พร้อมจุดข้อมูล เหมาะกับคอนโด โรงแรม โชว์รูม และสถานที่ท่องเที่ยว เปิดได้บนเว็บทุกอุปกรณ์',
    },
    en: {
      title: 'Virtual Tour 360° — Explore a Place from Home',
      description: 'A 360° tour with clickable hotspots and info points, for condos, hotels, showrooms and attractions. Opens on any device.',
    },
  },
  {
    path: '/hand-gestures',
    priority: 0.6,
    th: {
      title: 'ควบคุมด้วยมือ ไม่ต้องสัมผัสจอ สำหรับตู้คีออสก์และบูธ',
      description: 'ควบคุมหุ่นยนต์ 3D ด้วยท่ามือผ่านกล้อง ไม่ต้องแตะหน้าจอ เหมาะกับตู้คีออสก์ บูธในห้างสรรพสินค้า และงานนิทรรศการ',
    },
    en: {
      title: 'Hand Gesture Control — Touch-Free for Kiosks and Booths',
      description: 'Control a 3D robot with hand gestures through the camera, no touch needed. For kiosks, mall booths and exhibitions.',
    },
  },
  {
    path: '/motion-game',
    priority: 0.6,
    th: {
      title: 'เกมขยับตัวสำหรับบูธและจอใหญ่ เล่นด้วยกล้อง มีตารางคะแนน',
      description: 'เกมที่ผู้เล่นขยับตัวเพื่อรับของ ใช้กล้องจับการเคลื่อนไหว เหมาะกับบูธกิจกรรมและจอ LED ขนาดใหญ่ พร้อมตารางคะแนน',
    },
    en: {
      title: 'Motion Game for Booths and Big Screens — Camera Controlled',
      description: 'A game played by moving your body in front of a camera, with a leaderboard. For activity booths and large LED screens.',
    },
  },
  {
    path: '/marker-chem',
    priority: 0.6,
    th: {
      title: 'การ์ด Marker เคมี AR วางการ์ดให้โมเลกุลทำปฏิกิริยา',
      description: 'การ์ดธาตุที่เมื่อวางใกล้กันจะรวมเป็นโมเลกุล 3D ผ่านกล้องมือถือ เหมาะกับสื่อการสอน ของเล่น เกมการ์ด และสำนักพิมพ์',
    },
    en: {
      title: 'AR Chemistry Marker Cards — Place Cards to Build Molecules',
      description: 'Element cards that combine into 3D molecules when placed together, seen through the phone camera. For teaching, toys, card games and publishers.',
    },
  },
  {
    path: '/ar-cube',
    priority: 0.6,
    th: {
      title: 'AR Cube ลูกบาศก์ 6 หน้าที่หมุนโมเดล 3D ได้ในมือ',
      description: 'ลูกบาศก์ที่มี marker 6 หน้า ถือหมุนแล้วโมเดล 3D หมุนตามในมือ เหมาะกับของแจกในงานและบรรจุภัณฑ์',
    },
    en: {
      title: 'AR Cube — A 6-Face Cube That Rotates a 3D Model in Your Hand',
      description: 'A cube with markers on all six faces: turn it and the 3D model turns with it. For giveaways and packaging.',
    },
  },
  {
    path: '/machine-tags',
    priority: 0.6,
    th: {
      title: 'สติกเกอร์เครื่องจักร AR สแกนดูสถานะและขั้นตอนซ่อมที่หน้างาน',
      description: 'ติดสติกเกอร์ marker บนเครื่องจักร สแกนด้วยมือถือเพื่อดูสถานะ อุณหภูมิ ผลผลิต และขั้นตอนบริการ เชื่อมกับ Digital Twin ได้',
    },
    en: {
      title: 'AR Machine Tags — Scan for Status and Service Steps',
      description: 'Marker stickers on machines: scan with a phone to see status, temperature, output and service steps. Linkable to a digital twin.',
    },
  },
  {
    path: '/services',
    priority: 0.9,
    th: {
      title: 'บริการ WebAR VR 3D, Web App, AI องค์กร และออกแบบแอป',
      description:
        'บริการของเรา: พัฒนา WebAR, VR, Face AR, 3D Visualization, Web app ตามสั่ง, ผู้ช่วย AI (LLM/RAG) ในองค์กร, ออกแบบ UI/UX แอปมือถือ และที่ปรึกษาด้าน AR',
    },
    en: {
      title: 'Services — WebAR, VR, 3D, Web Apps, Enterprise AI, App Design',
      description: 'Our services: WebAR and VR, Face AR, 3D visualization, custom web apps, enterprise AI assistants (LLM, RAG), mobile app design and AR consulting.',
    },
  },
  {
    path: '/about',
    priority: 0.5,
    th: {
      title: 'เกี่ยวกับเรา — สตูดิโอ AR VR 3D และ Web App | TheNerdStudio',
      description: 'รู้จัก TheNerdStudio สตูดิโอที่ทำ AR, VR, 3D และ Web app ให้ใช้งานได้จริงบนเว็บ วิธีทำงาน ความสามารถ และสิ่งที่เรายึดถือ',
    },
    en: {
      title: 'About — AR, VR, 3D and Web App Studio | TheNerdStudio',
      description: 'Meet TheNerdStudio: how we make AR, VR, 3D and web apps that work in the browser, what we can build, and what we stand for.',
    },
  },
  {
    path: '/contact',
    priority: 0.8,
    th: {
      title: 'ติดต่อ ขอใบเสนอราคา AR VR 3D และ Web App | TheNerdStudio',
      description: 'เล่าโปรเจกต์ของคุณให้เราฟัง ขอคำปรึกษาและใบเสนอราคางาน AR, VR, 3D และ Web app ติดต่อทางอีเมลหรือแบบฟอร์ม',
    },
    en: {
      title: 'Contact — Quote for AR, VR, 3D and Web Apps | TheNerdStudio',
      description: 'Tell us about your project and get advice and a quote for AR, VR, 3D and web app work, by email or form.',
    },
  },
];

/** One page per portfolio project, built from the project data. */
export const projectPages: SeoPage[] = projects.map((p) => {
  const th = projectsTh[p.slug];
  return {
    path: `/projects/${p.slug}`,
    priority: 0.6,
    th: {
      title: `${th?.title ?? p.title} — ผลงาน AR/3D | ${SITE_NAME}`,
      description: th?.summary ?? p.summary,
    },
    en: { title: `${p.title} — AR/3D Project | ${SITE_NAME}`, description: p.summary },
  };
});

export const allPages: SeoPage[] = [...staticPages, ...projectPages];

const byPath = new Map(allPages.map((p) => [p.path, p]));

export function seoFor(path: string, lang: SeoLang): SeoText | undefined {
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return byPath.get(normalized)?.[lang];
}
