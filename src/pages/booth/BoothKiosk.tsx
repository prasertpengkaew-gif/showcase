import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { QRCode } from '../../components/QRCode';
import { CameraIcon, CloseIcon, ExpandIcon, ShrinkIcon } from '../../components/Icons';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useNoIndex } from '../../hooks/useNoIndex';
import { useLanguage, useT } from '../../i18n';
import { cameraProblem } from '../../lib/camera';
import { readableOn } from '../../lib/color';
import { drawEventFrame, drawImageFrame } from '../../lib/eventFrames';
import { drawFaces, type MeshConnections } from '../../lib/faceEffects';
import { createFaceLandmarker } from '../../lib/faceLandmarker';
import { getBackend } from '../../lib/booth/backend';
import { newPhotoCode } from '../../lib/booth/code';
import { ASPECT_RATIO } from '../../lib/booth/config';
import { UploadQueue, type QueueState } from '../../lib/booth/queue';
import { BoothError, type BoothEvent, type BoothProp } from '../../lib/booth/types';

type Phase = 'setup' | 'starting' | 'idle' | 'countdown' | 'review';
type Load = 'loading' | 'ready' | 'invalid' | 'offline';

const NO_MESH: MeshConnections = { tesselation: [], contours: [] };
const SMILE_ON = 0.6;
const SMILE_OFF = 0.3;
const SMILE_HOLD_MS = 700;
const MAX_LONG_SIDE = 1920;
const RETRY_MS = Number(import.meta.env.VITE_BOOTH_RETRY_MS) || 8000;
const STAFF_HOLD_MS = 1200;

const cacheKey = (slug: string) => `booth-event:${slug}`;
const guestUrl = (code: string) => `${(import.meta.env.VITE_PUBLIC_URL?.trim().replace(/\/+$/, '') || window.location.origin)}/p/${code}`;

function readCached(slug: string): BoothEvent | null {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(slug)) ?? 'null') as BoothEvent | null;
  } catch {
    return null;
  }
}

/** The photo booth that runs on the device at the venue. Opened from a private link: /booth/<event>?k=<token>. */
export default function BoothKiosk() {
  const t = useT();
  const b = t.boothKiosk;
  const { setLang } = useLanguage();
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('k') ?? '';
  useNoIndex();
  useDocumentTitle(b.setupTitle);

  const backend = useMemo(() => getBackend(), []);
  const queue = useMemo(() => new UploadQueue(backend, RETRY_MS), [backend]);

  const [load, setLoad] = useState<Load>('loading');
  const [event, setEvent] = useState<BoothEvent | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [problem, setProblem] = useState<'denied' | 'no-camera' | 'insecure' | 'error' | 'lost' | null>(null);
  const [prop, setProp] = useState<BoothProp>('none');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [faces, setFaces] = useState(0);
  const [smileHold, setSmileHold] = useState(0);
  const [shot, setShot] = useState<{ code: string; url: string } | null>(null);
  const [shots, setShots] = useState(0);
  const [upload, setUpload] = useState<'uploading' | 'waiting' | 'done'>('waiting');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [queueState, setQueueState] = useState<QueueState>({ pending: 0, blocked: null });
  const [staffOpen, setStaffOpen] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef(0);
  const frameRef = useRef<ImageBitmap | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const staffHoldRef = useRef<number | undefined>(undefined);
  const fs = useFullscreen(rootRef);

  // Everything the render loop reads lives in one ref so the loop is created once per camera start.
  const live = useRef({ phase, prop, event: null as BoothEvent | null });
  live.current = { phase, prop, event };
  const startCountdownRef = useRef<() => void>(() => {});

  // --- load the event -----------------------------------------------------------------------
  const loadEvent = useCallback(async () => {
    setLoad('loading');
    try {
      const ev = await backend.getEvent(slug, token);
      if (!ev) {
        setLoad('invalid');
        return;
      }
      try {
        localStorage.setItem(cacheKey(slug), JSON.stringify(ev));
      } catch {
        // Cache is optional.
      }
      setEvent(ev);
      setProp(ev.config.defaultProp);
      if (backend.mode !== 'demo') setLang(ev.config.language); // the demo follows the visitor's language
      setLoad('ready');
    } catch (err) {
      // No connection: a booth that has been set up before can start from the saved settings.
      const cached = err instanceof BoothError && err.kind === 'network' ? readCached(slug) : null;
      if (cached) {
        setEvent(cached);
        setProp(cached.config.defaultProp);
        if (backend.mode !== 'demo') setLang(cached.config.language);
        setLoad('ready');
      } else {
        setLoad(err instanceof BoothError && err.kind === 'invalid_event' ? 'invalid' : 'offline');
      }
    }
  }, [backend, slug, token, setLang]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    queue.start();
    const off = queue.subscribe(setQueueState);
    return () => {
      off();
      queue.stop();
    };
  }, [queue]);

  // Load the customer's frame image, if there is one.
  useEffect(() => {
    frameRef.current = null;
    setFrameFailed(false);
    const frame = event?.config.frame;
    if (frame?.kind !== 'image') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(frame.url, { mode: 'cors' });
        if (!res.ok) throw new Error(String(res.status));
        const bitmap = await createImageBitmap(await res.blob());
        if (!cancelled) frameRef.current = bitmap;
      } catch {
        if (!cancelled) setFrameFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event]);

  // --- camera -------------------------------------------------------------------------------
  const releaseWake = useCallback(() => {
    void wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
  }, []);

  const acquireWake = useCallback(async () => {
    try {
      wakeRef.current = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      // Not supported or refused: the device may dim; staff should turn off auto-lock.
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((tr) => {
      tr.onended = null;
      tr.stop();
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    releaseWake();
  }, [releaseWake]);

  useEffect(
    () => () => {
      stopCamera();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  // Screen wake lock is released when the tab is hidden; take it again when it comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && streamRef.current) void acquireWake();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [acquireWake]);

  const capture = useCallback(() => {
    const canvas = canvasRef.current;
    const ev = live.current.event;
    if (!canvas || !ev) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 350);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const code = newPhotoCode();
        void queue.enqueue({ code, slug: ev.slug, token, blob });
        setShot((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return { code, url: URL.createObjectURL(blob) };
        });
        setShots((n) => n + 1);
        setSecondsLeft(ev.config.reviewSeconds);
        live.current.phase = 'review';
        setPhase('review');
      },
      'image/jpeg',
      0.9,
    );
  }, [queue, token]);

  const startCountdown = useCallback(() => {
    const ev = live.current.event;
    if (!ev || live.current.phase !== 'idle') return;
    live.current.phase = 'countdown';
    setPhase('countdown');
    let n = ev.config.countdown;
    setCount(n);
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      window.clearInterval(timerRef.current);
      setCount(0);
      capture();
    }, 1000);
  }, [capture]);
  startCountdownRef.current = startCountdown;

  const backToIdle = useCallback(() => {
    window.clearInterval(timerRef.current);
    live.current.phase = 'idle';
    setPhase('idle');
    setShot((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    const ev = live.current.event;
    if (ev) setProp(ev.config.defaultProp);
  }, []);

  // Review screen: count down to the next guest and follow the upload.
  useEffect(() => {
    if (phase !== 'review' || !shot) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => s - 1);
      setUpload(queue.status(shot.code));
    }, 1000);
    setUpload(queue.status(shot.code));
    return () => window.clearInterval(id);
  }, [phase, shot, queue]);

  useEffect(() => {
    if (phase === 'review' && secondsLeft <= 0) backToIdle();
  }, [phase, secondsLeft, backToIdle]);

  const runLoop = (landmarker: FaceLandmarker) => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let lastVideoTime = -1;
    let lastUi = 0;
    let smileSince = 0;
    let armed = true;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const ev = live.current.event;
      if (!ev) return;
      const cfg = ev.config;
      const result = landmarker.detectForVideo(video, now);

      // Crop the camera image to the booth's photo shape, so the saved photo is exactly what guests see.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const target = ASPECT_RATIO[cfg.aspect];
      const cw = Math.round(target < vw / vh ? vh * target : vw);
      const ch = Math.round(target < vw / vh ? vh : vw / target);
      const sx = (vw - cw) / 2;
      const sy = (vh - ch) / 2;
      const k = Math.min(1, MAX_LONG_SIDE / Math.max(cw, ch));
      const W = Math.round(cw * k);
      const H = Math.round(ch * k);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      if (cfg.mirror) ctx.setTransform(-1, 0, 0, 1, W, 0);
      else ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, W, H);
      const prop = live.current.prop;
      if (prop !== 'none') {
        const cropped = result.faceLandmarks.map((face) => face.map((pt) => ({ ...pt, x: (pt.x * vw - sx) / cw, y: (pt.y * vh - sy) / ch })));
        drawFaces(ctx, cropped, prop, NO_MESH);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (cfg.frame.kind === 'image' && frameRef.current) drawImageFrame(ctx, frameRef.current);
      else drawEventFrame(ctx, cfg.frame.kind === 'preset' ? cfg.frame.theme : 'neon', ev.name, cfg.subtitle);

      const smile = result.faceLandmarks.length
        ? (['mouthSmileLeft', 'mouthSmileRight'] as const).reduce(
            (acc, name) => acc + (result.faceBlendshapes[0]?.categories.find((c) => c.categoryName === name)?.score ?? 0) / 2,
            0,
          )
        : 0;
      if (smile < SMILE_OFF) armed = true;
      if (cfg.smileToSnap && live.current.phase === 'idle' && armed && smile >= SMILE_ON) {
        smileSince ||= now;
        if (now - smileSince >= SMILE_HOLD_MS) {
          armed = false;
          smileSince = 0;
          startCountdownRef.current();
        }
      } else smileSince = 0;

      if (now - lastUi > 120) {
        lastUi = now;
        setFaces(result.faceLandmarks.length);
        setSmileHold(smileSince ? Math.min(1, (now - smileSince) / SMILE_HOLD_MS) : 0);
      }
    };
    tick();
  };

  const startBooth = async (facingMode: 'user' | 'environment' = facing) => {
    if (!event) return;
    setProblem(null);
    setPhase('starting');
    stopCamera();
    void fs.enter();
    void acquireWake();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException('no camera', 'NotFoundError');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      stream.getVideoTracks()[0].onended = () => {
        stopCamera();
        setProblem('lost');
        live.current.phase = 'setup';
        setPhase('setup');
      };
      landmarkerRef.current ??= await createFaceLandmarker('VIDEO');
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      live.current.phase = 'idle';
      setPhase('idle');
      runLoop(landmarkerRef.current);
    } catch (err) {
      stopCamera();
      const p = cameraProblem(err);
      if (p === 'error') console.error('Booth failed to start', err);
      setProblem(p);
      live.current.phase = 'setup';
      setPhase('setup');
    }
  };

  const stopBooth = () => {
    stopCamera();
    window.clearInterval(timerRef.current);
    setStaffOpen(false);
    setShot(null);
    live.current.phase = 'setup';
    setPhase('setup');
    fs.exit();
  };

  const switchCamera = () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    setStaffOpen(false);
    void startBooth(next);
  };

  // --- staff gesture: press and hold the top-right corner ----------------------------------
  const holdStart = () => {
    window.clearTimeout(staffHoldRef.current);
    staffHoldRef.current = window.setTimeout(() => setStaffOpen(true), STAFF_HOLD_MS);
  };
  const holdEnd = () => window.clearTimeout(staffHoldRef.current);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === 's') setStaffOpen((o) => !o);
      else if (e.key === 'Escape') setStaffOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cfg = event?.config;
  const accent = cfg?.accent ?? '#2563EB';
  const onAccent = readableOn(accent);
  const running = phase === 'idle' || phase === 'countdown' || phase === 'review';
  const link = shot ? guestUrl(shot.code) : '';
  const buttonStyle = { background: accent, color: onAccent };

  const problemTitle =
    problem === 'denied' ? t.face.deniedTitle : problem === 'no-camera' ? t.face.noCameraTitle : problem === 'insecure' ? t.face.insecureTitle : problem === 'error' ? t.face.errorTitle : b.cameraLostTitle;
  const problemText =
    problem === 'denied' ? t.face.deniedText : problem === 'no-camera' ? t.face.noCameraText : problem === 'insecure' ? t.face.insecureText : problem === 'error' ? b.cameraErrorText : b.cameraLostText;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-black text-white select-none" style={{ height: '100dvh' }}>
      <video ref={videoRef} className="hidden" playsInline muted />
      {/* The photo sits between the hint at the top and the controls at the bottom, so they never cover the frame. */}
      <div className={`absolute inset-x-0 ${running ? '' : 'invisible'}`} style={{ top: '3.75rem', bottom: cfg && cfg.props.length > 1 ? '13.5rem' : '10.5rem' }}>
        <canvas ref={canvasRef} aria-hidden className="h-full w-full object-contain" />
      </div>

      {/* Not running: loading, errors and the setup screen */}
      {!running && (
        <div className="absolute inset-0 grid place-items-center overflow-y-auto p-6 text-center" style={{ background: 'radial-gradient(70% 60% at 50% 0%, #1e3a8a55, transparent 70%), #0B1220' }}>
          {load === 'loading' && (
            <div role="status">
              <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
              <p className="mt-4 text-slate-300">{b.loading}</p>
            </div>
          )}
          {(load === 'invalid' || load === 'offline') && (
            <div role="alert" className="max-w-md">
              <h1 className="font-display text-2xl font-bold">{load === 'invalid' ? b.invalidTitle : b.offlineTitle}</h1>
              <p className="mt-3 leading-relaxed text-slate-300">{load === 'invalid' ? b.invalidText : b.offlineText}</p>
              {load === 'offline' && (
                <button type="button" onClick={() => void loadEvent()} className="mt-6 h-12 rounded-full bg-white px-8 font-semibold text-navy-900">
                  {b.retry}
                </button>
              )}
            </div>
          )}
          {load === 'ready' && event && cfg && (
            <div className="w-full max-w-lg">
              {cfg.logoUrl && <img src={cfg.logoUrl} alt="" className="mx-auto mb-6 max-h-20 max-w-[60%] object-contain" />}
              <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{event.name}</h1>
              {cfg.subtitle && <p className="mt-2 text-slate-300">{cfg.subtitle}</p>}
              {phase === 'starting' ? (
                <div role="status" className="mt-10">
                  <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-white" />
                  <p className="mt-4 text-slate-300">{b.starting}</p>
                </div>
              ) : (
                <>
                  <p className="mt-8 text-lg font-semibold">{b.setupTitle}</p>
                  <p className="mt-1 text-slate-300">{b.setupText}</p>
                  {problem && (
                    <div role="alert" className="mt-5 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 text-left text-sm text-amber-100">
                      <p className="font-semibold">{problemTitle}</p>
                      <p className="mt-1 leading-relaxed">{problemText}</p>
                    </div>
                  )}
                  {backend.mode === 'demo' && (
                    <p role="note" className="mt-5 rounded-xl border border-white/15 bg-white/5 p-3 text-left text-sm leading-relaxed text-slate-300">
                      {b.demoNotice}
                    </p>
                  )}
                  <button type="button" onClick={() => void startBooth()} className="mt-8 h-16 rounded-full px-12 text-xl font-bold shadow-lg" style={buttonStyle}>
                    {b.start}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Idle / countdown: logo, hint, props and the shutter */}
      {running && cfg && event && (
        <>
          {cfg.logoUrl && phase !== 'review' && (
            <img src={cfg.logoUrl} alt="" className="pointer-events-none absolute top-4 left-4 max-h-14 max-w-[28%] object-contain drop-shadow-lg" />
          )}

          {phase === 'idle' && (
            <>
              <div className="pointer-events-none absolute inset-x-4 top-2 flex justify-center">
                <p
                  role="status"
                  className="relative overflow-hidden rounded-full bg-black/70 px-6 py-3 text-center text-lg font-semibold backdrop-blur"
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 transition-[width] duration-100" style={{ width: `${smileHold * 100}%`, background: accent, opacity: 0.55 }} />
                  <span className="relative">{faces ? (cfg.smileToSnap ? b.hintSmile : b.hintTap) : b.noFace}</span>
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {cfg.props.length > 1 && (
                  <div role="group" aria-label={b.props} className="flex max-w-full gap-2 overflow-x-auto">
                    {cfg.props.map((p) => (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={prop === p}
                        onClick={() => setProp(p)}
                        className="h-12 shrink-0 rounded-full px-5 text-base font-semibold whitespace-nowrap"
                        style={prop === p ? buttonStyle : { background: 'rgba(255,255,255,0.18)', color: '#fff' }}
                      >
                        {b.propNames[p]}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={startCountdown}
                  className="grid h-20 w-20 place-items-center rounded-full border-4 border-white shadow-xl"
                  style={buttonStyle}
                >
                  <CameraIcon width={34} height={34} />
                  <span className="sr-only">{b.takePhoto}</span>
                </button>
                <p className="max-w-xl text-center text-xs leading-relaxed text-slate-300">{cfg.consent ?? b.consent(event.retentionDays)}</p>
              </div>
            </>
          )}

          {phase === 'countdown' && count > 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-live="assertive">
              <span key={count} className="animate-countdown font-display text-[12rem] leading-none font-extrabold drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                {count}
              </span>
            </div>
          )}
          {flash && <div aria-hidden className="animate-flash pointer-events-none absolute inset-0 bg-white" />}

          {/* Review: the photo and the QR code */}
          {phase === 'review' && shot && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-[#0B1220] p-5 landscape:flex-row landscape:gap-10">
              <img src={shot.url} alt="" className="max-h-[48dvh] max-w-full rounded-2xl object-contain shadow-2xl landscape:max-h-[82dvh] landscape:max-w-[50%]" />
              <div className="flex w-full max-w-sm flex-col items-center text-center">
                <h1 className="font-display text-2xl font-bold">{b.reviewTitle}</h1>
                <div className="mt-4 rounded-2xl bg-white p-3">
                  <QRCode value={link} size={200} label={b.reviewTitle} />
                </div>
                <p role="status" className="mt-4 text-sm font-semibold" style={{ color: upload === 'done' ? '#86efac' : '#fde68a' }}>
                  {upload === 'done' ? b.ready : upload === 'uploading' ? b.uploading : b.waiting}
                </p>
                <p className="mt-3 text-xs text-slate-400">{b.reviewOr}</p>
                <p className="mt-1 text-sm break-all text-slate-200">{link}</p>
                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      backToIdle();
                      startCountdown();
                    }}
                    className="h-12 rounded-full px-7 font-semibold"
                    style={buttonStyle}
                  >
                    {b.another}
                  </button>
                  <button type="button" onClick={backToIdle} className="h-12 rounded-full bg-white/15 px-7 font-semibold">
                    {b.done}
                  </button>
                </div>
                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/15" aria-hidden>
                  <div className="h-full rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${Math.max(0, (secondsLeft / cfg.reviewSeconds) * 100)}%`, background: accent }} />
                </div>
                <p className="mt-2 text-xs text-slate-400">{b.nextGuest(Math.max(0, secondsLeft))}</p>
              </div>
            </div>
          )}

          {/* Upload status, always visible so staff notice a problem */}
          <p
            className="pointer-events-none absolute bottom-2 left-3 rounded-full bg-black/60 px-3 py-1 text-xs"
            style={{ color: queueState.blocked ? '#fecaca' : queueState.pending ? '#fde68a' : '#cbd5e1', display: phase === 'review' ? 'none' : undefined }}
            role="status"
          >
            {b.queue(queueState.pending)}
          </p>
        </>
      )}

      {/* Staff entry: press and hold the top-right corner (or Shift+S) */}
      <button
        type="button"
        aria-label={b.staffOpen}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
        onPointerCancel={holdEnd}
        onClick={(e) => e.detail === 0 && setStaffOpen(true)}
        className="absolute top-0 right-0 z-10 h-16 w-16 opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
      />

      {staffOpen && event && (
        <div role="dialog" aria-modal="true" aria-label={b.staff} className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-ink shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">{b.staff}</h2>
              <button type="button" onClick={() => setStaffOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" autoFocus>
                <CloseIcon />
                <span className="sr-only">{b.close}</span>
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">{b.staffEvent}</dt>
              <dd className="font-semibold">{event.name}</dd>
              <dt className="text-muted">{b.staffMode}</dt>
              <dd className="font-semibold">{backend.mode === 'demo' ? b.modeDemo : b.modeLive}</dd>
              <dt className="text-muted">{b.staffShots}</dt>
              <dd className="font-semibold tabular-nums">{shots}</dd>
              <dt className="text-muted">{b.staffQueue}</dt>
              <dd className="font-semibold">{b.queue(queueState.pending)}</dd>
            </dl>
            {queueState.blocked && (
              <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                {queueState.blocked === 'quota_reached' ? b.staffBlockedQuota : b.staffBlockedEvent}
              </p>
            )}
            {frameFailed && (
              <p role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                {b.staffFrameFailed}
              </p>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => (fs.isFull ? fs.exit() : void fs.enter())} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line font-semibold hover:bg-surface">
                {fs.isFull ? <ShrinkIcon /> : <ExpandIcon />} {fs.isFull ? b.exitFullscreen : b.fullscreen}
              </button>
              <button type="button" onClick={switchCamera} disabled={!running} className="h-11 rounded-full border border-line font-semibold hover:bg-surface disabled:opacity-50">
                {b.switchCamera}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStaffOpen(false);
                  void loadEvent();
                }}
                className="h-11 rounded-full border border-line font-semibold hover:bg-surface"
              >
                {b.reload}
              </button>
              <button type="button" onClick={stopBooth} disabled={!running} className="h-11 rounded-full bg-navy-900 font-semibold text-white disabled:opacity-50">
                {b.stop}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
