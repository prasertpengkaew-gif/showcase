import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from '../i18n/Link';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { PageHeader } from '../components/PageHeader';
import { Button, buttonClasses } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { CameraStage, StageChip } from '../components/CameraStage';
import { AlertIcon, ArrowRightIcon, CameraIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { drawFaces, type FaceEffect, type MeshConnections } from '../lib/faceEffects';
import { drawEventFrame, type FrameTheme } from '../lib/eventFrames';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { useLanguage, useT } from '../i18n';

const MODEL_URL = '/models/face/face_landmarker.task';
const WASM_BASE = '/mediapipe';
const THEMES: FrameTheme[] = ['neon', 'gold', 'fest'];
type Filter = 'none' | Exclude<FaceEffect, 'mesh'>;
const FILTERS: Filter[] = ['none', 'glasses', 'crown'];
const NO_MESH: MeshConnections = { tesselation: [], contours: [] };
/** Smile score that counts as smiling, and how long it must be held to trigger the shutter. */
const SMILE_ON = 0.6;
const SMILE_OFF = 0.3;
const SMILE_HOLD_MS = 700;

type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | 'photo' | CameraProblem;
type Phase = 'live' | 'countdown' | 'review';

function smileScore(result: FaceLandmarkerResult) {
  const shapes = result.faceBlendshapes[0]?.categories ?? [];
  const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  return (score('mouthSmileLeft') + score('mouthSmileRight')) / 2;
}

export default function EventBooth() {
  const t = useT();
  const { lang } = useLanguage();
  const e = t.eventBooth;
  useDocumentTitle(e.metaTitle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const photoRef = useRef<{ image: ImageBitmap; result: FaceLandmarkerResult } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [theme, setTheme] = useState<FrameTheme>('neon');
  const [filter, setFilter] = useState<Filter>('glasses');
  // Until edited, the frame text follows the site language.
  const [titleInput, setTitle] = useState<string | null>(null);
  const [subtitleInput, setSubtitle] = useState<string | null>(null);
  const title = titleInput ?? e.defaultTitle;
  const subtitle =
    subtitleInput ?? new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const [smileToSnap, setSmileToSnap] = useState(true);
  const [phase, setPhase] = useState<Phase>('live');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [shots, setShots] = useState(0);
  const [faces, setFaces] = useState(0);
  const [smileHold, setSmileHold] = useState(0);

  // The render loop reads the latest settings through one ref instead of restarting.
  const live = useRef({ theme, filter, title, subtitle, smileToSnap, phase });
  live.current = { theme, filter, title, subtitle, smileToSnap, phase };

  const ensureLandmarker = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!landmarkerRef.current) {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const create = (delegate: 'GPU' | 'CPU') =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numFaces: 4,
          outputFaceBlendshapes: true,
        });
      landmarkerRef.current = await create('GPU').catch(() => create('CPU'));
    } else {
      await landmarkerRef.current.setOptions({ runningMode: mode });
    }
    return landmarkerRef.current;
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      window.clearInterval(timerRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  // Free the previous photo's memory when it is replaced or the page closes.
  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  const capture = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 350);
    canvasRef.current?.toBlob(
      (blob) => {
        if (!blob) return;
        setShot({ url: URL.createObjectURL(blob), blob });
        setShots((n) => n + 1);
        setPhase('review');
      },
      'image/jpeg',
      0.92,
    );
  }, []);

  const startCountdown = useCallback(() => {
    if (live.current.phase !== 'live') return;
    setPhase('countdown');
    live.current.phase = 'countdown';
    let n = 3;
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
  const startCountdownRef = useRef(startCountdown);
  startCountdownRef.current = startCountdown;

  /** Draws the uploaded photo with the current filter and frame. */
  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.image.width;
    canvas.height = photo.image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(photo.image, 0, 0);
    if (filter !== 'none') drawFaces(ctx, photo.result.faceLandmarks, filter, NO_MESH);
    drawEventFrame(ctx, theme, title, subtitle);
  }, [filter, theme, title, subtitle]);

  useEffect(() => {
    if (status === 'photo') renderPhoto();
  }, [status, renderPhoto]);

  const loop = (landmarker: FaceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
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
      const result = landmarker.detectForVideo(video, now);
      const s = live.current;

      // Crop the camera image to the shape of the stage (e.g. portrait in full screen on a phone),
      // so the frame always fits on screen and the saved photo is exactly what guests see.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const target = canvas.clientWidth && canvas.clientHeight ? canvas.clientWidth / canvas.clientHeight : vw / vh;
      const cw = Math.round(target < vw / vh ? vh * target : vw);
      const ch = Math.round(target < vw / vh ? vh : vw / target);
      const sx = (vw - cw) / 2;
      const sy = (vh - ch) / 2;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      // Mirror like a selfie camera; the frame is drawn unmirrored so its text reads correctly.
      ctx.setTransform(-1, 0, 0, 1, cw, 0);
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
      if (s.filter !== 'none') {
        const cropped = result.faceLandmarks.map((face) =>
          face.map((pt) => ({ ...pt, x: (pt.x * vw - sx) / cw, y: (pt.y * vh - sy) / ch })),
        );
        drawFaces(ctx, cropped, s.filter, NO_MESH);
      }
      drawEventFrame(ctx, s.theme, s.title, s.subtitle);

      // Smile to snap: hold a smile briefly; it re-arms only after the smile drops.
      const smile = result.faceLandmarks.length ? smileScore(result) : 0;
      if (smile < SMILE_OFF) armed = true;
      if (s.smileToSnap && s.phase === 'live' && armed && smile >= SMILE_ON) {
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

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    photoRef.current = null;
    setPhase('live');
    setShot(null);
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('loading');
      const landmarker = await ensureLandmarker('VIDEO');
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      loop(landmarker);
    } catch (err) {
      stopCamera();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Event booth failed to start', err);
      setStatus(problem);
    }
  };

  const onStop = () => {
    stopCamera();
    window.clearInterval(timerRef.current);
    setPhase('live');
    setFaces(0);
    setStatus('idle');
  };

  const onPhoto = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    stopCamera();
    window.clearInterval(timerRef.current);
    setPhase('live');
    setShot(null);
    try {
      setStatus('loading');
      const landmarker = await ensureLandmarker('IMAGE');
      const image = await createImageBitmap(file);
      const result = landmarker.detect(image);
      photoRef.current = { image, result };
      setFaces(result.faceLandmarks.length);
      setStatus('photo');
    } catch (err) {
      console.error('Event booth could not process the photo', err);
      setStatus('error');
    }
  };

  const retake = () => {
    setShot(null);
    setPhase('live');
  };

  const download = () => {
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot.url;
    a.download = `event-photo-${shots}.jpg`;
    a.click();
  };

  const shareFile = shot ? new File([shot.blob], `event-photo-${shots}.jpg`, { type: 'image/jpeg' }) : null;
  const canShare = !!shareFile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] });
  const share = () => {
    if (shareFile) navigator.share({ files: [shareFile], title }).catch(() => {});
  };

  const running = status === 'running';
  const showCanvas = running || status === 'photo';
  const busy = status === 'loading' || status === 'starting-camera';
  const f = t.face;
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: f.deniedTitle, text: f.deniedText },
    'no-camera': { title: f.noCameraTitle, text: f.noCameraText },
    insecure: { title: f.insecureTitle, text: f.insecureText },
    error: { title: f.errorTitle, text: f.errorText },
  };
  const problem = problems[status];
  const canShoot = showCanvas && phase === 'live';
  const onShutter = () => (status === 'photo' ? capture() : startCountdown());

  return (
    <>
      <PageHeader eyebrow={e.eyebrow} title={e.title} description={e.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <CameraStage
              label={e.stageLabel}
              available={showCanvas}
              captureLabel={e.shutter}
              onCapture={canShoot ? onShutter : undefined}
              fullscreenControls={
                phase === 'review'
                  ? undefined
                  : FILTERS.map((x) => (
                      <StageChip key={x} active={filter === x} onClick={() => setFilter(x)}>
                        {e.filters[x]}
                      </StageChip>
                    ))
              }
            >
              {(isFull) => (
                <>
                  <video ref={videoRef} className="hidden" playsInline muted />
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-x-0 top-0 w-full object-contain ${isFull ? 'h-[calc(100%-10rem)]' : 'h-full'} ${showCanvas ? '' : 'invisible'}`}
                    aria-hidden
                  />
                  {!showCanvas && (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                      {busy ? (
                        <div>
                          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                          <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? f.startingCamera : f.loadingModel}</p>
                        </div>
                      ) : (
                        <div className="max-w-sm">
                          <CameraIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                          <p className="mt-4 font-display text-lg font-bold">{e.idleTitle}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{e.idleText}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {running && phase === 'live' && smileToSnap && (
                    <p
                      role="status"
                      className="absolute top-3 left-3 z-[1] flex items-center gap-2 overflow-hidden rounded-full bg-navy-900/80 py-2 pr-4 pl-3 text-sm font-semibold text-white"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 bg-electric-600 transition-[width] duration-100"
                        style={{ width: `${smileHold * 100}%` }}
                      />
                      <span className="relative">{faces ? e.smileHint : e.noFace}</span>
                    </p>
                  )}

                  {phase === 'countdown' && count > 0 && (
                    <div className="absolute inset-0 z-[2] grid place-items-center" aria-live="assertive">
                      <span key={count} className="animate-countdown font-display text-[9rem] leading-none font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                        {count}
                      </span>
                    </div>
                  )}
                  {flash && <div aria-hidden className="animate-flash absolute inset-0 z-[3] bg-white" />}

                  {phase === 'review' && shot && (
                    <div className="absolute inset-0 z-[4] flex flex-col bg-navy-900 p-3 sm:p-4">
                      <img src={shot.url} alt={e.photoAlt(title)} className="min-h-0 flex-1 object-contain" />
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-[env(safe-area-inset-bottom)]">
                        <Button variant="secondary" onClick={retake}>
                          {e.retake}
                        </Button>
                        <Button onClick={download}>{e.download}</Button>
                        {canShare && (
                          <Button variant="secondary" onClick={share}>
                            {e.share}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CameraStage>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {running ? (
                <Button variant="secondary" onClick={onStop}>
                  {f.stopCamera}
                </Button>
              ) : (
                <Button onClick={start} disabled={busy || status === 'insecure'}>
                  {f.startCamera}
                </Button>
              )}
              <Button variant="ghost" onClick={onShutter} disabled={!canShoot}>
                <CameraIcon /> {e.shutter}
              </Button>
              <label className={`${buttonClasses('ghost')} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50`}>
                {f.uploadPhoto}
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={busy} />
              </label>
            </div>

            {problem && (
              <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertIcon className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{problem.title}</p>
                  <p className="mt-1 leading-relaxed">{problem.text}</p>
                </div>
              </div>
            )}
            <p className="mt-4 flex items-start gap-2 text-sm text-muted">
              <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {e.privacy}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{e.setupTitle}</h2>
              <label className="mt-4 block text-sm font-medium text-ink">
                {e.eventName}
                <input
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  maxLength={40}
                  className="mt-1.5 block h-11 w-full rounded-xl border border-line px-3.5 text-base focus:border-electric-600 focus:ring-2 focus:ring-electric-600/20 focus:outline-none"
                />
              </label>
              <label className="mt-4 block text-sm font-medium text-ink">
                {e.eventLine}
                <input
                  value={subtitle}
                  onChange={(ev) => setSubtitle(ev.target.value)}
                  maxLength={50}
                  className="mt-1.5 block h-11 w-full rounded-xl border border-line px-3.5 text-base focus:border-electric-600 focus:ring-2 focus:ring-electric-600/20 focus:outline-none"
                />
              </label>
              <p className="mt-2 text-xs text-muted">{e.setupNote}</p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{e.kioskTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{e.kioskText}</p>
              <Link to="/booth/demo" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-700 hover:underline">
                {e.kioskLink} <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <OptionChips legend={e.frame} options={THEMES} value={theme} onChange={setTheme} format={(x) => e.themes[x]} />
              <div className="mt-5">
                <OptionChips legend={e.filter} options={FILTERS} value={filter} onChange={setFilter} format={(x) => e.filters[x]} />
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={smileToSnap}
                  onChange={(ev) => setSmileToSnap(ev.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-electric-600"
                />
                <span>
                  <span className="font-semibold text-ink">{e.smileToSnap}</span>
                  <span className="mt-0.5 block text-muted">{e.smileToSnapText}</span>
                </span>
              </label>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm text-muted">{e.shotsLabel}</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink tabular-nums" aria-live="polite">
                {shots}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="event-addons-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="event-addons-title" className="font-display text-3xl font-bold">
            {e.addonsTitle}
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted">{e.addonsText}</p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {e.addons.map((a) => (
              <li key={a.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{a.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
