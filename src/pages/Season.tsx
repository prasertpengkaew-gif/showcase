import { Link, useParams } from 'react-router-dom';
import { ButtonLink } from '../components/Button';
import { DemoCard } from '../components/DemoCard';
import { FloorAR } from '../components/FloorAR';
import NotFound from './NotFound';
import { PageHeader } from '../components/PageHeader';
import { QRCode } from '../components/QRCode';
import { SeasonFace } from '../components/SeasonFace';
import { SectionHeading } from '../components/SectionHeading';
import { demos } from '../data/demos';
import { seasonCopy, seasons } from '../data/seasons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLanguage, useT } from '../i18n';
import { buildDragon } from '../lib/dragonObject';
import { buildGate } from '../lib/halloweenGate';
import { buildKrathong } from '../lib/krathongObject';
import { SEASON_LOOKS } from '../lib/seasonFace';
import {
  activeSeasonId,
  findSeason,
  formatWindow,
  monthDay,
  seasonIsOpen,
  seasonPath,
  seasonStatus,
  type SeasonStatus,
} from '../lib/season';
import type { Season } from '../data/seasons';

function landingUrl(path: string): string {
  const configured = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, '');
  if (configured) return `${configured}${path}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

function StatusBadge({ status, label }: { status: SeasonStatus; label: string }) {
  const tone = status === 'active' ? 'bg-emerald-400' : status === 'upcoming' ? 'bg-amber-300' : 'bg-white/40';
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function SeasonView({ season, activeId, day, pinned }: { season: Season; activeId: string; day: string; pinned: boolean }) {
  const t = useT();
  const s = t.season;
  const { lang } = useLanguage();
  useDocumentTitle();
  const copy = seasonCopy(season, lang);
  const path = seasonPath(pinned ? season.id : undefined);
  const url = landingUrl(path);
  const open = seasonIsOpen(season, day);
  const status = seasonStatus(season, day, activeId);
  const featured = season.demos.flatMap((id) => {
    const demo = demos.find((item) => item.id === id);
    return demo ? [demo] : [];
  });
  const ordered = [...seasons].sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const build = season.floor === 'gate' ? () => buildGate(copy.banner) : season.floor === 'dragon' ? buildDragon : buildKrathong;

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.heroTitle} description={copy.heroText}>
        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: season.accent }} />
                <span className="sr-only">{s.datesLabel}: </span>
                {formatWindow(season, lang)}
              </p>
              <StatusBadge status={status} label={s.status[status]} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={`/contact?season=${encodeURIComponent(season.id)}`} size="lg">{copy.ctaLabel}</ButtonLink>
              <ButtonLink to="#floor" size="lg" variant="outline-light">{s.tryFloor}</ButtonLink>
            </div>
          </div>
          <div id="qr" className="w-fit rounded-2xl bg-white p-4 text-navy-900">
            <QRCode value={url} size={168} label={s.qrLabel} />
            <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-slate-700">{pinned ? s.qrTextFixed : s.qrTextCurrent}</p>
            <p className="mt-2 max-w-[14rem] text-xs break-all text-slate-500">
              <span className="font-semibold text-slate-700">{s.qrAddress}: </span>
              <a href={url} className="underline">{url}</a>
            </p>
          </div>
        </div>
      </PageHeader>

      <section className="bg-surface py-12 sm:py-16" aria-labelledby="season-pitch">
        <div className="container-page max-w-3xl">
          {pinned && !open && (
            <p role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              {s.notOpen}{' '}
              <Link to={seasonPath()} className="font-semibold underline">{s.seeCurrent}</Link>
            </p>
          )}
          <p className="text-sm font-semibold tracking-wide text-electric-700 uppercase">{pinned ? s.fixedLabel : s.calendarLabel}</p>
          <h2 id="season-pitch" className="mt-2 font-display text-2xl font-bold text-ink">{copy.name}</h2>
          <p className="mt-4 leading-relaxed text-muted">{pinned ? s.detailNote(formatWindow(season, lang)) : s.currentNote}</p>
          <p className="mt-4 leading-relaxed text-ink">{copy.pitch}</p>
          {!pinned && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {s.fixedHint}{' '}
              <Link to={seasonPath(season.id)} className="font-semibold text-electric-700 underline">{copy.name}</Link>
            </p>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="season-demos">
        <div className="container-page">
          <SectionHeading id="season-demos" eyebrow={s.demosEyebrow} title={s.demosTitle} description={s.demosText} />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((demo) => (
              <li key={demo.id}><DemoCard demo={demo} /></li>
            ))}
          </ul>
        </div>
      </section>

      <section id="floor" className="scroll-mt-24 bg-surface py-16 sm:py-20" aria-labelledby="season-floor">
        <div className="container-page">
          <SectionHeading id="season-floor" eyebrow={s.floorEyebrow} title={copy.floorTitle} />
          <FloorAR
            key={season.id}
            build={build}
            title={copy.floorTitle}
            text={copy.floorText}
            panelClass={season.panelClass}
            minDistance={season.minDistance}
            hideUntilPlaced={season.hideUntilPlaced}
            dialogLabel={copy.dialogLabel}
            canvasLabel={copy.canvasLabel}
            photoCaption={copy.photoCaption}
            photoAlt={copy.photoAlt}
          />
        </div>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="season-face">
        <div className="container-page">
          <SectionHeading id="season-face" eyebrow={s.faceEyebrow} title={copy.faceTitle} description={copy.faceText} />
          <div className="mt-8">
            <SeasonFace
              key={season.id}
              theme={season.theme}
              looks={SEASON_LOOKS[season.theme]}
              lookLabels={copy.looks}
              frameTitle={copy.frameTitle}
              frameLine={copy.frameLine}
            />
          </div>
        </div>
      </section>

      <section className="bg-surface py-16 sm:py-20" aria-labelledby="season-calendar">
        <div className="container-page">
          <SectionHeading id="season-calendar" eyebrow={s.calendarEyebrow} title={pinned ? s.otherTitle : s.calendarTitle} description={s.calendarText} />
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {ordered.map((item) => {
              const itemCopy = seasonCopy(item, lang);
              const itemStatus = seasonStatus(item, day, activeId);
              const current = item.id === season.id;
              return (
                <li key={item.id}>
                  <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-5" aria-current={current ? 'page' : undefined}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-xl font-bold text-ink">{itemCopy.name}</h3>
                      <span className="text-sm font-semibold text-slate-600">{s.status[itemStatus]}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{formatWindow(item, lang)}</p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{itemCopy.heroText}</p>
                    {current ? (
                      <p className="mt-4 text-sm font-semibold text-ink">{s.thisPage}</p>
                    ) : (
                      <Link to={seasonPath(item.id)} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-electric-700 underline">{s.openSeason}</Link>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading eyebrow={s.howEyebrow} title={s.howTitle} />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {s.how.map((item) => (
              <div key={item.title} className="border-t-2 border-electric-600 pt-5">
                <h3 className="font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-navy-900 py-16 text-white">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">{copy.ctaTitle}</h2>
            <p className="mt-3 max-w-xl text-slate-300">{copy.ctaText}</p>
          </div>
          <ButtonLink to={`/contact?season=${encodeURIComponent(season.id)}`} size="lg">{copy.ctaLabel}</ButtonLink>
        </div>
      </section>
    </>
  );
}

export default function Season() {
  const { id } = useParams();
  const day = monthDay(new Date());
  const activeId = activeSeasonId(seasons, day);
  const season = id ? findSeason(seasons, id) : findSeason(seasons, activeId);
  if (!season || !activeId) return <NotFound />;
  return <SeasonView season={season} activeId={activeId} day={day} pinned={Boolean(id)} />;
}
