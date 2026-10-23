import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { ModelViewer } from '../components/ModelViewer';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { coverRect, floorHit, yawFacingOrigin } from '../lib/arFloor';
import { buildGate, type Gate } from '../lib/halloweenGate';
import { useModels, useT } from '../i18n';

type Mode = 'off' | 'camera' | 'preview';
const HEIGHTS = ['1.2', '1.4', '1.6'] as const;
type Height = (typeof HEIGHTS)[number];
const FOV = 62;
const TAP_SLOP = 8;

interface Runtime {
  height: number;
  placeDir: THREE.Vector3;
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

export default function HalloweenGate() {
  const d = useT().halloween;
  const gateModel = useModels().gate;
  useDocumentTitle(d.metaTitle);
  const [mode, setMode] = useState<Mode>('off');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<CameraProblem | null>(null);
  const [noSensor, setNoSensor] = useState(false);
  const [height, setHeight] = useState<Height>('1.4');
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [notice, setNotice] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const placeRef = useRef<(dir: THREE.Vector3) => void>(() => {});
  const captureRef = useRef<() => Promise<Blob | null>>(async () => null);
  const rt = useRef<Runtime>({ height: 1.4, placeDir: new THREE.Vector3(0, -0.35, -1), alpha0: null, orient: null, yaw: 0, pitch: 0 });

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  const close = useCallback(() => { stopStream(); setMode('off'); setShot((s) => { if (s) URL.revokeObjectURL(s.url); return null; }); setNotice(''); }, [stopStream]);
  useEffect(() => stopStream, [stopStream]);

  const start = async (wanted: Mode) => {
    setProblem(null);
    setNoSensor(false);
    rt.current = { height: Number(height), placeDir: new THREE.Vector3(0, -0.35, -1), alpha0: null, orient: null, yaw: 0, pitch: 0 };
    if (wanted === 'camera') {
      setBusy(true);
      try {
        // iPhones ask for motion access first, and only from a tap.
        const request = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
        if (request) await request.call(DeviceOrientationEvent).catch(() => 'denied');
        if (!navigator.mediaDevices?.getUserMedia) { setProblem(window.isSecureContext ? 'no-camera' : 'insecure'); return; }
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      } catch (err) {
        const p = cameraProblem(err);
        if (p === 'error') console.error('Halloween gate camera failed to start', err);
        setProblem(p);
        return;
      } finally {
        setBusy(false);
      }
    }
    setMode(wanted);
  };

  // The AR scene: camera feed behind, the gate drawn on top, anchored to a spot on the floor.
  useEffect(() => {
    if (mode === 'off') return;
    const canvas = canvasRef.current!;
    const stage = stageRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 60);
    const gate: Gate = buildGate(d.banner);
    scene.add(gate.group);
    const run = rt.current;
    const place = (dir: THREE.Vector3) => {
      run.placeDir.copy(dir);
      const p = floorHit(dir, run.height);
      gate.group.position.set(p.x, -run.height, p.z);
      gate.group.rotation.y = yawFacingOrigin(p.x, p.z);
    };
    placeRef.current = place;
    place(run.placeDir);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      if (run.alpha0 === null) run.alpha0 = e.alpha;
      run.orient = { alpha: e.alpha - run.alpha0, beta: e.beta, gamma: e.gamma };
    };
    window.addEventListener('deviceorientation', onOrient);
    const noSensorTimer = window.setTimeout(() => { if (!run.orient) setNoSensor(true); }, 1500);

    const video = videoRef.current!;
    if (mode === 'camera' && streamRef.current) { video.srcObject = streamRef.current; void video.play().catch(() => {}); }

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (run.orient) orientationQuaternion(camera.quaternion, run.orient.alpha, run.orient.beta, run.orient.gamma, screen.orientation?.angle ?? 0);
      else camera.quaternion.setFromEuler(new THREE.Euler(run.pitch, run.yaw, 0, 'YXZ'));
      gate.update(clock.getElapsedTime());
      renderer.render(scene, camera);
    };
    tick();

    captureRef.current = async () => {
      renderer.render(scene, camera);
      const gl = renderer.domElement;
      const out = document.createElement('canvas');
      out.width = gl.width;
      out.height = gl.height;
      const ctx = out.getContext('2d')!;
      if (mode === 'camera' && video.videoWidth) {
        const r = coverRect(video.videoWidth, video.videoHeight, out.width, out.height);
        ctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, out.width, out.height);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, out.height);
        g.addColorStop(0, '#1b0b2e');
        g.addColorStop(1, '#3a1650');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, out.width, out.height);
      }
      ctx.drawImage(gl, 0, 0);
      ctx.font = `700 ${Math.round(out.width * 0.035)}px system-ui, "Noto Sans Thai", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(d.photoCaption, out.width / 2, out.height - out.width * 0.05);
      return new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
    };

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(noSensorTimer);
      window.removeEventListener('deviceorientation', onOrient);
      observer.disconnect();
      video.srcObject = null;
      gate.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, [mode, d.banner, d.photoCaption]);

  // Changing the phone height moves the gate to the matching spot on the floor.
  useEffect(() => { rt.current.height = Number(height); placeRef.current(rt.current.placeDir); }, [height, mode]);

  // A tap places the gate where that part of the picture meets the floor; a drag looks around when there is no sensor.
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => { pointer.current = { x: e.clientX, y: e.clientY, moved: false }; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const p = pointer.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.hypot(dx, dy) > TAP_SLOP) p.moved = true;
    if (p.moved && !rt.current.orient) {
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
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    const probe = new THREE.PerspectiveCamera(FOV, rect.width / rect.height, 0.05, 60);
    // Rebuild the camera pose the render loop is using, then cast a ray through the tapped point.
    const q = new THREE.Quaternion();
    const run = rt.current;
    if (run.orient) orientationQuaternion(q, run.orient.alpha, run.orient.beta, run.orient.gamma, screen.orientation?.angle ?? 0);
    else q.setFromEuler(new THREE.Euler(run.pitch, run.yaw, 0, 'YXZ'));
    probe.quaternion.copy(q);
    probe.updateMatrixWorld();
    const dir = new THREE.Vector3(ndc.x, ndc.y, 0.5).unproject(probe).normalize();
    placeRef.current(dir);
  };
  const placeCentre = () => {
    const q = new THREE.Quaternion();
    const run = rt.current;
    if (run.orient) orientationQuaternion(q, run.orient.alpha, run.orient.beta, run.orient.gamma, screen.orientation?.angle ?? 0);
    else q.setFromEuler(new THREE.Euler(run.pitch, run.yaw, 0, 'YXZ'));
    placeRef.current(new THREE.Vector3(0, 0, -1).applyQuaternion(q));
  };

  const takePhoto = async () => {
    const blob = await captureRef.current();
    if (!blob) { setNotice(d.photoFailed); return; }
    setShot((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), blob }; });
  };
  const save = async () => {
    if (!shot) return;
    const file = new File([shot.blob], 'halloween-gate.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: d.metaTitle }); setNotice(d.shared); } catch (err) { if ((err as Error).name !== 'AbortError') setNotice(d.photoFailed); }
      return;
    }
    Object.assign(document.createElement('a'), { href: shot.url, download: 'halloween-gate.jpg' }).click();
    setNotice(d.downloaded);
  };

  const problemText: Partial<Record<CameraProblem, string>> = { denied: d.denied, 'no-camera': d.noCamera, insecure: d.insecure, error: d.error };

  return <DemoShell d={d}>
    <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-bold">{d.realTitle}</h2>
      <p className="mt-2 max-w-2xl text-muted">{d.realText}</p>
      <div className="mt-6"><ModelViewer model={gateModel} className="h-[420px] sm:h-[520px]" label={d.canvasLabel} /></div>
    </div>
    <div className="mt-8 rounded-3xl bg-gradient-to-b from-[#1b0b2e] to-[#3a1650] p-6 text-white sm:p-10">
      <p className="font-display text-3xl font-extrabold text-[#ff9a1f] sm:text-4xl">🎃 {d.startTitle}</p>
      <p className="mt-3 max-w-2xl text-slate-200">{d.startText}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => start('camera')} disabled={busy}>{busy ? d.starting : d.startAr}</Button>
        <Button size="lg" variant="outline-light" onClick={() => start('preview')} disabled={busy}>{d.startPreview}</Button>
      </div>
      {problem && <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{problemText[problem]} <button type="button" className="font-semibold underline" onClick={() => start('preview')}>{d.startPreview}</button></div>}
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>

    {mode !== 'off' && <div role="dialog" aria-modal="true" aria-label={d.dialogLabel} className="fixed inset-0 z-50 bg-black">
      <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#1b0b2e] to-[#3a1650]">
        <video ref={videoRef} className={`absolute inset-0 h-full w-full object-cover ${mode === 'camera' ? '' : 'hidden'}`} playsInline muted />
        <canvas ref={canvasRef} aria-label={d.canvasLabel} className="absolute inset-0 h-full w-full touch-none" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
      </div>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <p className="max-w-[70%] rounded-xl bg-black/60 px-3 py-2 text-sm text-white">{noSensor && mode === 'camera' ? d.noSensor : mode === 'preview' ? d.previewHint : d.tapHint}</p>
        <Button variant="outline-light" onClick={close}>{d.close}</Button>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 pb-6">
        <div className="rounded-2xl bg-black/60 px-3 py-2 text-white">
          <OptionChips legend={d.heightLegend} options={HEIGHTS} value={height} onChange={setHeight} format={(h) => d.heightLabel(h)} />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline-light" onClick={placeCentre}>{d.placeHere}</Button>
          <button type="button" onClick={takePhoto} aria-label={d.shutter} className="grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-white/20 text-3xl backdrop-blur active:bg-white/50"><span aria-hidden>📸</span></button>
        </div>
        {notice && !shot && <p role="status" className="rounded-xl bg-black/70 px-3 py-2 text-sm text-white">{notice}</p>}
      </div>
      {shot && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
        <img src={shot.url} alt={d.photoAlt} className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={save}>{d.save}</Button>
          <Button size="lg" variant="outline-light" onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); setNotice(''); }}>{d.retake}</Button>
        </div>
        {notice && <p role="status" className="text-sm text-white">{notice}</p>}
        <p className="max-w-md text-center text-xs text-slate-300">{d.saveHint}</p>
      </div>}
    </div>}
  </DemoShell>;
}
