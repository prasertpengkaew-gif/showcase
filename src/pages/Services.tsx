import { PageHeader } from '../components/PageHeader';
import { ServiceCard } from '../components/ServiceCard';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { services } from '../data/services';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const principles = [
  {
    title: 'Browser first',
    text: 'If it needs an app install, most people won’t try it. We build for the link people already tapped.',
  },
  {
    title: 'Performance budgets',
    text: 'We agree file-size and load-time targets up front and test on mid-range phones, not just flagships.',
  },
  {
    title: 'Graceful fallbacks',
    text: 'Every AR experience has a complete 3D or image fallback so no visitor hits a dead end.',
  },
  {
    title: 'You own the assets',
    text: 'Source files and glTF/USDZ models are handed over in open formats you can reuse anywhere.',
  },
];

export default function Services() {
  useDocumentTitle('Services');
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Four ways we help teams ship 3D and AR"
        description="Engage us for a single model, a full experience, or advice before you commit budget."
      />
      <section aria-labelledby="service-list-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="service-list-title" className="sr-only">
            Services
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <li key={s.id}>
                <ServiceCard service={s} index={i} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="principles-title" eyebrow="Principles" title="How every engagement is run" />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.title} className="border-t-2 border-electric-600 pt-5">
                <dt className="font-display text-lg font-bold">{p.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{p.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="services-cta" className="py-20 sm:py-24">
        <div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="services-cta" className="font-display text-3xl font-bold">
              Not sure which service fits?
            </h2>
            <p className="mt-3 text-lg text-muted">Describe what you want to achieve and we'll suggest a starting point.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/contact" size="lg">
              Contact us
            </ButtonLink>
            <ButtonLink to="/ar-playground" size="lg" variant="ghost">
              Try the AR Playground
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
