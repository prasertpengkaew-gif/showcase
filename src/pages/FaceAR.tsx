import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { PageHeader } from '../components/PageHeader';
import { Button, buttonClasses } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { CameraStage, StageChip } from '../components/CameraStage';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { drawFaces, headRoll, type FaceEffect, type MeshConnections } from '../lib/faceEffects';
import { useT } from '../i18n';
import { FaceGlyph } from '../components/FaceGlyph';

const MODEL_URL = '/models/face/face_landmarker.task';
const WASM_BASE = '/mediapipe';
const EFFECTS: FaceEffect[] = ['mesh', 'glasses', 'crown'];

type Status =
  | 'idle'
  | 'loading-model'
  | 'starting-camera'
  | 'running'
  | 'photo'
  | 'denied'
  | 'no-camera'
  | 'insecure'
  | 'error';

interface Metrics {
  faces: number;
  smile: number;
  blinkL: number;
  blinkR: number;
  mouth: number;
  tilt: number;
  fps: number;
}

const EMPTY_METRICS: Metrics = { faces: 0, smile: 0, blinkL: 0, blinkR: 0, mouth: 0, tilt: 0, fps: 0 };

function readMetrics(result: FaceLandmarkerResult, w: number, h: number, fps: number): Metrics {
  const face = result.faceLandmarks[0];
  const shapes = result.faceBlendshapes[0]?.categories ?? [];
  const score = (name: string) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
  return {
    faces: result.faceLandmarks.length,
    smile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2,
    blinkL: score('eyeBlinkLeft'),
    blinkR: score('eyeBlinkRight'),
    mouth: score('jawOpen'),
    tilt: face ? headRoll(face, w, h) : 0,
    fps,
  };
}

export default function FaceAR() {
  const t = useT();
  const f = t.face;
  useDocumentTitle(f.metaTitle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const connectionsRef = useRef<MeshConnections | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const effectRef = useRef<FaceEffect>('mesh');
  const photoRef = useRef<{ image: ImageBitmap; result: FaceLandmarkerResult } | null>(null);

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [effect, setEffect] = useState<FaceEffect>('mesh');
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [photoNoFace, setPhotoNoFace] = useState(false);

  effectRef.current = effect;

  /** Loads the WebAssembly runtime and face model once, on first use. */
  const ensureLandmarker = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!landmarkerRef.current) {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const create = (delegate: 'GPU' | 'CPU') =>
        vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numFaces: 2,
          outputFaceBlendshapes: true,
        });
      landmarkerRef.current = await create('GPU').catch(() => create('CPU'));
      const FL = vision.FaceLandmarker;
      connectionsRef.current = {
        tesselation: FL.FACE_LANDMARKS_TESSELATION,
        contours: [
          ...FL.FACE_LANDMARKS_FACE_OVAL,
          ...FL.FACE_LANDMARKS_LEFT_EYE,
          ...FL.FACE_LANDMARKS_RIGHT_EYE,
          ...FL.FACE_LANDMARKS_LEFT_EYEBROW,
          ...FL.FACE_LANDMARKS_RIGHT_EYEBROW,
          ...FL.FACE_LANDMARKS_LIPS,
        ],
      };
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

  // Stop the camera and free the model when leaving the page.
  useEffect(
    () => () => {
      stopCamera();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  /** Renders a still photo with the current effect (re-run when the effect changes). */
  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo || !connectionsRef.current) return;
    canvas.width = photo.image.width;
    canvas.height = photo.image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(photo.image, 0, 0);
    drawFaces(ctx, photo.result.faceLandmarks, effectRef.current, connectionsRef.current);
  }, []);

  useEffect(() => {
    if (status === 'photo') renderPhoto();
  }, [effect, status, renderPhoto]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    photoRef.current = null;
    setPhotoNoFace(false);
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('loading-model');
      const landmarker = await ensureLandmarker('VIDEO');
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      loop(landmarker);
    } catch (err) {
      stopCamera();
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') setStatus('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError')
        setStatus('no-camera');
      else {
        console.error('Face AR failed to start', err);
        setStatus('error');
      }
    }
  };

  const loop = (landmarker: FaceLandmarker) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d')!;
    let lastVideoTime = -1;
    let lastMetrics = 0;
    let frames = 0;
    let fpsWindowStart = performance.now();
    let fps = 0;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      // Mirror like a selfie camera; landmarks are drawn in the same mirrored space.
      ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawFaces(ctx, result.faceLandmarks, effectRef.current, connectionsRef.current!);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      frames++;
      if (now - fpsWindowStart >= 1000) {
        fps = (frames * 1000) / (now - fpsWindowStart);
        frames = 0;
        fpsWindowStart = now;
      }
      if (now - lastMetrics > 150) {
        lastMetrics = now;
        setMetrics(readMetrics(result, canvas.width, canvas.height, fps));
      }
    };
    tick();
  };

  const onStop = () => {
    stopCamera();
    setMetrics(EMPTY_METRICS);
    setStatus('idle');
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCamera();
    try {
      setStatus('loading-model');
      const landmarker = await ensureLandmarker('IMAGE');
      const image = await createImageBitmap(file);
      const result = landmarker.detect(image);
      photoRef.current = { image, result };
      setPhotoNoFace(result.faceLandmarks.length === 0);
      setMetrics(readMetrics(result, image.width, image.height, 0));
      setStatus('photo');
    } catch (err) {
      console.error('Face AR could not process the photo', err);
      setStatus('error');
    }
  };

  const savePhoto = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thenerdstudio-face-ar.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const live = status === 'running';
  const showCanvas = live || status === 'photo';
  const busy = status === 'loading-model' || status === 'starting-camera';
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  const message: { tone: 'info' | 'warn'; title: string; text: string } | null =
    status === 'denied'
      ? { tone: 'warn', title: f.deniedTitle, text: f.deniedText }
      : status === 'no-camera'
        ? { tone: 'warn', title: f.noCameraTitle, text: f.noCameraText }
        : status === 'insecure'
          ? { tone: 'warn', title: f.insecureTitle, text: f.insecureText }
          : status === 'error'
            ? { tone: 'warn', title: f.errorTitle, text: f.errorText }
            : null;

  return (
    <>
      <PageHeader eyebrow={f.eyebrow} title={f.title} description={f.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 id="face-stage-title" className="sr-only">
              {f.stageLabel}
            </h2>
            <CameraStage
              label={f.stageLabel}
              available={showCanvas}
              captureLabel={f.takePhoto}
              onCapture={showCanvas && metrics.faces > 0 ? savePhoto : undefined}
              fullscreenControls={EFFECTS.map((e) => (
                <StageChip key={e} active={effect === e} onClick={() => setEffect(e)}>
                  {f.effects[e]}
                </StageChip>
              ))}
            >
              {(isFull) => (
                <>
                  <video ref={videoRef} className="hidden" playsInline muted />
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 h-full w-full ${isFull && live ? 'object-cover' : 'object-contain'} ${showCanvas ? '' : 'invisible'}`}
                    aria-hidden
                  />
                  {!showCanvas && (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                      {busy ? (
                        <div>
                          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                          <p className="mt-4 text-sm text-slate-300">
                            {status === 'starting-camera' ? f.startingCamera : f.loadingModel}
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-sm">
                          <FaceGlyph />
                          <p className="mt-5 font-display text-lg font-bold">{f.idleTitle}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.idleText}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {busy && showCanvas && (
                    <p className="absolute top-4 left-4 rounded-full bg-navy-900/85 px-3 py-1.5 text-xs text-white" role="status">
                      {f.loadingModel}
                    </p>
                  )}
                  {live && metrics.faces === 0 && (
                    <p
                      role="status"
                      className={`absolute inset-x-4 ${isFull ? 'top-16' : 'bottom-4'} rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white`}
                    >
                      {f.noFace}
                    </p>
                  )}
                  {status === 'photo' && photoNoFace && (
                    <p
                      role="status"
                      className={`absolute inset-x-4 ${isFull ? 'top-16' : 'bottom-4'} rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white`}
                    >
                      {f.photoNoFace}
                    </p>
                  )}
                </>
              )}
            </CameraStage>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {live ? (
                <Button variant="secondary" onClick={onStop}>
                  {f.stopCamera}
                </Button>
              ) : (
                <Button onClick={startCamera} disabled={busy || status === 'insecure'}>
                  {f.startCamera}
                </Button>
              )}
              <label className={`${buttonClasses('ghost')} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50`}>
                {f.uploadPhoto}
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={busy} />
              </label>
              <Button variant="ghost" onClick={savePhoto} disabled={!showCanvas || metrics.faces === 0}>
                {f.takePhoto}
              </Button>
            </div>

            {message && (
              <div
                role="alert"
                className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
              >
                <AlertIcon className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">{message.title}</p>
                  <p className="mt-1 leading-relaxed">{message.text}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <OptionChips
                legend={f.effect}
                options={EFFECTS}
                value={effect}
                onChange={setEffect}
                format={(e) => f.effects[e]}
              />
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{f.metricsTitle}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <Metric label={f.faces} value={String(metrics.faces)} />
                <Metric label={f.fps} value={live ? metrics.fps.toFixed(0) : '—'} />
                <Metric label={f.smile} value={pct(metrics.smile)} bar={metrics.smile} />
                <Metric label={f.mouth} value={pct(metrics.mouth)} bar={metrics.mouth} />
                <Metric label={f.blinkL} value={pct(metrics.blinkL)} bar={metrics.blinkL} />
                <Metric label={f.blinkR} value={pct(metrics.blinkR)} bar={metrics.blinkR} />
                <Metric label={f.tilt} value={`${metrics.tilt.toFixed(0)}°`} />
              </dl>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
              <p className="flex items-center gap-2 font-semibold">
                <CheckIcon width={18} height={18} /> {f.privacyTitle}
              </p>
              <ul className="mt-3 space-y-1.5 leading-relaxed">
                {f.privacy.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="face-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="face-uses-title" className="font-display text-3xl font-bold">
            {f.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {f.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 flex items-start gap-2 text-sm text-muted">
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {f.note}
          </p>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 font-display text-lg font-bold text-ink tabular-nums">{value}</dd>
      {bar !== undefined && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="h-full rounded-full bg-electric-600 transition-[width] duration-150" style={{ width: `${bar * 100}%` }} />
        </div>
      )}
    </div>
  );
}
