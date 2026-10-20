import type { FrameTheme } from '../eventFrames';

export type BoothAspect = 'landscape' | 'portrait' | 'square';
export type BoothProp = 'none' | 'glasses' | 'crown';
export type BoothFrame = { kind: 'preset'; theme: FrameTheme } | { kind: 'image'; url: string };

/** What an event organiser's booth looks like and how it behaves. Always passed through normalizeConfig(). */
export interface BoothConfig {
  language: 'th' | 'en';
  /** Shape of the photo; custom frame images must use the same shape. */
  aspect: BoothAspect;
  frame: BoothFrame;
  /** Second line on preset frames (date, venue, hashtag) and on the guest page. */
  subtitle: string;
  logoUrl?: string;
  accent: string;
  props: BoothProp[];
  defaultProp: BoothProp;
  countdown: number;
  smileToSnap: boolean;
  /** Mirror the camera like a selfie. */
  mirror: boolean;
  /** Seconds the QR code stays on screen before the booth resets for the next guest. */
  reviewSeconds: number;
  /** Replaces the default privacy line on the booth. */
  consent?: string;
  /** Headline on the idle screen. */
  welcome?: string;
}

export interface BoothEvent {
  slug: string;
  name: string;
  config: BoothConfig;
  retentionDays: number;
}

export type GuestPhoto =
  | { status: 'pending' }
  | {
      status: 'ready';
      url: string;
      /** Same file, served with a "save as" header. */
      downloadUrl: string;
      createdAt: string;
      expiresAt: string;
      event: { name: string; subtitle?: string; logoUrl?: string; accent?: string };
    };

export type BoothErrorKind =
  /** Wrong kiosk link, event not running, or no longer active. */
  | 'invalid_event'
  /** The event's photo limit is used up. */
  | 'quota_reached'
  | 'invalid_code'
  | 'not_uploaded'
  /** No connection or the server could not be reached: retry later. */
  | 'network'
  | 'server';

export class BoothError extends Error {
  constructor(
    readonly kind: BoothErrorKind,
    message?: string,
  ) {
    super(message ?? kind);
  }
}

export interface BoothBackend {
  /** 'demo' keeps photos on this device only; 'supabase' stores them for real. */
  readonly mode: 'supabase' | 'demo';
  getEvent(slug: string, token: string): Promise<BoothEvent | null>;
  /** Registers the photo, uploads the file and confirms it. Safe to call again after a failure. */
  submitPhoto(slug: string, token: string, code: string, photo: Blob): Promise<void>;
  getPhoto(code: string): Promise<GuestPhoto | null>;
  deletePhoto(code: string): Promise<void>;
}
