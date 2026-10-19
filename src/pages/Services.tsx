import { PageHeader } from '../components/PageHeader';
import { ServiceCard } from '../components/ServiceCard';
import { SectionHeading } from '../components/SectionHeading';
import { ButtonLink } from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useServices, useT } from '../i18n';

export default function Services() {
  const t = useT().servicesPage;
  useDocumentTitle(t.metaTitle);
  const services = useServices();

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <section aria-labelledby="service-list-title" className="py-20 sm:py-24">
        <div className="container-page">
          <h2 id="service-list-title" className="sr-only">
            {t.listTitle}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <li key={s.id} className={i === services.length - 1 && services.length % 2 === 1 ? 'md:col-span-2' : ''}>
                <ServiceCard service={s} index={i} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="principles-title" className="bg-surface py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading id="principles-title" eyebrow={t.principlesEyebrow} title={t.principlesTitle} />
          <dl className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {t.principles.map((p) => (
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
              {t.ctaTitle}
            </h2>
            <p className="mt-3 text-lg text-muted">{t.ctaText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/contact" size="lg">
              {t.ctaContact}
            </ButtonLink>
            <ButtonLink to="/ar-playground" size="lg" variant="ghost">
              {t.ctaPlayground}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
