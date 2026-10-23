import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { movingCells, toGrey } from '../lib/motion';
import { useT } from '../i18n';

const W = 640;
const H = 360;
const GW = 64;
const GH = 36;
const MAX_PARTICLES = 400;

interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number }
type Status = 'idle' | 'starting' | 'running' | CameraProblem;

export default function MotionWall() {
  const d = useT().motionWall;
  useDocumentTitle(d.metaTitle);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const [status, setStatus] = useState<Status>(() => typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle');

  const burst = (x: number, y: number, n: number) => {
    for (let i = 0; i < n && particles.current.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.5 + Math.random() * 2;
      particles.current.push({ x: x * W, y: y * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 1, hue: 190 + Math.random() * 120 });
    }
  };

  // Draw loop: fade the wall, move and paint the particles. The camera, when running, only adds particles.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const small = document.createElement('canvas');
    small.width = GW;
    small.height = GH;
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    let prev: Uint8ClampedArray | null = null;
    let frame = 0;
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (streamRef.current && video && video.readyState >= 2 && frame++ % 2 === 0) {
        sctx.drawImage(video, 0, 0, GW, GH);
        const grey = toGrey(sctx.getImageData(0, 0, GW, GH).data);
        if (prev) for (const c of movingCells(prev, grey, GW, GH, 4, 22).slice(0, 12)) burst(1 - c.x, c.y, 4);
        prev = grey;
      }
      ctx.fillStyle = 'rgba(10, 15, 30, 0.25)';
      ctx.fillRect(0, 0, W, H);
      particles.current = particles.current.filter((p) => p.life > 0.03);
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.02; p.life *= 0.965;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + p.life * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => stop, [stop]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus(window.isSecureContext ? 'no-camera' : 'insecure'); return; }
    try {
      setStatus('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      videoRef.current!.srcObject = stream;
      await videoRef.current!.play();
      setStatus('running');
    } catch (err) {
      stop();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Motion wall camera failed to start', err);
      setStatus(problem);
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    burst((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, 3);
  };
  const problemText: Partial<Record<Status, string>> = { denied: d.denied, 'no-camera': d.noCamera, insecure: d.insecure, error: d.error };

  return <DemoShell d={d}>
    <div className="mt-8 rounded-3xl bg-navy-900 p-3 sm:p-4">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width={W} height={H} onPointerMove={move} aria-label={d.canvasLabel} className="aspect-video w-full touch-none rounded-2xl bg-[#0a0f1e]" />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {status === 'running' ? <Button variant="secondary" onClick={() => { stop(); setStatus('idle'); }}>{d.stopCamera}</Button> : <Button onClick={start} disabled={status === 'starting' || status === 'insecure'}>{status === 'starting' ? d.starting : d.startCamera}</Button>}
      <span className="text-sm text-muted">{status === 'running' ? d.runningHint : d.idleHint}</span>
    </div>
    {problemText[status] && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{problemText[status]}</div>}
    <p className="mt-4 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
