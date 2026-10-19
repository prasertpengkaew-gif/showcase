import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { PageHeader } from '../components/PageHeader';
import { CameraStage } from '../components/CameraStage';
import { Button } from '../components/Button';
import { AlertIcon, GamepadIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { CatchGame, POINTS, type Hand } from '../lib/catchGame';
import { useT } from '../i18n';

const MODEL_URL = '/models/pose/pose_landmarker_lite.task';
const WASM_BASE = '/mediapipe';
const STORAGE_KEY = 'motion-game-scores';
const POINTER_W = 1280;
const POINTER_H = 720;
/** Hold both hands above the head this long to start a round hands-free. */
const RAISE_HOLD_MS = 800;

type Input = 'none' | 'camera' | 'pointer';
type Status = 'idle' | 'loading' | 'starting-camera' | 'ready' | CameraProblem;
type Phase = 'ready' | 'countdown' | 'playing' | 'over';
interface Score {
  name: string;
  score: number;
}

function loadScores(): Score[] {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Score[];
    return Array.isArray(s) ? s.filter((x) => typeof x.score === 'number').slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveScores(s: Score[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // The board then lasts for this visit only.
  }
}

export default function MotionGame() {
  const t = useT();
  const g = t.game;
  useDocumentTitle(g.metaTitle);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const gameRef = useRef<CatchGame | null>(null);
  const pointerRef = useRef<Hand | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const [input, setInput] = useState<Input>('none');
  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState(0);
  const [hud, setHud] = useState({ score: 0, time: 30 });
  const [result, setResult] = useState<{ score: number; caught: number } | null>(null);
  const [scores, setScores] = useState<Score[]>(loadScores);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);
  const [raise, setRaise] = useState(0);

  const live = useRef({ phase, input });
  live.current = { phase, input };

  const startCountdown = useCallback(() => {
    if (live.current.phase === 'countdown' || live.current.phase === 'playing') return;
    live.current.phase = 'countdown';
    setPhase('countdown');
    setResult(null);
    setSaved(false);
    let n = 3;
    setCount(n);
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      n -= 1;
      if (n > 0) return setCount(n);
      window.clearInterval(timerRef.current);
      const canvas = canvasRef.current!;
      gameRef.current = new CatchGame(canvas.width, canvas.height);
      live.current.phase = 'playing';
      setPhase('playing');
    }, 1000);
  }, []);
  const startRef = useRef(startCountdown);
  startRef.current = startCountdown;

  const finish = useCallback((game: CatchGame) => {
    live.current.phase = 'over';
    setPhase('over');
    setResult({ score: game.score, caught: game.caught });
  }, []);
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopLoop();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopLoop],
  );

  /** One loop for both inputs: read the hands, advance the game, draw. */
  const run = (landmarker: PoseLandmarker | null) => {
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    const ctx = canvas.getContext('2d')!;
    let last = performance.now();
    let lastVideoTime = -1;
    let hands: Hand[] = [];
    let raisedSince = 0;
    let lastUi = 0;
    let overAt = 0;
    // Draws the catchers between rounds.
    const idle = new CatchGame(canvas.width, canvas.height);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const { phase: ph } = live.current;

      if (landmarker) {
        if (video.readyState < 2) return;
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          gameRef.current?.resize(canvas.width, canvas.height);
        }
        const w = canvas.width;
        const h = canvas.height;
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          const pose = landmarker.detectForVideo(video, now).landmarks[0];
          hands = [];
          let raised = false;
          if (pose) {
            // Hand centre ≈ between wrist and index knuckle; mirrored like a selfie camera.
            for (const [wi, ii] of [
              [15, 19],
              [16, 20],
            ]) {
              const wr = pose[wi];
              const ix = pose[ii];
              if ((wr.visibility ?? 1) > 0.5) hands.push({ x: (1 - (wr.x + ix.x) / 2) * w, y: ((wr.y + ix.y) / 2) * h });
            }
            const nose = pose[0];
            raised = hands.length === 2 && pose[15].y < nose.y && pose[16].y < nose.y;
          }
          // Raise both hands to start, also after a round (with a short pause so it isn't instant).
          const canStart = ph === 'ready' || (ph === 'over' && now - overAt > 3000);
          if (raised && canStart) {
            raisedSince ||= now;
            if (now - raisedSince > RAISE_HOLD_MS) {
              raisedSince = 0;
              startRef.current();
            }
          } else raisedSince = 0;
        }
        ctx.setTransform(-1, 0, 0, 1, w, 0);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(11,18,32,0.35)';
        ctx.fillRect(0, 0, w, h);
      } else {
        const w = canvas.width;
        const h = canvas.height;
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#0B1220');
        bg.addColorStop(1, '#1e3a8a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        hands = pointerRef.current ? [pointerRef.current] : [];
      }

      const game = gameRef.current;
      if (game && ph === 'playing') {
        game.step(dt, hands);
        if (game.over) {
          overAt = now;
          finishRef.current(game);
        }
      }
      if (game && (ph === 'playing' || ph === 'over')) game.draw(ctx, hands);
      else {
        idle.resize(canvas.width, canvas.height);
        idle.draw(ctx, hands);
      }

      if (now - lastUi > 100) {
        lastUi = now;
        setHud({ score: game?.score ?? 0, time: Math.ceil(game?.timeLeft ?? 30) });
        setRaise(raisedSince ? Math.min(1, (now - raisedSince) / RAISE_HOLD_MS) : 0);
      }
    };
    tick();
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    stopLoop();
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('loading');
      if (!landmarkerRef.current) {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const create = (delegate: 'GPU' | 'CPU') =>
          vision.PoseLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: 'VIDEO',
            numPoses: 1,
          });
        landmarkerRef.current = await create('GPU').catch(() => create('CPU'));
      }
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setInput('camera');
      setStatus('ready');
      setPhase('ready');
      run(landmarkerRef.current);
    } catch (err) {
      stopLoop();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Motion game failed to start', err);
      setStatus(problem);
    }
  };

  const startPointer = () => {
    stopLoop();
    const canvas = canvasRef.current!;
    canvas.width = POINTER_W;
    canvas.height = POINTER_H;
    pointerRef.current = { x: POINTER_W / 2, y: POINTER_H * 0.8 };
    setInput('pointer');
    setPhase('ready');
    run(null);
    canvas.parentElement?.focus();
  };

  const onStop = () => {
    stopLoop();
    gameRef.current = null;
    setInput('none');
    setPhase('ready');
    setStatus('idle');
  };

  /** Pointer position in canvas pixels, accounting for the letterboxing of object-contain. */
  const onPointer = (e: PointerEvent<HTMLCanvasElement>) => {
    if (live.current.input !== 'pointer') return;
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    const scale = Math.min(rect.width / c.width, rect.height / c.height);
    const ox = (rect.width - c.width * scale) / 2;
    const oy = (rect.height - c.height * scale) / 2;
    pointerRef.current = { x: (e.clientX - rect.left - ox) / scale, y: (e.clientY - rect.top - oy) / scale };
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const p = pointerRef.current;
    if (input !== 'pointer' || !p) return;
    const step = POINTER_W * 0.05;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      pointerRef.current = {
        x: Math.min(POINTER_W, Math.max(0, p.x + m[0])),
        y: Math.min(POINTER_H, Math.max(0, p.y + m[1])),
      };
    } else if ((e.key === ' ' || e.key === 'Enter') && e.target === e.currentTarget && (phase === 'ready' || phase === 'over')) {
      e.preventDefault();
      startCountdown();
    }
  };

  const qualifies = !!result && result.score > 0 && (scores.length < 5 || result.score > scores[scores.length - 1].score);
  const saveScore = () => {
    if (!result) return;
    const entry = { name: name.trim() || g.anonymous, score: result.score };
    const next = [...scores, entry].sort((a, b) => b.score - a.score).slice(0, 5);
    setScores(next);
    saveScores(next);
    setSaved(true);
  };
  const clearScores = () => {
    setScores([]);
    saveScores([]);
  };

  const active = input !== 'none';
  const busy = status === 'loading' || status === 'starting-camera';
  const f = t.face;
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: f.deniedTitle, text: g.cameraFallback },
    'no-camera': { title: f.noCameraTitle, text: g.cameraFallback },
    insecure: { title: f.insecureTitle, text: g.cameraFallback },
    error: { title: g.errorTitle, text: g.cameraFallback },
  };
  const problem = problems[status];

  return (
    <>
      <PageHeader eyebrow={g.eyebrow} title={g.title} description={g.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div>
            <CameraStage
              label={g.stageLabel}
              available={active}
              captureLabel={g.play}
              onCapture={active && (phase === 'ready' || phase === 'over') ? startCountdown : undefined}
            >
              {() => (
                // A focusable wrapper so keyboard players can steer with the arrow keys.
                <div
                  tabIndex={active && input === 'pointer' ? 0 : -1}
                  onKeyDown={onKey}
                  aria-label={input === 'pointer' ? g.keyboardHint : undefined}
                  className="absolute inset-0 outline-none focus-visible:ring-4 focus-visible:ring-electric-500 focus-visible:ring-inset"
                >
                  <video ref={videoRef} className="hidden" playsInline muted />
                  <canvas
                    ref={canvasRef}
                    onPointerMove={onPointer}
                    onPointerDown={onPointer}
                    className={`absolute inset-0 h-full w-full object-contain ${input === 'pointer' ? 'touch-none' : ''} ${active ? '' : 'invisible'}`}
                    aria-hidden
                  />
                  {!active && (
                    <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                      {busy ? (
                        <div>
                          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                          <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? f.startingCamera : g.loading}</p>
                        </div>
                      ) : (
                        <div className="max-w-sm">
                          <GamepadIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                          <p className="mt-4 font-display text-lg font-bold">{g.idleTitle}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{g.idleText}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {active && (
                    <div className="pointer-events-none absolute top-3 left-3 z-[1] flex gap-2">
                      <p className="rounded-full bg-navy-900/85 px-4 py-2 text-sm font-semibold text-white tabular-nums">
                        {g.score}: {hud.score}
                      </p>
                      <p className="rounded-full bg-navy-900/85 px-4 py-2 text-sm font-semibold text-white tabular-nums">
                        {g.time}: {phase === 'playing' ? hud.time : 30}
                      </p>
                    </div>
                  )}

                  {active && phase === 'ready' && (
                    <div className="pointer-events-none absolute inset-x-4 bottom-24 z-[1] mx-auto max-w-md overflow-hidden rounded-xl bg-navy-900/85 text-center text-white sm:bottom-6">
                      <span aria-hidden className="absolute inset-y-0 left-0 bg-electric-600" style={{ width: `${raise * 100}%` }} />
                      <p role="status" className="relative px-4 py-3 text-sm font-semibold">
                        {input === 'camera' ? g.raiseToStart : g.pointerToStart}
                      </p>
                    </div>
                  )}

                  {phase === 'countdown' && count > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-[2] grid place-items-center" aria-live="assertive">
                      <span
                        key={count}
                        className="animate-countdown font-display text-[9rem] leading-none font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                      >
                        {count}
                      </span>
                    </div>
                  )}

                  {phase === 'over' && result && (
                    <div className="absolute inset-0 z-[3] grid place-items-center bg-navy-900/80 p-4 text-center text-white">
                      <div className="w-full max-w-sm">
                        <p className="text-sm font-semibold tracking-[0.14em] text-slate-300 uppercase">{g.timeUp}</p>
                        <p role="status" className="mt-2 font-display text-6xl font-extrabold tabular-nums">
                          {result.score}
                          <span className="sr-only"> {g.points}</span>
                        </p>
                        <p className="mt-1 text-sm text-slate-300">{g.caught(result.caught)}</p>
                        {qualifies && !saved && (
                          <form
                            className="mt-5 flex gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveScore();
                            }}
                          >
                            <label className="sr-only" htmlFor="game-name">
                              {g.yourName}
                            </label>
                            <input
                              id="game-name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              maxLength={16}
                              placeholder={g.yourName}
                              className="h-11 min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-base text-white placeholder:text-slate-400 focus:border-white focus:outline-none"
                            />
                            <Button type="submit">{g.save}</Button>
                          </form>
                        )}
                        {saved && <p className="mt-4 text-sm font-semibold text-emerald-300">{g.saved}</p>}
                        <div className="mt-5">
                          <Button onClick={startCountdown}>{g.playAgain}</Button>
                        </div>
                        {input === 'camera' && <p className="mt-3 text-xs text-slate-300">{g.raiseAgain}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CameraStage>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {active ? (
                <>
                  <Button onClick={startCountdown} disabled={phase === 'countdown' || phase === 'playing'}>
                    {g.play}
                  </Button>
                  <Button variant="secondary" onClick={onStop}>
                    {g.stop}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={startCamera} disabled={busy || status === 'insecure'}>
                    {g.startCamera}
                  </Button>
                  <Button variant="ghost" onClick={startPointer} disabled={busy}>
                    {g.playPointer}
                  </Button>
                </>
              )}
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
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{g.howTitle}</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {(['star', 'gem', 'bomb'] as const).map((k) => (
                  <li key={k} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 rounded-full bg-surface py-1 text-center font-semibold tabular-nums">
                      {POINTS[k] > 0 ? `+${POINTS[k]}` : POINTS[k]}
                    </span>
                    {g.items[k]}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-muted">{g.howText}</p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{g.boardTitle}</h2>
              {scores.length ? (
                <ol className="mt-3 divide-y divide-line">
                  {scores.map((s, i) => (
                    <li key={`${s.name}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                      <span className="w-6 font-display font-bold text-muted">{i + 1}</span>
                      <span className="flex-1 truncate font-medium text-ink">{s.name}</span>
                      <span className="font-display font-bold tabular-nums">{s.score}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted">{g.boardEmpty}</p>
              )}
              <p className="mt-3 text-xs text-muted">{g.boardNote}</p>
              {scores.length > 0 && (
                <button type="button" onClick={clearScores} className="mt-2 text-sm font-semibold text-electric-700 hover:underline">
                  {g.clear}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="game-addons-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="game-addons-title" className="font-display text-3xl font-bold">
            {g.addonsTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {g.addons.map((a) => (
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
