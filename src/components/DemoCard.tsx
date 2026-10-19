import { Link } from 'react-router-dom';
import type { Demo } from '../data/demos';
import { LazyImage } from './LazyImage';
import { ArrowRightIcon } from './Icons';
import { useT } from '../i18n';

export function DemoCard({ demo, headingLevel: Heading = 'h3' }: { demo: Demo; headingLevel?: 'h2' | 'h3' }) {
  const t = useT().demos;
  const item = t.items[demo.id];
  const Icon = demo.icon;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-xl hover:shadow-slate-900/[0.06]">
      <div className="relative aspect-[3/2] overflow-hidden bg-navy-900">
        {demo.image ? (
          <LazyImage
            src={demo.image}
            alt=""
            width={1440}
            height={960}
            wrapperClassName="h-full"
            className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(50%_60%_at_50%_45%,rgba(37,99,235,0.35),transparent_70%)] text-white">
            <Icon width={72} height={72} strokeWidth={1.2} />
          </div>
        )}
        <span className="absolute top-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-electric-700 shadow-sm">
          <Icon />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <Heading className="font-display text-xl font-bold text-ink">
          <Link to={demo.to} className="outline-none after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </Heading>
        <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{item.text}</p>
        <p className="mt-4 text-xs text-slate-600">
          <span className="font-semibold">{t.needs}:</span> {item.needs}
        </p>
        <span aria-hidden className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-700">
          {t.open} <ArrowRightIcon width={16} height={16} />
        </span>
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-electric-600 ring-offset-2 group-has-[a:focus-visible]:ring-2" />
    </article>
  );
}
