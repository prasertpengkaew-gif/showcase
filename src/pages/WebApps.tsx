import { Link } from '../i18n/Link';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { ArrowRightIcon, CheckIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

/** Live apps on this site that show the work; `id` selects the copy in the `webApps` dictionary. */
const apps: { id: 'booth' | 'twin' | 'map' | 'game' | 'rag' | 'tms' | 'cold'; to: string; image: string }[] = [
  { id: 'booth', to: '/event-booth', image: '/images/event-booth.webp' },
  { id: 'twin', to: '/digital-twin', image: '/images/digital-twin.webp' },
  { id: 'map', to: '/map-3d', image: '/images/map-3d.webp' },
  { id: 'game', to: '/motion-game', image: '/images/motion-game.webp' },
  { id: 'rag', to: '/enterprise-ai', image: '/images/enterprise-ai.webp' },
  { id: 'tms', to: '/tms', image: '/images/tms.webp' },
  { id: 'cold', to: '/cold-room', image: '/images/cold-room.webp' },
];

export default function WebApps() {
  const t = useT().webApps;
  useDocumentTitle(t.metaTitle);

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/contact" size="lg">
            {t.ctaContact}
          </ButtonLink>
          <ButtonLink to="/demos" size="lg" variant="outline-light">
            {t.ctaDemos}
          </ButtonLink>
          <ButtonLink to="/app-design" size="lg" variant="outline-light">
            {t.ctaDesign}
          </ButtonLink>
        </div>
      </PageHeader>

      <section aria-labelledby="webapps-list" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="webapps-list" eyebrow={t.appsEyebrow} title={t.appsTitle} description={t.appsText} />
          <ul className="mt-12 grid gap-6 md:grid-cols-2">
            {apps.map((app) => {
              const item = t.apps[app.id];
              return (
                <li key={app.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-xl hover:shadow-slate-900/[0.06]">
                  <img src={app.image} alt="" width={1440} height={960} loading="lazy" className="aspect-[3/2] w-full bg-navy-900 object-cover" />
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-bold text-ink">
                      <Link to={app.to} className="outline-none after:absolute after:inset-0 after:content-['']">
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-muted">{item.text}</p>
                    <ul className="mt-4 space-y-2">
                      {item.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-[15px] leading-relaxed text-slate-700">
                          <CheckIcon aria-hidden className="mt-1 h-4 w-4 shrink-0 text-electric-700" />
                          {point}
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <li key={tag} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-slate-700">
                          {tag}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm text-muted">
                      <span className="font-semibold text-ink">{t.bestForLabel}</span> {item.bestFor}
                    </p>
                    <span aria-hidden className="mt-auto inline-flex pt-5 items-center gap-1.5 text-sm font-semibold text-electric-700">
                      {t.openLive} <ArrowRightIcon width={16} height={16} />
                    </span>
                  </div>
                  <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-electric-600 ring-offset-2 group-has-[a:focus-visible]:ring-2" />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="webapps-devices" className="overflow-hidden bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="webapps-devices" eyebrow={t.devicesEyebrow} title={t.devicesTitle} description={t.devicesText} tone="dark" />
            <ul className="mt-8 space-y-3">
              {t.devicesPoints.map((p) => (
                <li key={p} className="flex gap-3 text-slate-200">
                  <CheckIcon aria-hidden className="mt-1 h-5 w-5 shrink-0 text-electric-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto flex w-full max-w-xl items-end justify-center">
            <figure className="w-[82%]">
              <div className="rounded-t-xl border-4 border-b-0 border-slate-600 bg-slate-800">
                <img src="/images/digital-twin.webp" alt="" width={1440} height={960} loading="lazy" className="aspect-[3/2] w-full rounded-t-md object-cover" />
              </div>
              <div aria-hidden className="mx-[-6%] h-3 rounded-b-xl bg-slate-500" />
              <figcaption className="mt-3 text-center text-sm text-slate-300">
                {t.desktopLabel} + {t.mobileLabel}
              </figcaption>
            </figure>
            <figure className="absolute right-0 bottom-9 w-[26%]">
              <div className="rounded-2xl border-4 border-slate-600 bg-slate-800 shadow-xl shadow-black/40">
                <img src="/images/digital-twin.webp" alt="" width={1440} height={960} loading="lazy" className="aspect-[9/16] w-full rounded-xl object-cover object-[35%_50%]" />
              </div>
            </figure>
          </div>
        </div>
      </section>

      <section aria-labelledby="webapps-build" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="webapps-build" eyebrow={t.buildEyebrow} title={t.buildTitle} />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {t.capabilities.map((c) => (
              <div key={c.title} className="border-t-2 border-electric-600 pt-5">
                <dt className="font-display text-lg font-bold">{c.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{c.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="webapps-stack" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="webapps-stack" eyebrow={t.stackEyebrow} title={t.stackTitle} description={t.stackText} />
          <ul className="mt-10 flex flex-wrap gap-3">
            {t.stack.map((s) => (
              <li key={s} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="webapps-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="webapps-cta" className="font-display text-3xl font-bold">
              {t.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-slate-300">{t.ctaText}</p>
          </div>
          <ButtonLink to="/contact" size="lg">
            {t.ctaContact}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
