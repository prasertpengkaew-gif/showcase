import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ModelExplorer } from '../components/ModelExplorer';
import { LazyImage } from '../components/LazyImage';
import { EventIdeas } from '../components/EventIdeas';
import { playgroundModelIds } from '../data/models';
import type { ModelId } from '../types/project';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useModels, useT } from '../i18n';

export default function ARPlayground() {
  const t = useT();
  const pg = t.playground;
  useDocumentTitle(pg.metaTitle);
  const models = useModels();
  const [selected, setSelected] = useState<ModelId>(playgroundModelIds[0]);
  const model = models[selected];

  return (
    <>
      <PageHeader eyebrow={pg.eyebrow} title={pg.title} description={pg.description} />

      <section aria-labelledby="picker-title" className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <h2 id="picker-title" className="text-xs font-semibold tracking-[0.14em] text-slate-600 uppercase">
            {pg.choose}
          </h2>
          <fieldset className="mt-4">
            <legend className="sr-only">{pg.model}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {playgroundModelIds.map((id) => {
                const m = models[id];
                return (
                  <label key={id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="playground-model"
                      value={id}
                      checked={id === selected}
                      onChange={() => setSelected(id)}
                      className="peer sr-only"
                    />
                    <span className="flex items-center gap-4 rounded-2xl border border-line bg-white p-3 transition-colors peer-checked:border-electric-600 peer-checked:ring-1 peer-checked:ring-electric-600 peer-focus-visible:ring-2 peer-focus-visible:ring-electric-600 peer-focus-visible:ring-offset-2 hover:border-slate-300">
                      <LazyImage src={m.poster} alt="" width={1440} height={960} wrapperClassName="w-24 shrink-0 rounded-xl" />
                      <span>
                        <span className="block font-display font-bold text-ink">{m.name}</span>
                        <span className="mt-0.5 block text-sm text-muted">{m.dimensions}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-8">
            <ModelExplorer model={model} viewerClassName="h-[440px] sm:h-[600px]" />
          </div>
          <p className="mt-4 text-xs text-muted">
            {pg.credit(model.credit.title, model.credit.author, model.credit.license)} {model.credit.notes}{' '}
            <a href={model.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {pg.source}
              <span className="sr-only"> {t.footer.newTab}</span>
            </a>
          </p>
        </div>
      </section>

      <section aria-labelledby="how-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 id="how-title" className="font-display text-3xl font-bold">
              {pg.howTitle}
            </h2>
            <ol className="mt-8 space-y-6">
              {pg.steps.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display font-bold">{s.title}</h3>
                    <p className="mt-1 leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">{pg.compatTitle}</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{pg.compatCaption}</caption>
                <thead className="bg-surface text-xs tracking-wide text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">{pg.deviceCol}</th>
                    <th scope="col" className="px-5 py-3 font-semibold">{pg.modeCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pg.compat.map((c) => (
                    <tr key={c.platform}>
                      <th scope="row" className="px-5 py-4 align-top font-semibold text-ink">{c.platform}</th>
                      <td className="px-5 py-4 text-slate-700">
                        <span className="font-medium text-ink">{c.mode}</span>
                        <span className="mt-1 block text-muted">{c.needs}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{pg.compatNote}</p>
          </div>
        </div>
      </section>
      <EventIdeas id="playground-events-title" ideas={t.eventIdeas.playground} />
    </>
  );
}
