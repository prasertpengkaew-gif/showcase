import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { Button, ButtonLink } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { AlertIcon, CheckIcon, ClockIcon, InfoIcon, PauseIcon, PlayIcon, RotateIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { SAMPLE_SHIPMENTS, STATUSES, advance, delayMinutes, etaHours, kpis, progress, statusOf, type Shipment, type ShipmentStatus } from '../lib/tms';
import { useLanguage, useT } from '../i18n';

/** One real second moves the simulated clock this many hours. */
const HOURS_PER_TICK = 0.1;
const FILTERS = ['all', ...STATUSES] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_COLOR: Record<ShipmentStatus, string> = { scheduled: '#64748b', inTransit: '#2563eb', delayed: '#b45309', delivered: '#0c7a0c' };
const STATUS_ICON: Record<ShipmentStatus, ComponentType<SVGProps<SVGSVGElement>>> = { scheduled: ClockIcon, inTransit: PlayIcon, delayed: AlertIcon, delivered: CheckIcon };

function StatusBadge({ status, label }: { status: ShipmentStatus; label: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink">
      <span className="grid h-4 w-4 place-items-center rounded-full text-white" style={{ background: STATUS_COLOR[status] }} aria-hidden>
        <Icon width={10} height={10} strokeWidth={2.5} />
      </span>
      {label}
    </span>
  );
}

export default function TMS() {
  const d = useT().tms;
  const { lang } = useLanguage();
  useDocumentTitle(d.metaTitle);
  const reducedMotion = usePrefersReducedMotion();

  const [shipments, setShipments] = useState<Shipment[]>(SAMPLE_SHIPMENTS);
  const [hours, setHours] = useState(0);
  const [running, setRunning] = useState(!reducedMotion);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState(SAMPLE_SHIPMENTS[0].id);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setShipments((list) => advance(list, HOURS_PER_TICK));
      setHours((h) => h + HOURS_PER_TICK);
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const reset = () => {
    setShipments(SAMPLE_SHIPMENTS);
    setHours(0);
  };

  const k = useMemo(() => kpis(shipments), [shipments]);
  const shown = shipments.filter((s) => filter === 'all' || statusOf(s) === filter);
  const selected = shipments.find((s) => s.id === selectedId) ?? shipments[0];
  const selStatus = statusOf(selected);
  const selProgress = progress(selected);
  const stops = [
    { name: selected.origin[lang], at: 0 },
    { name: selected.via[lang], at: 0.5 },
    { name: selected.destination[lang], at: 1 },
  ];

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />

      <section aria-labelledby="tms-demo" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="tms-demo" className="sr-only">
            {d.demoTitle}
          </h2>
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-slate-700">
            <InfoIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-electric-700" />
            <p>
              <span className="font-semibold">{d.simulatedTitle}.</span> {d.simulatedText}
            </p>
          </div>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: d.kpiActive, value: String(k.active) },
              { label: d.kpiDelayed, value: String(k.delayed) },
              { label: d.kpiDelivered, value: String(k.delivered) },
              { label: d.kpiOnTime, value: k.onTimeRate === null ? '–' : `${k.onTimeRate}%` },
            ].map((tile) => (
              <div key={tile.label} className="rounded-2xl border border-line bg-white p-5">
                <dt className="text-sm text-muted">{tile.label}</dt>
                <dd className="mt-1 font-display text-3xl font-bold text-ink">{tile.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <OptionChips legend={d.filterLegend} options={FILTERS} value={filter} onChange={setFilter} format={(f) => (f === 'all' ? d.filterAll : d.status[f])} />
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted" aria-live="off">
                {d.clock(Math.floor(hours), Math.round((hours % 1) * 60))}
              </p>
              <Button variant="ghost" onClick={() => setRunning((r) => !r)} icon={running ? <PauseIcon aria-hidden width={16} height={16} /> : <PlayIcon aria-hidden width={16} height={16} />}>
                {running ? d.pause : d.resume}
              </Button>
              <Button variant="ghost" onClick={reset} icon={<RotateIcon aria-hidden width={16} height={16} />}>
                {d.reset}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div>
              <h3 className="sr-only">{d.listTitle}</h3>
              {shown.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line p-6 text-muted">{d.noMatch}</p>
              ) : (
                <ul className="space-y-3">
                  {shown.map((s) => {
                    const st = statusOf(s);
                    const pct = Math.round(progress(s) * 100);
                    const delay = delayMinutes(s);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          aria-pressed={s.id === selected.id}
                          className="w-full rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-electric-600 focus-visible:ring-offset-2 focus-visible:outline-none aria-pressed:border-navy-900 aria-pressed:ring-1 aria-pressed:ring-navy-900"
                        >
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-display text-base font-bold text-ink">
                              {s.id} <span className="font-sans text-sm font-medium text-muted">· {s.customer}</span>
                            </span>
                            <StatusBadge status={st} label={d.status[st]} />
                          </span>
                          <span className="mt-1 block text-sm text-slate-700">
                            {s.origin[lang]} → {s.destination[lang]}
                          </span>
                          <span
                            role="progressbar"
                            aria-label={d.progressLabel(s.id)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={pct}
                            className="mt-3 block h-2 overflow-hidden rounded-full bg-slate-100"
                          >
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLOR[st] }} />
                          </span>
                          <span className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted">
                            <span>{pct}%</span>
                            <span>{st === 'delivered' ? (delay >= 30 ? d.arrivedLate(delay) : d.arrivedOnTime) : st === 'scheduled' ? d.notDeparted : delay > 0 ? d.behind(delay) : d.onSchedule}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <aside aria-labelledby="tms-detail" className="h-fit rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-24">
              <h3 id="tms-detail" className="font-display text-lg font-bold">
                {d.detailTitle}: {selected.id}
              </h3>
              <p className="mt-1 text-sm text-muted">{selected.customer}</p>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted">{d.vehicle}</dt>
                  <dd className="font-semibold text-ink">{selected.vehicle}</dd>
                </div>
                <div>
                  <dt className="text-muted">{d.distance}</dt>
                  <dd className="font-semibold text-ink">{selected.distanceKm} km</dd>
                </div>
                <div>
                  <dt className="text-muted">{d.eta}</dt>
                  <dd className="font-semibold text-ink">{selStatus === 'delivered' ? d.arrived : d.etaValue(Math.floor(etaHours(selected)), Math.round((etaHours(selected) % 1) * 60))}</dd>
                </div>
                <div>
                  <dt className="text-muted">{d.statusLabel}</dt>
                  <dd>
                    <StatusBadge status={selStatus} label={d.status[selStatus]} />
                  </dd>
                </div>
              </dl>
              <h4 className="mt-6 text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.stops}</h4>
              <ol className="mt-3 space-y-3">
                {stops.map((stop) => {
                  const done = selProgress >= stop.at && selStatus !== 'scheduled';
                  return (
                    <li key={stop.at} className="flex items-center gap-3 text-sm">
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2"
                        style={done ? { background: STATUS_COLOR.delivered, borderColor: STATUS_COLOR.delivered, color: '#fff' } : { borderColor: '#cbd5e1' }}
                      >
                        {done && <CheckIcon width={11} height={11} strokeWidth={3} />}
                      </span>
                      <span className={done ? 'font-semibold text-ink' : 'text-muted'}>{stop.name}</span>
                      <span className="sr-only">{done ? d.stopDone : d.stopNext}</span>
                    </li>
                  );
                })}
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <section aria-labelledby="tms-read" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="tms-read" eyebrow={d.readEyebrow} title={d.readTitle} description={d.readText} />
          <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {d.read.map((r) => (
              <div key={r.title}>
                <dt className="font-display text-lg font-bold">{r.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="tms-roles" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="tms-roles" eyebrow={d.rolesEyebrow} title={d.rolesTitle} />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {d.roles.map((r) => (
              <li key={r.title} className="rounded-2xl border border-line bg-surface p-6">
                <h3 className="font-display text-lg font-bold">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="tms-flow" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="tms-flow" eyebrow={d.flowEyebrow} title={d.flowTitle} />
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {d.flow.map((f, i) => (
              <li key={f.title} className="border-t-2 border-electric-600 pt-5">
                <p className="font-display text-sm font-bold text-electric-700">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-3xl text-muted">{d.flowNote}</p>
        </div>
      </section>

      <section aria-labelledby="tms-features" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="tms-features" eyebrow={d.featuresEyebrow} title={d.featuresTitle} description={d.featuresText} />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {d.features.map((f) => (
              <div key={f.title} className="border-t-2 border-electric-600 pt-5">
                <dt className="font-display text-lg font-bold">{f.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="tms-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="tms-cta" className="font-display text-3xl font-bold">
              {d.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-slate-300">{d.ctaText}</p>
          </div>
          <ButtonLink to="/contact" size="lg">
            {d.ctaContact}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
