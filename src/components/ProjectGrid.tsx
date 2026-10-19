import type { Project } from '../types/project';
import { ProjectCard } from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  /** Number of leading cards whose images load eagerly. */
  priorityCount?: number;
  emptyMessage?: string;
}

export function ProjectGrid({ projects, priorityCount = 0, emptyMessage = 'No projects match this filter yet.' }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center text-muted">{emptyMessage}</div>
    );
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {projects.map((p, i) => (
        <li key={p.slug} className="flex">
          <div className="flex w-full">
            <ProjectCard project={p} priority={i < priorityCount} />
          </div>
        </li>
      ))}
    </ul>
  );
}
