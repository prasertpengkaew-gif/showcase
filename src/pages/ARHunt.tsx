import { useCallback, useEffect, useRef, useState } from 'react';
import type { MindARThree } from '../vendor/mindar/mindar-image-three.prod.js';
import { PageHeader } from '../components/PageHeader';
import { Button, ButtonAnchor } from '../components/Button';
import { QRCode } from '../components/QRCode';
import { LazyImage } from '../components/LazyImage';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { requestCamera, type CameraProblem } from '../lib/camera';
import { models } from '../data/models';
import { useT } from '../i18n';

const TARGETS = '/ar-hunt/hunt.mind';
const STORAGE_KEY = 'ar-hunt-progress';
/** Target index = station order in hunt.mind (see scripts/make-hunt-posters.mjs). */
const STATIONS = [
  { model: models.robot.src, clip: 'Wave', poster: '/ar-hunt/poster-1.png' },
  { model: models.fox.src, clip: 'Survey', poster: '/ar-hunt/poster-2.png' },
  { model: models.sneaker.src, clip: null, poster: '/ar-hunt/poster-3.png' },
] as const;

type Status = 'idle' | 'loading' | 'scanning' | 'found' | CameraProblem;
interface Progress {
  found: number[];
  code?: string;
}

function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Progress;
    if (Array.isArray(p.found)) return { found: p.found.filter((n) => n >= 0 && n < STATIONS.length), code: p.code };
  } catch {
    // No saved progress, or storage is unavailable (private mode).
  }
  return { found: [] };
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Progress then lasts for this visit only.
  }
}

function rewardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return 'HUNT-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

export default function ARHunt() {
  const t = useT();
  const h = t.hunt;
  useDocumentTitle(h.metaTitle);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<MindARThree | null>(null);
  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [active, setActive] = useState<number | null>(null);
  const [justFound, setJustFound] = useState<number | null>(null);

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const collect = useCallback((i: number) => {
    const prev = progressRef.current;
    if (prev.found.includes(i)) return;
    const found = [...prev.found, i].sort();
    const next = { found, code: found.length === STATIONS.length ? (prev.code ?? rewardCode()) : prev.code };
    progressRef.current = next;
    saveProgress(next);
    setProgress(next);
    setJustFound(i);
  }, []);

  useEffect(() => {
    if (justFound === null) return;
    const id = window.setTimeout(() => setJustFound(null), 3000);
    return () => window.clearTimeout(id);
  }, [justFound]);

  const stop = useCallback(() => {
    const ar = arRef.current;
    arRef.current = null;
    if (!ar) return;
    ar.renderer.setAnimationLoop(null);
    try {
      ar.stop();
    } catch {
      // Already stopped (e.g. the camera never started).
    }
    ar.renderer.dispose();
    ar.renderer.domElement.remove();
    containerRef.current?.querySelectorAll('canvas, video, div').forEach((el) => el.remove());
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    const problem = await requestCamera('environment');
    if (problem) {
      setStatus(problem);
      return;
    }
    setStatus('loading');
    try {
      const [{ MindARThree }, THREE, { GLTFLoader }] = await Promise.all([
        import('../vendor/mindar/mindar-image-three.prod.js'),
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
      ]);
      const ar = new MindARThree({
        container: containerRef.current!,
        imageTargetSrc: TARGETS,
        maxTrack: 1,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0.0005,
        filterBeta: 0.01,
      });
      arRef.current = ar;
      const { renderer, scene, camera } = ar;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(0.5, 1, 1);
      scene.add(sun);

      const loader = new GLTFLoader();
      const gltfs = await Promise.all(STATIONS.map((s) => loader.loadAsync(s.model)));
      const mixers: InstanceType<typeof THREE.AnimationMixer>[] = [];
      const spinners: InstanceType<typeof THREE.Object3D>[] = [];
      gltfs.forEach((gltf, i) => {
        // The anchor spans the poster width (-0.5…0.5) and height (±0.707).
        const anchor = ar.addAnchor(i);
        const obj = gltf.scene;
        const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
        obj.scale.setScalar(0.5 / Math.max(size.x, size.y, size.z));
        // Posters hang on walls, so the model stays upright in the poster's plane, just in front of it.
        const holder = new THREE.Group();
        holder.position.set(0, -0.25, 0.12);
        holder.add(obj);
        anchor.group.add(holder);
        const clipName = STATIONS[i].clip;
        const clip = clipName && gltf.animations.find((a) => a.name === clipName);
        if (clip && !reducedMotion) {
          const mixer = new THREE.AnimationMixer(obj);
          mixer.clipAction(clip).play();
          mixers.push(mixer);
        } else if (!clip) spinners.push(obj);
        anchor.onTargetFound = () => {
          setActive(i);
          setStatus('found');
          collect(i);
        };
        anchor.onTargetLost = () => {
          setActive(null);
          setStatus('scanning');
        };
      });

      await ar.start();
      setStatus('scanning');
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = clock.getDelta();
        mixers.forEach((m) => m.update(dt));
        if (!reducedMotion) spinners.forEach((o) => (o.rotation.y += dt * 0.8));
        renderer.render(scene, camera);
      });
    } catch (err) {
      console.error('AR hunt failed to start', err);
      stop();
      setStatus('error');
    }
  };

  const onStop = () => {
    stop();
    setActive(null);
    setStatus('idle');
  };

  const reset = () => {
    const next = { found: [] };
    saveProgress(next);
    setProgress(next);
  };

  const running = status === 'loading' || status === 'scanning' || status === 'found';
  const done = progress.found.length === STATIONS.length;
  const p = t.printAR;
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: p.deniedTitle, text: p.deniedText },
    'no-camera': { title: p.noCameraTitle, text: p.noCameraText },
    insecure: { title: p.insecureTitle, text: p.insecureText },
    error: { title: p.errorTitle, text: p.errorText },
  };
  const problem = problems[status];
  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  return (
    <>
      <PageHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <div
              role="region"
              aria-label={h.stageLabel}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-navy-900 sm:aspect-video"
            >
              <div ref={containerRef} className="absolute inset-0 isolate" />
              {!running && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                  <div className="max-w-sm">
                    <p className="font-display text-lg font-bold">{h.idleTitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{h.idleText}</p>
                  </div>
                </div>
              )}
              {running && (
                <p
                  role="status"
                  className={`absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm text-white ${
                    status === 'found' ? 'bg-emerald-700/90' : 'bg-navy-900/85'
                  }`}
                >
                  {status === 'found' && <CheckIcon width={18} height={18} />}
                  {status === 'loading'
                    ? p.loading
                    : active !== null
                      ? justFound === active
                        ? h.collected(active + 1)
                        : h.station(active + 1)
                      : h.scanning}
                </p>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {running ? (
                <Button variant="secondary" onClick={onStop}>
                  {p.stop}
                </Button>
              ) : (
                <Button onClick={start} disabled={status === 'insecure'}>
                  {p.start}
                </Button>
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
              <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {p.privacy}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">{h.stampsTitle}</h2>
                <p className="text-sm font-semibold text-muted tabular-nums" aria-live="polite">
                  {h.progress(progress.found.length, STATIONS.length)}
                </p>
              </div>
              <ol className="mt-4 grid grid-cols-3 gap-3">
                {STATIONS.map((s, i) => {
                  const got = progress.found.includes(i);
                  return (
                    <li key={s.poster} className="text-center">
                      <span
                        className={`mx-auto grid h-16 w-16 place-items-center rounded-full border-2 font-display text-2xl font-bold ${
                          got ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-dashed border-slate-300 text-slate-400'
                        }`}
                      >
                        {got ? <CheckIcon width={28} height={28} /> : i + 1}
                      </span>
                      <span className="mt-2 block text-sm font-medium text-ink">{h.names[i]}</span>
                      <span className="sr-only">{got ? h.stampGot : h.stampMissing}</span>
                    </li>
                  );
                })}
              </ol>
              {done ? (
                <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-950" role="status">
                  <p className="font-semibold">{h.doneTitle}</p>
                  <p className="mt-2 font-display text-2xl font-bold tracking-wider">{progress.code}</p>
                  <p className="mt-2 text-sm leading-relaxed">{h.doneText}</p>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-relaxed text-muted">{h.howTo}</p>
              )}
              {progress.found.length > 0 && (
                <button type="button" onClick={reset} className="mt-3 text-sm font-semibold text-electric-700 hover:underline">
                  {h.reset}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{h.postersTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{h.postersText}</p>
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {STATIONS.map((s, i) => (
                  <li key={s.poster}>
                    <LazyImage src={s.poster} alt={h.posterAlt(i + 1)} width={1000} height={1414} wrapperClassName="rounded-lg" />
                    <ButtonAnchor href={s.poster} download={`ar-hunt-poster-${i + 1}.png`} variant="ghost" size="md" className="mt-2 w-full">
                      {h.download}
                      <span className="sr-only"> {h.posterAlt(i + 1)}</span>
                    </ButtonAnchor>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
              <QRCode value={pageUrl} size={112} label={p.qrLabel} className="shrink-0" />
              <p className="text-sm leading-relaxed text-muted">{h.qrText}</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="hunt-addons-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="hunt-addons-title" className="font-display text-3xl font-bold">
            {h.addonsTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {h.addons.map((a) => (
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
