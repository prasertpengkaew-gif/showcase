import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ProjectFilters } from '../components/ProjectFilters';
import { ProjectGrid } from '../components/ProjectGrid';
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
