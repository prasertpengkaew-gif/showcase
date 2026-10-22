import { useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink, Button } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { InfoIcon, SearchIcon } from '../components/Icons';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { DOCS, ROLES, search, visibleDocs, type Role } from '../lib/rag';
import { useLanguage, useT } from '../i18n';

export default function EnterpriseAI() {
  const d = useT().rag;
  const { lang } = useLanguage();
  useDocumentTitle(d.metaTitle);

  const [role, setRole] = useState<Role>('employee');
  const [draft, setDraft] = useState('');
  const [asked, setAsked] = useState('');

  // Derived, so switching role re-runs the same question against what that role may read.
  const hits = useMemo(() => search(asked, role, lang), [asked, role, lang]);
  const docs = visibleDocs(role);

  const ask = (q: string) => {
    setDraft(q);
    setAsked(q.trim());
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };

  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />

      <section aria-labelledby="rag-demo" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="rag-demo" className="sr-only">
            {d.demoTitle}
          </h2>
          <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-slate-700">
            <InfoIcon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-electric-700" />
            <p>
              <span className="font-semibold">{d.simulatedTitle}.</span> {d.simulatedText}
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="space-y-8">
              <OptionChips legend={d.roleLegend} options={ROLES} value={role} onChange={setRole} format={(r) => d.roles[r]} />
              <p className="-mt-4 text-sm text-muted">{d.roleNote}</p>

              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.samplesLegend}</p>
                <ul className="mt-3 flex flex-col items-start gap-2">
                  {d.samples.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => ask(q)}
                        className="rounded-full border border-line bg-white px-3.5 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-electric-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.docsTitle}</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {docs.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2">
                      <span>{doc.title[lang]}</span>
                      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-slate-600">{d.access[doc.access]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-muted">{d.hiddenDocs(DOCS.length - docs.length)}</p>
              </div>
            </div>

            <div>
              <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="rag-q" className="sr-only">
                  {d.askLabel}
                </label>
                <input
                  id="rag-q"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={d.placeholder}
                  maxLength={200}
                  className="h-12 min-w-0 flex-1 rounded-full border border-line bg-white px-5 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-electric-600"
                />
                <Button type="submit" size="lg" icon={<SearchIcon aria-hidden width={18} height={18} />}>
                  {d.askButton}
                </Button>
              </form>

              <div aria-live="polite" className="mt-6">
                {!asked && <p className="rounded-2xl border border-dashed border-line p-6 text-muted">{d.emptyText}</p>}
                {asked && hits.length === 0 && (
                  <div className="rounded-2xl border border-line bg-white p-6">
                    <h3 className="font-display text-lg font-bold">{d.notFoundTitle}</h3>
                    <p className="mt-2 text-muted">{d.notFoundText}</p>
                  </div>
                )}
                {hits.length > 0 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-electric-600/30 bg-white p-6 shadow-sm">
                      <h3 className="text-xs font-semibold tracking-[0.14em] text-electric-700 uppercase">{d.answerTitle}</h3>
                      <p className="mt-3 text-lg leading-relaxed text-ink">
                        {hits[0].text} <sup className="font-semibold text-electric-700">[1]</sup>
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">{d.sourcesTitle}</h3>
                      <ol className="mt-3 space-y-3">
                        {hits.map((h, i) => (
                          <li key={`${h.doc.id}-${h.passage}`} className="rounded-xl border border-line bg-white p-4">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                              <span className="text-electric-700">[{i + 1}]</span> {h.doc.title[lang]}
                              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-slate-600">{d.access[h.doc.access]}</span>
                              <span className="ml-auto text-xs font-medium text-muted">
                                {d.score} {h.score.toFixed(1)}
                              </span>
                            </p>
                            {i > 0 && <p className="mt-2 text-sm leading-relaxed text-muted">{h.text}</p>}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="rag-steps" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="rag-steps" eyebrow={d.stepsEyebrow} title={d.stepsTitle} description={d.stepsText} />
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {d.steps.map((s, i) => (
              <li key={s.title} className="border-t-2 border-electric-600 pt-5">
                <p className="font-display text-sm font-bold text-electric-700">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-1 font-display text-lg font-bold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="rag-cta" className="bg-navy-900 py-20 text-white sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="rag-cta" className="font-display text-3xl font-bold">
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
