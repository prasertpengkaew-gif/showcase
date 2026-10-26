import { Link } from '../i18n/Link';
import { HeroSection } from '../components/HeroSection';
import { SectionHeading } from '../components/SectionHeading';
import { ProjectGrid } from '../components/ProjectGrid';
import { ServiceCard } from '../components/ServiceCard';
import { ButtonLink } from '../components/Button';
import { ModelViewer } from '../components/ModelViewer';
import { ArrowRightIcon } from '../components/Icons';
import { DemoCard } from '../components/DemoCard';
import { demos } from '../data/demos';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useModels, useProjects, useServices, useT } from '../i18n';

export default function Home() {
  useDocumentTitle();
  const t = useT();
  const h = t.home;
  const featured = useProjects().filter((p) => p.featured).slice(0, 6);
  const services = useServices();
  const models = useModels();

  return (
    <>
      <HeroSection />

      {/* Featured work */}
      <section aria-labelledby="work-title" className="py-24 sm:py-32">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading id="work-title" eyebrow={h.workEyebrow} title={h.workTitle} description={h.workText} />
            <ButtonLink to="/projects" variant="ghost" icon={<ArrowRightIcon width={16} height={16} />}>
              {h.allProjects}
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
            <SectionHeading id="demo-title" eyebrow={h.demoEyebrow} title={h.demoTitle} description={h.demoText} />
            <ul className="mt-8 space-y-4 text-[15px] text-slate-700">
              {h.demoPoints.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <ButtonLink to="/ar-playground" variant="secondary" icon={<ArrowRightIcon width={16} height={16} />}>
                {h.openPlayground}
              </ButtonLink>
            </div>
          </div>
          <ModelViewer model={models.chair} className="h-[460px] sm:h-[540px]" controls={false} />
        </div>
      </section>

      {/* Live demos */}
      <section aria-labelledby="demos-title" className="py-24 sm:py-32">
        <div className="container-page">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading id="demos-title" eyebrow={h.demosEyebrow} title={h.demosTitle} description={h.demosText} />
            <ButtonLink to="/demos" variant="ghost" icon={<ArrowRightIcon width={16} height={16} />}>
              {h.allDemos}
            </ButtonLink>
          </div>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demos.filter((demo) => demo.featured).map((demo) => (
              <li key={demo.id}>
                <DemoCard demo={demo} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services */}
      <section aria-labelledby="services-title" className="bg-surface py-24 sm:py-32">
        <div className="container-page">
          <SectionHeading id="services-title" eyebrow={h.servicesEyebrow} title={h.servicesTitle} align="center" />
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
          <SectionHeading id="process-title" tone="dark" eyebrow={h.processEyebrow} title={h.processTitle} />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {h.steps.map((p, i) => (
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
                {h.ctaTitle}
              </h2>
              <p className="mt-4 text-lg text-white">{h.ctaText}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink to="/contact" variant="secondary" size="lg">
                  {h.ctaPrimary}
                </ButtonLink>
                <ButtonLink to="/services" variant="outline-light" size="lg">
                  {h.ctaSecondary}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
