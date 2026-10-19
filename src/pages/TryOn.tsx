import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { PageHeader } from '../components/PageHeader';
import { Button, buttonClasses } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { AlertIcon, InfoIcon, ShirtIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { drawTryOn, type ShirtColor, type TryOnItem } from '../lib/tryOnEffects';
import { useT } from '../i18n';

const MODEL_URL = '/models/pose/pose_landmarker_lite.task';
const WASM_BASE = '/mediapipe';
const ITEMS: TryOnItem[] = ['hat', 'necklace', 'watch', 'shirt'];
const COLORS: ShirtColor[] = ['navy', 'blue', 'white'];

type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | 'photo' | CameraProblem;

export default function TryOn() {
  const t = useT();
  const o = t.tryOn;
  useDocumentTitle(o.metaTitle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const photoRef = useRef<{ image: ImageBitmap; result: PoseLandmarkerResult } | null>(null);

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [items, setItems] = useState<Set<TryOnItem>>(() => new Set(['hat', 'necklace', 'watch']));
  const [color, setColor] = useState<ShirtColor>('navy');
  const [people, setPeople] = useState(0);
  const itemsRef = useRef(items);
  const colorRef = useRef(color);
  itemsRef.current = items;
  colorRef.current = color;

  const ensureLandmarker = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!landmarkerRef.current) {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const create = (delegate: 'GPU' | 'CPU') =>
        vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numPoses: 2,
        });
      landmarkerRef.current = await create('GPU').catch(() => create('CPU'));
    } else {
      await landmarkerRef.current.setOptions({ runningMode: mode });
    }
    return landmarkerRef.current;
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.image.width;
    canvas.height = photo.image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(photo.image, 0, 0);
    setPeople(drawTryOn(ctx, photo.result.landmarks, itemsRef.current, colorRef.current));
  }, []);

  useEffect(() => {
    if (status === 'photo') renderPhoto();
  }, [items, color, status, renderPhoto]);

  const loop = (landmarker: PoseLandmarker) => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let lastTime = -1;
    let lastUi = 0;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (video.readyState < 2 || video.currentTime === lastTime) return;
      lastTime = video.currentTime;
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      // Mirror like a selfie camera; overlays are drawn in the same mirrored space.
      ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const count = drawTryOn(ctx, result.landmarks, itemsRef.current, colorRef.current, true);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (now - lastUi > 200) {
        lastUi = now;
        setPeople(count);
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
      if (problem === 'error') console.error('Try-on failed to start', err);
      setStatus(problem);
    }
  };

  const onStop = () => {
    stopCamera();
    setPeople(0);
    setStatus('idle');
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCamera();
    try {
      setStatus('loading');
      const landmarker = await ensureLandmarker('IMAGE');
      const image = await createImageBitmap(file);
      photoRef.current = { image, result: landmarker.detect(image) };
      setStatus('photo');
    } catch (err) {
      console.error('Try-on could not process the photo', err);
      setStatus('error');
    }
  };

  const savePhoto = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'thenerdstudio-try-on.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  };

  const toggleItem = (item: TryOnItem) =>
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });

  const live = status === 'running';
  const showCanvas = live || status === 'photo';
  const busy = status === 'loading' || status === 'starting-camera';
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: o.deniedTitle, text: o.deniedText },
    'no-camera': { title: o.noCameraTitle, text: o.noCameraText },
    insecure: { title: o.insecureTitle, text: o.insecureText },
    error: { title: o.errorTitle, text: o.errorText },
  };
  const problem = problems[status];

  return (
    <>
      <PageHeader eyebrow={o.eyebrow} title={o.title} description={o.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div
              role="region"
              aria-label={o.stageLabel}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-navy-900 sm:aspect-video"
            >
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 h-full w-full object-contain ${showCanvas ? '' : 'invisible'}`}
                aria-hidden
              />
              {!showCanvas && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                  {busy ? (
                    <div>
                      <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                      <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? o.startingCamera : o.loading}</p>
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <ShirtIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                      <p className="mt-4 font-display text-lg font-bold">{o.idleTitle}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{o.idleText}</p>
                    </div>
                  )}
                </div>
              )}
              {showCanvas && people === 0 && (
                <p role="status" className="absolute inset-x-4 bottom-4 rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white">
                  {status === 'photo' ? o.photoNoBody : o.noBody}
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {live ? (
                <Button variant="secondary" onClick={onStop}>
                  {o.stop}
                </Button>
              ) : (
                <Button onClick={start} disabled={busy || status === 'insecure'}>
                  {o.start}
                </Button>
              )}
              <label className={`${buttonClasses('ghost')} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50`}>
                {o.uploadPhoto}
                <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={busy} />
              </label>
              <Button variant="ghost" onClick={savePhoto} disabled={!showCanvas || people === 0}>
                {o.savePhoto}
              </Button>
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
              <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {o.privacy}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <fieldset className="rounded-2xl border border-line bg-white p-5">
              <legend className="sr-only">{o.items}</legend>
              <p aria-hidden className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
                {o.items}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ITEMS.map((item) => (
                  <label key={item} className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={items.has(item)}
                      onChange={() => toggleItem(item)}
                    />
                    <span className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors peer-checked:border-navy-900 peer-checked:bg-navy-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-electric-600 peer-focus-visible:ring-offset-2 hover:border-slate-300">
                      {o.itemNames[item]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-line bg-white p-5">
              <OptionChips
                legend={o.shirtColor}
                options={COLORS}
                value={color}
                onChange={setColor}
                format={(c) => o.colors[c]}
                disabled={!items.has('shirt')}
              />
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 text-sm">
              <p className="font-semibold text-ink">{o.honestTitle}</p>
              <ul className="mt-3 space-y-2 leading-relaxed text-slate-700">
                {o.honest.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="tryon-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="tryon-uses-title" className="font-display text-3xl font-bold">
            {o.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {o.uses.map((u) => (
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
