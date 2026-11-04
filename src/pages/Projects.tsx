import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ProjectFilters } from '../components/ProjectFilters';
import { ProjectGrid } from '../components/ProjectGrid';
import { ArrowRightIcon } from '../components/Icons';
import { ButtonLink } from '../components/Button';
import { PROJECT_CATEGORIES, type ProjectCategory } from '../types/project';
import { categoryToParam, paramToCategory } from '../lib/category';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useCategoryLabel, useProjects, useT } from '../i18n';

export default function Projects() {
  const t = useT().projectsPage;
  const projects = useProjects();
  const categoryLabel = useCategoryLabel();
  useDocumentTitle(t.metaTitle);
  const [params, setParams] = useSearchParams();
  const active = paramToCategory(params.get('category'));

  const counts = useMemo(() => {
    const c = Object.fromEntries(PROJECT_CATEGORIES.map((k) => [k, 0])) as Record<ProjectCategory, number>;
    for (const p of projects) c[p.category]++;
    return c;
  }, [projects]);

  const visible = active ? projects.filter((p) => p.category === active) : projects;

  const onChange = (category: ProjectCategory | null) => {
    const next = new URLSearchParams(params);
    if (category) next.set('category', categoryToParam(category));
    else next.delete('category');
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <section aria-labelledby="property-showcase-title" className="bg-navy-900 py-16 text-white sm:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold text-electric-300">{t.propertyEyebrow}</p>
            <h2 id="property-showcase-title" className="mt-3 max-w-2xl font-display text-3xl leading-tight font-bold sm:text-4xl">
              {t.propertyTitle}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">{t.propertyText}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/map-3d" icon={<ArrowRightIcon width={16} height={16} />}>
                {t.propertyMap}
              </ButtonLink>
              <ButtonLink to="/virtual-tour" variant="outline-light">
                {t.propertyTour}
              </ButtonLink>
              <ButtonLink to="/room-capture" variant="outline-light">
                {t.propertyCapture}
              </ButtonLink>
              <ButtonLink to="/property-tools" variant="outline-light">
                {t.propertyTools}
              </ButtonLink>
            </div>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-400">{t.propertyNote}</p>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-electric-300 underline-offset-4 hover:underline">
              {t.propertyContact}
              <ArrowRightIcon width={16} height={16} />
            </Link>
          </div>

          <Link
            to="/projects/furnished-unit-staging"
            className="group relative isolate flex min-h-[320px] items-end overflow-hidden rounded-3xl bg-navy-800 p-7 sm:min-h-[380px] sm:p-9"
          >
            <img
              src="/images/projects/furnished-unit-staging/cover.webp"
              alt=""
              loading="lazy"
              className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
            />
            <div aria-hidden className="absolute inset-0 z-10 bg-gradient-to-t from-navy-950/95 via-navy-950/15 to-transparent" />
            <div className="relative z-20">
              <h3 className="font-display text-2xl font-bold">{t.stagingTitle}</h3>
              <p className="mt-2 max-w-md leading-relaxed text-slate-200">{t.stagingText}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                {t.stagingLink}
                <ArrowRightIcon width={16} height={16} />
              </span>
            </div>
          </Link>
        </div>
      </section>
      <section aria-labelledby="gallery-title" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="gallery-title" className="sr-only">
            {t.galleryTitle}
          </h2>
          <ProjectFilters active={active} counts={counts} total={projects.length} onChange={onChange} />
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            {t.showing(visible.length, active ? categoryLabel(active) : undefined)}
          </p>
          <div className="mt-8">
            <ProjectGrid projects={visible} priorityCount={3} />
          </div>
        </div>
      </section>
    </>
  );
}
