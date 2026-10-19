import { lazy, Suspense } from 'react';
import { ButtonLink } from './Button';
import { ArrowRightIcon, ScanIcon } from './Icons';
import { ErrorBoundary } from './ErrorBoundary';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { models } from '../data/models';
import { useT } from '../i18n';

const HeroScene = lazy(() => import('./HeroScene'));


function HeroFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center p-8">
      <img
        src={models.robot.poster}
        alt=""
        width={1440}
        height={960}
        className="w-full max-w-lg rounded-3xl object-cover opacity-90 shadow-2xl shadow-black/40"
        decoding="async"
      />
    </div>
  );
}

export function HeroSection() {
  const reducedMotion = usePrefersReducedMotion();
  const { webgl } = useDeviceCapabilities();
  const t = useT().hero;

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-navy-900 text-white"
    >
      {/* Cinematic backdrop: soft key light and a horizon line, no neon */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_72%_42%,rgba(37,99,235,0.28),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_15%_10%,rgba(148,163,184,0.10),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-950 to-transparent" />
      </div>

      <div className="container-page grid min-h-[100svh] content-center items-center gap-x-6 gap-y-10 pt-28 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-20">
        <div className="animate-fade-up lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-electric-500" aria-hidden />
            {t.badge}
          </p>
          <h1
            id="hero-title"
            data-latin
            className="mt-6 font-display text-[clamp(2.125rem,8.6vw,2.75rem)] leading-[1.04] font-extrabold tracking-[-0.03em] sm:text-6xl lg:text-7xl"
          >
            {t.line1}
            <br />
            <span className="text-electric-400">{t.line2}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            {t.lead}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/projects" size="lg" icon={<ArrowRightIcon />}>
              {t.viewWork}
            </ButtonLink>
            <ButtonLink to="/ar-playground" size="lg" variant="outline-light" icon={<ScanIcon />}>
              {t.tryAR}
            </ButtonLink>
          </div>
        </div>

        <div className="relative aspect-[4/3.4] w-full sm:aspect-[4/3] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:aspect-auto lg:h-[min(640px,78vh)]">
          {webgl ? (
            <ErrorBoundary fallback={<HeroFallback />}>
              <Suspense
                fallback={
                  <div className="absolute inset-0 grid place-items-center" role="status">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                    <span className="sr-only">{t.loading}</span>
                  </div>
                }
              >
                <HeroScene animate={!reducedMotion} screen={{ status: t.screenStatus, label: t.screenLabel, button: t.screenButton }} />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <HeroFallback />
          )}
          <p className="sr-only">
            {t.sceneDescription}
          </p>
        </div>

        <dl className="grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-3 lg:col-start-1 lg:row-start-2 lg:self-start">
          {t.highlights.map((h) => (
            <div key={h.title}>
              <dt className="text-sm font-semibold text-white">{h.title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">{h.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
