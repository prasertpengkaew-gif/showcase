import { Link } from 'react-router-dom';
import { ArrowRightIcon } from './Icons';
import { useT } from '../i18n';

interface EventIdea {
  title: string;
  text: string;
  /** Optional link to the demo that shows the idea. */
  to?: string;
  link?: string;
}

/** "Using this at an event" ideas, shown on demo pages that double as event activations. */
export function EventIdeas({ id, ideas }: { id: string; ideas: readonly EventIdea[] }) {
  const e = useT().eventIdeas;
  return (
    <section aria-labelledby={id} className="bg-navy-900 py-20 text-white sm:py-24">
      <div className="container-page">
        <p className="text-sm font-semibold tracking-[0.14em] text-electric-200 uppercase">{e.eyebrow}</p>
        <h2 id={id} className="mt-2 font-display text-3xl font-bold">
          {e.title}
        </h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {ideas.map((idea) => (
            <li key={idea.title} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-display text-lg font-bold">{idea.title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-slate-300">{idea.text}</p>
              {idea.to && idea.link && (
                <Link to={idea.to} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-200 hover:text-white">
                  {idea.link} <ArrowRightIcon width={16} height={16} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
