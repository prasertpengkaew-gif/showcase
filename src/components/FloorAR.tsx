import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from './Button';
import { OptionChips } from './OptionChips';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { coverRect, floorHitFrom, yawFacingOrigin } from '../lib/arFloor';
import { loadXR8, type XR8 } from '../lib/xr8';
import { useT } from '../i18n';

/** Something to stand on the floor: its origin is the floor point, +Z is its front, and it moves itself in update(). */
export interface Placeable {
  group: THREE.Object3D;
  update: (time: number) => void;
  dispose: () => void;
}

export interface FloorARProps {
  /** Builds the object; may be async, for instance to load a model file. */
  build: () => Placeable | Promise<Placeable>;
  title: string;
  text: string;
  /** Tailwind classes for the start panel background. */
  panelClass?: string;
  /** Nearest the object may be placed to the camera, in metres. Long objects need more room. */
  minDistance?: number;
  dialogLabel: string;
  canvasLabel: string;
  photoCaption: string;
  photoAlt: string;
}

/** world: 8th Wall SLAM tracking. camera: phone motion sensors only. preview: no camera at all. */
type Mode = 'off' | 'world' | 'camera' | 'preview';
const HEIGHTS = ['1.2', '1.4', '1.6'] as const;
type Height = (typeof HEIGHTS)[number];
const FOV = 62;
const TAP_SLOP = 8;
const TRACKING_TIMEOUT_MS = 12000;
const IDENTITY = { w: 1, x: 0, y: 0, z: 0 };
const DEFAULT_NDC = new THREE.Vector2(0, -0.3);

interface Runtime {
  height: number;
  alpha0: number | null;
  orient: { alpha: number; beta: number; gamma: number } | null;
  yaw: number;
  pitch: number;
}

/** Camera rotation from the phone sensors, following the usual three.js device-orientation maths. */
const orientationQuaternion = (q: THREE.Quaternion, alpha: number, beta: number, gamma: number, screenAngle: number) => {
  const rad = THREE.MathUtils.degToRad;
  q.setFromEuler(new THREE.Euler(rad(beta), rad(alpha), -rad(gamma), 'YXZ'));
  q.multiply(new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -rad(screenAngle)));
};

const motionPermissions = async () => {
  // iPhones ask for motion access first, and only from a tap.
  for (const api of [DeviceOrientationEvent, typeof DeviceMotionEvent === 'undefined' ? undefined : DeviceMotionEvent]) {
    const request = (api as unknown as { requestPermission?: () => Promise<string> } | undefined)?.requestPermission;
    if (request) await request.call(api).catch(() => 'denied');
  }
};

/** Start panel plus a full-screen AR camera that stands an object on the floor and takes a photo to save. */
export function FloorAR({ build, title, text, panelClass = 'from-[#1b0b2e] to-[#3a1650]', minDistance = 1.5, dialogLabel, canvasLabel, photoCaption, photoAlt }: FloorARProps) {
  const d = useT().floorAr;
  const [mode, setMode] = useState<Mode>('off');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [noSensor, setNoSensor] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [fellBack, setFellBack] = useState(false);
  const [height, setHeight] = useState<Height>('1.4');
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [notice, setNotice] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pickRef = useRef<(ndc: THREE.Vector2) => void>(() => {});
  const heightRef = useRef<(h: number) => void>(() => {});
  const captureRef = useRef<() => Promise<Blob | null>>(async () => null);
  const startRef = useRef<(wanted: Mode, fallback?: boolean) => Promise<void>>(async () => {});
  const buildRef = useRef(build);
  buildRef.current = build;
  const rt = useRef<Runtime>({ height: 1.4, alpha0: null, orient: null, yaw: 0, pitch: 0 });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  const close = useCallback(() => { stopStream(); setMode('off'); setShot((s) => { if (s) URL.revokeObjectURL(s.url); return null; }); setNotice(''); setFellBack(false); }, [stopStream]);
  useEffect(() => stopStream, [stopStream]);

  const start = async (wanted: Mode, fallback = false) => {
    setProblem(null);
    setNoSensor(false);
    setScanning(false);
    setFellBack(fallback);
    rt.current = { height: Number(height), alpha0: null, orient: null, yaw: 0, pitch: 0 };
    if (wanted === 'world') {
      setBusy(true);
      try { await motionPermissions(); } finally { setBusy(false); }
    }
    if (wanted === 'camera') {
      setBusy(true);
      try {
        await motionPermissions();
        if (!navigator.mediaDevices?.getUserMedia) { setProblem(window.isSecureContext ? 'no-camera' : 'insecure'); return; }
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (err) {
        const p = cameraProblem(err);
        if (p === 'error') console.error('AR camera failed to start', err);
        setProblem(p);
        return;
      } finally {
        setBusy(false);
      }
    }
    setMode(wanted);
  };
  startRef.current = start;

  // The AR scene: camera feed behind, the object drawn on top, anchored to a spot on the floor.
  useEffect(() => {
    if (mode === 'off') return;
    const world = mode === 'world';
    const canvas = canvasRef.current!;
    const stage = stageRef.current!;
    const run = rt.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: world });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
    // Where the centre of the screen meets the floor, so people can see the phone has found the floor before they tap.
    const reticle = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff9a1f, transparent: true, opacity: 0.9, depthWrite: false }));
    reticle.visible = false;
    scene.add(reticle);

    // The object may still be loading when the first tap lands, so the wanted spot is remembered and applied when it arrives.
    let object: Placeable | null = null;
    const spot = { x: 0, z: 0, yaw: 0 };
    const applySpot = () => { if (object) { object.group.position.set(spot.x, floorY(), spot.z); object.group.rotation.y = spot.yaw; } };
    let cancelled = false;
    Promise.resolve(buildRef.current()).then((made) => {
      if (cancelled) { made.dispose(); return; }
      object = made;
      scene.add(made.group);
      applySpot();
    }).catch((err) => console.error('Building the AR object failed', err));

    // Sensor-only mode keeps the camera at the origin and puts the floor below it; the engine puts the floor at y = 0.
    function floorY() { return world ? 0 : -run.height; }
    const raycaster = new THREE.Raycaster();
    const rayDir = (ndc: THREE.Vector2) => { raycaster.setFromCamera(ndc, camera); return raycaster.ray.direction.clone(); };
    const place = (ndc: THREE.Vector2) => {
      camera.updateMatrixWorld();
      const p = floorHitFrom(camera.position, rayDir(ndc), floorY(), minDistance);
      spot.x = p.x; spot.z = p.z;
      spot.yaw = yawFacingOrigin(p.x, p.z, camera.position.x, camera.position.z);
      applySpot();
    };
    pickRef.current = place;

    let xr8: XR8 | null = null;
    let tracking = false;
    let fallbackTimer = 0;
    const stopEngine = () => {
      if (!xr8) return;
      try { xr8.stop(); xr8.clearCameraPipelineModules(); } catch (err) { console.error('Stopping the AR engine failed', err); }
      xr8 = null;
    };
    const originFor = (h: number) => ({ x: 0, y: h, z: 0 });
    heightRef.current = (h) => {
      run.height = h;
      if (!world) { place(DEFAULT_NDC); return; }
      if (!xr8) return;
      xr8.XrController.updateCameraProjectionMatrix({ origin: originFor(h), facing: IDENTITY });
      xr8.XrController.recenter();
      place(DEFAULT_NDC);
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      const engineCanvas = engineCanvasRef.current;
      if (world && engineCanvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        engineCanvas.width = Math.round(w * dpr);
        engineCanvas.height = Math.round(h * dpr);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      if (run.alpha0 === null) run.alpha0 = e.alpha;
      run.orient = { alpha: e.alpha - run.alpha0, beta: e.beta, gamma: e.gamma };
    };
    let noSensorTimer = 0;
    if (!world) {
      window.addEventListener('deviceorientation', onOrient);
      noSensorTimer = window.setTimeout(() => { if (!run.orient) setNoSensor(true); }, 1500);
    }

    const video = videoRef.current!;
    if (mode === 'camera' && streamRef.current) { video.srcObject = streamRef.current; void video.play().catch(() => {}); }

    // Real tracking: the engine draws the camera picture and follows the phone in space; we copy its camera pose to ours.
    const fail = (reason: unknown) => {
      if (cancelled) return;
      cancelled = true;
      console.warn('8th Wall tracking is not available, using the sensor mode instead:', reason);
      stopEngine();
      window.setTimeout(() => void startRef.current('camera', true), 400);
    };
    const live = { px: 0, py: 0, pz: 0, qx: 0, qy: 0, qz: 0, qw: 1, proj: null as Float32Array | null };
    if (world) {
      setScanning(true);
      void (async () => {
        try {
          const engine: XR8 = await loadXR8();
          if (cancelled) return;
          xr8 = engine;
          engine.XrController.configure({ scale: 'absolute' });
          engine.CanvasScreenshot.configure({ maxDimension: 1920, jpgCompression: 92 });
          const project = ({ canvasWidth, canvasHeight }: { canvasWidth: number; canvasHeight: number }) =>
            engine.XrController.updateCameraProjectionMatrix({ cam: { pixelRectWidth: canvasWidth, pixelRectHeight: canvasHeight, nearClipPlane: 0.05, farClipPlane: 60 }, origin: originFor(run.height), facing: IDENTITY });
          engine.addCameraPipelineModules([
            engine.GlTextureRenderer.pipelineModule(),
            engine.XrController.pipelineModule(),
            engine.CanvasScreenshot.pipelineModule(),
            {
              name: 'floor-ar',
              onStart: project,
              onCanvasSizeChange: project,
              onUpdate: ({ processCpuResult }: { processCpuResult: { reality?: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number }; intrinsics: Float32Array } } }) => {
                const r = processCpuResult.reality;
                if (!r || !r.position || !r.rotation || !r.intrinsics) return;
                live.px = r.position.x; live.py = r.position.y; live.pz = r.position.z;
                live.qx = r.rotation.x; live.qy = r.rotation.y; live.qz = r.rotation.z; live.qw = r.rotation.w;
                live.proj = r.intrinsics;
                if (!tracking) { tracking = true; setScanning(false); place(DEFAULT_NDC); }
              },
              onException: fail,
              onCameraStatusChange: ({ status }: { status: string }) => { if (status === 'failed') fail('camera status failed'); },
            },
          ]);
          engine.CanvasScreenshot.setForegroundCanvas(canvas);
          engine.run({ canvas: engineCanvasRef.current!, allowedDevices: engine.XrConfig.device().ANY });
          fallbackTimer = window.setTimeout(() => { if (!tracking) fail('no tracking data'); }, TRACKING_TIMEOUT_MS);
        } catch (err) {
          fail(err);
        }
      })();
    }

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (world) {
        if (tracking && live.proj) {
          camera.position.set(live.px, live.py, live.pz);
          camera.quaternion.set(live.qx, live.qy, live.qz, live.qw);
          camera.projectionMatrix.fromArray(live.proj as unknown as number[]);
          camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
          camera.updateMatrixWorld();
          const p = floorHitFrom(camera.position, rayDir(new THREE.Vector2(0, 0)), 0, 0.8, 8);
          reticle.visible = p.hit;
          reticle.position.set(p.x, 0.01, p.z);
        }
      } else {
        if (run.orient) orientationQuaternion(camera.quaternion, run.orient.alpha, run.orient.beta, run.orient.gamma, screen.orientation?.angle ?? 0);
        else camera.quaternion.setFromEuler(new THREE.Euler(run.pitch, run.yaw, 0, 'YXZ'));
        camera.updateMatrixWorld();
      }
      object?.update(clock.getElapsedTime());
      renderer.render(scene, camera);
    };
    if (!world) place(DEFAULT_NDC);
    tick();

    const withCaption = (draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) => {
      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d')!;
      draw(ctx, w, h);
      ctx.font = `700 ${Math.round(w * 0.035)}px system-ui, "Noto Sans Thai", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(photoCaption, w / 2, h - w * 0.05);
      return new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
    };
    captureRef.current = async () => {
      if (world && xr8) {
        // The engine joins the camera picture and our canvas, then we add the caption.
        const base64: string = await xr8.CanvasScreenshot.takeScreenshot();
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64}`;
        await img.decode();
        return withCaption((ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), img.naturalWidth, img.naturalHeight);
      }
      renderer.render(scene, camera);
      const gl = renderer.domElement;
      return withCaption((ctx, w, h) => {
        if (mode === 'camera' && video.videoWidth) {
          const r = coverRect(video.videoWidth, video.videoHeight, w, h);
          ctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
        } else {
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#1b0b2e');
          g.addColorStop(1, '#3a1650');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(gl, 0, 0);
      }, gl.width, gl.height);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(noSensorTimer);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('deviceorientation', onOrient);
      observer.disconnect();
      stopEngine();
      video.srcObject = null;
      object?.dispose();
      reticle.geometry.dispose();
      (reticle.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [mode, photoCaption, minDistance]);

  // Changing the phone height moves the object (and, with the engine, restarts tracking from that height).
  useEffect(() => { rt.current.height = Number(height); heightRef.current(Number(height)); }, [height]);

  // A tap places the object where that part of the picture meets the floor; a drag looks around when there is no sensor.
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > TAP_SLOP) p.moved = true;
    if (p.moved && mode !== 'world' && !rt.current.orient) {
      rt.current.yaw -= dx * 0.005;
      rt.current.pitch = Math.max(-1.2, Math.min(1.2, rt.current.pitch - dy * 0.005));
      p.x = e.clientX; p.y = e.clientY;
    }
  };
  const onUp = (e: React.PointerEvent) => {
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.moved) return;
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    pickRef.current(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1)));
  };

  const takePhoto = async () => {
    try {
      const blob = await captureRef.current();
      if (!blob) { setNotice(d.photoFailed); return; }
      setShot((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), blob }; });
    } catch (err) {
      console.error('Taking the photo failed', err);
      setNotice(d.photoFailed);
    }
  };
  const save = async () => {
    if (!shot) return;
    const file = new File([shot.blob], 'ar-photo.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: photoCaption }); setNotice(d.shared); } catch (err) { if ((err as Error).name !== 'AbortError') setNotice(d.photoFailed); }
      return;
    }
    Object.assign(document.createElement('a'), { href: shot.url, download: 'ar-photo.jpg' }).click();
    setNotice(d.downloaded);
  };

  const problemText: Partial<Record<CameraProblem, string>> = { denied: d.denied, 'no-camera': d.noCamera, insecure: d.insecure, error: d.error };
  const hint = mode === 'preview' ? d.previewHint : mode === 'world' ? (scanning ? d.scanning : d.worldHint) : noSensor ? d.noSensor : d.tapHint;

  return <>
    <div className={`mt-8 rounded-3xl bg-gradient-to-b ${panelClass} p-6 text-white sm:p-10`}>
      <p className="font-display text-3xl font-extrabold text-[#ffd54a] sm:text-4xl">{title}</p>
      <p className="mt-3 max-w-2xl text-slate-200">{text}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => start('world')} disabled={busy}>{busy ? d.starting : d.startAr}</Button>
        <Button size="lg" variant="outline-light" onClick={() => start('preview')} disabled={busy}>{d.startPreview}</Button>
      </div>
      {problem && <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{problemText[problem]} <button type="button" className="font-semibold underline" onClick={() => start('preview')}>{d.startPreview}</button></div>}
      <p className="mt-5 text-xs text-slate-300">{d.privacy}</p>
    </div>
    <p className="mt-2 text-xs text-muted">{d.engineCredit} <a className="underline" href="https://github.com/8thwall/engine/blob/main/LICENSE" target="_blank" rel="noreferrer">{d.engineLicense}</a></p>

    {mode !== 'off' && <div role="dialog" aria-modal="true" aria-label={dialogLabel} className="fixed inset-0 z-50 bg-black">
      <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#1b0b2e] to-[#3a1650]">
        {mode === 'world' && <canvas ref={engineCanvasRef} aria-hidden className="absolute inset-0 h-full w-full" />}
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${mode === 'camera' ? '' : 'hidden'}`} playsInline muted />
        <canvas key={mode} ref={canvasRef} aria-label={canvasLabel} className="absolute inset-0 h-full w-full touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <p className="max-w-[70%] rounded-xl bg-black/60 px-3 py-2 text-sm text-white" role="status">{fellBack && mode === 'camera' ? `${d.fallbackNote} ` : ''}{hint}</p>
        <Button variant="outline-light" onClick={close}>{d.close}</Button>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 pb-6">
        <div className="rounded-2xl bg-black/60 px-3 py-2 text-white">
          <OptionChips legend={d.heightLegend} options={HEIGHTS} value={height} onChange={setHeight} format={(h) => d.heightLabel(h)} />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline-light" onClick={() => pickRef.current(new THREE.Vector2(0, 0))}>{d.placeHere}</Button>
          <button type="button" onClick={takePhoto} aria-label={d.shutter} className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20 text-3xl backdrop-blur active:bg-white/50"><span aria-hidden>📸</span></button>
        </div>
        {notice && !shot && <p role="status" className="rounded-xl bg-black/70 px-3 py-2 text-sm text-white">{notice}</p>}
      </div>
      {shot && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
        <img src={shot.url} alt={photoAlt} className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={save}>{d.save}</Button>
          <Button size="lg" variant="outline-light" onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); setNotice(''); }}>{d.retake}</Button>
        </div>
        {notice && <p role="status" className="text-sm text-white">{notice}</p>}
        <p className="max-w-md text-center text-xs text-slate-300">{d.saveHint}</p>
      </div>}
    </div>}
  </>;
}
