import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Button } from '../components/Button';
import { LineChart, type Point } from '../components/LineChart';
import { AlertIcon, CheckIcon, InfoIcon, PauseIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { createTwinSource, MACHINES, type MachineReading, type MachineStatus, type SourceState } from '../lib/twin';
import { useLanguage, useT } from '../i18n';

const TwinScene = lazy(() => import('../components/TwinScene'));
const HISTORY = 60;
const STATUS_COLOR: Record<MachineStatus, string> = { running: '#0ca30c', idle: '#94a3b8', warning: '#fab219', fault: '#d03b3b' };
const STATUS_ICON: Record<MachineStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
  running: CheckIcon,
  idle: PauseIcon,
  warning: AlertIcon,
  fault: AlertIcon,
};

interface LogEntry {
  time: number;
  id: string;
  status: MachineStatus;
}

function StatusBadge({ status, label }: { status: MachineStatus; label: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink">
      <span className="grid h-4 w-4 place-items-center rounded-full text-white" style={{ background: STATUS_COLOR[status] }} aria-hidden>
        <Icon width={11} height={11} strokeWidth={2.5} />
      </span>
      {label}
    </span>
  );
}

export default function DigitalTwin() {
  const t = useT();
  const d = t.twin;
  const { lang } = useLanguage();
  useDocumentTitle(d.metaTitle);
  const reducedMotion = usePrefersReducedMotion();
  const { webgl } = useDeviceCapabilities();

  const source = useMemo(() => createTwinSource(), []);
  const [sourceState, setSourceState] = useState<SourceState>(source.state);
  const [readings, setReadings] = useState<Record<string, MachineReading>>({});
  const [selected, setSelected] = useState<string | null>('press-1');
  const [tempHistory, setTempHistory] = useState<Record<string, Point[]>>({});
  const [outputHistory, setOutputHistory] = useState<Point[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const availability = useRef({ samples: 0, up: 0 });
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const lastStatus = useRef<Record<string, MachineStatus>>({});

  useEffect(
    () =>
      source.subscribe(
        (snap) => {
          // Detect status changes outside state updaters so they are logged exactly once.
          const events: LogEntry[] = [];
          for (const m of snap.machines) {
            const before = lastStatus.current[m.id];
            if (before && before !== m.status) events.push({ time: snap.time, id: m.id, status: m.status });
            lastStatus.current[m.id] = m.status;
          }
          if (events.length) setLog((l) => [...events.reverse(), ...l].slice(0, 12));
          setReadings((prev) => {
            const next = { ...prev };
            for (const m of snap.machines) next[m.id] = m;
            return next;
          });
          setTempHistory((prev) => {
            const next = { ...prev };
            for (const m of snap.machines) next[m.id] = [...(prev[m.id] ?? []), { time: snap.time, value: m.temperature }].slice(-HISTORY);
            return next;
          });
          const packer = snap.machines.find((m) => m.id === 'pack-1');
          if (packer) setOutputHistory((h) => [...h, { time: snap.time, value: packer.throughput }].slice(-HISTORY));
          availability.current.samples++;
          if (!snap.machines.some((m) => m.status === 'fault')) availability.current.up++;
        },
        setSourceState,
      ),
    [source],
  );

  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(lang === 'th' ? 'th-TH' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    [lang],
  );
  const formatTime = useCallback((ts: number) => timeFmt.format(ts), [timeFmt]);

  const list = MACHINES.map((m) => ({ spec: m, reading: readings[m.id] }));
  const running = list.filter((m) => m.reading && (m.reading.status === 'running' || m.reading.status === 'warning')).length;
  const alarms = list.filter((m) => m.reading && (m.reading.status === 'warning' || m.reading.status === 'fault')).length;
  const output = readings['pack-1']?.throughput ?? 0;
  const avail = availability.current.samples ? Math.round((availability.current.up / availability.current.samples) * 100) : 100;
  const sel = MACHINES.find((m) => m.id === selected) ?? null;
  const selReading = sel ? readings[sel.id] : undefined;
  const isLive = sourceState.kind === 'live';

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />

      <section className="bg-surface py-10 sm:py-14">
        <div className="container-page">
          {/* Data source — always visible so simulated numbers are never mistaken for real ones */}
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
              isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            <InfoIcon className="mt-0.5 shrink-0" />
            {sourceState.kind === 'live' ? (
              <p className="font-semibold">{sourceState.connected ? d.liveConnected(sourceState.url) : d.liveDisconnected}</p>
            ) : (
              <p>
                <span className="font-semibold">{d.simulatedTitle}.</span> {d.simulatedText}
              </p>
            )}
          </div>

          {/* KPI tiles */}
          <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{d.kpiOutput}</dt>
              <dd className="mt-1 font-display text-4xl font-bold text-ink">
                {output} <span className="text-base font-medium text-muted">{d.kpiOutputUnit}</span>
              </dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{d.kpiRunning}</dt>
              <dd className="mt-1 font-display text-4xl font-bold text-ink">
                {running} <span className="text-base font-medium text-muted">/ {MACHINES.length}</span>
              </dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{d.kpiAlarms}</dt>
              <dd className="mt-1 flex items-center gap-2 font-display text-4xl font-bold text-ink">
                {alarms}
                {alarms > 0 && <AlertIcon className="text-[#d03b3b]" width={24} height={24} aria-hidden />}
              </dd>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <dt className="text-sm text-muted">{d.kpiAvailability}</dt>
              <dd className="mt-1 font-display text-4xl font-bold text-ink">{avail}%</dd>
            </div>
          </dl>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            {/* 3D view */}
            <div>
              <div
                role="region"
                aria-label={d.sceneLabel}
                className="relative h-[420px] overflow-hidden rounded-2xl border border-line bg-[#eef1f5] sm:h-[540px]"
              >
                {webgl ? (
                  <ErrorBoundary fallback={<p className="absolute inset-0 grid place-items-center p-6 text-sm">{t.vr.renderError}</p>}>
                    <Suspense fallback={null}>
                      <TwinScene
                        readings={readings}
                        selected={selected}
                        onSelect={setSelected}
                        animate={!reducedMotion}
                        labelRefs={labelRefs}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-700">{t.vr.noWebgl}</p>
                )}
                {webgl && (
                  <ul className="pointer-events-none absolute inset-0 overflow-hidden">
                    {MACHINES.map((m, i) => {
                      const status = readings[m.id]?.status ?? 'idle';
                      return (
                        <li
                          key={m.id}
                          ref={(el) => {
                            labelRefs.current[i] = el;
                          }}
                          className="pointer-events-auto absolute top-0 left-0"
                          style={{ visibility: 'hidden' }}
                        >
                          <button
                            type="button"
                            onClick={() => setSelected(m.id)}
                            aria-pressed={selected === m.id}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-md ${
                              selected === m.id ? 'bg-electric-600 text-white' : 'bg-white/95 text-ink'
                            }`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: STATUS_COLOR[status] }} aria-hidden />
                            {m.code}
                            <span className="sr-only"> — {d.status[status]}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-full bg-white/85 px-3.5 py-1.5 text-xs text-slate-700 sm:block">
                  {d.hint}
                </p>
              </div>
            </div>

            {/* Inspector */}
            <aside aria-label={sel ? sel.code : d.selectPrompt} className="flex flex-col gap-4">
              <div className="rounded-2xl border border-line bg-white p-5">
                {sel && selReading ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-display text-xl font-bold">{sel.code}</h2>
                        <p className="text-sm text-muted">{d.kinds[sel.kind]}</p>
                      </div>
                      <StatusBadge status={selReading.status} label={d.status[selReading.status]} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-muted">{d.temperature}</dt>
                        <dd className="mt-0.5 font-display text-lg font-bold">{selReading.temperature.toFixed(1)} °C</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{d.throughput}</dt>
                        <dd className="mt-0.5 font-display text-lg font-bold">{selReading.throughput}/min</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{d.vibration}</dt>
                        <dd className="mt-0.5 font-display text-lg font-bold">{selReading.vibration} mm/s</dd>
                      </div>
                    </dl>
                    <h3 className="mt-5 text-sm font-semibold text-ink">{d.tempChart(sel.code)}</h3>
                    <div className="mt-2">
                      <LineChart
                        data={tempHistory[sel.id] ?? []}
                        label={d.tempChart(sel.code)}
                        unit="°C"
                        threshold={{ value: sel.tempWarn, label: d.warnLimit(sel.tempWarn) }}
                        formatTime={formatTime}
                        height={170}
                      />
                    </div>
                    {selReading.status === 'fault' && !isLive && (
                      <div className="mt-4">
                        <Button variant="secondary" onClick={() => source.reset(sel.id)}>
                          {d.reset}
                        </Button>
                        <p className="mt-2 text-xs text-muted">{d.resetNote}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">{d.selectPrompt}</p>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-white p-5">
                <h2 className="text-sm font-semibold text-ink">{d.alarmsTitle}</h2>
                {log.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">{d.noAlarms}</p>
                ) : (
                  <ol className="mt-3 space-y-2 text-sm" aria-live="polite">
                    {log.slice(0, 6).map((e) => {
                      const code = MACHINES.find((m) => m.id === e.id)?.code ?? e.id;
                      return (
                        <li key={`${e.time}-${e.id}`} className="flex items-start gap-2">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[e.status] }} aria-hidden />
                          <span className="tabular-nums text-muted">{formatTime(e.time)}</span>
                          <span className="text-slate-700">{d.events[e.status](code)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </aside>
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-sm font-semibold text-ink">{d.outputChart}</h2>
              <div className="mt-2">
                <LineChart data={outputHistory} label={d.outputChart} unit="/min" min={0} formatTime={formatTime} height={170} />
              </div>
            </div>

            <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <caption className="px-5 pt-4 text-left text-sm font-semibold text-ink">{d.tableTitle}</caption>
                <thead className="text-xs tracking-wide text-slate-600 uppercase">
                  <tr className="border-b border-line">
                    <th scope="col" className="px-5 py-3 font-semibold">{d.colMachine}</th>
                    <th scope="col" className="px-3 py-3 font-semibold">{d.colStatus}</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">{d.colTemp}</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">{d.colRate}</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">{d.colVib}</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">{d.inspect}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map(({ spec, reading }) => (
                    <tr key={spec.id} className={selected === spec.id ? 'bg-electric-50' : ''}>
                      <th scope="row" className="px-5 py-3 font-semibold text-ink">
                        {spec.code}
                        <span className="block text-xs font-normal text-muted">{d.kinds[spec.kind]}</span>
                      </th>
                      <td className="px-3 py-3">{reading && <StatusBadge status={reading.status} label={d.status[reading.status]} />}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{reading ? `${reading.temperature.toFixed(1)} °C` : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{reading ? `${reading.throughput}/min` : '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{reading ? `${reading.vibration} mm/s` : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(spec.id)}
                          className="rounded-full px-3 py-1 text-xs font-semibold text-electric-700 hover:bg-electric-50"
                        >
                          {d.inspect}
                          <span className="sr-only"> {spec.code}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="twin-connect-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 id="twin-connect-title" className="font-display text-3xl font-bold">
              {d.connectTitle}
            </h2>
            <p className="mt-4 leading-relaxed text-muted">{d.connectText}</p>
            <h3 className="mt-6 text-sm font-semibold text-ink">{d.connectFormat}</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-navy-900 p-4 text-xs leading-relaxed text-slate-200">
              {`{ "machines": [
  { "id": "press-1", "status": "warning",
    "temperature": 86.4, "throughput": 27,
    "vibration": 3.1 }
] }`}
            </pre>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">{d.usesTitle}</h2>
            <ul className="mt-6 space-y-4">
              {d.uses.map((u) => (
                <li key={u.title} className="rounded-2xl border border-line p-5">
                  <h3 className="font-display text-lg font-bold">{u.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{u.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
