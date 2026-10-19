import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { GestureRecognizer, GestureRecognizerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { PageHeader } from '../components/PageHeader';
import { Button, buttonClasses } from '../components/Button';
import { ModelViewer } from '../components/ModelViewer';
import { AlertIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { useModels, useT } from '../i18n';

const MODEL_URL = '/models/hand/gesture_recognizer.task';
const WASM_BASE = '/mediapipe';

/** MediaPipe gesture name → robot animation clip in robot.glb. */
const GESTURE_ANIMATION = {
  Open_Palm: 'Wave',
  Thumb_Up: 'ThumbsUp',
  Victory: 'Dance',
  Pointing_Up: 'Jump',
  Thumb_Down: 'No',
  Closed_Fist: 'Punch',
  ILoveYou: 'Yes',
} as const;
type Gesture = keyof typeof GESTURE_ANIMATION;
const GESTURES = Object.keys(GESTURE_ANIMATION) as Gesture[];
const EMOJI: Record<Gesture, string> = {
  Open_Palm: '✋',
  Thumb_Up: '👍',
  Victory: '✌️',
  Pointing_Up: '☝️',
  Thumb_Down: '👎',
  Closed_Fist: '✊',
  ILoveYou: '🤟',
};

const MIN_SCORE = 0.6;
/** A gesture must be held this many consecutive frames before the robot reacts. */
const HOLD_FRAMES = 4;
/** Return to idle this long after the hand is lowered. */
const IDLE_AFTER_MS = 1500;

type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | 'photo' | CameraProblem;

type Connection = { start: number; end: number };

function drawHands(ctx: CanvasRenderingContext2D, hands: NormalizedLandmark[][], connections: Connection[]) {
  const { width: w, height: h } = ctx.canvas;
  const s = Math.max(1, w / 900);
  for (const hand of hands) {
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 4 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const { start, end } of connections) {
      ctx.moveTo(hand[start].x * w, hand[start].y * h);
      ctx.lineTo(hand[end].x * w, hand[end].y * h);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (const p of hand) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const topGesture = (result: GestureRecognizerResult): { name: Gesture; score: number } | null => {
  const best = result.gestures[0]?.[0];
  if (!best || best.score < MIN_SCORE || !(best.categoryName in GESTURE_ANIMATION)) return null;
  return { name: best.categoryName as Gesture, score: best.score };
};

export default function HandGestures() {
  const t = useT();
  const g = t.hands;
  useDocumentTitle(g.metaTitle);
  const models = useModels();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const connectionsRef = useRef<Connection[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [gesture, setGesture] = useState<{ name: Gesture; score: number } | null>(null);
  const [handVisible, setHandVisible] = useState(false);
  const [animation, setAnimation] = useState<string>('Idle');
  const [photoNone, setPhotoNone] = useState(false);

  const ensureRecognizer = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!recognizerRef.current) {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      const create = (delegate: 'GPU' | 'CPU') =>
        vision.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: mode,
          numHands: 1,
        });
      recognizerRef.current = await create('GPU').catch(() => create('CPU'));
      connectionsRef.current = vision.GestureRecognizer.HAND_CONNECTIONS;
    } else {
      await recognizerRef.current.setOptions({ runningMode: mode });
    }
    return recognizerRef.current;
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
      recognizerRef.current?.close();
      recognizerRef.current = null;
    },
    [stopCamera],
  );

  const loop = (recognizer: GestureRecognizer) => {
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let lastTime = -1;
    let candidate: Gesture | null = null;
    let streak = 0;
    let active: Gesture | null = null;
    let lastSeen = 0;
    let lastUi = 0;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (video.readyState < 2 || video.currentTime === lastTime) return;
      lastTime = video.currentTime;
      const now = performance.now();
      const result = recognizer.recognizeForVideo(video, now);

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      drawHands(ctx, result.landmarks, connectionsRef.current);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const top = topGesture(result);
      if (top) {
        lastSeen = now;
        streak = top.name === candidate ? streak + 1 : 1;
        candidate = top.name;
        if (streak >= HOLD_FRAMES && active !== top.name) {
          active = top.name;
          setAnimation(GESTURE_ANIMATION[top.name]);
        }
      } else if (active && now - lastSeen > IDLE_AFTER_MS) {
        active = null;
        candidate = null;
        setAnimation('Idle');
      }
      if (now - lastUi > 120) {
        lastUi = now;
        setGesture(top);
        setHandVisible(result.landmarks.length > 0);
      }
    };
    tick();
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    setPhotoNone(false);
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('loading');
      const recognizer = await ensureRecognizer('VIDEO');
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      loop(recognizer);
    } catch (err) {
      stopCamera();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Hand tracking failed to start', err);
      setStatus(problem);
    }
  };

  const onStop = () => {
    stopCamera();
    setStatus('idle');
    setGesture(null);
    setHandVisible(false);
    setAnimation('Idle');
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    stopCamera();
    try {
      setStatus('loading');
      const recognizer = await ensureRecognizer('IMAGE');
      const image = await createImageBitmap(file);
      const result = recognizer.recognize(image);
      const canvas = canvasRef.current!;
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      drawHands(ctx, result.landmarks, connectionsRef.current);
      const top = topGesture(result);
      setGesture(top);
      setHandVisible(result.landmarks.length > 0);
      setPhotoNone(!top);
      setAnimation(top ? GESTURE_ANIMATION[top.name] : 'Idle');
      setStatus('photo');
    } catch (err) {
      console.error('Hand tracking could not process the photo', err);
      setStatus('error');
    }
  };

  const live = status === 'running';
  const showCanvas = live || status === 'photo';
  const busy = status === 'loading' || status === 'starting-camera';
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: g.deniedTitle, text: g.deniedText },
    'no-camera': { title: g.noCameraTitle, text: g.noCameraText },
    insecure: { title: g.insecureTitle, text: g.insecureText },
    error: { title: g.errorTitle, text: g.errorText },
  };
  const problem = problems[status];

  return (
    <>
      <PageHeader eyebrow={g.eyebrow} title={g.title} description={g.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid gap-6 lg:grid-cols-2">
          <div>
            <div
              role="region"
              aria-label={g.stageLabel}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-navy-900"
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
                      <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? g.startingCamera : g.loading}</p>
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <p className="text-5xl" aria-hidden>
                        ✋
                      </p>
                      <p className="mt-4 font-display text-lg font-bold">{g.idleTitle}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{g.idleText}</p>
                    </div>
                  )}
                </div>
              )}
              {showCanvas && (
                <p
                  role="status"
                  aria-live="polite"
                  className="absolute inset-x-4 bottom-4 rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white"
                >
                  {gesture
                    ? `${g.detected}: ${EMOJI[gesture.name]} ${g.gestures[gesture.name].split(' — ')[0]} (${Math.round(gesture.score * 100)}%)`
                    : status === 'photo' && photoNone
                      ? g.photoNone
                      : handVisible
                        ? g.none
                        : g.noHand}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {live ? (
                <Button variant="secondary" onClick={onStop}>
                  {g.stop}
                </Button>
              ) : (
                <Button onClick={start} disabled={busy || status === 'insecure'}>
                  {g.start}
                </Button>
              )}
              <label className={`${buttonClasses('ghost')} cursor-pointer has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50`}>
                {g.uploadPhoto}
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
              <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {g.privacy}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <ModelViewer
              model={models.robot}
              animation={animation}
              ar={false}
              controls={false}
              autoRotate={false}
              lazy={false}
              label={g.robotLabel}
              className="h-[340px] sm:h-[420px]"
            />
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{g.gesturesTitle}</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {GESTURES.map((name) => {
                  const active = animation === GESTURE_ANIMATION[name];
                  return (
                    <li
                      key={name}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        active ? 'bg-electric-600 text-white' : 'bg-surface text-slate-700'
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {EMOJI[name]}
                      </span>
                      {g.gestures[name]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="hand-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="hand-uses-title" className="font-display text-3xl font-bold">
            {g.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {g.uses.map((u) => (
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
