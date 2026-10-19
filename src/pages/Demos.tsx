import { PageHeader } from '../components/PageHeader';
import { DemoCard } from '../components/DemoCard';
import { QRCode } from '../components/QRCode';
import { demoGroups, demos } from '../data/demos';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

export default function Demos() {
  const t = useT();
  const d = t.demos;
  useDocumentTitle(d.metaTitle);
  const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  return (
    <>
      <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description}>
        <div className="mt-8 hidden items-center gap-4 sm:flex">
          <QRCode value={url} size={104} label={t.arNotice.qrLabel} onDark className="shrink-0" />
        </div>
      </PageHeader>
      {demoGroups.map((group, i) => (
        <section key={group} aria-labelledby={`demos-${group}`} className={`py-14 sm:py-16 ${i % 2 ? 'bg-surface' : ''}`}>
          <div className="container-page">
            <h2 id={`demos-${group}`} className="font-display text-2xl font-bold">
              {d.groups[group].title}
            </h2>
            <p className="mt-2 max-w-2xl text-muted">{d.groups[group].text}</p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {demos
                .filter((demo) => demo.group === group)
                .map((demo) => (
                  <li key={demo.id}>
                    <DemoCard demo={demo} />
                  </li>
                ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
