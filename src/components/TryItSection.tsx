import type { ProjectTryIt } from '../types/project';
import { QRCode } from './QRCode';
import { buttonClasses } from './Button';
import { ArrowRightIcon } from './Icons';
import { useT } from '../i18n';

interface TryItSectionProps {
  tryIt: ProjectTryIt;
  /** id of the viewer section to jump back to. */
  viewerAnchor: string;
}

/** Hands-on alternative to a demo video: steps to try in the live viewer, plus a QR code for AR on a phone. */
export function TryItSection({ tryIt, viewerAnchor }: TryItSectionProps) {
  const url = window.location.href.split('#')[0];
  const t = useT().tryIt;
  return (
    <section aria-labelledby="try-title" className="bg-navy-900 py-20 text-white sm:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-20">
        <div>
          <p className="eyebrow text-electric-400">{t.eyebrow}</p>
          <h2 id="try-title" className="mt-3 font-display text-3xl font-bold">
            {tryIt.title}
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-slate-300">
            {t.intro}
          </p>
          <ol className="mt-8 space-y-5">
            {tryIt.steps.map((step, i) => (
              <li key={step} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 font-display text-sm font-bold">
                  {i + 1}
                </span>
                <p className="pt-1 leading-relaxed text-slate-200">{step}</p>
              </li>
            ))}
          </ol>
          <a href={`#${viewerAnchor}`} className={buttonClasses('primary', 'lg', 'mt-10')}>
            {t.goToViewer} <ArrowRightIcon />
          </a>
        </div>

        <div className="flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-7 sm:flex-row sm:items-center lg:flex-col lg:items-start">
          <QRCode value={url} label={t.qrLabel} className="shrink-0" onDark />
          <div>
            <h3 className="font-display text-lg font-bold">{t.phoneTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {t.phoneText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
