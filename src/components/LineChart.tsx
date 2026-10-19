import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';

export interface Point {
  time: number;
  value: number;
}

interface LineChartProps {
  data: Point[];
  /** Accessible name; the chart title is rendered by the parent. */
  label: string;
  unit: string;
  /** Optional reference line, e.g. a warning limit. */
  threshold?: { value: number; label: string };
  height?: number;
  /** Lower bound of the y axis (defaults to the data minimum, padded). */
  min?: number;
  formatTime: (t: number) => string;
}

const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

function niceTicks(lo: number, hi: number, count = 4) {
  const span = hi - lo || 1;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step;
  const nice = err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1;
  const s = nice * step;
  const start = Math.floor(lo / s) * s;
  const ticks: number[] = [];
  for (let v = start; v <= hi + s * 0.5; v += s) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

/** Single-series line chart with recessive grid, crosshair tooltip and an optional threshold line. */
export function LineChart({ data, label, unit, threshold, height = 180, min, formatTime }: LineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { ticks, x, y, path, area } = useMemo(() => {
    const values = data.map((d) => d.value).concat(threshold ? [threshold.value] : []);
    const lo = min ?? Math.min(...values, 0);
    const hi = Math.max(...values, lo + 1);
    const ticks = niceTicks(lo, hi * 1.05);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const t0 = data[0]?.time ?? 0;
    const t1 = data[data.length - 1]?.time ?? 1;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = (t: number) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
    const y = (v: number) => PAD.top + (1 - (v - yMin) / Math.max(1e-6, yMax - yMin)) * innerH;
    const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.time).toFixed(1)},${y(d.value).toFixed(1)}`).join('');
    const area = data.length
      ? `${path}L${x(t1).toFixed(1)},${y(yMin).toFixed(1)}L${x(t0).toFixed(1)},${y(yMin).toFixed(1)}Z`
      : '';
    return { ticks, x, y, path, area };
  }, [data, width, height, threshold, min]);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    if (!data.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + PAD.left;
    let best = 0;
    for (let i = 1; i < data.length; i++) if (Math.abs(x(data[i].time) - px) < Math.abs(x(data[best].time) - px)) best = i;
    setHover(best);
  };

  const h = hover !== null ? data[hover] : null;
  const last = data[data.length - 1];

  return (
    <div ref={wrapRef} className="relative w-full min-w-0 overflow-hidden">
      <svg width={width} height={height} role="img" aria-label={`${label}: ${last ? `${last.value} ${unit}` : '—'}`} className="block">
        {ticks.map((tk) => (
          <g key={tk}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tk)} y2={y(tk)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(tk)} textAnchor="end" dominantBaseline="middle" className="fill-slate-500 text-[11px] tabular-nums">
              {tk}
            </text>
          </g>
        ))}
        {data.length > 1 && (
          <>
            <text x={PAD.left} y={height - 6} className="fill-slate-500 text-[11px]">
              {formatTime(data[0].time)}
            </text>
            <text x={width - PAD.right} y={height - 6} textAnchor="end" className="fill-slate-500 text-[11px]">
              {formatTime(last.time)}
            </text>
          </>
        )}
        {threshold && (
          <g>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(threshold.value)}
              y2={y(threshold.value)}
              stroke="#b45309"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <text x={width - PAD.right} y={y(threshold.value) - 5} textAnchor="end" className="fill-amber-800 text-[11px] font-medium">
              {threshold.label}
            </text>
          </g>
        )}
        <path d={area} fill="#2563EB" opacity={0.08} />
        <path d={path} fill="none" stroke="#2563EB" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {last && <circle cx={x(last.time)} cy={y(last.value)} r={4} fill="#2563EB" stroke="#fff" strokeWidth={2} />}
        {h && (
          <g pointerEvents="none">
            <line x1={x(h.time)} x2={x(h.time)} y1={PAD.top} y2={height - PAD.bottom} stroke="#94a3b8" strokeWidth={1} />
            <circle cx={x(h.time)} cy={y(h.value)} r={5} fill="#2563EB" stroke="#fff" strokeWidth={2} />
          </g>
        )}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={Math.max(0, width - PAD.left - PAD.right)}
          height={Math.max(0, height - PAD.top - PAD.bottom)}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: Math.min(Math.max(0, x(h.time) - 50), width - 110) }}
        >
          <span className="font-semibold tabular-nums">
            {h.value} {unit}
          </span>
          <span className="ml-2 text-slate-300">{formatTime(h.time)}</span>
        </div>
      )}
    </div>
  );
}
