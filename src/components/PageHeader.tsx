import type { ReactNode } from 'react';
import { breakable } from './Breakable';

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}

/** Compact dark header band used at the top of inner pages. */
export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-navy-900 pt-32 pb-16 text-white sm:pt-40 sm:pb-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(37,99,235,0.22),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="container-page relative">
        <p className="eyebrow text-electric-400">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.08] font-bold sm:text-5xl lg:text-6xl">{breakable(title)}</h1>
        {description && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">{description}</p>}
        {children}
      </div>
    </section>
  );
}
