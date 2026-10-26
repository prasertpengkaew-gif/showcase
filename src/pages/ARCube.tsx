import { useEffect, useRef, useState } from 'react';
import { AnimationMixer, Box3, Group, Object3D, Vector3, type AnimationClip } from 'three';
import { loadGlb } from '../lib/loadGlb';
import { PageHeader } from '../components/PageHeader';
import { MarkerPanel } from '../components/MarkerPanel';
import { MarkerImage } from '../components/MarkerImage';
import { OptionChips } from '../components/OptionChips';
import { Button } from '../components/Button';
import { useMarkerCamera, type MarkerFrame, type MarkerScene } from '../hooks/useMarkerCamera';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CUBE_FACES, CUBE_MODELS, type CubeFace, type CubeModel } from '../data/cube';
import { models } from '../data/models';
import { cubePose } from '../lib/cubePose';
import { buildCubeSheet, downloadCanvas } from '../lib/markerSheet';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useT } from '../i18n';

const ONLY = new Set(CUBE_FACES.map((f) => f.id));
/** Size of the product, in marker edges (the cube itself is 1.25). Larger than the cube so it covers it. */
const PRODUCT_SIZE = 2.1;
const CLIPS: Partial<Record<CubeModel, string>> = { robot: 'Wave', fox: 'Survey' };

interface Loaded {
  object: Object3D;
  clips: AnimationClip[];
}

export default function ARCube() {
  const t = useT();
  const c = t.arCube;
  useDocumentTitle(c.metaTitle);
  const reduced = usePrefersReducedMotion();

  const [model, setModel] = useState<CubeModel>('sneaker');
  const modelRef = useRef<CubeModel>(model);
  modelRef.current = model;
  const sceneRef = useRef<MarkerScene | null>(null);
  const cubeGroupRef = useRef<Group | null>(null);
  const holderRef = useRef<Group | null>(null);
  const cacheRef = useRef(new Map<CubeModel, Loaded>());
  const mixerRef = useRef<AnimationMixer | null>(null);
  const shownRef = useRef<CubeModel | null>(null);
  const [faces, setFaces] = useState<number[]>([]);
  const lastFaces = useRef('');

  /** Puts the chosen product into the holder, loading it the first time. */
  const showModel = async (id: CubeModel) => {
    const holder = holderRef.current;
    if (!holder) return;
    let loaded = cacheRef.current.get(id);
    if (!loaded) {
      const gltf = await loadGlb(models[id].src);
      const obj = gltf.scene;
      const box = new Box3().setFromObject(obj);
      const size = box.getSize(new Vector3());
      const centre = box.getCenter(new Vector3());
      // Centre it on the cube and scale to a fixed size; the cube's up is the model's up.
      const wrap = new Group();
      obj.position.sub(centre);
      wrap.add(obj);
      wrap.scale.setScalar(PRODUCT_SIZE / Math.max(size.x, size.y, size.z));
      loaded = { object: wrap, clips: gltf.animations };
      cacheRef.current.set(id, loaded);
    }
    if (holderRef.current !== holder || modelRef.current !== id) return; // user moved on or camera stopped
    holder.clear();
    holder.add(loaded.object);
    shownRef.current = id;
    mixerRef.current = null;
    const clip = CLIPS[id] && loaded.clips.find((a) => a.name === CLIPS[id]);
    if (clip && !reduced) {
      mixerRef.current = new AnimationMixer(loaded.object.children[0]);
      mixerRef.current.clipAction(clip).play();
    }
  };

  useEffect(() => {
    if (holderRef.current) void showModel(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const cam = useMarkerCamera({
    only: ONLY,
    setup: (s: MarkerScene) => {
      sceneRef.current = s;
      const cubeGroup = new Group();
      cubeGroup.matrixAutoUpdate = false;
      cubeGroup.visible = false;
      const holder = new Group();
      cubeGroup.add(holder);
      s.scene.add(cubeGroup);
      cubeGroupRef.current = cubeGroup;
      holderRef.current = holder;
      shownRef.current = null;
      void showModel(modelRef.current);
      return () => {
        sceneRef.current = null;
        cubeGroupRef.current = null;
        holderRef.current = null;
        mixerRef.current = null;
      };
    },
    frame: (f: MarkerFrame) => {
      const group = cubeGroupRef.current;
      if (!group) return;
      const pose = cubePose(f.markers);
      group.visible = !!pose && shownRef.current !== null;
      if (pose) {
        group.matrix.copy(pose.matrix);
        group.matrixWorldNeedsUpdate = true;
      }
      mixerRef.current?.update(f.dt);
      const key = (pose?.faces ?? []).sort().join(',');
      if (key !== lastFaces.current) {
        lastFaces.current = key;
        setFaces(pose?.faces ?? []);
      }
    },
  });

  const faceName = (id: number) => c.faces[CUBE_FACES.find((f) => f.id === id)!.face as CubeFace];

  const downloadSheet = () =>
    downloadCanvas(
      buildCubeSheet({
        heading: c.sheetHeading,
        note: t.markers.printTip,
        glue: c.glue,
        ids: Object.fromEntries(CUBE_FACES.map((f) => [f.face, f.id])) as Record<CubeFace, number>,
      }),
      'thenerdstudio-ar-cube.png',
    );

  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <MarkerPanel
            cam={cam}
            label={c.stageLabel}
            idleTitle={c.idleTitle}
            idleText={c.idleText}
            hint={c.hint}
            photoName="thenerdstudio-ar-cube.png"
          >
            <Button variant="ghost" onClick={downloadSheet}>
              {t.markers.downloadSheet}
            </Button>
          </MarkerPanel>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-white p-5">
              <OptionChips legend={c.product} options={CUBE_MODELS} value={model} onChange={setModel} format={(m) => c.products[m]} />
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{c.facesTitle}</h2>
              <p className="mt-1 text-sm text-muted">{c.facesText}</p>
              <ul className="mt-4 grid grid-cols-3 gap-2" aria-live="polite">
                {CUBE_FACES.map((f) => {
                  const on = faces.includes(f.id);
                  return (
                    <li
                      key={f.id}
                      className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold ${on ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-line text-slate-500'}`}
                    >
                      {faceName(f.id)}
                      <span className="sr-only"> {on ? c.faceSeen : c.faceHidden}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold">{c.buildTitle}</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
                {c.build.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p className="mt-4 text-sm font-semibold">{t.markers.onScreen}</p>
              <p className="mt-1 text-sm text-muted">{c.onScreenText}</p>
              <MarkerImage id={20} size={120} label={t.markers.markerAlt(c.faces.front)} className="mt-3" />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cube-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="cube-uses-title" className="font-display text-3xl font-bold">
            {c.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {c.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">{t.markers.versus}</p>
        </div>
      </section>
    </>
  );
}
