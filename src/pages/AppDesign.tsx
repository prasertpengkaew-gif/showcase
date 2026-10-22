import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { CheckIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

/** `id` selects the copy in the `appDesign` dictionary; `swatch` is the project's own page colour. */
const SHOTS = ['home', 'result', 'wardrobe', 'planner', 'tryon', 'builder'] as const;

const projects = [
  { id: 'ruiya', swatch: '#064E3B', shots: SHOTS },
  { id: 'mochi', swatch: '#29261b', shots: [] },
] as const;

export default function AppDesign() {
  const d = useT().appDesign;
  useDocumentTitle(d.metaTitle);

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/contact" size="lg">
            {d.ctaContact}
          </ButtonLink>
          <ButtonLink to="/web-apps" size="lg" variant="outline-light">
            {d.backToWebApps}
          </ButtonLink>
        </div>
      </PageHeader>

      <section aria-labelledby="design-list" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="design-list" eyebrow={d.listEyebrow} title={d.listTitle} description={d.listText} />
          <ul className="mt-12 space-y-8">
            {projects.map((p) => {
              const item = d.projects[p.id];
              return (
                <li key={p.id}>
                  <article className="overflow-hidden rounded-2xl border border-line bg-white">
                    <div className="h-2" style={{ background: p.swatch }} aria-hidden />
                    <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                      <div>
                        <p className="eyebrow">{item.kind}</p>
                        <h3 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">{item.title}</h3>
                        <p className="mt-3 leading-relaxed text-muted">{item.text}</p>
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <li key={tag} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-slate-700">
                              {tag}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-5 rounded-xl bg-surface p-3 text-sm leading-relaxed text-slate-700">{item.status}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.insideTitle}</h4>
                        <ul className="mt-4 space-y-3">
                          {item.inside.map((line) => (
                            <li key={line} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
                              <CheckIcon aria-hidden className="mt-1 h-4 w-4 shrink-0 text-electric-700" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {p.shots.length > 0 && (
                      <div className="border-t border-line p-6 sm:p-8 lg:col-span-2">
                        <h4 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.shotsTitle}</h4>
                        {/* tabIndex lets keyboard users scroll the row */}
                        <ul tabIndex={0} aria-label={d.shotsLabel} className="mt-4 flex snap-x gap-4 overflow-x-auto pb-3 focus-visible:ring-2 focus-visible:ring-electric-600 focus-visible:outline-none">
                          {p.shots.map((shot) => (
                            <li key={shot} className="w-44 shrink-0 snap-start sm:w-52">
                              <figure>
                                <img src={`/images/design/ruiya-${shot}.webp`} alt="" width={804} height={1748} loading="lazy" className="w-full rounded-[1.6rem] border border-line bg-surface" />
                                <figcaption className="mt-2 text-xs leading-snug text-muted">{d.shots[shot]}</figcaption>
                              </figure>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="design-deliver" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="design-deliver" eyebrow={d.deliverEyebrow} title={d.deliverTitle} description={d.deliverText} />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {d.deliver.map((x) => (
              <div key={x.title} className="border-t-2 border-electric-600 pt-5">
                <dt className="font-display text-lg font-bold">{x.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{x.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="design-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="design-cta" className="font-display text-3xl font-bold">
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
