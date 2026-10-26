import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../i18n/Link';
import { createXRStore } from '@react-three/xr';
import { PageHeader } from '../components/PageHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Button, buttonClasses } from '../components/Button';
import { LazyImage } from '../components/LazyImage';
import { CloseIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { tourRooms, type Hotspot, type InfoHotspot, type RoomId } from '../data/tour';
import { useT } from '../i18n';

const TourScene = lazy(() => import('../components/TourScene'));

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };

export default function VirtualTour() {
  const t = useT();
  const v = t.tour;
  useDocumentTitle(v.metaTitle);
  const { webgl, platform } = useDeviceCapabilities();
  const store = useMemo(() => createXRStore({ emulate: false, offerSession: false }), []);

  const [roomId, setRoomId] = useState<RoomId>('living');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [info, setInfo] = useState<InfoHotspot | null>(null);
  const [motion, setMotion] = useState(false);
  const [motionDenied, setMotionDenied] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);

  const room = tourRooms.find((r) => r.id === roomId)!;
  const hasMotion = platform !== 'desktop' && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

  useEffect(() => {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported(m: string): Promise<boolean> } }).xr;
    xr?.isSessionSupported('immersive-vr').then(setVrSupported, () => setVrSupported(false));
  }, []);

  const goTo = (id: RoomId) => {
    if (id === roomId) return;
    setInfo(null);
    setFailed(false);
    setLoading(true);
    setRoomId(id);
  };

  const onHotspot = useCallback((h: Hotspot) => {
    if (h.kind === 'door') {
      setInfo(null);
      setFailed(false);
      setLoading(true);
      setRoomId(h.to);
    } else {
      setInfo(h);
    }
  }, []);
  const onLoaded = useCallback(() => setLoading(false), []);
  const onError = useCallback(() => {
    setLoading(false);
    setFailed(true);
  }, []);

  const toggleMotion = async () => {
    if (motion) {
      setMotion(false);
      return;
    }
    setMotionDenied(false);
    // iOS asks for permission; other browsers grant it directly.
    const request = (DeviceOrientationEvent as unknown as MotionPermission).requestPermission;
    if (request) {
      try {
        if ((await request()) !== 'granted') {
          setMotionDenied(true);
          return;
        }
      } catch {
        setMotionDenied(true);
        return;
      }
    }
    setMotion(true);
  };

  const label = (h: Hotspot) => (h.kind === 'door' ? v.goTo(v.rooms[h.to]) : v.items[h.item].name);

  return (
    <>
      <PageHeader eyebrow={v.eyebrow} title={v.title} description={v.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <div
            role="region"
            aria-label={`${v.viewerLabel}: ${v.rooms[roomId]}`}
            className="relative h-[460px] overflow-hidden rounded-2xl border border-line bg-navy-900 sm:h-[620px]"
          >
            {webgl ? (
              <ErrorBoundary
                fallback={<p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white">{v.error}</p>}
              >
                <Suspense fallback={null}>
                  <TourScene
                    room={room}
                    store={store}
                    labelRefs={labelRefs}
                    motion={motion}
                    onHotspot={onHotspot}
                    onLoaded={onLoaded}
                    onError={onError}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-white" role="alert">
                {v.noWebgl}
              </p>
            )}

            {/* Hotspot labels: real buttons (keyboard and screen-reader friendly), positioned by the 3D scene. */}
            {webgl && (
              <ul className="pointer-events-none absolute inset-0 overflow-hidden">
                {room.hotspots.map((h, i) => (
                  <li
                    key={`${room.id}-${i}`}
                    ref={(el) => {
                      labelRefs.current[i] = el;
                    }}
                    className="pointer-events-auto absolute top-0 left-0"
                    style={{ visibility: 'hidden' }}
                  >
                    <button
                      type="button"
                      onClick={() => onHotspot(h)}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap shadow-lg ring-2 ring-white/70 ${
                        h.kind === 'door' ? 'bg-electric-600 text-white hover:bg-electric-700' : 'bg-white text-ink hover:bg-surface'
                      }`}
                    >
                      <span aria-hidden>{h.kind === 'door' ? '→' : 'ⓘ'}</span>
                      {label(h)}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {webgl && loading && !failed && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-navy-900/60" role="status">
                <div className="text-center text-white">
                  <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                  <p className="mt-3 text-sm">{v.loading}</p>
                </div>
              </div>
            )}
            {failed && (
              <div className="absolute inset-0 grid place-items-center bg-navy-900/80 p-6 text-center text-white" role="alert">
                <div>
                  <p className="text-sm">{v.error}</p>
                  <Button
                    className="mt-4"
                    variant="outline-light"
                    onClick={() => {
                      setFailed(false);
                      setLoading(true);
                      // Re-mount the panorama loader by toggling the room.
                      const current = roomId;
                      setRoomId(current === 'living' ? 'studio' : 'living');
                      setTimeout(() => setRoomId(current), 0);
                    }}
                  >
                    {t.viewer.retry}
                  </Button>
                </div>
              </div>
            )}

            <p className="pointer-events-none absolute top-4 left-4 rounded-full bg-navy-900/80 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              {v.rooms[roomId]}
            </p>
            <p className="pointer-events-none absolute bottom-4 left-4 hidden rounded-full bg-white/85 px-4 py-2 text-xs font-medium text-slate-700 backdrop-blur sm:block">
              {v.hint}
            </p>

            {info && (
              <div
                role="dialog"
                aria-labelledby="tour-info-title"
                className="absolute right-4 bottom-4 left-4 rounded-2xl bg-white p-5 shadow-xl sm:left-auto sm:w-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 id="tour-info-title" className="font-display text-lg font-bold">
                    {v.items[info.item].name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setInfo(null)}
                    aria-label={v.close}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-surface"
                  >
                    <CloseIcon width={18} height={18} />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.items[info.item].text}</p>
                <Link to={`/projects/${info.projectSlug}`} className={buttonClasses('primary', 'md', 'mt-4')}>
                  {v.viewIn3D}
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {hasMotion && (
              <Button variant={motion ? 'secondary' : 'ghost'} onClick={toggleMotion} aria-pressed={motion}>
                {motion ? v.motionOff : v.motionOn}
              </Button>
            )}
            {vrSupported && (
              <Button variant="ghost" onClick={() => store.enterVR()}>
                {v.enterVR}
              </Button>
            )}
            {motionDenied && <p className="text-sm text-amber-800">{v.motionDenied}</p>}
          </div>

          <h2 className="mt-10 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{v.roomsTitle}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {tourRooms.map((r) => {
              const active = r.id === roomId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => goTo(r.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition-colors ${
                      active ? 'border-electric-600 ring-1 ring-electric-600' : 'border-line hover:border-slate-300'
                    }`}
                  >
                    <LazyImage src={r.thumb} alt="" width={480} height={320} wrapperClassName="w-24 shrink-0 rounded-xl" />
                    <span>
                      <span className="block font-display font-bold text-ink">{v.rooms[r.id]}</span>
                      {active && <span className="mt-0.5 block text-sm text-electric-700">{v.current}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 flex items-start gap-2 text-sm text-muted">
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {v.cgNote}
          </p>
        </div>
      </section>

      <section aria-labelledby="tour-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="tour-uses-title" className="font-display text-3xl font-bold">
            {v.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {v.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
