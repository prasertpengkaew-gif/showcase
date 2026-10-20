import { parseEvent, DEMO_EVENT } from './config';
import { isPhotoCode } from './code';
import { kvStore } from './idb';
import { BoothError, type BoothBackend, type BoothErrorKind, type BoothEvent, type GuestPhoto } from './types';

const KNOWN_ERRORS: BoothErrorKind[] = ['invalid_event', 'quota_reached', 'invalid_code', 'not_uploaded'];

/**
 * Talks to Supabase with plain fetch (no client library). Only the public anon key is used; what it
 * may do is decided by the database (see supabase/migrations/…_booth_studio.sql).
 */
export class SupabaseBackend implements BoothBackend {
  readonly mode = 'supabase' as const;
  private readonly url: string;

  constructor(
    url: string,
    private readonly anonKey: string,
  ) {
    this.url = url.replace(/\/+$/, '');
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.anonKey, Authorization: `Bearer ${this.anonKey}`, ...extra };
  }

  private async request(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: ctrl.signal });
    } catch {
      throw new BoothError('network');
    } finally {
      clearTimeout(timer);
    }
  }

  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const res = await this.request(
      `${this.url}/rest/v1/rpc/${name}`,
      { method: 'POST', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) },
      12000,
    );
    if (res.ok) return (await res.json()) as T;
    let message = '';
    try {
      message = String(((await res.json()) as { message?: string }).message ?? '');
    } catch {
      // Not JSON: treated as a plain server error below.
    }
    const known = KNOWN_ERRORS.find((k) => message === k);
    throw new BoothError(known ?? 'server', message || `HTTP ${res.status}`);
  }

  async getEvent(slug: string, token: string): Promise<BoothEvent | null> {
    return parseEvent(await this.rpc('booth_config', { p_slug: slug, p_token: token }));
  }

  async submitPhoto(slug: string, token: string, code: string, photo: Blob): Promise<void> {
    const path = await this.rpc<string>('booth_register_photo', { p_slug: slug, p_token: token, p_code: code });
    const res = await this.request(
      `${this.url}/storage/v1/object/photos/${path}`,
      { method: 'POST', headers: this.headers({ 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }), body: photo },
      60000,
    );
    if (!res.ok) {
      // A repeat of an upload that already went through is fine; Supabase reports it as 409 "Duplicate".
      const text = await res.text().catch(() => '');
      const duplicate = res.status === 409 || /duplicate|already exists/i.test(text);
      if (!duplicate) throw new BoothError('server', `upload failed: HTTP ${res.status}`);
    }
    await this.rpc('booth_confirm_photo', { p_slug: slug, p_token: token, p_code: code });
  }

  async getPhoto(code: string): Promise<GuestPhoto | null> {
    if (!isPhotoCode(code)) return null;
    const r = await this.rpc<{
      status: 'pending' | 'ready';
      path?: string;
      createdAt?: string;
      expiresAt?: string;
      event?: { name?: string; subtitle?: string | null; logoUrl?: string | null; accent?: string | null };
    } | null>('photo_get', { p_code: code });
    if (!r) return null;
    if (r.status === 'pending' || !r.path) return { status: 'pending' };
    const publicUrl = `${this.url}/storage/v1/object/public/photos/${r.path}`;
    return {
      status: 'ready',
      url: publicUrl,
      downloadUrl: `${publicUrl}?download=${encodeURIComponent('photo-booth.jpg')}`,
      createdAt: r.createdAt ?? '',
      expiresAt: r.expiresAt ?? '',
      event: {
        name: r.event?.name ?? '',
        subtitle: r.event?.subtitle ?? undefined,
        logoUrl: r.event?.logoUrl ?? undefined,
        accent: r.event?.accent ?? undefined,
      },
    };
  }

  async deletePhoto(code: string): Promise<void> {
    await this.rpc('photo_delete', { p_code: code });
  }
}

interface DemoPhoto {
  blob: Blob;
  createdAt: string;
}

/** Used when no Supabase project is connected: photos stay in this browser, so a QR code only works on this device. */
export class DemoBackend implements BoothBackend {
  readonly mode = 'demo' as const;
  private readonly store = kvStore<DemoPhoto>('booth-demo', 'photos');

  async getEvent(slug: string): Promise<BoothEvent | null> {
    return slug === DEMO_EVENT.slug ? DEMO_EVENT : null;
  }

  async submitPhoto(_slug: string, _token: string, code: string, photo: Blob): Promise<void> {
    await this.store.put(code, { blob: photo, createdAt: new Date().toISOString() });
  }

  async getPhoto(code: string): Promise<GuestPhoto | null> {
    const p = await this.store.get(code);
    if (!p) return null;
    const url = URL.createObjectURL(p.blob);
    return {
      status: 'ready',
      url,
      downloadUrl: url,
      createdAt: p.createdAt,
      expiresAt: new Date(Date.parse(p.createdAt) + DEMO_EVENT.retentionDays * 864e5).toISOString(),
      event: { name: DEMO_EVENT.name, subtitle: DEMO_EVENT.config.subtitle, accent: DEMO_EVENT.config.accent },
    };
  }

  async deletePhoto(code: string): Promise<void> {
    await this.store.delete(code);
  }
}

let backend: BoothBackend | undefined;

/** The Supabase backend when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, otherwise the on-device demo. */
export function getBackend(): BoothBackend {
  if (!backend) {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    backend = url && key ? new SupabaseBackend(url, key) : new DemoBackend();
  }
  return backend;
}
