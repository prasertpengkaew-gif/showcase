import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useNoIndex } from '../../hooks/useNoIndex';
import { useLanguage, useT } from '../../i18n';
import { readableOn } from '../../lib/color';
import { getBackend } from '../../lib/booth/backend';
import type { GuestPhoto as Photo } from '../../lib/booth/types';
import { CheckIcon, InfoIcon } from '../../components/Icons';

type View = 'loading' | 'pending' | 'ready' | 'notfound' | 'error' | 'deleted';
const POLL_MS = 5000;
const MAX_POLLS = 36; // about three minutes

/** What a guest sees after scanning the QR code: their photo, with download, share and delete. */
export default function GuestPhoto() {
  const { code = '' } = useParams();
  const t = useT();
  const g = t.guestPhoto;
  const { lang } = useLanguage();
  useNoIndex();
  useDocumentTitle(g.metaTitle);

  const backend = getBackend();
  const [view, setView] = useState<View>('loading');
  const [photo, setPhoto] = useState<Extract<Photo, { status: 'ready' }> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const polls = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const p = await backend.getPhoto(code);
      if (!p) return setView('notfound');
      if (p.status === 'ready') {
        setPhoto(p);
        return setView('ready');
      }
      setView('pending');
      if (polls.current++ < MAX_POLLS) timer.current = window.setTimeout(() => void load(), POLL_MS);
    } catch {
      setView('error');
    }
  }, [backend, code]);

  useEffect(() => {
    polls.current = 0;
    void load();
    return () => window.clearTimeout(timer.current);
  }, [load]);

  const accent = photo?.event.accent && /^#[0-9a-f]{6}$/i.test(photo.event.accent) ? photo.event.accent : '#2563EB';
  const onAccent = readableOn(accent);
  const expires = photo?.expiresAt
    ? new Date(photo.expiresAt).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const share = async () => {
    if (!photo) return;
    try {
      const blob = await (await fetch(photo.url)).blob();
      const file = new File([blob], 'photo-booth.jpg', { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: photo.event.name });
      else await navigator.share({ url: window.location.href, title: photo.event.name });
    } catch {
      // The guest closed the share sheet, or sharing is not possible: nothing to report.
    }
  };

  const remove = async () => {
    setDeleteFailed(false);
    try {
      await backend.deletePhoto(code);
      setPhoto(null);
      setView('deleted');
    } catch {
      setDeleteFailed(true);
    }
  };

  const message = (title: string, text: string, retry = false) => (
    <div role={view === 'error' ? 'alert' : 'status'} className="mt-16 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-3 leading-relaxed text-muted">{text}</p>
      {retry && (
        <button type="button" onClick={() => void load()} className="mt-6 h-12 rounded-full bg-navy-900 px-8 font-semibold text-white">
          {g.retry}
        </button>
      )}
    </div>
  );

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-white px-5 pt-8 pb-6 text-ink">
      <div className="flex-1">
        {view === 'loading' && (
          <div role="status" className="mt-24 text-center">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-line border-t-electric-600" />
            <p className="mt-4 text-muted">{g.loading}</p>
          </div>
        )}
        {view === 'pending' && message(g.pendingTitle, g.pendingText)}
        {view === 'notfound' && message(g.notFoundTitle, g.notFoundText)}
        {view === 'error' && message(g.errorTitle, g.errorText, true)}
        {view === 'deleted' && (
          <p role="status" className="mt-24 flex items-center justify-center gap-2 text-center text-lg font-semibold">
            <CheckIcon /> {g.deleted}
          </p>
        )}

        {view === 'ready' && photo && (
          <>
            <header className="text-center">
              {photo.event.logoUrl && <img src={photo.event.logoUrl} alt="" className="mx-auto mb-3 max-h-14 max-w-[60%] object-contain" />}
              <h1 className="font-display text-2xl font-bold">{photo.event.name}</h1>
              {photo.event.subtitle && <p className="mt-1 text-sm text-muted">{photo.event.subtitle}</p>}
            </header>

            <img src={photo.url} alt={g.photoAlt(photo.event.name)} className="mt-6 w-full rounded-2xl border border-line shadow-lg" />

            <div className="mt-5 grid gap-3">
              <a
                href={photo.downloadUrl}
                download="photo-booth.jpg"
                className="inline-flex h-14 items-center justify-center rounded-full text-lg font-bold"
                style={{ background: accent, color: onAccent }}
              >
                {g.download}
              </a>
              {typeof navigator.share === 'function' && (
                <button type="button" onClick={() => void share()} className="h-12 rounded-full border border-line font-semibold hover:bg-surface">
                  {g.share}
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-muted">{g.iosHint}</p>
            {expires && <p className="mt-4 text-center text-sm font-medium text-slate-700">{g.expires(expires)}</p>}
            {backend.mode === 'demo' && (
              <p role="note" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {g.demoNotice}
              </p>
            )}

            <section aria-labelledby="privacy-title" className="mt-8 rounded-2xl bg-surface p-4">
              <h2 id="privacy-title" className="text-sm font-semibold">
                {g.privacyTitle}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{g.privacyText}</p>
              {confirming ? (
                <div className="mt-3" role="group" aria-label={g.deleteConfirm}>
                  <p className="text-sm font-semibold">{g.deleteConfirm}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => void remove()} className="h-10 rounded-full bg-red-700 px-5 text-sm font-semibold text-white">
                      {g.deleteYes}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-full border border-line bg-white px-5 text-sm font-semibold">
                      {g.deleteNo}
                    </button>
                  </div>
                  {deleteFailed && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {g.deleteError}
                    </p>
                  )}
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="mt-3 text-sm font-semibold text-red-700 underline">
                  {g.delete}
                </button>
              )}
            </section>
          </>
        )}
      </div>
      <footer className="mt-10 text-center text-xs text-muted">
        <Link to="/" className="underline">
          {g.poweredBy}
        </Link>
      </footer>
    </main>
  );
}
