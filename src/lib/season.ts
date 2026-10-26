/**
 * Which seasonal landing is on the calendar.
 *
 * Windows are month-and-day (`MM-DD`) in Thailand, and they repeat every year, so a printed
 * booth QR code does not go stale in January. A window that starts in December and ends in
 * January is written with `endsOn` earlier than `startsOn`.
 *
 * February 29 is a real slot on this ruler. Distances that cross it are off by one day in
 * non-leap years, which is finer than any season boundary we ship.
 */

export const SEASON_TIME_ZONE = 'Asia/Bangkok';

export interface SeasonWindow {
  id: string;
  /** Inclusive start, `MM-DD`. */
  startsOn: string;
  /** Inclusive end, `MM-DD`. Earlier than `startsOn` means the window crosses New Year. */
  endsOn: string;
}

export const SEASON_THEMES = ['halloween', 'loy', 'christmas'] as const;
export type SeasonTheme = (typeof SEASON_THEMES)[number];

export const FLOOR_KINDS = ['gate', 'dragon', 'krathong'] as const;
export type FloorKind = (typeof FLOOR_KINDS)[number];

const MONTH_LENGTHS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const YEAR_DAYS = MONTH_LENGTHS.reduce((sum, days) => sum + days, 0);

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isMonthDay(value: string): boolean {
  const match = /^(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  return month >= 1 && month <= 12 && day >= 1 && day <= MONTH_LENGTHS[month];
}

/** Position on the 366-day ruler, so every comparison uses the same February. */
export function ordinal(value: string): number {
  const [month, day] = value.split('-').map(Number);
  let n = day;
  for (let i = 1; i < month; i++) n += MONTH_LENGTHS[i];
  return n;
}

/** `MM-DD` for `date` in Thailand, unless a test passes another time zone. */
export function monthDay(date: Date, timeZone = SEASON_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit', day: '2-digit' }).formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${month}-${day}`;
}

function forward(from: number, to: number): number {
  return (to - from + YEAR_DAYS) % YEAR_DAYS;
}

export function seasonIsOpen(season: SeasonWindow, day: string): boolean {
  if (!isMonthDay(season.startsOn) || !isMonthDay(season.endsOn) || !isMonthDay(day)) return false;
  if (season.startsOn <= season.endsOn) return day >= season.startsOn && day <= season.endsOn;
  return day >= season.startsOn || day <= season.endsOn;
}

/** Days until the next opening. Zero while the season is open. */
function daysUntilStart(season: SeasonWindow, day: string): number {
  if (seasonIsOpen(season, day)) return 0;
  const dist = forward(ordinal(day), ordinal(season.startsOn));
  return dist === 0 ? YEAR_DAYS : dist;
}

function daysSinceStart(season: SeasonWindow, day: string): number {
  return forward(ordinal(season.startsOn), ordinal(day));
}

function daysSinceEnd(season: SeasonWindow, day: string): number {
  const dist = forward(ordinal(season.endsOn), ordinal(day));
  return dist === 0 ? YEAR_DAYS : dist;
}

/**
 * The season `/season` should show.
 * An open window wins; if several are open, the one that started most recently wins.
 * If none are open, the next one to start wins, so a booth link is never an empty page.
 */
export function activeSeasonId(seasons: readonly SeasonWindow[], day: string): string | null {
  if (!isMonthDay(day)) return null;
  const valid = seasons.filter((season) => isMonthDay(season.startsOn) && isMonthDay(season.endsOn));
  const open = valid.filter((season) => seasonIsOpen(season, day));
  const pool = open.length ? open : valid;
  if (!pool.length) return null;
  const measure = open.length ? daysSinceStart : daysUntilStart;
  return [...pool].sort((a, b) => measure(a, day) - measure(b, day) || a.id.localeCompare(b.id))[0]?.id ?? null;
}

export type SeasonStatus = 'active' | 'upcoming' | 'past';

/** Label for the calendar. The season the index would show, when it is not open yet, is "upcoming". */
export function seasonStatus(season: SeasonWindow, day: string, activeId: string | null): SeasonStatus {
  if (!isMonthDay(day) || !isMonthDay(season.startsOn) || !isMonthDay(season.endsOn)) return 'past';
  if (seasonIsOpen(season, day)) return 'active';
  if (season.id === activeId) return 'upcoming';
  return daysUntilStart(season, day) <= daysSinceEnd(season, day) ? 'upcoming' : 'past';
}

export function formatMonthDay(value: string, lang: 'th' | 'en'): string {
  const [month, day] = value.split('-').map(Number);
  const name = (lang === 'th' ? TH_MONTHS : EN_MONTHS)[month - 1] ?? value;
  return `${day} ${name}`;
}

export function formatWindow(season: SeasonWindow, lang: 'th' | 'en'): string {
  return `${formatMonthDay(season.startsOn, lang)} – ${formatMonthDay(season.endsOn, lang)}`;
}

/** `/season` follows the calendar. `/season/<id>` is the fixed address for one season. */
export function seasonPath(id?: string): string {
  return id ? `/season/${id}` : '/season';
}

export function findSeason<T extends SeasonWindow>(seasons: readonly T[], id: string | null | undefined): T | undefined {
  if (!id) return undefined;
  return seasons.find((season) => season.id === id);
}
