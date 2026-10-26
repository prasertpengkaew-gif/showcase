import { Link } from '../i18n/Link';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { DemoCard } from '../components/DemoCard';
import { ArrowRightIcon } from '../components/Icons';
import { demos, type DemoId } from '../data/demos';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

/** Demos shown in "try it now": the ones that suit an event and have a cover image. */
const TRY: DemoId[] = ['event', 'hunt', 'game', 'print', 'ar', 'cube'];

export default function EventAR() {
  const d = useT().eventAR;
  useDocumentTitle(d.metaTitle);
  const tryDemos = TRY.map((id) => demos.find((x) => x.id === id)).filter((x) => x !== undefined);

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/contact" size="lg">
            {d.ctaContact}
          </ButtonLink>
          <ButtonLink to="/demos" size="lg" variant="outline-light">
            {d.ctaDemos}
          </ButtonLink>
        </div>
      </PageHeader>

      <section aria-labelledby="event-types" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="event-types" eyebrow={d.typesEyebrow} title={d.typesTitle} description={d.typesText} />
          <ul className="mt-12 grid gap-6 lg:grid-cols-2">
            {d.types.map((type) => (
              <li key={type.title}>
                <article className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 sm:p-8">
                  <h3 className="font-display text-xl font-bold text-ink">{type.title}</h3>
                  <p className="mt-2 text-muted">{type.goal}</p>
                  <ul className="mt-6 space-y-5 border-t border-line pt-6">
                    {type.ideas.map((idea) => (
                      <li key={idea.title}>
                        <h4 className="font-semibold text-ink">{idea.title}</h4>
                        <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{idea.text}</p>
                        {idea.to ? (
                          <Link to={idea.to} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-700 hover:underline">
                            {d.tryRelated} <ArrowRightIcon aria-hidden width={16} height={16} />
                          </Link>
                        ) : (
                          <p className="mt-2 inline-block rounded-full bg-surface px-3 py-1 text-xs font-semibold text-slate-600">{d.ideaOnly}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="event-try" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="event-try" eyebrow={d.tryEyebrow} title={d.tryTitle} description={d.tryText} />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tryDemos.map((demo) => (
              <li key={demo.id}>
                <DemoCard demo={demo} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="event-run" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="event-run" eyebrow={d.runEyebrow} title={d.runTitle} />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {d.run.map((phase, i) => (
              <li key={phase.title} className="border-t-2 border-electric-600 pt-5">
                <p className="font-display text-sm font-bold text-electric-700">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{phase.title}</h3>
                <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted">
                  {phase.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="event-notes" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="event-notes" eyebrow={d.notesEyebrow} title={d.notesTitle} />
          <dl className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {d.notes.map((n) => (
              <div key={n.title}>
                <dt className="font-display text-lg font-bold">{n.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{n.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="event-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="event-cta" className="font-display text-3xl font-bold">
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
