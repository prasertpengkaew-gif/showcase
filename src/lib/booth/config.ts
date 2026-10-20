import type { BoothAspect, BoothConfig, BoothEvent, BoothFrame, BoothProp } from './types';
import type { FrameTheme } from '../eventFrames';

const ASPECTS: BoothAspect[] = ['landscape', 'portrait', 'square'];
const PROPS: BoothProp[] = ['none', 'glasses', 'crown'];
const THEMES: FrameTheme[] = ['neon', 'gold', 'fest'];

export const ASPECT_RATIO: Record<BoothAspect, number> = { landscape: 3 / 2, portrait: 2 / 3, square: 1 };

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
const url = (v: unknown) => (typeof v === 'string' && /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : undefined);

/**
 * Turns the JSON stored for an event into a safe, complete config: unknown or invalid values fall
 * back to defaults, numbers are clamped and colours / URLs are checked (the config comes from a
 * database, so nothing in it is trusted to be well-formed).
 */
export function normalizeConfig(raw: unknown): BoothConfig {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const frameRaw = (c.frame && typeof c.frame === 'object' ? c.frame : {}) as Record<string, unknown>;
  const imageUrl = url(frameRaw.url);
  const frame: BoothFrame =
    frameRaw.kind === 'image' && imageUrl
      ? { kind: 'image', url: imageUrl }
      : { kind: 'preset', theme: THEMES.includes(frameRaw.theme as FrameTheme) ? (frameRaw.theme as FrameTheme) : 'neon' };

  const props = (Array.isArray(c.props) ? c.props : []).filter((p): p is BoothProp => PROPS.includes(p as BoothProp));
  const list: BoothProp[] = props.length ? [...new Set(props)] : ['none'];
  const defaultProp = list.includes(c.defaultProp as BoothProp) ? (c.defaultProp as BoothProp) : list[0];

  return {
    language: c.language === 'en' ? 'en' : 'th',
    aspect: ASPECTS.includes(c.aspect as BoothAspect) ? (c.aspect as BoothAspect) : 'portrait',
    frame,
    subtitle: str(c.subtitle, 50) ?? '',
    logoUrl: url(c.logoUrl),
    accent: typeof c.accent === 'string' && /^#[0-9a-f]{6}$/i.test(c.accent) ? c.accent : '#2563EB',
    props: list,
    defaultProp,
    countdown: num(c.countdown, 1, 10, 3),
    smileToSnap: c.smileToSnap !== false,
    mirror: c.mirror !== false,
    reviewSeconds: num(c.reviewSeconds, 8, 120, 25),
    consent: str(c.consent, 300),
    welcome: str(c.welcome, 80),
  };
}

/** Builds a BoothEvent from the booth_config() response. Returns null if it is not in the expected shape. */
export function parseEvent(raw: unknown): BoothEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 80);
  const slug = str(r.slug, 40);
  if (!name || !slug) return null;
  const config = normalizeConfig(r.config);
  return { slug, name, config, retentionDays: num(r.retentionDays, 1, 365, 30) };
}

/** The built-in event used by /booth/demo when no Supabase project is connected. */
export const DEMO_EVENT: BoothEvent = {
  slug: 'demo',
  name: 'TheNerdStudio Launch Night',
  retentionDays: 1,
  config: normalizeConfig({
    language: 'th',
    aspect: 'portrait',
    frame: { kind: 'preset', theme: 'neon' },
    subtitle: 'AR Photo Booth Studio',
    props: ['glasses', 'crown', 'none'],
    defaultProp: 'glasses',
  }),
};
