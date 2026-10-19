import { PROJECT_CATEGORIES, type ProjectCategory } from '../types/project';

interface ProjectFiltersProps {
  active: ProjectCategory | null;
  counts: Record<ProjectCategory, number>;
  total: number;
  onChange: (category: ProjectCategory | null) => void;
}

export function ProjectFilters({ active, counts, total, onChange }: ProjectFiltersProps) {
  const options: { value: ProjectCategory | null; label: string; count: number }[] = [
    { value: null, label: 'All work', count: total },
    ...PROJECT_CATEGORIES.map((c) => ({ value: c, label: c, count: counts[c] })),
  ];

  return (
    <div role="group" aria-label="Filter projects by category" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {options.map((o) => {
          const selected = o.value === active;
          return (
            <li key={o.label}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={o.count === 0}
                onClick={() => onChange(o.value)}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-line bg-white text-slate-700 hover:border-slate-300 hover:text-ink'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {o.label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${selected ? 'bg-white/15' : 'bg-slate-100 text-slate-500'}`}
                >
                  {o.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
