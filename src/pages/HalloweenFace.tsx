import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import type { FaceLandmarker, FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { DemoShell } from '../components/DemoShell';
import { Button, buttonClasses } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { CameraStage, StageChip } from '../components/CameraStage';
import { AlertIcon, ArrowRightIcon, CameraIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { createFaceLandmarker } from '../lib/faceLandmarker';
import { drawHalloweenFaces, drawHalloweenFrame, HALLOWEEN_LOOKS, type HalloweenLook } from '../lib/halloweenFace';
import { useT } from '../i18n';

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

/** Keeps a phone photo from becoming a multi-megapixel canvas the filter has to redraw. */
async function loadPhoto(file: File) {
  const source = await createImageBitmap(file);
  const maxEdge = 1280;
  const edge = Math.max(source.width, source.height);
  if (edge <= maxEdge) return source;
  const scale = maxEdge / edge;
  const image = await createImageBitmap(source, {
    resizeWidth: Math.round(source.width * scale),
    resizeHeight: Math.round(source.height * scale),
    resizeQuality: 'high',
  });
  source.close();
  return image;
}

export default function HalloweenFace() {
  const t = useT();
  const d = t.halloweenFace;
  const f = t.face;
  useDocumentTitle(d.metaTitle);
  const reduced = usePrefersReducedMotion();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);
  const photoRef = useRef<{ image: ImageBitmap; faces: NormalizedLandmark[][] } | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [look, setLook] = useState<HalloweenLook>('pumpkin');
  const [smileToSnap, setSmileToSnap] = useState(true);
  const [phase, setPhase] = useState<Phase>('live');
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [shots, setShots] = useState(0);
  const [faces, setFaces] = useState(0);
  const [smileHold, setSmileHold] = useState(0);

  const live = useRef({ look, smileToSnap, phase, frameTitle: d.frameTitle, frameLine: d.frameLine });
  live.current = { look, smileToSnap, phase, frameTitle: d.frameTitle, frameLine: d.frameLine };

  const ensureLandmarker = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!landmarkerRef.current) landmarkerRef.current = await createFaceLandmarker(mode, 2);
    else await landmarkerRef.current.setOptions({ runningMode: mode });
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
      photoRef.current?.image.close();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  const paint = useCallback((ctx: CanvasRenderingContext2D, mirror: boolean, faceList: NormalizedLandmark[][]) => {
    const view = live.current;
    if (mirror) ctx.setTransform(-1, 0, 0, 1, ctx.canvas.width, 0);
    drawHalloweenFaces(ctx, faceList, view.look);
    drawHalloweenFrame(ctx, view.frameTitle, view.frameLine, reducedRef.current ? 0 : performance.now());
  }, []);

  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.image.width;
    canvas.height = photo.image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(photo.image, 0, 0);
    paint(ctx, false, photo.faces);
  }, [paint]);

  useEffect(() => {
    if (status === 'photo' && phase === 'live') renderPhoto();
  }, [status, phase, look, d.frameTitle, d.frameLine, renderPhoto]);

  const capture = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 350);
    const canvas = canvasRef.current;
    if (!canvas) {
      setPhase('live');
      live.current.phase = 'live';
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setPhase('live');
          live.current.phase = 'live';
          return;
        }
        setShot({ url: URL.createObjectURL(blob), blob });
        setShots((n) => n + 1);
        setPhase('review');
        live.current.phase = 'review';
      },
      'image/jpeg',
      0.92,
    );
  }, []);

  const startCountdown = useCallback(() => {
    if (live.current.phase !== 'live') return;
    if (status === 'photo') {
      live.current.phase = 'countdown';
      setPhase('countdown');
      capture();
      return;
    }
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
  }, [capture, status]);
  const startCountdownRef = useRef(startCountdown);
  startCountdownRef.current = startCountdown;

  const loop = (landmarker: FaceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let lastVideoTime = -1;
    let lastUi = 0;
    let smileSince = 0;
    let armed = true;
    let skip = 0;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (live.current.phase === 'review') return;
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      if (skip > 0) {
        skip -= 1;
        lastVideoTime = video.currentTime;
        return;
      }
      lastVideoTime = video.currentTime;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const started = performance.now();
      const result = landmarker.detectForVideo(video, started);
      if (performance.now() - started > 42) skip = 1;

      const target = canvas.clientWidth && canvas.clientHeight ? canvas.clientWidth / canvas.clientHeight : vw / vh;
      const cw = Math.max(2, Math.round(target < vw / vh ? vh * target : vw));
      const ch = Math.max(2, Math.round(target < vw / vh ? vh : vw / target));
      const sx = (vw - cw) / 2;
      const sy = (vh - ch) / 2;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.setTransform(-1, 0, 0, 1, cw, 0);
      ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
      const cropped = result.faceLandmarks.map((face) =>
        face.map((pt) => ({ ...pt, x: (pt.x * vw - sx) / cw, y: (pt.y * vh - sy) / ch })),
      );
      paint(ctx, true, cropped);

      const smile = result.faceLandmarks.length ? smileScore(result) : 0;
      const now = performance.now();
      if (smile < SMILE_OFF) armed = true;
      const settings = live.current;
      if (settings.smileToSnap && settings.phase === 'live' && armed && smile >= SMILE_ON) {
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

  const openCamera = async () => {
    const base = { audio: false as const };
    try {
      return await navigator.mediaDevices.getUserMedia({
        ...base,
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name !== 'OverconstrainedError' && name !== 'NotFoundError') throw err;
      return navigator.mediaDevices.getUserMedia({ ...base, video: { width: { ideal: 960 }, height: { ideal: 720 } } });
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    photoRef.current?.image.close();
    photoRef.current = null;
    setPhase('live');
    setShot(null);
    try {
      setStatus('starting-camera');
      const stream = await openCamera();
      streamRef.current = stream;
      setStatus('loading');
      const landmarker = await ensureLandmarker('VIDEO');
      await document.fonts.ready;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      loop(landmarker);
    } catch (err) {
      stopCamera();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Halloween face filters failed to start', err);
      setStatus(problem);
    }
  };

  const onStop = () => {
    stopCamera();
    window.clearInterval(timerRef.current);
    setPhase('live');
    setFaces(0);
    setSmileHold(0);
    setShot(null);
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
    photoRef.current?.image.close();
    photoRef.current = null;
    try {
      setStatus('loading');
      const landmarker = await ensureLandmarker('IMAGE');
      await document.fonts.ready;
      const image = await loadPhoto(file);
      const result = landmarker.detect(image);
      photoRef.current = { image, faces: result.faceLandmarks };
      setFaces(result.faceLandmarks.length);
      setStatus('photo');
    } catch (err) {
      console.error('Halloween face filters could not process the photo', err);
      setStatus('error');
    }
  };

  const retake = () => {
    setShot(null);
    setPhase('live');
    live.current.phase = 'live';
  };

  const download = () => {
    if (!shot) return;
    const a = document.createElement('a');
    a.href = shot.url;
    a.download = 'halloween-face.jpg';
    a.click();
  };

  const shareFile = shot ? new File([shot.blob], 'halloween-face.jpg', { type: 'image/jpeg' }) : null;
  const canShare = !!shareFile && typeof navigator.canShare === 'function' && navigator.canShare({ files: [shareFile] });
  const share = () => {
    if (shareFile) navigator.share({ files: [shareFile], title: d.frameTitle }).catch(() => {});
  };

  const running = status === 'running';
  const showCanvas = (running || status === 'photo') && phase !== 'review';
  const busy = status === 'loading' || status === 'starting-camera';
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: f.deniedTitle, text: f.deniedText },
    'no-camera': { title: f.noCameraTitle, text: f.noCameraText },
    insecure: { title: f.insecureTitle, text: f.insecureText },
    error: { title: f.errorTitle, text: f.errorText },
  };
  const problem = problems[status];
  const canShoot = (running || status === 'photo') && phase === 'live' && faces > 0;

  return (
    <DemoShell d={d}>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <CameraStage
            label={d.stageLabel}
            available={running || status === 'photo'}
            captureLabel={d.shutter}
            onCapture={canShoot ? startCountdown : undefined}
            fullscreenControls={
              phase === 'review'
                ? undefined
                : HALLOWEEN_LOOKS.map((id) => (
                    <StageChip key={id} active={look === id} onClick={() => setLook(id)}>
                      {d.looks[id]}
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
                {!showCanvas && phase !== 'review' && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                    {busy ? (
                      <div>
                        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-orange-400" />
                        <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? f.startingCamera : f.loadingModel}</p>
                      </div>
                    ) : (
                      <div className="max-w-sm">
                        <CameraIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                        <p className="mt-4 font-display text-lg font-bold">{d.idleTitle}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{d.idleText}</p>
                      </div>
                    )}
                  </div>
                )}

                {running && phase === 'live' && faces === 0 && (
                  <p role="status" className={`absolute inset-x-4 ${isFull ? 'top-16' : 'top-3'} z-[1] rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white`}>
                    {d.noFace}
                  </p>
                )}
                {running && phase === 'live' && faces > 0 && smileToSnap && (
                  <p
                    role="status"
                    className="absolute top-3 left-3 z-[1] flex items-center gap-2 overflow-hidden rounded-full bg-navy-900/80 py-2 pr-4 pl-3 text-sm font-semibold text-white"
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0 bg-orange-500 transition-[width] duration-100" style={{ width: `${smileHold * 100}%` }} />
                    <span className="relative">{d.smileHint}</span>
                  </p>
                )}
                {status === 'photo' && faces === 0 && phase === 'live' && (
                  <p role="status" className="absolute inset-x-4 bottom-4 z-[1] rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white">
                    {d.photoNoFace}
                  </p>
                )}
                {phase === 'countdown' && count > 0 && (
                  <div className="absolute inset-0 z-[2] grid place-items-center" aria-live="assertive">
                    <span className="sr-only">{d.countLabel}</span>
                    <span key={count} className="animate-countdown font-display text-[9rem] leading-none font-extrabold text-amber-100 drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
                      {count}
                    </span>
                  </div>
                )}
                {flash && <div aria-hidden className="animate-flash absolute inset-0 z-[3] bg-white" />}
                {phase === 'review' && shot && (
                  <div className="absolute inset-0 z-[4] flex flex-col bg-navy-900 p-3 sm:p-4">
                    <img src={shot.url} alt={d.photoAlt} className="min-h-0 flex-1 object-contain" />
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-[env(safe-area-inset-bottom)]">
                      <Button variant="secondary" onClick={retake}>{d.retake}</Button>
                      <Button onClick={download}>{d.download}</Button>
                      {canShare && (
                        <Button variant="secondary" onClick={share}>{d.share}</Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CameraStage>

          <div className="mt-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
            <OptionChips legend={d.lookLegend} options={HALLOWEEN_LOOKS} value={look} onChange={setLook} format={(id) => d.looks[id]} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {running ? (
              <Button variant="secondary" onClick={onStop}>{f.stopCamera}</Button>
            ) : (
              <Button onClick={start} disabled={busy || status === 'insecure'}>{f.startCamera}</Button>
            )}
            <Button variant="ghost" onClick={startCountdown} disabled={!canShoot}>
              <CameraIcon /> {d.shutter}
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
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {d.privacy}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="rounded-2xl border border-line bg-white p-5">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={smileToSnap}
                onChange={(ev) => setSmileToSnap(ev.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-electric-600"
              />
              <span>
                <span className="font-semibold text-ink">{d.smileToSnap}</span>
                <span className="mt-0.5 block text-muted">{d.smileToSnapText}</span>
              </span>
            </label>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{d.photosLabel}</p>
            <p className="mt-1 font-display text-3xl font-bold text-ink tabular-nums" aria-live="polite">{shots}</p>
            <div className="mt-4 flex flex-col items-start gap-2 text-sm font-semibold">
              <Link to="/halloween-gate" className="inline-flex min-h-11 items-center gap-1.5 text-electric-700 hover:underline">
                {d.gateLink} <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link to="/face-ar" className="inline-flex min-h-11 items-center gap-1.5 text-electric-700 hover:underline">
                {d.trackingLink} <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
