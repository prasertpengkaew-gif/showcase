import { Link } from 'react-router-dom';
import { HeroSection } from '../components/HeroSection';
import { SectionHeading } from '../components/SectionHeading';
import { ProjectGrid } from '../components/ProjectGrid';
import { ServiceCard } from '../components/ServiceCard';
import { ButtonLink } from '../components/Button';
import { ModelViewer } from '../components/ModelViewer';
import { ArrowRightIcon } from '../components/Icons';
import { projects } from '../data/projects';
import { services } from '../data/services';
import { models } from '../data/models';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const steps = [
  {
    step: 'Discover',
    text: 'We agree on who the experience is for, which devices they use, and what a successful outcome looks like.',
  },
  {
    step: 'Prototype',
    text: 'A working link on real phones within the first sprint, so decisions are made on something you can hold.',
  },
  {
    step: 'Produce',
    text: '3D assets, interaction and front-end built to performance budgets, tested across iOS, Android and desktop.',
  },
  {
    step: 'Launch & hand over',
    text: 'Deployment, documentation and source files. You own the code and the glTF assets.',
  },
];

export default function Home() {
  useDocumentTitle();
  const featured = projects.filter((p) => p.featured).slice(0, 6);

  return (
    <>
      <HeroSection />

      {/* Featured work */}
      <section aria-labelledby="work-title" className="py-24 sm:py-32">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              id="work-title"
              eyebrow="Selected work"
              title="Experiences people place, explore and remember"
              description="Studio concepts across six industries, each built with production techniques you can inspect and try in AR yourself."
            />
            <ButtonLink to="/projects" variant="ghost" icon={<ArrowRightIcon width={16} height={16} />}>
              All projects
            </ButtonLink>
          </div>
          <div className="mt-14">
            <ProjectGrid projects={featured} />
          </div>
        </div>
      </section>

      {/* Inline AR demo */}
      <section aria-labelledby="demo-title" className="bg-surface py-24 sm:py-32">
        <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              id="demo-title"
              eyebrow="Try it here"
              title="Real 3D, right in the page"
              description="This is the same viewer we ship to clients. Drag to rotate, pinch to zoom — and on a phone, place the chair at its real 83 cm width in your room."
            />
            <ul className="mt-8 space-y-4 text-[15px] text-slate-700">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                Opens in Apple Quick Look on iPhone and iPad, Scene Viewer or WebXR on Android.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                Falls back to an interactive 3D view everywhere else.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                Loads only when it scrolls into view, so it doesn't slow the page.
              </li>
            </ul>
            <div className="mt-10">
              <ButtonLink to="/ar-playground" variant="secondary" icon={<ArrowRightIcon width={16} height={16} />}>
                Open the AR Playground
              </ButtonLink>
            </div>
          </div>
          <ModelViewer model={models.chair} className="h-[460px] sm:h-[540px]" controls={false} />
        </div>
      </section>

      {/* Services */}
      <section aria-labelledby="services-title" className="py-24 sm:py-32">
        <div className="container-page">
          <SectionHeading
            id="services-title"
            eyebrow="What we do"
            title="From a single 3D model to a complete AR programme"
            align="center"
          />
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <li key={s.id}>
                <Link to={`/services#${s.id}`} className="group block h-full rounded-2xl">
                  <div className="h-full transition-transform duration-300 motion-safe:group-hover:-translate-y-1">
                    <ServiceCard service={s} variant="compact" index={i} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Process */}
      <section aria-labelledby="process-title" className="bg-navy-900 py-24 text-white sm:py-32">
        <div className="container-page">
          <SectionHeading
            id="process-title"
            tone="dark"
            eyebrow="How we work"
            title="A clear process, with something real on a phone early"
          />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((p, i) => (
              <li key={p.step} className="bg-navy-900 p-7 sm:p-8">
                <span className="font-display text-sm font-semibold text-electric-400 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{p.step}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section aria-labelledby="cta-title" className="py-24 sm:py-32">
        <div className="container-page">
          <div className="relative overflow-hidden rounded-3xl bg-electric-600 px-8 py-14 text-white sm:px-14 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full border-[40px] border-white/10"
            />
            <div className="relative max-w-2xl">
              <h2 id="cta-title" className="font-display text-3xl leading-tight font-bold sm:text-4xl">
                Have a product, space or story that should be seen in 3D?
              </h2>
              <p className="mt-4 text-lg text-white">
                Tell us what you're working on. We'll tell you honestly whether AR is the right fit.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/contact" variant="secondary" size="lg">
                  Start a conversation
                </ButtonLink>
                <ButtonLink to="/services" variant="outline-light" size="lg">
                  Explore services
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
