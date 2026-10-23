import { useRef, useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { checkIn, createDraw, draw, eligible } from '../lib/luckyDraw';
import { useT } from '../i18n';

const COLORS = ['#2563eb', '#0ea5e9', '#7c3aed', '#db2777', '#f59e0b', '#10b981'];
const SPIN_MS = 4000;

/** One wheel slice as an SVG path, starting at the top and going clockwise. */
const slice = (i: number, n: number) => {
  if (n === 1) return 'M0 0 m-100 0 a100 100 0 1 0 200 0 a100 100 0 1 0 -200 0';
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  return `M0 0 L${100 * Math.cos(a0)} ${100 * Math.sin(a0)} A100 100 0 ${n === 2 ? 1 : 0} 1 ${100 * Math.cos(a1)} ${100 * Math.sin(a1)} Z`;
};

export default function LuckyDraw() {
  const d = useT().luckyDraw;
  useDocumentTitle(d.metaTitle);
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState(() => d.samples.reduce(checkIn, createDraw()));
  const [name, setName] = useState('');
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [announce, setAnnounce] = useState('');
  const timer = useRef(0);
  const pool = eligible(state);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const next = checkIn(state, name);
    setAnnounce(next === state ? d.joinRejected : d.joined(name.trim()));
    if (next !== state) { setState(next); setName(''); }
  };
  const spin = () => {
    if (spinning || !pool.length) return;
    const result = draw(state, Math.random);
    const index = pool.indexOf(result.winner!);
    // The wheel shows everyone still in the draw, so the winner's slice is turned under the pointer at the top.
    const target = 360 * 5 + 360 - ((index + 0.5) / pool.length) * 360;
    const finish = () => { setState(result.state); setSpinning(false); setAnnounce(d.winnerIs(result.winner!)); };
    setSpinning(true);
    setAngle((a) => a - (a % 360) + target);
    if (reduced) finish(); else timer.current = window.setTimeout(finish, SPIN_MS);
  };

  return <DemoShell d={d}>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 rounded-3xl border border-line bg-white p-6 text-center sm:p-8">
        <div className="relative mx-auto w-full max-w-sm">
          <div aria-hidden className="absolute top-0 left-1/2 z-10 -translate-x-1/2 text-3xl leading-none text-rose-600">▼</div>
          <svg viewBox="-105 -105 210 210" className="mx-auto w-full" role="img" aria-label={d.wheelLabel(pool.length)}>
            <g style={{ transform: `rotate(${angle}deg)`, transition: reduced ? 'none' : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.1, 1)` }}>
              {pool.map((n, i) => {
                const mid = ((i + 0.5) / pool.length) * 2 * Math.PI - Math.PI / 2;
                return <g key={n}><path d={slice(i, pool.length)} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1" />
                  {pool.length <= 14 && <text x={62 * Math.cos(mid)} y={62 * Math.sin(mid)} fill="#fff" fontSize="7" fontWeight="700" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(mid * 180) / Math.PI + 90} ${62 * Math.cos(mid)} ${62 * Math.sin(mid)})`}>{n.slice(0, 10)}</text>}
                </g>;
              })}
            </g>
          </svg>
        </div>
        <Button className="mt-6" size="lg" onClick={spin} disabled={spinning || pool.length === 0}>{spinning ? d.spinning : d.spin}</Button>
        <p className="sr-only" aria-live="polite">{announce}</p>
        {state.winners.length > 0 && <div className="mt-6 text-left"><h2 className="font-display text-xl font-bold">{d.winnersTitle}</h2>
          <ol className="mt-3 grid gap-2">{state.winners.map((w, i) => <li key={w} className="rounded-xl bg-emerald-50 px-4 py-2 font-semibold text-emerald-900">🏆 {i + 1}. {w}</li>)}</ol></div>}
        {pool.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-slate-700">{d.empty}</p>}
      </div>
      <form onSubmit={join} className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{d.joinTitle}</h2>
        <p className="mt-2 text-muted">{d.joinText}</p>
        <label className="mt-5 block text-sm font-semibold">{d.nameLabel}<input className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" /></label>
        <Button className="mt-5" type="submit">{d.joinButton}</Button>
        {announce && <p className="mt-3 text-sm text-muted">{announce}</p>}
        <p className="mt-6 text-sm font-semibold">{d.entrants(state.entrants.length, pool.length)}</p>
      </form>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
