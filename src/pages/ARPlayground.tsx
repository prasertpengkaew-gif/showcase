import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ModelExplorer } from '../components/ModelExplorer';
import { LazyImage } from '../components/LazyImage';
import { models, playgroundModelIds } from '../data/models';
import type { ModelId } from '../types/project';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const steps = [
  { title: 'Choose a model', text: 'Pick the chair, robot or car. Each loads as a real glTF file.' },
  { title: 'Explore in 3D', text: 'Drag to orbit, pinch or scroll to zoom, or use the buttons below the viewer.' },
  { title: 'View in your space', text: 'On a supported phone, tap the AR button and aim at the floor to place it.' },
];

const compatibility = [
  {
    platform: 'iPhone & iPad',
    mode: 'Apple AR Quick Look',
    needs: 'Safari (or Chrome) on iOS 12+. Some in-app browsers block it.',
  },
  {
    platform: 'Android',
    mode: 'WebXR or Google Scene Viewer',
    needs: 'Chrome on a device certified for Google Play Services for AR (ARCore).',
  },
  {
    platform: 'Desktop & other devices',
    mode: 'Interactive 3D',
    needs: 'Any modern browser with WebGL. AR is not available on desktop.',
  },
];

export default function ARPlayground() {
  useDocumentTitle('AR Playground');
  const [selected, setSelected] = useState<ModelId>(playgroundModelIds[0]);
  const model = models[selected];

  return (
    <>
      <PageHeader
        eyebrow="AR Playground"
        title="Put a 3D model in your room"
        description="Choose a model, explore it in 3D, then place it at real-world scale with your phone's camera. Nothing to install."
      />

      <section aria-labelledby="picker-title" className="bg-surface py-12 sm:py-16">
        <div className="container-page">
          <h2 id="picker-title" className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Choose a model
          </h2>
          <fieldset className="mt-4">
            <legend className="sr-only">Model</legend>
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
            Model: “{model.credit.title}” by {model.credit.author}, {model.credit.license}.{' '}
            {model.credit.notes}{' '}
            <a href={model.credit.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Source<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </section>

      <section aria-labelledby="how-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 id="how-title" className="font-display text-3xl font-bold">
              How it works
            </h2>
            <ol className="mt-8 space-y-6">
              {steps.map((s, i) => (
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
            <h2 className="font-display text-3xl font-bold">Device compatibility</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Which AR mode each device uses</caption>
                <thead className="bg-surface text-xs tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Device</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Mode &amp; requirements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {compatibility.map((c) => (
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
            <p className="mt-4 text-sm leading-relaxed text-muted">
              AR requires a secure HTTPS connection and camera permission. Android's Scene Viewer downloads the model
              from this site's public URL, so it won't work from a local development server.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
