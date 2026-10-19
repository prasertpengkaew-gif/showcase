import type { ReactNode } from 'react';
import { breakable } from './Breakable';

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  as?: 'h1' | 'h2';
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
  as: Heading = 'h2',
  id,
}: SectionHeadingProps) {
  const center = align === 'center';
  const dark = tone === 'dark';
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className={`eyebrow ${dark ? 'text-electric-400' : ''}`}>{eyebrow}</p>}
      <Heading
        id={id}
        className={`mt-3 font-display font-bold ${
          Heading === 'h1' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
        } leading-[1.1] ${dark ? 'text-white' : 'text-ink'}`}
      >
        {breakable(title)}
      </Heading>
      {description && (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${dark ? 'text-slate-300' : 'text-muted'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
