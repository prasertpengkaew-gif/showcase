import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { models } from '../data/models';
import { siteConfig } from '../config/site';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const capabilities = [
  {
    area: '3D asset pipeline',
    items: ['glTF 2.0 / GLB and USDZ', 'PBR materials and material variants', 'Texture and mesh optimization', 'Validation with the Khronos glTF Validator'],
  },
  {
    area: 'AR delivery',
    items: ['WebXR immersive-ar sessions', 'Apple AR Quick Look', 'Google Scene Viewer', 'Device detection and fallbacks'],
  },
  {
    area: 'Front-end engineering',
    items: ['React and TypeScript', 'Three.js and React Three Fiber', "Google's model-viewer", 'Performance profiling on real devices'],
  },
  {
    area: 'Experience design',
    items: ['Interaction and motion design', 'Accessible controls (keyboard, screen reader)', 'Reduced-motion support', 'Clear onboarding for first-time AR users'],
  },
];

const values = [
  {
    title: 'Useful before impressive',
    text: 'AR should answer a real question — does it fit, how does it work, what does it look like — not just look clever in a demo.',
  },
  {
    title: 'Honest about limits',
    text: 'Not every device supports AR, and not every project needs it. We say so early and design the fallback as carefully as the headline feature.',
  },
  {
    title: 'Open by default',
    text: 'We build on open standards so your assets and code outlive any single vendor or platform.',
  },
];

export default function About() {
  useDocumentTitle('About');
  return (
    <>
      <PageHeader
        eyebrow="About"
        title={`${siteConfig.name} builds 3D and AR for the open web`}
        description="We're a design and engineering studio focused on one thing: real-time 3D and augmented reality that people can open from a link and genuinely use."
      />

      <section aria-labelledby="intro-title" className="py-20 sm:py-24">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <SectionHeading id="intro-title" eyebrow="Who we are" title="Designers and engineers who ship to real phones" />
          <div className="space-y-5 text-lg leading-relaxed text-slate-700">
            <p>
              We work at the point where 3D content, web engineering and product design meet. That means we can take a
              project from a CAD file or product photo to a fast, tested AR experience without handing it between
              agencies.
            </p>
            <p>
              We favour the browser over native apps because it removes the biggest barrier to AR: asking people to
              install something. Everything we build runs from a URL on iOS, Android and desktop.
            </p>
            <p>
              The projects on this site are studio concepts built with openly licensed sample assets, so you can see —
              and try — exactly how we work.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="capabilities-title" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="capabilities-title" eyebrow="Capabilities" title="What we bring to a project" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((c) => (
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
          <SectionHeading id="values-title" eyebrow="What we believe" title="Three principles behind every build" />
          <dl className="mt-12 grid gap-10 md:grid-cols-3">
            {values.map((v, i) => (
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
              Work with us
            </ButtonLink>
            <ButtonLink to="/projects" size="lg" variant="ghost">
              See the work
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="credits" aria-labelledby="credits-title" className="scroll-mt-24 border-t border-line bg-surface py-16">
        <div className="container-page">
          <h2 id="credits-title" className="font-display text-2xl font-bold">
            3D asset credits
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            The demonstration models on this site are openly licensed. We thank their creators.
          </p>
          <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(models).map((m) => (
              <li key={m.id} className="rounded-xl border border-line bg-white p-5">
                <p className="font-semibold text-ink">
                  {m.name} — “{m.credit.title}”
                </p>
                <p className="mt-1 text-muted">{m.credit.author}</p>
                <p className="mt-1 text-muted">
                  License: {m.credit.license}
                  {m.credit.notes ? ` · ${m.credit.notes}` : ''}
                </p>
                <a
                  href={m.credit.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-medium text-electric-700 hover:underline"
                >
                  View source<span className="sr-only"> for {m.credit.title} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
