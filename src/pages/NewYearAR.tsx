import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { ModelExplorer } from '../components/ModelExplorer';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useModels, useT } from '../i18n';

const GREETINGS = ['th', 'en', 'zh', 'fortune'] as const;
type Greeting = (typeof GREETINGS)[number];
const COLORS = ['#e6a700', '#e11d2e', '#ff7a00', '#d6247a', '#7c3aed'];

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

/** Draws a few firework bursts on the canvas for about four seconds, then clears it. */
function launch(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;
  const sparks: Spark[] = [];
  let frame = 0;
  let raf = 0;
  const burst = () => {
    const cx = w * (0.15 + Math.random() * 0.7);
    const cy = h * (0.12 + Math.random() * 0.4);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const v = 1.5 + Math.random() * 3;
      sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
  };
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    if (frame % 28 === 0 && frame < 200) burst();
    for (const s of sparks) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.vx *= 0.99; s.life *= 0.97;
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame++;
    if (frame < 260) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, w, h);
  };
  tick();
  return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); };
}

export default function NewYearAR() {
  const d = useT().newYear;
  useDocumentTitle(d.metaTitle);
  const reduced = usePrefersReducedMotion();
  const model = useModels().dragon;
  const [greeting, setGreeting] = useState<Greeting>('th');
  const [celebrating, setCelebrating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!celebrating || reduced) return;
    const stop = launch(canvasRef.current!);
    const done = window.setTimeout(() => setCelebrating(false), 4500);
    return () => { stop(); window.clearTimeout(done); };
  }, [celebrating, reduced]);

  return <DemoShell d={d}>
    <div className="mt-8"><OptionChips legend={d.greetingLegend} options={GREETINGS} value={greeting} onChange={setGreeting} format={(g) => d.greetings[g]} /></div>
    <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-b from-[#3a0a10] to-[#12060a] p-3 sm:p-4">
      <p className="px-4 pt-3 pb-5 text-center font-display text-3xl font-extrabold text-[#ffd54a] sm:text-5xl" aria-live="polite">{d.greetings[greeting]}</p>
      <canvas ref={canvasRef} width={900} height={500} aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
      <ModelExplorer model={model} viewerClassName="h-[420px] sm:h-[560px]" />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Button onClick={() => setCelebrating(true)} disabled={celebrating}>{reduced ? d.celebrateStill : d.celebrate}</Button>
      <span className="text-sm text-muted">{d.arHint}</span>
    </div>
    {celebrating && reduced && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 font-semibold text-amber-950">🎆 {d.greetings[greeting]}</p>}
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
