import { useCallback, useEffect, useRef, useState } from 'react';
import type { MindARThree } from '../vendor/mindar/mindar-image-three.prod.js';
import { AlertIcon, CheckIcon, InfoIcon } from '../components/Icons';
import { Button, ButtonAnchor } from '../components/Button';
import { LazyImage } from '../components/LazyImage';
import { PageHeader } from '../components/PageHeader';
import { QRCode } from '../components/QRCode';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { requestCamera, type CameraProblem } from '../lib/camera';
import { models } from '../data/models';
import { useT } from '../i18n';

const SCENE_IDS = ['morning-market', 'canal-tea-shop', 'rainy-sweet-shop', 'tuk-tuk-ride', 'loy-krathong', 'mango-garden', 'wooden-canal-house', 'evening-market', 'garden-stroll', 'temple-fair'];
const COLOR_TARGET = '/coloring-ar/pages.mind';
type Status = 'idle' | 'loading' | 'scanning' | 'found' | CameraProblem;

export default function ColoringAR() {
  const t = useT();
  const c = t.coloringAR;
  useDocumentTitle(c.metaTitle);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<MindARThree | null>(null);
  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [selectedScene, setSelectedScene] = useState(0);
  const selected = c.scenes[selectedScene];
  const pagePath = `/coloring-ar/pages/${SCENE_IDS[selectedScene]}.png`;

  const stop = useCallback(() => {
    const ar = arRef.current;
    arRef.current = null;
    if (!ar) return;
    ar.renderer.setAnimationLoop(null);
    try { ar.stop(); } catch { /* Camera may not have started. */ }
    ar.renderer.dispose();
    ar.renderer.domElement.remove();
    containerRef.current?.querySelectorAll('canvas, video, div').forEach((element) => element.remove());
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    const problem = await requestCamera('environment');
    if (problem) { setStatus(problem); return; }
    setStatus('loading');
    try {
      const [{ MindARThree }, THREE, { GLTFLoader }] = await Promise.all([
        import('../vendor/mindar/mindar-image-three.prod.js'),
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
      ]);
      const ar = new MindARThree({
        container: containerRef.current!,
        imageTargetSrc: COLOR_TARGET,
        maxTrack: 1,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
        filterMinCF: 0.0005,
        filterBeta: 0.01,
      });
      arRef.current = ar;
      const { renderer, scene, camera } = ar;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x7b6f61, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2);
      keyLight.position.set(0.5, 1, 1);
      scene.add(keyLight);

      const gltf = await new GLTFLoader().loadAsync(models.dragon.src);
      const dragon = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(dragon);
      const size = bounds.getSize(new THREE.Vector3());
      dragon.scale.setScalar(0.56 / Math.max(size.x, size.y, size.z));
      const holder = new THREE.Group();
      holder.rotation.x = Math.PI / 2;
      holder.position.set(0, -0.18, 0.06);
      holder.add(dragon);
      const anchor = ar.addAnchor(selectedScene);
      anchor.group.add(holder);

      const mixer = new THREE.AnimationMixer(dragon);
      const swim = gltf.animations.find((clip) => clip.name === 'swim');
      if (swim && !reducedMotion) mixer.clipAction(swim).play();
      const clock = new THREE.Clock();
      anchor.onTargetFound = () => setStatus('found');
      anchor.onTargetLost = () => setStatus('scanning');

      await ar.start();
      setStatus('scanning');
      renderer.setAnimationLoop(() => {
        mixer.update(clock.getDelta());
        renderer.render(scene, camera);
      });
    } catch (error) {
      console.error('Coloring AR failed to start', error);
      stop();
      setStatus('error');
    }
  };

  const onStop = () => { stop(); setStatus('idle'); };
  const running = status === 'loading' || status === 'scanning' || status === 'found';
  const problems: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: c.deniedTitle, text: c.deniedText },
    'no-camera': { title: c.noCameraTitle, text: c.noCameraText },
    insecure: { title: c.insecureTitle, text: c.insecureText },
    error: { title: c.errorTitle, text: c.errorText },
  };
  const problem = problems[status];
  const pageUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';

  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <div className="bg-[#f8f6ef] py-12 sm:py-16">
        <div className="container-page">
          <section aria-labelledby="cozy-scenes-title" className="mb-10 sm:mb-14">
            <div className="max-w-2xl">
              <h2 id="cozy-scenes-title" className="font-display text-2xl font-bold text-[#203c32] sm:text-3xl">{c.collectionTitle}</h2>
              <p className="mt-3 leading-relaxed text-slate-700">{c.collectionDescription}</p>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {c.scenes.map((scene, index) => (
                <li key={scene.title}>
                  <button type="button" onClick={() => setSelectedScene(index)} disabled={running} aria-pressed={selectedScene === index} className={`h-full w-full rounded-2xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31583e] disabled:cursor-not-allowed ${selectedScene === index ? 'border-[#426b52] bg-[#e4eddf]' : 'border-[#e3dccd] bg-white/80 hover:bg-white'}`}>
                    <LazyImage src={`/coloring-ar/pages/${SCENE_IDS[index]}.png`} alt={`${scene.title}: ${scene.text}`} width={2000} height={2828} wrapperClassName="rounded-xl" />
                    <span className="mt-3 block text-xl" aria-hidden="true">{scene.icon}</span>
                    <span className="mt-1 block font-semibold text-[#203c32]">{scene.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-slate-600">{scene.text}</span>
                    <span className={`mt-3 block text-xs font-semibold ${selectedScene === index ? 'text-[#31583e]' : 'text-slate-500'}`}>{selectedScene === index ? c.selectedScene : c.sceneReady}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div role="region" aria-label={c.stageLabel} className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-[6px] border-white bg-[#182126] shadow-xl sm:aspect-video">
              <div ref={containerRef} className="absolute inset-0 isolate" />
              {!running && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
                <div className="max-w-sm"><p className="text-5xl" aria-hidden="true">🐉</p><p className="mt-3 font-display text-xl font-bold">{c.idleTitle}</p><p className="mt-2 text-sm leading-relaxed text-slate-200">{c.idleText}</p></div>
              </div>}
              {running && <p role="status" className={`absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-sm text-white ${status === 'found' ? 'bg-emerald-700/90' : 'bg-navy-900/85'}`}>
                {status === 'found' && <CheckIcon width={18} height={18} />}{status === 'loading' ? c.loading : status === 'found' ? c.found : c.scanning}
              </p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {running ? <Button variant="secondary" onClick={onStop}>{c.stop}</Button> : <Button onClick={start} disabled={status === 'insecure'}>{c.start}</Button>}
            </div>
            {problem && <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertIcon className="mt-0.5 shrink-0" /><div><p className="font-semibold">{problem.title}</p><p className="mt-1 leading-relaxed">{problem.text}</p></div></div>}
            <p className="mt-4 flex items-start gap-2 text-sm text-muted"><InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />{c.privacy}</p>
          </div>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-[#e3dccd] bg-white p-5 shadow-sm">
              <a href={pagePath} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">
                <LazyImage src={pagePath} alt={`${selected.title}: ${selected.text}`} width={2000} height={2828} wrapperClassName="rounded-xl" />
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonAnchor href={pagePath} download={`cozy-thailand-${SCENE_IDS[selectedScene]}.png`}>{c.download}</ButtonAnchor>
                <ButtonAnchor href={pagePath} target="_blank" rel="noopener noreferrer" variant="ghost">{c.openPage}<span className="sr-only"> {t.footer.newTab}</span></ButtonAnchor>
                <ButtonAnchor href="/coloring-ar/cozy-thailand-coloring-book.pdf" download="cozy-thailand-coloring-book.pdf" variant="ghost">{c.downloadBook}</ButtonAnchor>
              </div>
            </div>
            <ol className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
              {[c.step1, c.step2, c.step3].map((step, index) => <li key={step} className="flex gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#182126] font-display text-sm font-bold text-white">{index + 1}</span><p className="pt-1 text-[15px] leading-relaxed text-slate-700">{step}</p></li>)}
            </ol>
            <div className="flex items-center gap-4 rounded-3xl bg-[#182126] p-5 text-white">
              <QRCode value={pageUrl} size={88} label={c.qrLabel} onDark className="shrink-0" />
              <p className="text-sm leading-relaxed text-slate-200">{c.qrText}</p>
            </div>
          </aside>
          </div>
        </div>
      </div>
    </>
  );
}
