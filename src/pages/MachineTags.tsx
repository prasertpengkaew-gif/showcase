import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../i18n/Link';
import { PageHeader } from '../components/PageHeader';
import { MarkerPanel } from '../components/MarkerPanel';
import { MarkerImage } from '../components/MarkerImage';
import { Button } from '../components/Button';
import { ArrowRightIcon, InfoIcon } from '../components/Icons';
import { useMarkerCamera, type MarkerFrame } from '../hooks/useMarkerCamera';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MACHINE_TAGS } from '../data/tags';
import { createTwinSource, MACHINES, STATUS_COLOR, type MachineReading, type MachineStatus } from '../lib/twin';
import { buildSheet, downloadCanvas } from '../lib/markerSheet';
import type { TrackedMarker } from '../lib/markers';
import { useT } from '../i18n';

const ONLY = new Set(MACHINE_TAGS.map((m) => m.marker));
const SPEC = new Map(MACHINES.map((m) => [m.id, m]));
const MACHINE_OF = new Map(MACHINE_TAGS.map((m) => [m.marker, m.machine]));

/** Small round status icon: tick, pause, exclamation mark or cross, in the status colour. */
function drawStatusIcon(ctx: CanvasRenderingContext2D, status: MachineStatus, x: number, y: number, r: number) {
  ctx.fillStyle = STATUS_COLOR[status];
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = status === 'warning' ? '#0B1220' : '#fff';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (status === 'running') {
    ctx.moveTo(x - r * 0.45, y + r * 0.02);
    ctx.lineTo(x - r * 0.1, y + r * 0.38);
    ctx.lineTo(x + r * 0.5, y - r * 0.34);
    ctx.stroke();
  } else if (status === 'idle') {
    ctx.moveTo(x - r * 0.25, y - r * 0.38);
    ctx.lineTo(x - r * 0.25, y + r * 0.38);
    ctx.moveTo(x + r * 0.25, y - r * 0.38);
    ctx.lineTo(x + r * 0.25, y + r * 0.38);
    ctx.stroke();
  } else if (status === 'warning') {
    ctx.moveTo(x, y - r * 0.5);
    ctx.lineTo(x, y + r * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y + r * 0.42, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(x - r * 0.38, y - r * 0.38);
    ctx.lineTo(x + r * 0.38, y + r * 0.38);
    ctx.moveTo(x + r * 0.38, y - r * 0.38);
    ctx.lineTo(x - r * 0.38, y + r * 0.38);
    ctx.stroke();
  }
}

export default function MachineTags() {
  const t = useT();
  const g = t.machineTags;
  const d = t.twin;
  useDocumentTitle(g.metaTitle);

  const source = useMemo(() => createTwinSource(), []);
  const readingsRef = useRef(new Map<string, MachineReading>());
  const [readings, setReadings] = useState<Record<string, MachineReading>>({});
  const textRef = useRef({ g, d });
  textRef.current = { g, d };

  useEffect(
    () =>
      source.subscribe((snap) => {
        const map = new Map(snap.machines.map((m) => [m.id, m]));
        readingsRef.current = map;
        setReadings(Object.fromEntries(map));
      }),
    [source],
  );

  const drawTag = (ctx: CanvasRenderingContext2D, m: TrackedMarker, f: MarkerFrame) => {
    const id = MACHINE_OF.get(m.id);
    const spec = id && SPEC.get(id);
    if (!spec || m.missed > 3) return;
    const { g: tg, d: td } = textRef.current;
    const reading = readingsRef.current.get(spec.id);
    const status: MachineStatus = reading?.status ?? 'idle';
    const color = STATUS_COLOR[status];
    const u = Math.min(f.width, f.height);
    ctx.save();
    ctx.globalAlpha = m.missed ? 0.5 : 1;

    // Outline the marker in the status colour.
    ctx.beginPath();
    m.corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
    ctx.closePath();
    ctx.lineWidth = u * 0.008;
    ctx.strokeStyle = color;
    ctx.stroke();

    const extra = status === 'warning' || status === 'fault' ? tg[status === 'warning' ? 'actionWarning' : 'actionFault'] : '';
    const cw = u * 0.56;
    const ch = u * (extra ? 0.205 : 0.155);
    const top = Math.min(...m.corners.map((c) => c.y));
    const bottom = Math.max(...m.corners.map((c) => c.y));
    const gap = u * 0.045;
    let cx = Math.min(Math.max(m.center.x - cw / 2, 8), f.width - cw - 8);
    let cy = top - gap - ch;
    const below = cy < 8;
    if (below) cy = Math.min(bottom + gap, f.height - ch - 8);
    cx = Math.round(cx);

    // Connector from the card to the marker.
    ctx.setLineDash([u * 0.01, u * 0.008]);
    ctx.beginPath();
    ctx.moveTo(m.center.x, below ? cy : cy + ch);
    ctx.lineTo(m.center.x, below ? bottom : top);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(11,18,32,0.92)';
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, u * 0.025);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(cx, cy + u * 0.02, u * 0.01, ch - u * 0.04);

    const pad = u * 0.03;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${u * 0.04}px Manrope, "Noto Sans Thai", sans-serif`;
    ctx.fillText(spec.code, cx + pad, cy + u * 0.036);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `500 ${u * 0.026}px Inter, "Noto Sans Thai", sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(td.kinds[spec.kind], cx + cw - pad, cy + u * 0.036);
    ctx.textAlign = 'left';

    drawStatusIcon(ctx, status, cx + pad + u * 0.017, cy + u * 0.09, u * 0.017);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${u * 0.03}px Inter, "Noto Sans Thai", sans-serif`;
    ctx.fillText(td.status[status], cx + pad + u * 0.048, cy + u * 0.09);
    if (reading) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = `500 ${u * 0.026}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${reading.temperature.toFixed(1)} °C · ${reading.throughput}/min`, cx + cw - pad, cy + u * 0.09);
      ctx.textAlign = 'left';
    }
    if (extra) {
      ctx.fillStyle = status === 'warning' ? '#fde68a' : '#fecaca';
      ctx.font = `700 ${u * 0.026}px Inter, "Noto Sans Thai", sans-serif`;
      ctx.fillText(extra, cx + pad, cy + u * 0.15);
    }
    ctx.restore();
  };

  const cam = useMarkerCamera({
    only: ONLY,
    overlay: (ctx, f) => {
      for (const m of f.markers) drawTag(ctx, m, f);
    },
  });

  const visible = cam.ids.map((id) => MACHINE_OF.get(id)).filter((x): x is string => !!x);
  const live = source.state.kind === 'live';
  const trouble = visible.filter((id) => ['warning', 'fault'].includes(readings[id]?.status ?? ''));

  const downloadSheet = () =>
    downloadCanvas(
      buildSheet({
        heading: g.sheetHeading,
        note: g.sheetNote,
        columns: 2,
        cards: MACHINE_TAGS.map((tag) => {
          const spec = SPEC.get(tag.machine)!;
          return { id: tag.marker, title: spec.code, subtitle: d.kinds[spec.kind], color: '#2563EB' };
        }),
      }),
      'thenerdstudio-machine-tags.png',
    );

  return (
    <>
      <PageHeader eyebrow={g.eyebrow} title={g.title} description={g.description} />

      <section className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <p className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="note">
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />
            <span>{live ? d.liveConnected((source.state as { url: string }).url) : `${d.simulatedTitle}. ${d.simulatedText}`}</span>
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <MarkerPanel
              cam={cam}
              label={g.stageLabel}
              idleTitle={g.idleTitle}
              idleText={g.idleText}
              hint={g.hint}
              photoName="thenerdstudio-machine-tags.png"
            >
              <Button variant="ghost" onClick={downloadSheet}>
                {t.markers.downloadSheet}
              </Button>
              {source.injectFault && (
                <>
                  <Button variant="ghost" onClick={() => source.injectFault!(visible[0] ?? 'cnc-1')}>
                    {g.simulate}
                  </Button>
                  <Button variant="ghost" onClick={() => MACHINES.forEach((m) => source.reset(m.id))}>
                    {g.resetAll}
                  </Button>
                </>
              )}
            </MarkerPanel>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-line bg-white p-5">
                <h2 className="font-display text-lg font-bold">{g.detectedTitle}</h2>
                <ul aria-live="polite" className="mt-3 divide-y divide-line text-sm">
                  {visible.length ? (
                    visible.map((id) => {
                      const spec = SPEC.get(id)!;
                      const r = readings[id];
                      return (
                        <li key={id} className="flex items-center justify-between gap-3 py-2">
                          <span className="font-semibold">{spec.code}</span>
                          <span className="flex items-center gap-2 text-slate-700">
                            {r && (
                              <>
                                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />
                                {d.status[r.status]} · {r.temperature.toFixed(1)} °C
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-2 text-muted">{g.noneDetected}</li>
                  )}
                </ul>
              </div>

              {trouble.length > 0 && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950" role="status">
                  <h2 className="font-display text-lg font-bold">{g.stepsTitle}</h2>
                  {trouble.map((id) => {
                    const spec = SPEC.get(id)!;
                    return (
                      <div key={id} className="mt-3">
                        <p className="text-sm font-semibold">
                          {spec.code} · {d.status[readings[id].status]}
                        </p>
                        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-relaxed">
                          {g.steps[spec.kind].map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    );
                  })}
                  <p className="mt-3 text-xs">{g.stepsNote}</p>
                </div>
              )}

              <div className="rounded-2xl border border-line bg-white p-5">
                <h2 className="font-display text-lg font-bold">{t.markers.onScreen}</h2>
                <p className="mt-1 text-sm text-muted">{t.markers.onScreenText}</p>
                <ul className="mt-4 grid grid-cols-3 gap-3">
                  {MACHINE_TAGS.map((tag) => {
                    const spec = SPEC.get(tag.machine)!;
                    return (
                      <li key={tag.marker} className="text-center">
                        <MarkerImage id={tag.marker} size={88} label={t.markers.markerAlt(spec.code)} className="mx-auto" />
                        <span className="mt-1 block text-sm font-semibold">{spec.code}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="tags-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="tags-uses-title" className="font-display text-3xl font-bold">
            {g.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {g.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-muted">{g.realNote}</p>
          <Link to="/digital-twin" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-700 hover:underline">
            {g.twinLink} <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
