import type { ReactNode } from 'react';
import { ButtonLink } from './Button';
import { PageHeader } from './PageHeader';
import { SectionHeading } from './SectionHeading';

/** Text every concept demo page shares: header, "concept demo" note, how it works, good to know, call to action. */
export interface ShellText {
  eyebrow: string;
  title: string;
  description: string;
  sampleTitle: string;
  sampleText: string;
  howEyebrow: string;
  howTitle: string;
  howText: string;
  goodTitle: string;
  goodToKnow: { title: string; text: string }[];
  ctaTitle: string;
  ctaText: string;
  ctaContact: string;
}

export function DemoShell({ d, children }: { d: ShellText; children: ReactNode }) {
  return <>
    <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />
    <section className="bg-surface py-12 sm:py-16">
      <div className="container-page">
        <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-slate-700"><strong>{d.sampleTitle}.</strong> {d.sampleText}</div>
        {children}
      </div>
    </section>
    <section className="py-16 sm:py-20"><div className="container-page"><SectionHeading eyebrow={d.howEyebrow} title={d.howTitle} description={d.howText} /><h2 className="mt-12 font-display text-2xl font-bold">{d.goodTitle}</h2><div className="mt-6 grid gap-8 md:grid-cols-3">{d.goodToKnow.map((item) => <div key={item.title} className="border-t-2 border-electric-600 pt-5"><h3 className="font-display text-lg font-bold">{item.title}</h3><p className="mt-2 leading-relaxed text-muted">{item.text}</p></div>)}</div></div></section>
    <section className="bg-navy-900 py-16 text-white"><div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"><div><h2 className="font-display text-3xl font-bold">{d.ctaTitle}</h2><p className="mt-3 text-slate-300">{d.ctaText}</p></div><ButtonLink to="/contact" size="lg">{d.ctaContact}</ButtonLink></div></section>
  </>;
}
