import { BoothError, type BoothBackend } from './types';
import { kvStore } from './idb';

interface QueuedPhoto {
  code: string;
  slug: string;
  token: string;
  blob: Blob;
  createdAt: number;
  attempts: number;
  nextTry: number;
  /** Why the server last refused this photo, if for a reason staff must fix. */
  blocked?: 'quota_reached' | 'invalid_event';
}

export interface QueueState {
  /** Photos not yet uploaded. */
  pending: number;
  /** Set when uploads are refused for a reason staff must fix (photo limit, event closed). */
  blocked: 'quota_reached' | 'invalid_event' | null;
}

export type PhotoStatus = 'uploading' | 'waiting' | 'done';

const MAX_BACKOFF_MS = 60_000;

/**
 * Photos are saved on the device first and uploaded in the background, so a dead Wi-Fi never loses a
 * guest's photo: the booth keeps working and the queue catches up when the connection returns. The
 * queue survives a page reload (IndexedDB).
 */
export class UploadQueue {
  private readonly store = kvStore<QueuedPhoto>('booth-queue', 'photos');
  private readonly listeners = new Set<(s: QueueState) => void>();
  private readonly done = new Set<string>();
  private state: QueueState = { pending: 0, blocked: null };
  private running = false;
  private current: string | null = null;
  private timer: number | undefined;
  private readonly onOnline = () => void this.process(true);

  constructor(
    private readonly backend: BoothBackend,
    private readonly retryMs = 8000,
  ) {}

  start() {
    this.timer = window.setInterval(() => void this.process(), this.retryMs);
    window.addEventListener('online', this.onOnline);
    void this.process(true);
  }

  stop() {
    window.clearInterval(this.timer);
    window.removeEventListener('online', this.onOnline);
  }

  subscribe(fn: (s: QueueState) => void) {
    this.listeners.add(fn);
    fn(this.state);
    return () => void this.listeners.delete(fn);
  }

  status(code: string): PhotoStatus {
    if (this.done.has(code)) return 'done';
    return this.current === code ? 'uploading' : 'waiting';
  }

  async enqueue(photo: Pick<QueuedPhoto, 'code' | 'slug' | 'token' | 'blob'>) {
    await this.store.put(photo.code, { ...photo, createdAt: Date.now(), attempts: 0, nextTry: 0 });
    await this.refresh();
    void this.process(true);
  }

  private set(next: Partial<QueueState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((fn) => fn(this.state));
  }

  private async refresh() {
    const items = (await this.store.all()).map(([, v]) => v);
    this.set({ pending: items.length, blocked: items.find((i) => i.blocked)?.blocked ?? null });
  }

  /** Uploads what is due, one photo at a time. `force` ignores the back-off timers. */
  async process(force = false) {
    if (this.running) return;
    this.running = true;
    try {
      const items = (await this.store.all()).map(([, v]) => v).sort((a, b) => a.createdAt - b.createdAt);
      this.set({ pending: items.length });
      for (const item of items) {
        if (!force && item.nextTry > Date.now()) continue;
        this.current = item.code;
        this.listeners.forEach((fn) => fn(this.state));
        try {
          await this.backend.submitPhoto(item.slug, item.token, item.code, item.blob);
          await this.store.delete(item.code);
          this.done.add(item.code);
        } catch (err) {
          const kind = err instanceof BoothError ? err.kind : 'server';
          const attempts = item.attempts + 1;
          if (kind === 'invalid_code') {
            await this.store.delete(item.code); // can never succeed: drop it
            continue;
          }
          // Keep the photo and try again later, backing off up to a minute.
          await this.store.put(item.code, {
            ...item,
            attempts,
            nextTry: Date.now() + Math.min(MAX_BACKOFF_MS, this.retryMs * 2 ** attempts),
            blocked: kind === 'quota_reached' || kind === 'invalid_event' ? kind : undefined,
          });
          if (kind === 'network') break; // no point trying the rest while offline
        } finally {
          this.current = null;
        }
      }
      await this.refresh();
    } finally {
      this.running = false;
    }
  }
}
