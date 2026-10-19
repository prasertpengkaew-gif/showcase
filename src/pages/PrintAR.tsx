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

const CARD_PNG = '/ar-card/card.png';
const CARD_TARGET = '/ar-card/card.mind';

type Status = 'idle' | 'loading' | 'scanning' | 'found' | CameraProblem;

export default function PrintAR() {
  const t = useT();
  const p = t.printAR;
  useDocumentTitle(p.metaTitle);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<MindARThree | null>(null);
  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );

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
        imageTargetSrc: CARD_TARGET,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        // Smoother tracking: lower jitter at a small cost of latency.
        filterMinCF: 0.0005,
        filterBeta: 0.01,
      });
      arRef.current = ar;
      const { renderer, scene, camera } = ar;

      scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.2));
      const sun = new THREE.DirectionalLight(0xffffff, 2);
      sun.position.set(0.5, 1, 1);
      scene.add(sun);

      // The anchor spans the card: x from -0.5 to 0.5 (card width = 1), z points out of the card.
      const anchor = ar.addAnchor(0);
      const gltf = await new GLTFLoader().loadAsync(models.chair.src);
      const chair = gltf.scene;
      const box = new THREE.Box3().setFromObject(chair);
      const size = box.getSize(new THREE.Vector3());
      const scale = 0.34 / Math.max(size.x, size.z);
      chair.scale.setScalar(scale);
      // Stand the chair up out of the card, centred on the photo half (left side).
      const holder = new THREE.Group();
      holder.rotation.x = Math.PI / 2;
      holder.position.set(-0.25, 0, 0);
      holder.add(chair);
      anchor.group.add(holder);
      // Soft contact shadow on the card
      const shadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
      );
      shadow.position.set(-0.25, 0, 0.002);
      anchor.group.add(shadow);

      anchor.onTargetFound = () => setStatus('found');
      anchor.onTargetLost = () => setStatus('scanning');

      await ar.start();
      setStatus('scanning');
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        if (!reducedMotion) chair.rotation.y += clock.getDelta() * 0.6;
        renderer.render(scene, camera);
      });
    } catch (err) {
      console.error('Print AR failed to start', err);
      stop();
      setStatus('error');
    }
  };

  const onStop = () => {
    stop();
    setStatus('idle');
  };

  const running = status === 'loading' || status === 'scanning' || status === 'found';
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
      <PageHeader eyebrow={p.eyebrow} title={p.title} description={p.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div
              role="region"
              aria-label={p.stageLabel}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-navy-900 sm:aspect-video"
            >
              {/* MindAR mounts its video and canvases inside this element. */}
              <div ref={containerRef} className="absolute inset-0 isolate" />
              {!running && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                  <div className="max-w-sm">
                    <p className="font-display text-lg font-bold">{p.idleTitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.idleText}</p>
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
                  {status === 'loading' ? p.loading : status === 'found' ? p.found : p.scanning}
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
              <LazyImage src={CARD_PNG} alt={p.cardAlt} width={1600} height={1000} wrapperClassName="rounded-lg" />
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonAnchor href={CARD_PNG} download="thenerdstudio-ar-card.png" size="md">
                  {p.downloadCard}
                </ButtonAnchor>
                <ButtonAnchor href={CARD_PNG} target="_blank" rel="noopener noreferrer" variant="ghost" size="md">
                  {p.openCard}
                  <span className="sr-only"> {t.footer.newTab}</span>
                </ButtonAnchor>
              </div>
            </div>
            <ol className="space-y-4 rounded-2xl border border-line bg-white p-5">
              {[p.step1, p.step2, p.step3].map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="pt-1 text-[15px] leading-relaxed text-slate-700">{s}</p>
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-5">
              <QRCode value={pageUrl} size={112} label={p.qrLabel} className="shrink-0" />
              <p className="text-sm leading-relaxed text-muted">{p.step2}</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="print-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="print-uses-title" className="font-display text-3xl font-bold">
            {p.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {p.uses.map((u) => (
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
