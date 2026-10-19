import { PageHeader } from '../components/PageHeader';
import { DemoCard } from '../components/DemoCard';
import { QRCode } from '../components/QRCode';
import { demos } from '../data/demos';
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
      <section aria-label={d.metaTitle} className="py-16 sm:py-20">
        <div className="container-page">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((demo) => (
              <li key={demo.id}>
                <DemoCard demo={demo} headingLevel="h2" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
