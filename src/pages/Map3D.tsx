import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MiniMap } from '../components/MiniMap';
import type { MapApi, ViewState } from '../components/MapScene';
import { CategoryIcon, InfoIcon, MinusIcon, MoonIcon, PlusIcon, RotateIcon, SearchIcon, SunIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { ACCESS, CATEGORIES, CATEGORY_COLOR, city, poiById, type Category, type Poi } from '../data/cityMap';
import { readableOn } from '../lib/color';
import { nearby, route as findRoute, shortestPaths, walkshed, WALK_BANDS, WALK_M_PER_MIN } from '../lib/cityGraph';
import { useLanguage, useT } from '../i18n';

const MapScene = lazy(() => import('../components/MapScene'));
const BAND_COLORS = ['#22d3ee', '#3b82f6', '#8b5cf6'];
const EMPTY_VIEW: ViewState = { x: 0, z: 0, azimuth: 0, polar: 0.95, distance: 1750, footprint: [] };

/** Round to a whole minute (at least 1) or to 5 m for display. */
const minutes = (m: number) => Math.max(1, Math.round(m));

function Pin({ poi, category, active, start }: { poi: Poi; category: Category; active: boolean; start: boolean }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full ring-2 ring-white"
      style={{
        background: start ? '#0B1220' : CATEGORY_COLOR[category],
        color: start ? '#ffffff' : readableOn(CATEGORY_COLOR[category]),
        boxShadow: active ? '0 0 0 3px #2563EB' : undefined,
      }}
      data-poi={poi.id}
    >
      <CategoryIcon category={category} width={15} height={15} />
    </span>
  );
}

export default function Map3D() {
  const t = useT();
  const m = t.map3d;
  const { lang } = useLanguage();
  useDocumentTitle(m.metaTitle);
  const { webgl } = useDeviceCapabilities();
  const reducedMotion = usePrefersReducedMotion();

  const [night, setNight] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<Set<Category>>(() => new Set(CATEGORIES));
  const [selectedId, setSelectedId] = useState<string | null>('grand-mall');
  const [startId, setStartId] = useState<string | null>('central-station');
  const [showRoute, setShowRoute] = useState(true);
  const [showWalk, setShowWalk] = useState(true);
  const [vehicles, setVehicles] = useState(!reducedMotion);
  const [announce, setAnnounce] = useState('');

  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const viewRef = useRef<ViewState>(EMPTY_VIEW);
  const apiRef = useRef<MapApi | null>(null);
  const compassRef = useRef<SVGSVGElement>(null);

  const name = (p: Poi) => p.name[lang];
  const selected = selectedId ? poiById.get(selectedId) ?? null : null;
  const start = startId ? poiById.get(startId) ?? null : null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return new Set(
      city.pois
        .filter((p) => active.has(p.category) && (!q || p.name.en.toLowerCase().includes(q) || p.name.th.toLowerCase().includes(q)))
        .map((p) => p.id),
    );
  }, [query, active]);

  // Everything below is computed on the street network of the sample city.
  const fromStart = useMemo(() => (start ? shortestPaths(start.door) : null), [start]);
  const fromSelected = useMemo(() => (selected ? shortestPaths(selected.door) : null), [selected]);
  const routeInfo = useMemo(
    () => (start && selected && start.id !== selected.id && fromStart ? findRoute(start.id, selected.id, fromStart) : null),
    [start, selected, fromStart],
  );
  const route = showRoute ? routeInfo : null;
  const walkPieces = useMemo(() => (showWalk && selected ? walkshed(selected.id) : null), [showWalk, selected]);
  const around = useMemo(() => (selected && fromSelected ? nearby(selected.id, 10, fromSelected) : []), [selected, fromSelected]);
  const minutesFromStart = (p: Poi) => (fromStart && start && p.id !== start.id ? (fromStart.dist[p.door] + 2 * ACCESS) / WALK_M_PER_MIN : 0);

  const select = (id: string) => {
    const p = poiById.get(id);
    if (!p) return;
    setSelectedId(id);
    setAnnounce(m.announceSelected(name(p)));
    apiRef.current?.flyTo(p.x, p.z, 460);
  };

  const toggleCategory = (c: Category) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  // The compass needle follows the map's rotation.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = compassRef.current;
      if (el) el.style.transform = `rotate(${(viewRef.current.azimuth * 180) / Math.PI}deg)`;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const iconBtn =
    'grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-600';
  const textBtn = 'h-10 rounded-full bg-white/95 px-3.5 text-sm font-semibold text-ink shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-600';
  const api = () => apiRef.current;

  return (
    <>
      <PageHeader eyebrow={m.eyebrow} title={m.title} description={m.description} />

      <section className="bg-surface py-10 sm:py-14">
        <div className="container-page">
          <p role="note" className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />
            <span>
              <strong className="font-semibold">{m.sampleTitle}.</strong> {m.sampleText}
            </span>
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
            {/* The map */}
            <div>
              <div
                className="relative h-[480px] overflow-hidden rounded-2xl border border-line sm:h-[620px]"
                style={{ background: night ? '#050b18' : '#d3e2f3' }}
              >
                {webgl ? (
                  <ErrorBoundary fallback={<p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-700">{m.renderError}</p>}>
                    <Suspense
                      fallback={
                        <div className="absolute inset-0 grid place-items-center" role="status">
                          <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-400/30 border-t-electric-600" />
                          <span className="sr-only">{t.nav.loadingPage}</span>
                        </div>
                      }
                    >
                      <MapScene
                        night={night}
                        shown={shown}
                        selectedId={selectedId}
                        startId={startId}
                        route={route}
                        walkPieces={walkPieces}
                        vehicles={vehicles}
                        animate={!reducedMotion}
                        labelRefs={labelRefs}
                        viewRef={viewRef}
                        apiRef={apiRef}
                        label={m.sceneLabel}
                      />
                    </Suspense>
                  </ErrorBoundary>
                ) : (
                  <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-slate-700">{m.noWebgl}</p>
                )}

                {/* Labels that follow the places on the map */}
                {webgl && (
                  <ul className="pointer-events-none absolute inset-0 isolate z-[1] overflow-hidden">
                    {city.pois.map((p, i) => {
                      const isStart = p.id === startId;
                      const isSel = p.id === selectedId;
                      if (!shown.has(p.id) && !isStart) return null;
                      return (
                        <li
                          key={p.id}
                          ref={(el) => void (labelRefs.current[i] = el)}
                          className="group pointer-events-auto absolute top-0 left-0"
                          style={{ visibility: 'hidden' }}
                          data-near="0"
                        >
                          <button
                            type="button"
                            onClick={() => select(p.id)}
                            aria-pressed={isSel}
                            className={`inline-flex items-center gap-1.5 rounded-full p-0.5 text-xs font-semibold whitespace-nowrap shadow-md ${
                              isSel ? 'bg-electric-600 text-white' : 'bg-white/95 text-ink'
                            }`}
                          >
                            <Pin poi={p} category={p.category} active={isSel} start={isStart} />
                            <span className={isSel || isStart ? 'pr-2' : 'sr-only group-data-[near=1]:not-sr-only group-data-[near=1]:pr-2'}>{name(p)}</span>
                            {isStart && <span className="sr-only"> — {m.isStart}</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Controls */}
                {webgl && (
                  <>
                    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setNight((n) => !n)} aria-pressed={night} className={`${textBtn} inline-flex items-center gap-2`}>
                        {night ? <MoonIcon width={17} height={17} /> : <SunIcon width={17} height={17} />}
                        <span className="sr-only">{m.modeLabel}: </span>
                        {night ? m.night : m.day}
                      </button>
                    </div>
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => api()?.setView('iso')} className={textBtn}>
                          {m.view3d}
                        </button>
                        <button type="button" onClick={() => api()?.setView('top')} className={textBtn}>
                          {m.viewTop}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => api()?.rotate(-0.4)} className={iconBtn}>
                          <RotateIcon width={18} height={18} style={{ transform: 'scaleX(-1)' }} />
                          <span className="sr-only">{m.rotateLeft}</span>
                        </button>
                        <button type="button" onClick={() => api()?.rotate(0.4)} className={iconBtn}>
                          <RotateIcon width={18} height={18} />
                          <span className="sr-only">{m.rotateRight}</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => api()?.zoom(0.65)} className={iconBtn}>
                          <PlusIcon width={18} height={18} />
                          <span className="sr-only">{m.zoomIn}</span>
                        </button>
                        <button type="button" onClick={() => api()?.zoom(1.55)} className={iconBtn}>
                          <MinusIcon width={18} height={18} />
                          <span className="sr-only">{m.zoomOut}</span>
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10">
                      <MiniMap
                        viewRef={viewRef}
                        shown={shown}
                        selectedId={selectedId}
                        startId={startId}
                        night={night}
                        label={m.minimap}
                        onPick={(x, z) => api()?.flyTo(x, z, Math.min(900, Math.max(300, viewRef.current.distance)))}
                      />
                    </div>
                    <div className="absolute right-3 bottom-3 z-10 flex items-center gap-2">
                      <button type="button" onClick={() => api()?.reset()} className={textBtn}>
                        {m.resetView}
                      </button>
                      <button type="button" onClick={() => api()?.resetNorth()} className={`${iconBtn} relative`}>
                        <svg ref={compassRef} viewBox="0 0 24 24" width="24" height="24" aria-hidden className="transition-none">
                          <path d="M12 3l4 9h-8z" fill="#dc2626" />
                          <path d="M12 21l-4-9h8z" fill="#64748b" />
                        </svg>
                        <span className="sr-only">
                          {m.compass}: {m.resetNorth}
                        </span>
                      </button>
                    </div>
                    <p className="pointer-events-none absolute right-0 bottom-[3.8rem] left-0 z-10 mx-auto hidden w-fit rounded-full bg-white/85 px-3.5 py-1.5 text-xs text-slate-700 lg:block">
                      {m.hint}
                    </p>
                  </>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={vehicles} onChange={(e) => setVehicles(e.target.checked)} className="h-4 w-4 accent-electric-600" />
                  <span className="font-medium text-ink">{m.vehicles}</span>
                  <span className="text-muted">— {m.vehiclesNote}</span>
                </label>
                {showWalk && selected && (
                  <div className="flex flex-wrap items-center gap-3" aria-label={m.walkLegend}>
                    <span className="font-medium text-ink">{m.walkLegend}:</span>
                    {WALK_BANDS.map((min, i) => (
                      <span key={min} className="inline-flex items-center gap-1.5 text-slate-700">
                        <span aria-hidden className="h-2.5 w-6 rounded-full" style={{ background: BAND_COLORS[i] }} />
                        {m.walkBand(min)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="sr-only" role="status" aria-live="polite">
                {announce}
              </p>
            </div>

            {/* Search, places and details */}
            <aside className="flex flex-col gap-4" aria-label={m.panel}>
              <div className="rounded-2xl border border-line bg-white p-4">
                <label className="relative block">
                  <span className="sr-only">{m.search}</span>
                  <SearchIcon width={18} height={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={m.searchPlaceholder}
                    className="h-11 w-full rounded-xl border border-line pr-3 pl-10 text-base focus:border-electric-600 focus:ring-2 focus:ring-electric-600/20 focus:outline-none"
                  />
                </label>
                <div role="group" aria-label={m.placesTitle} className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active.has(c)}
                      onClick={() => toggleCategory(c)}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium ${
                        active.has(c) ? 'border-transparent text-white' : 'border-line bg-white text-slate-600'
                      }`}
                      style={active.has(c) ? { background: CATEGORY_COLOR[c], color: readableOn(CATEGORY_COLOR[c]) } : undefined}
                    >
                      <CategoryIcon category={c} width={14} height={14} />
                      {m.categories[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white p-5">
                {selected ? (
                  <>
                    <div className="flex items-start gap-3">
                      <Pin poi={selected} category={selected.category} active={false} start={false} />
                      <div className="min-w-0">
                        <h2 className="font-display text-xl leading-tight font-bold">{name(selected)}</h2>
                        <p className="text-sm text-muted">{m.categories[selected.category]}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">{selected.desc[lang]}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => api()?.flyTo(selected.x, selected.z, 420)} className="h-10 rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface">
                        {m.flyTo}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartId(selected.id)}
                        disabled={startId === selected.id}
                        className="h-10 rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface disabled:opacity-50"
                      >
                        {startId === selected.id ? m.isStart : m.setStart}
                      </button>
                      <button type="button" aria-pressed={showRoute} onClick={() => setShowRoute((v) => !v)} className={`h-10 rounded-full px-4 text-sm font-semibold ${showRoute ? 'bg-electric-600 text-white' : 'border border-line hover:bg-surface'}`}>
                        {showRoute ? m.hideRoute : m.showRoute}
                      </button>
                      <button type="button" aria-pressed={showWalk} onClick={() => setShowWalk((v) => !v)} className={`h-10 rounded-full px-4 text-sm font-semibold ${showWalk ? 'bg-electric-600 text-white' : 'border border-line hover:bg-surface'}`}>
                        {showWalk ? m.hideWalk : m.showWalk}
                      </button>
                    </div>

                    <div className="mt-5 border-t border-line pt-4" aria-live="polite">
                      <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{m.routeTitle}</h3>
                      {start && (
                        <p className="mt-1 text-sm text-muted">
                          {m.routeFrom(name(start))}
                        </p>
                      )}
                      {routeInfo ? (
                        <p className="mt-1 text-base font-semibold">
                          {m.routeSummary(Math.round(routeInfo.meters / 5) * 5, minutes(routeInfo.walkMin), minutes(routeInfo.driveMin))}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-700">{m.routeNone}</p>
                      )}
                    </div>

                    <div className="mt-4 border-t border-line pt-4">
                      <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{m.nearbyTitle}</h3>
                      {around.length ? (
                        <ul className="mt-2 divide-y divide-line">
                          {around.slice(0, 6).map((n) => (
                            <li key={n.poi.id}>
                              <button type="button" onClick={() => select(n.poi.id)} className="flex w-full items-center gap-3 py-2 text-left hover:text-electric-700">
                                <Pin poi={n.poi} category={n.poi.category} active={false} start={false} />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name(n.poi)}</span>
                                <span className="shrink-0 text-sm tabular-nums text-muted">{m.nearbyMin(minutes(n.walkMin))}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted">{m.nearbyNone}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted">{m.selectPrompt}</p>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-display text-base font-bold">{m.placesTitle}</h2>
                  <p className="text-xs text-muted" aria-live="polite">
                    {m.placesCount(shown.size)}
                  </p>
                </div>
                {shown.size ? (
                  <ul aria-label={m.placesTitle} className="mt-2 max-h-[300px] divide-y divide-line overflow-y-auto">
                    {city.pois
                      .filter((p) => shown.has(p.id))
                      .map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => select(p.id)}
                            aria-pressed={selectedId === p.id}
                            className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${selectedId === p.id ? 'bg-electric-50' : 'hover:bg-surface'}`}
                          >
                            <Pin poi={p} category={p.category} active={false} start={startId === p.id} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{name(p)}</span>
                              <span className="block truncate text-xs text-muted">{m.categories[p.category]}</span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted">
                              {startId === p.id ? m.startBadge : startId ? m.fromStart(minutes(minutesFromStart(p))) : ''}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">{m.noResults}</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section aria-labelledby="map-uses-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="map-uses-title" className="font-display text-3xl font-bold">
            {m.usesTitle}
          </h2>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {m.uses.map((u) => (
              <li key={u.title} className="rounded-2xl border border-line p-6">
                <h3 className="font-display text-lg font-bold">{u.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{u.text}</p>
              </li>
            ))}
          </ul>

          <h2 className="mt-16 font-display text-3xl font-bold">{m.buildTitle}</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {m.build.map((b, i) => (
              <li key={b.title} className="rounded-2xl bg-surface p-6">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 font-display text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 font-display text-lg font-bold">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{b.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-start gap-2 text-sm text-muted">
            <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} />
            <span>
              <strong className="font-semibold text-ink">{m.limitsTitle}.</strong> {m.limits}
            </span>
          </p>
        </div>
      </section>
    </>
  );
}
