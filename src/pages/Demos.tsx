import { PageHeader } from '../components/PageHeader';
import { DemoCard } from '../components/DemoCard';
import { QRCode } from '../components/QRCode';
import { demoGroups, demos, isHalloweenSeason } from '../data/demos';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

export default function Demos() {
  const t = useT();
  const d = t.demos;
  useDocumentTitle(d.metaTitle);
  const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const spotlight = isHalloweenSeason() ? demos.find((demo) => demo.id === 'halloweenFace') : undefined;
  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description}>
        <div className="mt-8 hidden items-center gap-4 sm:flex">
          <QRCode value={url} size={104} label={t.arNotice.qrLabel} onDark className="shrink-0" />
        </div>
      </PageHeader>
      {spotlight && (
        <section aria-labelledby="demos-halloween" className="border-b border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 py-12 sm:py-14">
          <div className="container-page grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <div>
              <p>
                <span className="inline-flex items-center rounded-full bg-orange-600 px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
                  {d.season.badge}
                </span>
              </p>
              <h2 id="demos-halloween" className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                {d.season.title}
              </h2>
              <p className="mt-3 max-w-xl text-lg leading-relaxed text-muted">{d.season.text}</p>
            </div>
            <DemoCard demo={spotlight} badge={d.season.badge} priority />
          </div>
        </section>
      )}
      {demoGroups.map((group, i) => {
        const items = demos.filter((demo) => demo.group === group && demo.id !== spotlight?.id);
        if (items.length === 0) return null;
        return (
          <section key={group} aria-labelledby={`demos-${group}`} className={`py-14 sm:py-16 ${i % 2 ? 'bg-surface' : ''}`}>
            <div className="container-page">
              <h2 id={`demos-${group}`} className="font-display text-2xl font-bold">
                {d.groups[group].title}
              </h2>
              <p className="mt-2 max-w-2xl text-muted">{d.groups[group].text}</p>
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((demo) => (
                  <li key={demo.id}>
                    <DemoCard demo={demo} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}
    </>
  );
}
