import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ProjectFilters } from '../components/ProjectFilters';
import { ProjectGrid } from '../components/ProjectGrid';
import { projects } from '../data/projects';
import { PROJECT_CATEGORIES, type ProjectCategory } from '../types/project';
import { categoryToParam, paramToCategory } from '../lib/category';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Projects() {
  useDocumentTitle('Projects');
  const [params, setParams] = useSearchParams();
  const active = paramToCategory(params.get('category'));

  const counts = useMemo(() => {
    const c = Object.fromEntries(PROJECT_CATEGORIES.map((k) => [k, 0])) as Record<ProjectCategory, number>;
    for (const p of projects) c[p.category]++;
    return c;
  }, []);

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
        eyebrow="Portfolio"
        title="Work you can open, rotate and place"
        description="Every project here has a live 3D viewer and AR mode. These are studio concepts built with openly licensed assets to demonstrate our approach in each industry."
      />
      <section aria-labelledby="gallery-title" className="py-16 sm:py-20">
        <div className="container-page">
          <h2 id="gallery-title" className="sr-only">
            Project gallery
          </h2>
          <ProjectFilters active={active} counts={counts} total={projects.length} onChange={onChange} />
          <p className="mt-6 text-sm text-muted" aria-live="polite">
            Showing {visible.length} {visible.length === 1 ? 'project' : 'projects'}
            {active ? ` in ${active}` : ''}.
          </p>
          <div className="mt-8">
            <ProjectGrid projects={visible} priorityCount={3} />
          </div>
        </div>
      </section>
    </>
  );
}
