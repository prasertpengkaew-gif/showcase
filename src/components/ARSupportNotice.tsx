import { useState } from 'react';
import type { DeviceCapabilities } from '../lib/device';
import { CheckIcon, CopyIcon, InfoIcon, PhoneIcon } from './Icons';
import { QRCode } from './QRCode';
import { useT } from '../i18n';

interface ARSupportNoticeProps {
  caps: DeviceCapabilities;
  /** From model-viewer after the model loads; null while unknown. */
  canActivateAR: boolean | null;
}

type Tone = 'ready' | 'info' | 'warn';

/** Explains, in plain language, whether AR will work on this device and what to do if not. */
export function ARSupportNotice({ caps, canActivateAR }: ARSupportNoticeProps) {
  const { platform, secureContext } = caps;
  const n = useT().arNotice;
  let tone: Tone = 'info';
  let title: string;
  let body: string;
  let showCopy = false;

  if (!secureContext) {
    tone = 'warn';
    title = n.insecureTitle;
    body = n.insecureText;
  } else if (canActivateAR === true) {
    tone = 'ready';
    title = n.readyTitle;
    body = platform === 'ios' ? n.readyIOS : n.readyOther;
  } else if (platform === 'desktop') {
    title = n.desktopTitle;
    body = n.desktopText;
    showCopy = true;
  } else if (canActivateAR === null) {
    title = n.checkingTitle;
    body = n.checkingText;
  } else if (platform === 'ios') {
    tone = 'warn';
    title = n.iosTitle;
    body = n.iosText;
    showCopy = true;
  } else if (platform === 'android') {
    tone = 'warn';
    title = n.androidTitle;
    body = n.androidText;
  } else {
    tone = 'warn';
    title = n.otherTitle;
    body = n.otherText;
  }

  const styles: Record<Tone, string> = {
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-line bg-surface text-slate-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
  };
  const Icon = tone === 'ready' ? CheckIcon : platform === 'desktop' ? PhoneIcon : InfoIcon;

  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-sm ${styles[tone]}`} aria-live="polite">
      <Icon className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-relaxed opacity-90">{body}</p>
        {showCopy && <CopyLink />}
      </div>
      {platform === 'desktop' && secureContext && (
        <QRCode
          value={window.location.href.split('#')[0]}
          size={112}
          label={n.qrLabel}
          className="hidden shrink-0 sm:block"
        />
      )}
    </div>
  );
}

function CopyLink() {
  const n = useT().arNotice;
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const url = window.location.href;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
    window.setTimeout(() => setState('idle'), 2500);
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <code className="max-w-full truncate rounded-md bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-line">{url}</code>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-ink ring-1 ring-line hover:ring-slate-300"
      >
        <CopyIcon width={14} height={14} />
        {state === 'copied' ? n.copied : state === 'failed' ? n.copyFailed : n.copy}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? n.copiedSr : ''}
      </span>
    </div>
  );
}
