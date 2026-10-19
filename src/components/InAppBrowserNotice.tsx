import { useState } from 'react';
import { detectInAppBrowser, detectPlatform, externalBrowserUrl } from '../lib/device';
import { CheckIcon, CloseIcon, CopyIcon, ExternalIcon } from './Icons';
import { useT } from '../i18n';

const DISMISS_KEY = 'in-app-notice-dismissed';

/** Suggests opening the site in Chrome or Safari when it was opened inside LINE, Facebook etc. */
export function InAppBrowserNotice() {
  const n = useT().inApp;
  const [app] = useState(() => (typeof navigator === 'undefined' ? null : detectInAppBrowser()));
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);
  if (!app || dismissed) return null;

  const ios = detectPlatform() === 'ios';
  const external = externalBrowserUrl(app);
  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Then it shows again on the next page load, which is acceptable.
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      window.prompt(n.copyPrompt, window.location.href);
    }
  };

  return (
    <div role="region" aria-label={n.label} className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl bg-navy-900 p-4 text-white shadow-2xl sm:bottom-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{n.title(n.apps[app])}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{external ? n.text : ios ? n.textIOS : n.text}</p>
        </div>
        <button type="button" onClick={dismiss} className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10">
          <CloseIcon width={18} height={18} />
          <span className="sr-only">{n.dismiss}</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {external && (
          <a
            href={external}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-electric-600 px-4 text-sm font-semibold hover:bg-electric-700"
          >
            <ExternalIcon width={16} height={16} /> {ios ? n.openSafari : n.openBrowser}
          </a>
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10"
        >
          {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />} {copied ? n.copied : n.copy}
        </button>
      </div>
    </div>
  );
}
