/**
 * Seasonal landing kit. One object here is one booth page.
 *
 * To add a season:
 * 1. Copy an entry in `seasons` below. Give it a new `id` (this becomes `/season/<id>`).
 * 2. Set `startsOn` and `endsOn` as `MM-DD` in Thailand. Repeat every year.
 *    If the window crosses New Year, `endsOn` is the January date (earlier than `startsOn`).
 * 3. Write `th` and `en` (name, hero, pitch, floor and face lines, frame text, contact draft)
 *    and `seo` (title under about 60 characters, description under about 160).
 * 4. Pick a `theme` (`halloween`, `loy`, `christmas`) and a `floor` (`gate`, `dragon`, `krathong`).
 *    Those reuse the face-filter painters and the floor AR objects. A new look needs a branch
 *    in `src/lib/seasonFace.ts`; a new object needs a builder and a `floor` id.
 * 5. List `demos` by id from `src/data/demos.ts`, and a booth `frame` from `src/lib/eventFrames.ts`.
 * 6. Run `npm run test:season`, then `npm run build`. The route, sitemap and prerender
 *    follow this list. Re-run `npm run snapshots -- /season /season/<id>` after the build
 *    so crawlers get the new Thai text, then build once more.
 */
import type { DemoId } from './demos';
import type { FloorKind, SeasonTheme, SeasonWindow } from '../lib/season';
import type { FrameTheme } from '../lib/eventFrames';

export interface SeasonCopy {
  name: string;
  eyebrow: string;
  heroTitle: string;
  heroText: string;
  /** A short festival note. Shown under the hero, and it is what makes each landing its own page. */
  pitch: string;
  floorTitle: string;
  floorText: string;
  faceTitle: string;
  faceText: string;
  frameTitle: string;
  frameLine: string;
  /** Sign on the floor object, when that object has one. */
  banner: string;
  photoCaption: string;
  photoAlt: string;
  canvasLabel: string;
  dialogLabel: string;
  ctaTitle: string;
  ctaText: string;
  ctaLabel: string;
  /** Dropped into the contact form when the page links here with `?season=<id>`. */
  contactDraft: string;
  looks: Record<string, string>;
}

export interface SeasonSeo {
  title: string;
  description: string;
}

export interface Season extends SeasonWindow {
  theme: SeasonTheme;
  floor: FloorKind;
  /** Closest photo-booth frame, for a kiosk that should match this season. */
  frame: FrameTheme;
  /** Tailwind gradient classes for the floor-AR start panel. */
  panelClass: string;
  /** Spot colour for the date chip. Text never relies on it alone. */
  accent: string;
  minDistance: number;
  hideUntilPlaced: boolean;
  demos: readonly DemoId[];
  seo: { th: SeasonSeo; en: SeasonSeo };
  th: SeasonCopy;
  en: SeasonCopy;
}

export const seasons: readonly Season[] = [
  {
    id: 'halloween',
    startsOn: '10-01',
    endsOn: '11-02',
    theme: 'halloween',
    floor: 'gate',
    frame: 'fest',
    panelClass: 'from-[#1b0b2e] to-[#3a1650]',
    accent: '#fb923c',
    minDistance: 1.5,
    hideUntilPlaced: true,
    demos: ['halloween', 'halloweenFace', 'event', 'hunt'],
    seo: {
      th: {
        title: 'แลนดิ้งฮาโลวีน AR สำหรับบูธและงานปาร์ตี้ | TheNerdStudio',
        description:
          'หน้าแลนดิ้งฮาโลวีนสำหรับพิมพ์ QR ติดบูธ แขกเปิดซุ้ม AR ขนาดเท่าจริงและฟิลเตอร์หน้าฟักทองบนมือถือได้ทันที ไม่ต้องติดตั้งแอป และขอใบเสนอราคาได้จากหน้าเดียวกัน',
      },
      en: {
        title: 'Halloween AR Landing for Booths and Parties | TheNerdStudio',
        description:
          'A Halloween landing to print as a booth QR code. Guests open a life-size gate and pumpkin face filters on their phone, with no app to install, and can ask for a quote.',
      },
    },
    th: {
      name: 'ฮาโลวีน',
      eyebrow: 'ฤดูกาล · ฮาโลวีน · จุดถ่ายรูป',
      heroTitle: 'ฮาโลวีนทั้งซุ้มและฟิลเตอร์ ในลิงก์เดียว',
      heroText:
        'หน้าสำหรับบูธและงานปาร์ตี้ช่วงปลายตุลาคม แขกสแกน QR แล้วได้ทั้งซุ้มขนาดเท่าจริงบนพื้น และฟิลเตอร์หน้าฟักทองบนกล้องหน้า',
      pitch:
        'ช่วงนี้ตั้งใจให้เป็นมุมถ่ายรูปที่แขกเล่นเองได้ ซุ้มไม้พร้อมฟักทองและค้างคาววางบนพื้นห้อง ส่วนกล้องหน้าใส่หัวฟักทอง เพนต์หน้ากะโหลก หมวกแม่มด หรือเขี้ยวแวมไพร์ กรอบรูปติดไปกับภาพที่บันทึก ไม่ต้องติดตั้งแอป',
      floorTitle: 'วางซุ้มฮาโลวีนบนพื้น แล้วถ่ายรูป',
      floorText: 'ซุ้มขนาดเท่าของจริง แตะที่พื้นเพื่อวาง ถอยออกมาให้เพื่อนถ่าย รูปบันทึกลงมือถือ',
      faceTitle: 'ฟิลเตอร์หน้าสำหรับเซลฟี่ในงาน',
      faceText: 'เปิดกล้องหน้าแล้วสลับลุคได้สี่แบบ กรอบฮาโลวีนเป็นส่วนหนึ่งของรูป',
      frameTitle: 'สุขสันต์ฮาโลวีน',
      frameLine: 'TheNerdStudio',
      banner: 'สุขสันต์ฮาโลวีน',
      photoCaption: 'สุขสันต์ฮาโลวีน · TheNerdStudio',
      photoAlt: 'รูปของคุณกับซุ้มฮาโลวีน',
      canvasLabel: 'ซุ้มฮาโลวีนที่วางบนพื้น',
      dialogLabel: 'กล้อง AR ซุ้มฮาโลวีน',
      ctaTitle: 'อยากได้มุมฮาโลวีนในงานคุณ?',
      ctaText: 'บอกสถานที่ วันที่ และจำนวนจุดถ่ายรูป เราจะจับซุ้ม ฟิลเตอร์ และกรอบให้เข้ากับแบรนด์',
      ctaLabel: 'ติดต่อเรื่องงานฮาโลวีน',
      contactDraft:
        'กำลังวางแผนบูธหรือมุมถ่ายรูปฮาโลวีน อยากได้หน้าแลนดิ้ง AR ตามฤดูกาล พร้อมซุ้มขนาดเท่าจริงและฟิลเตอร์หน้า',
      looks: { pumpkin: 'ฟักทอง', skull: 'กะโหลก', witch: 'แม่มด', vampire: 'แวมไพร์' },
    },
    en: {
      name: 'Halloween',
      eyebrow: 'Season · Halloween · photo spot',
      heroTitle: 'A Halloween gate and face filters, on one link',
      heroText:
        'A booth page for late October. Guests scan a QR code and get a life-size gate on the floor plus pumpkin face filters on the front camera.',
      pitch:
        'The idea is a photo corner guests can run themselves. The wooden gate, with pumpkins and bats, stands on the floor. The front camera adds a pumpkin head, sugar-skull paint, a witch hat or vampire fangs. The frame is part of the saved photo. Nothing to install.',
      floorTitle: 'Place the Halloween gate on the floor and take a photo',
      floorText: 'The gate is life size. Tap the floor to place it, step back, and let a friend take the picture. It saves to the phone.',
      faceTitle: 'Face filters for a party selfie',
      faceText: 'Open the front camera and switch among four looks. The Halloween frame is part of the photo.',
      frameTitle: 'Happy Halloween',
      frameLine: 'TheNerdStudio',
      banner: 'HAPPY HALLOWEEN',
      photoCaption: 'Happy Halloween · TheNerdStudio',
      photoAlt: 'Your photo with the Halloween gate',
      canvasLabel: 'Halloween gate placed on the floor',
      dialogLabel: 'Halloween gate AR camera',
      ctaTitle: 'Want a Halloween corner at your event?',
      ctaText: 'Tell us the venue, the date and how many photo spots you need. We will match the gate, the filters and the frame to your brand.',
      ctaLabel: 'Plan your Halloween event',
      contactDraft:
        'We are planning a Halloween booth or photo corner and would like a seasonal AR landing with the life-size gate and face filters.',
      looks: { pumpkin: 'Pumpkin', skull: 'Sugar skull', witch: 'Witch hat', vampire: 'Vampire' },
    },
  },
  {
    id: 'loy-krathong',
    startsOn: '11-08',
    endsOn: '11-30',
    theme: 'loy',
    floor: 'krathong',
    frame: 'gold',
    panelClass: 'from-[#083344] to-[#14532d]',
    accent: '#fbbf24',
    minDistance: 1.2,
    hideUntilPlaced: false,
    demos: ['event', 'wall', 'print', 'draw'],
    seo: {
      th: {
        title: 'แลนดิ้งลอยกระทง AR กระทงบนพื้นและฟิลเตอร์ | TheNerdStudio',
        description:
          'หน้าแลนดิ้งลอยกระทงสำหรับงานเทศกาล วางกระทงสามมิติบนพื้นผ่านกล้องมือถือ ลองฟิลเตอร์ดอกบัวและโคม พร้อม QR code สำหรับพิมพ์ติดจุดถ่ายรูป',
      },
      en: {
        title: 'Loy Krathong AR Landing for Festival Booths | TheNerdStudio',
        description:
          'A Loy Krathong landing for festival nights. Place a 3D krathong on the floor through the phone camera, try lotus and lantern filters, and print a QR code for the photo spot.',
      },
    },
    th: {
      name: 'ลอยกระทง',
      eyebrow: 'ฤดูกาล · ลอยกระทง · งานเทศกาล',
      heroTitle: 'ลอยกระทงบนพื้นห้อง พร้อมฟิลเตอร์ดอกบัว',
      heroText:
        'หน้าสำหรับงานเทศกาลเดือนพฤศจิกายน วันลอยกระทงตกอยู่ในช่วงนี้ทุกปี แขกวางกระทงผ่านกล้อง หรือถ่ายเซลฟี่พร้อมมาลัยและโคม',
      pitch:
        'กระทงใบบัว ดอกไม้ และเทียนไขวาดเป็นโมเดลสามมิติ วางบนพื้นแล้วถ่ายได้โดยไม่ต้องลงน้ำจริง กล้องหน้าใส่มาลัยใบตอง ดอกบัวบนหน้าผาก หรือโคมไฟเหนือศีรษะ เหมาะกับบูธห้าง โรงแรม และงานเลี้ยงของบริษัท',
      floorTitle: 'วางกระทงบนพื้น แล้วถอยออกมาถ่าย',
      floorText: 'กระทงขนาดวางบนพื้นห้อง เทียนกระพริบเบาๆ แตะที่พื้นเพื่อย้ายตำแหน่ง แล้วบันทึกรูป',
      faceTitle: 'ฟิลเตอร์ลอยกระทงบนกล้องหน้า',
      faceText: 'สามลุคจากของในงาน ไม่ใช้ภาพลิขสิทธิ์ วาดตามตำแหน่งใบหน้าบนเครื่องผู้ใช้',
      frameTitle: 'สุขสันต์วันลอยกระทง',
      frameLine: 'TheNerdStudio',
      banner: 'ลอยกระทง',
      photoCaption: 'สุขสันต์วันลอยกระทง · TheNerdStudio',
      photoAlt: 'รูปของคุณกับกระทง',
      canvasLabel: 'กระทงที่วางบนพื้น',
      dialogLabel: 'กล้อง AR กระทงลอยกระทง',
      ctaTitle: 'จัดงานลอยกระทงหรือบูธในห้าง?',
      ctaText: 'บอกขนาดพื้นที่และจำนวนคืนที่เปิดบูธ เราจะจับกระทง ฟิลเตอร์ และกรอบทองให้เข้ากับงาน',
      ctaLabel: 'ติดต่อเรื่องงานลอยกระทง',
      contactDraft:
        'กำลังวางแผนงานลอยกระทง อยากได้หน้าแลนดิ้ง AR ตามฤดูกาล พร้อมกระทงบนพื้นและฟิลเตอร์ดอกบัวสำหรับจุดถ่ายรูป',
      looks: { krathong: 'มาลัยกระทง', lotus: 'ดอกบัว', lantern: 'โคม' },
    },
    en: {
      name: 'Loy Krathong',
      eyebrow: 'Season · Loy Krathong · festival',
      heroTitle: 'A krathong on the floor, and a lotus filter',
      heroText:
        'A page for November festivals. Loy Krathong night falls inside this window every year. Guests place a krathong through the camera, or take a selfie with a garland and a lantern.',
      pitch:
        'The banana-leaf boat, flowers and candle are a 3D model, so guests can photograph one without a river. The front camera adds a leaf garland, a lotus on the forehead or a lantern above the head. It suits a mall booth, a hotel lobby or a company party.',
      floorTitle: 'Place the krathong on the floor, then step back',
      floorText: 'A floor-sized krathong with a soft candle flicker. Tap the floor to move it, then save the photo.',
      faceTitle: 'Loy Krathong filters on the front camera',
      faceText: 'Three looks drawn from the festival, with no licensed artwork. They follow the face on the guest’s device.',
      frameTitle: 'Happy Loy Krathong',
      frameLine: 'TheNerdStudio',
      banner: 'LOY KRATHONG',
      photoCaption: 'Happy Loy Krathong · TheNerdStudio',
      photoAlt: 'Your photo with the krathong',
      canvasLabel: 'Krathong placed on the floor',
      dialogLabel: 'Loy Krathong AR camera',
      ctaTitle: 'Planning a Loy Krathong night or a mall booth?',
      ctaText: 'Tell us the space and how many evenings the booth is open. We will match the krathong, the filters and the gold frame to the event.',
      ctaLabel: 'Plan your Loy Krathong event',
      contactDraft:
        'We are planning a Loy Krathong event and would like a seasonal AR landing with a floor krathong and lotus face filters for the photo spot.',
      looks: { krathong: 'Krathong garland', lotus: 'Lotus', lantern: 'Lantern' },
    },
  },
  {
    id: 'christmas',
    startsOn: '12-01',
    endsOn: '01-15',
    theme: 'christmas',
    floor: 'dragon',
    frame: 'gold',
    panelClass: 'from-[#3a0a10] to-[#12060a]',
    accent: '#facc15',
    minDistance: 3.2,
    hideUntilPlaced: false,
    demos: ['newyear', 'event', 'draw', 'wall'],
    seo: {
      th: {
        title: 'แลนดิ้งคริสต์มาสและปีใหม่ มังกร AR | TheNerdStudio',
        description:
          'หน้าแลนดิ้งคริสต์มาสและปีใหม่สำหรับงานเลี้ยง วางมังกรจีน AR ในห้อง ลองหมวกซานต้าและเขากวาง พร้อม QR code สำหรับพิมพ์และปุ่มติดต่อสตูดิโอ',
      },
      en: {
        title: 'Christmas and New Year AR Landing | TheNerdStudio',
        description:
          'A Christmas and New Year landing for parties. Place the Chinese dragon in the room, try a Santa hat and antlers, print a QR code, and contact the studio from the page.',
      },
    },
    th: {
      name: 'คริสต์มาสและปีใหม่',
      eyebrow: 'ฤดูกาล · คริสต์มาส · ปีใหม่',
      heroTitle: 'มังกรปีใหม่ในห้อง พร้อมหมวกซานต้า',
      heroText:
        'หน้าสำหรับงานเลี้ยงตั้งแต่ต้นธันวาคมถึงกลางมกราคม มังกรสีแดงทองวางบนพื้นห้อง และกล้องหน้าใส่หมวก เขากวาง หรือดาว',
      pitch:
        'ช่วงนี้ครอบคลุมทั้งคริสต์มาสและวันปีใหม่สากล มังกรเป็นโมเดลที่เราสร้างเอง ว่ายเป็นรูปตัวเอสเมื่อวางผ่านหน้ากล้องของเรา ฟิลเตอร์บนใบหน้าเป็นภาพวาดเรียบง่าย ไม่ผูกกับตัวละครที่มีลิขสิทธิ์ ใช้เป็นจุดถ่ายรูปท้ายงานเลี้ยงหรือการ์ดอวยพรที่สแกนได้',
      floorTitle: 'วางมังกรบนพื้นห้อง แล้วเดินรอบได้',
      floorText: 'มังกรยาวประมาณสองเมตรครึ่ง วางให้ห่างจากกล้องหน่อย แล้วถ่ายรูปกับคำอวยพร',
      faceTitle: 'ฟิลเตอร์ปีใหม่บนกล้องหน้า',
      faceText: 'หมวกซานต้า เขากวาง และดาวบนหน้าผาก กรอบแดงเขียวติดไปกับรูป',
      frameTitle: 'สุขสันต์ปีใหม่',
      frameLine: 'TheNerdStudio',
      banner: 'สุขสันต์ปีใหม่',
      photoCaption: 'สุขสันต์ปีใหม่ · TheNerdStudio',
      photoAlt: 'รูปของคุณกับมังกรปีใหม่',
      canvasLabel: 'มังกรจีนที่วางบนพื้น',
      dialogLabel: 'กล้อง AR มังกรปีใหม่',
      ctaTitle: 'กำลังจัดงานส่งท้ายปี?',
      ctaText: 'บอกแนวงานและสถานที่ เราจะจับมังกร ฟิลเตอร์ และกรอบอวยพรให้เป็นชุดเดียวกัน',
      ctaLabel: 'ติดต่อเรื่องงานปีใหม่',
      contactDraft:
        'กำลังวางแผนงานคริสต์มาสหรือปีใหม่ อยากได้หน้าแลนดิ้ง AR ตามฤดูกาล พร้อมมังกรในห้องและฟิลเตอร์หน้าสำหรับแขก',
      looks: { santa: 'หมวกซานต้า', antlers: 'เขากวาง', star: 'ดาว' },
    },
    en: {
      name: 'Christmas and New Year',
      eyebrow: 'Season · Christmas · New Year',
      heroTitle: 'A New Year dragon in the room, and a Santa hat',
      heroText:
        'A party page from the start of December through mid-January. A red and gold dragon stands on the floor, and the front camera adds a hat, antlers or a star.',
      pitch:
        'The window covers Christmas and New Year’s Day. The dragon is a model we built; it swims in an S curve in our camera page. The face looks are simple drawings, not licensed characters. Use it as the photo spot at the end of a party, or as a greeting card guests scan.',
      floorTitle: 'Place the dragon on the floor and walk around it',
      floorText: 'The dragon is about two and a half metres long. Give it room in front of the camera, then take a photo with the greeting.',
      faceTitle: 'New Year filters on the front camera',
      faceText: 'A Santa hat, reindeer antlers and a star on the forehead. The red and green frame is part of the photo.',
      frameTitle: 'Happy New Year',
      frameLine: 'TheNerdStudio',
      banner: 'HAPPY NEW YEAR',
      photoCaption: 'Happy New Year · TheNerdStudio',
      photoAlt: 'Your photo with the New Year dragon',
      canvasLabel: 'Chinese dragon placed on the floor',
      dialogLabel: 'New Year dragon AR camera',
      ctaTitle: 'Planning an end-of-year party?',
      ctaText: 'Tell us the mood and the venue. We will match the dragon, the filters and the greeting frame as one set.',
      ctaLabel: 'Plan your New Year event',
      contactDraft:
        'We are planning a Christmas or New Year party and would like a seasonal AR landing with the dragon in the room and face filters for guests.',
      looks: { santa: 'Santa hat', antlers: 'Antlers', star: 'Star' },
    },
  },
];

export function seasonCopy(season: Season, lang: 'th' | 'en'): SeasonCopy {
  return lang === 'th' ? season.th : season.en;
}
