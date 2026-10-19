import { useState } from 'react';
import type { DeviceCapabilities } from '../lib/device';
import { CheckIcon, CopyIcon, InfoIcon, PhoneIcon } from './Icons';

interface ARSupportNoticeProps {
  caps: DeviceCapabilities;
  /** From model-viewer after the model loads; null while unknown. */
  canActivateAR: boolean | null;
}

type Tone = 'ready' | 'info' | 'warn';

/** Explains, in plain language, whether AR will work on this device and what to do if not. */
export function ARSupportNotice({ caps, canActivateAR }: ARSupportNoticeProps) {
  const { platform, secureContext } = caps;
  let tone: Tone = 'info';
  let title: string;
  let body: string;
  let showCopy = false;

  if (!secureContext) {
    tone = 'warn';
    title = 'AR needs a secure (HTTPS) connection';
    body =
      'Browsers block camera and AR features on insecure pages. The 3D view still works here — open the HTTPS version of this site to use AR.';
  } else if (canActivateAR === true) {
    tone = 'ready';
    title = 'AR is available on this device';
    body =
      platform === 'ios'
        ? 'Tap “View in your space” to open the model in Apple Quick Look, then point your camera at the floor.'
        : 'Tap “View in your space”, then slowly move your phone so it can detect the floor.';
  } else if (platform === 'desktop') {
    title = 'Open this page on a phone or tablet to use AR';
    body =
      'On desktop you can rotate and zoom the model in 3D. AR needs an iPhone or iPad with Safari, or an Android device that supports Google Play Services for AR.';
    showCopy = true;
  } else if (canActivateAR === null) {
    title = 'Checking AR support…';
    body = 'AR availability is confirmed once the model finishes loading.';
  } else if (platform === 'ios') {
    tone = 'warn';
    title = 'AR Quick Look is not available in this browser';
    body = 'Open this page in Safari on iOS 12 or later. Some in-app browsers (social apps) block Quick Look.';
    showCopy = true;
  } else if (platform === 'android') {
    tone = 'warn';
    title = 'AR is not supported on this device or browser';
    body =
      'AR on Android needs Chrome and a device certified for Google Play Services for AR (ARCore). You can still explore the model in 3D.';
  } else {
    tone = 'warn';
    title = 'AR is not supported on this device';
    body = 'You can still rotate and zoom the model in 3D.';
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
    </div>
  );
}

function CopyLink() {
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
        {state === 'copied' ? 'Link copied' : state === 'failed' ? 'Copy failed — select the link' : 'Copy link'}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}
