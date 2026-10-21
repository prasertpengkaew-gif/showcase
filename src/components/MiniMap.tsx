import { useEffect, useRef, type MouseEvent, type MutableRefObject } from 'react';
import { CATEGORY_COLOR, HALF, city, riverZ, RIVER_HALF } from '../data/cityMap';
import type { ViewState } from './MapScene';

const EXTENT = HALF + 100;
const SIZE = 168;

interface MiniMapProps {
  viewRef: MutableRefObject<ViewState>;
  shown: ReadonlySet<string>;
  selectedId: string | null;
  startId: string | null;
  night: boolean;
  label: string;
  onPick: (x: number, z: number) => void;
}

/** A flat overview of the city: north is up, the white outline is what the 3D view shows. Click to move there. */
export function MiniMap({ viewRef, shown, selectedId, startId, night, label, onPick }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ shown, selectedId, startId });
  live.current = { shown, selectedId, startId };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const k = SIZE / (EXTENT * 2);
    const px = (x: number) => (x + EXTENT) * k;
    const pz = (z: number) => (z + EXTENT) * k;

    // The parts that never change are drawn once.
    const still = document.createElement('canvas');
    still.width = still.height = SIZE * dpr;
    const s = still.getContext('2d')!;
    s.scale(dpr, dpr);
    const c = night
      ? { ground: '#0b1526', water: '#0a2a4d', park: '#0f3a27', road: '#24365a', building: '#2d4268' }
      : { ground: '#e2e8ef', water: '#a8d0f1', park: '#c3e4c6', road: '#ffffff', building: '#c2cddd' };
    s.fillStyle = c.ground;
    s.fillRect(0, 0, SIZE, SIZE);
    s.fillStyle = c.water;
    s.beginPath();
    for (let x = -EXTENT; x <= EXTENT; x += 20) s.lineTo(px(x), pz(riverZ(x) - RIVER_HALF));
    for (let x = EXTENT; x >= -EXTENT; x -= 20) s.lineTo(px(x), pz(riverZ(x) + RIVER_HALF));
    s.closePath();
    s.fill();
    s.fillStyle = c.park;
    for (const r of city.parks) s.fillRect(px(r.x - r.w / 2), pz(r.z - r.d / 2), r.w * k, r.d * k);
    s.strokeStyle = c.road;
    for (const e of city.edges) {
      const a = city.nodes[e.a];
      const b = city.nodes[e.b];
      s.lineWidth = Math.max(0.8, (e.avenue ? 20 : 10) * k);
      s.beginPath();
      s.moveTo(px(a.x), pz(a.z));
      s.lineTo(px(b.x), pz(b.z));
      s.stroke();
    }
    s.fillStyle = c.building;
    for (const l of city.lots) if (!l.y0) s.fillRect(px(l.x - l.w / 2), pz(l.z - l.d / 2), Math.max(1, l.w * k), Math.max(1, l.d * k));

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.drawImage(still, 0, 0, SIZE, SIZE);
      const { shown: on, selectedId: sel, startId: st } = live.current;
      for (const p of city.pois) {
        const isSel = p.id === sel;
        const isStart = p.id === st;
        if (!on.has(p.id) && !isStart) continue;
        ctx.fillStyle = isStart ? '#ffffff' : CATEGORY_COLOR[p.category];
        ctx.strokeStyle = isSel ? '#ffffff' : 'rgba(11,18,32,0.6)';
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.beginPath();
        ctx.arc(px(p.x), pz(p.z), isSel ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      const v = viewRef.current;
      if (v.footprint?.length === 4) {
        ctx.beginPath();
        v.footprint.forEach(([x, z], i) => {
          const X = Math.min(SIZE, Math.max(0, px(x)));
          const Z = Math.min(SIZE, Math.max(0, pz(z)));
          if (i) ctx.lineTo(X, Z);
          else ctx.moveTo(X, Z);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(37,99,235,0.16)';
        ctx.fill();
        ctx.strokeStyle = night ? '#93c5fd' : '#1d4ed8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [night, viewRef]);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * EXTENT * 2 - EXTENT;
    const z = ((e.clientY - r.top) / r.height) * EXTENT * 2 - EXTENT;
    onPick(Math.max(-HALF, Math.min(HALF, x)), Math.max(-HALF, Math.min(HALF, z)));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="block overflow-hidden rounded-xl border-2 border-white/90 shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-600"
      style={{ width: SIZE, height: SIZE }}
    >
      <canvas ref={canvasRef} aria-hidden style={{ width: SIZE, height: SIZE }} className="block" />
    </button>
  );
}
