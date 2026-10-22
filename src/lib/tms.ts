/**
 * Transport-management (TMS) demo data layer: a dispatch board of sample shipments that advances
 * on a simulated clock. Everything shown (progress, delay, status, KPIs) is derived from each
 * shipment's `elapsedH`, so a real system only has to supply that, or the same fields from GPS.
 */
export type Lang = 'th' | 'en';
export type ShipmentStatus = 'scheduled' | 'inTransit' | 'delayed' | 'delivered';
export const STATUSES: readonly ShipmentStatus[] = ['scheduled', 'inTransit', 'delayed', 'delivered'];

/** A trip this many minutes behind plan is flagged as delayed. */
export const DELAY_MINUTES = 30;

type Text = Record<Lang, string>;

export interface Shipment {
  id: string;
  customer: string;
  origin: Text;
  via: Text;
  destination: Text;
  vehicle: string;
  distanceKm: number;
  /** Planned driving time in hours. */
  planH: number;
  /** Actual speed relative to plan: below 1 runs late, 1 or above runs on time. */
  speed: number;
  /** Hours since departure; negative while it waits to depart. */
  elapsedH: number;
}

const place = {
  bkk: { th: 'กรุงเทพฯ', en: 'Bangkok' },
  cnx: { th: 'เชียงใหม่', en: 'Chiang Mai' },
  kkc: { th: 'ขอนแก่น', en: 'Khon Kaen' },
  cho: { th: 'ชลบุรี', en: 'Chonburi' },
  kor: { th: 'นครราชสีมา', en: 'Nakhon Ratchasima' },
  hdy: { th: 'หาดใหญ่', en: 'Hat Yai' },
  rai: { th: 'ระยอง', en: 'Rayong' },
  phs: { th: 'พิษณุโลก', en: 'Phitsanulok' },
  nsw: { th: 'นครสวรรค์', en: 'Nakhon Sawan' },
  sur: { th: 'สุราษฎร์ธานี', en: 'Surat Thani' },
  pra: { th: 'ประจวบคีรีขันธ์', en: 'Prachuap Khiri Khan' },
  sra: { th: 'สระบุรี', en: 'Saraburi' },
  lop: { th: 'ลพบุรี', en: 'Lopburi' },
  cha: { th: 'ฉะเชิงเทรา', en: 'Chachoengsao' },
  chu: { th: 'ชุมพร', en: 'Chumphon' },
} as const;

/** Sample fleet; the customers are fictional. */
export const SAMPLE_SHIPMENTS: Shipment[] = [
  { id: 'TH-1001', customer: 'Siam Fresh Foods', origin: place.bkk, via: place.nsw, destination: place.cnx, vehicle: '6W-2417', distanceKm: 700, planH: 10, speed: 0.95, elapsedH: 6 },
  { id: 'TH-1002', customer: 'Isan Home Mart', origin: place.bkk, via: place.sra, destination: place.kkc, vehicle: '10W-8830', distanceKm: 450, planH: 6.5, speed: 0.75, elapsedH: 4 },
  { id: 'TH-1003', customer: 'Eastern Auto Parts', origin: place.bkk, via: place.cha, destination: place.cho, vehicle: '4W-1176', distanceKm: 120, planH: 2, speed: 1.1, elapsedH: 2 },
  { id: 'TH-1004', customer: 'Korat Packaging', origin: place.bkk, via: place.sra, destination: place.kor, vehicle: '6W-5062', distanceKm: 260, planH: 4, speed: 0.9, elapsedH: -1.5 },
  { id: 'TH-1005', customer: 'Andaman Beverages', origin: place.bkk, via: place.pra, destination: place.hdy, vehicle: 'TR-7741', distanceKm: 950, planH: 14, speed: 1, elapsedH: 3 },
  { id: 'TH-1006', customer: 'Rayong Chemicals', origin: place.rai, via: place.cha, destination: place.bkk, vehicle: '10W-3305', distanceKm: 180, planH: 3, speed: 0.9, elapsedH: 3.4 },
  { id: 'TH-1007', customer: 'Northern Textile', origin: place.bkk, via: place.lop, destination: place.phs, vehicle: '6W-9928', distanceKm: 380, planH: 5.5, speed: 1, elapsedH: 5 },
  { id: 'TH-1008', customer: 'Gulf Electronics', origin: place.sur, via: place.chu, destination: place.hdy, vehicle: '4W-2650', distanceKm: 270, planH: 4, speed: 0.85, elapsedH: -3 },
];

/** Hours the trip has actually been driving; stops once the shipment arrives. */
const drivenH = (s: Shipment): number => Math.max(0, Math.min(s.elapsedH, s.planH / s.speed));

/** 0 to 1 */
export const progress = (s: Shipment): number => Math.min(1, (drivenH(s) * s.speed) / s.planH);

/** Minutes behind plan (0 when on time or early). */
export const delayMinutes = (s: Shipment): number => Math.round(Math.max(0, 1 - s.speed) * drivenH(s) * 60);

export function statusOf(s: Shipment): ShipmentStatus {
  if (s.elapsedH <= 0) return 'scheduled';
  if (progress(s) >= 1) return 'delivered';
  return delayMinutes(s) >= DELAY_MINUTES ? 'delayed' : 'inTransit';
}

/** Hours left to arrive at the current speed (0 once delivered). */
export const etaHours = (s: Shipment): number => (statusOf(s) === 'scheduled' ? s.planH / s.speed : Math.max(0, s.planH / s.speed - Math.max(0, s.elapsedH)));

export const advance = (list: Shipment[], hours: number): Shipment[] => list.map((s) => ({ ...s, elapsedH: s.elapsedH + hours }));

export interface Kpis {
  active: number;
  delayed: number;
  delivered: number;
  /** Share of delivered shipments that arrived within DELAY_MINUTES of plan, 0 to 100; null if none delivered. */
  onTimeRate: number | null;
}

export function kpis(list: Shipment[]): Kpis {
  const status = list.map(statusOf);
  const delivered = list.filter((_, i) => status[i] === 'delivered');
  return {
    active: status.filter((x) => x === 'inTransit' || x === 'delayed').length,
    delayed: status.filter((x) => x === 'delayed').length,
    delivered: delivered.length,
    onTimeRate: delivered.length ? Math.round((delivered.filter((s) => delayMinutes(s) < DELAY_MINUTES).length / delivered.length) * 100) : null,
  };
}
