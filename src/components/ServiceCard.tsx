import type { Service } from '../data/services';
import { CheckIcon } from './Icons';

interface ServiceCardProps {
  service: Service;
  /** Compact cards show only the summary (used on the home page). */
  variant?: 'compact' | 'full';
  index?: number;
}

export function ServiceCard({ service, variant = 'full', index }: ServiceCardProps) {
  const Icon = service.icon;
  return (
    <article
      id={variant === 'full' ? service.id : undefined}
      className="flex h-full scroll-mt-24 flex-col rounded-2xl border border-line bg-white p-7 sm:p-8"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-electric-50 text-electric-700">
          <Icon width={24} height={24} />
        </span>
        {index !== undefined && (
          <span className="font-display text-sm font-semibold text-slate-300 tabular-nums" aria-hidden>
            {String(index + 1).padStart(2, '0')}
          </span>
        )}
      </div>
      <h3 className="mt-6 font-display text-xl font-bold text-ink">{service.title}</h3>
      <p className="mt-3 leading-relaxed text-muted">{service.summary}</p>
      {variant === 'full' && (
        <>
          <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
            {service.includes.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] text-slate-700">
                <CheckIcon className="mt-0.5 shrink-0 text-electric-600" width={18} height={18} />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            <span className="font-semibold text-ink">Best for: </span>
            {service.bestFor}
          </p>
        </>
      )}
    </article>
  );
}
