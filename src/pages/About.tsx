import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { siteConfig } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useModels, useT } from '../i18n';

export default function About() {
  const t = useT();
  const a = t.about;
  useDocumentTitle(a.metaTitle);
  const models = useModels();

  return (
    <>
      <PageHeader eyebrow={a.eyebrow} title={a.title(siteConfig.name)} description={a.description} />

      <section aria-labelledby="intro-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <SectionHeading id="intro-title" eyebrow={a.whoEyebrow} title={a.whoTitle} />
          <div className="space-y-5 text-lg leading-relaxed text-slate-700">
            {a.who.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-title" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="capabilities-title" eyebrow={a.capEyebrow} title={a.capTitle} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {a.capabilities.map((c) => (
              <div key={c.area} className="rounded-2xl border border-line bg-white p-7">
                <h3 className="font-display text-lg font-bold">{c.area}</h3>
                <ul className="mt-4 space-y-2.5 text-[15px] text-slate-700">
                  {c.items.map((i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="values-title" className="py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="values-title" eyebrow={a.valuesEyebrow} title={a.valuesTitle} />
          <dl className="mt-12 grid gap-10 md:grid-cols-3">
            {a.values.map((v, i) => (
              <div key={v.title}>
                <span className="font-display text-sm font-semibold text-electric-600 tabular-nums" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <dt className="mt-3 font-display text-xl font-bold">{v.title}</dt>
                <dd className="mt-3 leading-relaxed text-muted">{v.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-14 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/contact" size="lg">
              {a.workWithUs}
            </ButtonLink>
            <ButtonLink to="/projects" size="lg" variant="ghost">
              {a.seeWork}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="credits" aria-labelledby="credits-title" className="scroll-mt-24 border-t border-line bg-surface py-16">
        <div className="container-page">
          <h2 id="credits-title" className="font-display text-2xl font-bold">
            {a.creditsTitle}
          </h2>
          <p className="mt-3 max-w-2xl text-muted">{a.creditsText}</p>
          <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(models).map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-white p-5">
                <p className="font-semibold text-ink">
                  {m.name} — “{m.credit.title}”
                </p>
                <p className="mt-1 text-muted">{m.credit.author}</p>
                <p className="mt-1 text-muted">
                  {a.license} {m.credit.license}
                  {m.credit.notes ? ` · ${m.credit.notes}` : ''}
                </p>
                <a
                  href={m.credit.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-medium text-electric-700 hover:underline"
                >
                  {a.viewSource}
                  <span className="sr-only"> {a.sourceFor(m.credit.title)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
