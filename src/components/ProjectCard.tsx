import { Link } from 'react-router-dom';
import type { Project } from '../types/project';
import { LazyImage } from './LazyImage';
import { ArrowRightIcon } from './Icons';

interface ProjectCardProps {
  project: Project;
  /** Load the image eagerly (for cards visible on first paint). */
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
}

export function ProjectCard({ project, priority = false, headingLevel: Heading = 'h3' }: ProjectCardProps) {
  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-900/[0.06]">
      <div className="overflow-hidden">
        <LazyImage
          {...project.cover}
          priority={priority}
          className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[var(--ease-out-soft)] motion-safe:group-hover:scale-[1.035]"
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-electric-50 px-2.5 py-1 text-electric-700">{project.category}</span>
          {project.kind === 'concept' && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Studio concept</span>
          )}
        </div>
        <Heading className="mt-4 font-display text-xl font-bold text-ink">
          <Link to={`/projects/${project.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            {project.title}
          </Link>
        </Heading>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{project.summary}</p>
        <span
          aria-hidden
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-700"
        >
          View project
          <ArrowRightIcon width={16} height={16} className="motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      </div>
      {/* Focus ring for the whole card when its stretched link has keyboard focus */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl ring-electric-600 ring-offset-2 group-has-[a:focus-visible]:ring-2"
      />
    </article>
  );
}
