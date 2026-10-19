import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createXRStore } from '@react-three/xr';
import { PageHeader } from '../components/PageHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { QRCode } from '../components/QRCode';
import { Button } from '../components/Button';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { useT } from '../i18n';

const VRScene = lazy(() => import('../components/VRScene'));

type VRSupport = 'checking' | 'supported' | 'unsupported' | 'insecure';

async function detectVR(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

export default function VRShowroom() {
  const t = useT();
  const v = t.vr;
  useDocumentTitle(v.metaTitle);
  const reducedMotion = usePrefersReducedMotion();
  const { webgl, secureContext } = useDeviceCapabilities();
  // No emulator: only real WebXR devices report VR support.
  const store = useMemo(() => createXRStore({ emulate: false, offerSession: false }), []);
  const [support, setSupport] = useState<VRSupport>(secureContext ? 'checking' : 'insecure');
  const [inSession, setInSession] = useState(false);
  const [enterError, setEnterError] = useState(false);

  useEffect(() => {
    if (!secureContext) return;
    let cancelled = false;
    detectVR().then((ok) => !cancelled && setSupport(ok ? 'supported' : 'unsupported'));
    return () => {
      cancelled = true;
    };
  }, [secureContext]);

  useEffect(() => store.subscribe((s) => setInSession(s.session != null)), [store]);

  const enterVR = async () => {
    setEnterError(false);
    try {
      const session = await store.enterVR();
      if (!session) setEnterError(true);
    } catch (err) {
      console.error('Could not start VR session', err);
      setEnterError(true);
    }
  };

  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  return (
    <>
      <PageHeader eyebrow={v.eyebrow} title={v.title} description={v.description} />

      <section aria-labelledby="vr-viewer-title" className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <h2 id="vr-viewer-title" className="sr-only">
            {v.viewerTitle}
          </h2>
          <div
            role="region"
            aria-label={v.viewerLabel}
            className="relative h-[460px] overflow-hidden rounded-2xl border border-line bg-[#e9edf2] sm:h-[620px]"
          >
            {webgl ? (
              <ErrorBoundary
                fallback={
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-700" role="alert">
                    {v.renderError}
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="absolute inset-0 grid place-items-center" role="status">
                      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-electric-600" />
                      <span className="sr-only">{v.loading}</span>
                    </div>
                  }
                >
                  <VRScene store={store} animate={!reducedMotion} />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-700" role="alert">
                {v.noWebgl}
              </div>
            )}
            <p className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-white/85 px-4 py-2 text-xs font-medium text-slate-700 backdrop-blur">
              {v.hint}
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border border-line bg-white p-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={enterVR} disabled={support !== 'supported' || inSession}>
                  {inSession ? v.inSession : v.enter}
                </Button>
                <VRStatus support={support} />
              </div>
              {enterError && (
                <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-red-700">
                  <AlertIcon className="mt-0.5 shrink-0" width={18} height={18} /> {v.enterFailed}
                </p>
              )}
              <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-[15px] text-slate-700">
                {v.controls.map((c) => (
                  <li key={c} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-start">
              <QRCode value={pageUrl} size={128} label={v.qrLabel} className="shrink-0" />
              <div>
                <h3 className="font-display text-lg font-bold">{v.headsetTitle}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.headsetText}</p>
                <code className="mt-3 block truncate rounded-md bg-surface px-2 py-1 text-xs text-slate-600 ring-1 ring-line">
                  {pageUrl}
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="vr-devices-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 id="vr-devices-title" className="font-display text-3xl font-bold">
              {v.devicesTitle}
            </h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{v.devicesCaption}</caption>
                <thead className="bg-surface text-xs tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">{v.deviceCol}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{v.experienceCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {v.devices.map((d) => (
                    <tr key={d.device}>
                      <th scope="row" className="px-5 py-4 align-top font-semibold text-ink">{d.device}</th>
                      <td className="px-5 py-4 text-slate-700">
                        <span className="font-medium text-ink">{d.mode}</span>
                        <span className="mt-1 block text-muted">{d.note}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">{v.usesTitle}</h2>
            <ul className="mt-8 space-y-5">
              {v.uses.map((u) => (
                <li key={u.title} className="rounded-2xl border border-line p-6">
                  <h3 className="font-display text-lg font-bold">{u.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

function VRStatus({ support }: { support: VRSupport }) {
  const v = useT().vr;
  const map = {
    checking: { icon: InfoIcon, cls: 'text-slate-600', text: v.statusChecking },
    supported: { icon: CheckIcon, cls: 'text-emerald-700', text: v.statusSupported },
    unsupported: { icon: InfoIcon, cls: 'text-slate-600', text: v.statusUnsupported },
    insecure: { icon: AlertIcon, cls: 'text-amber-700', text: v.statusInsecure },
  }[support];
  const Icon = map.icon;
  return (
    <p className={`flex items-start gap-2 text-sm ${map.cls}`} aria-live="polite">
      <Icon className="mt-0.5 shrink-0" width={18} height={18} />
      {map.text}
    </p>
  );
}
