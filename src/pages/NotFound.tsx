import { ButtonLink } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useNoIndex } from '../hooks/useNoIndex';
import { useT } from '../i18n';

export default function NotFound({ title, message }: { title?: string; message?: string }) {
  const t = useT().notFound;
  useDocumentTitle(title ?? t.title);
  useNoIndex();
  return (
    <PageHeader
      eyebrow="404"
      title={title ?? t.title}
      description={message ?? t.text}
    >
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/" size="lg">
          {t.home}
        </ButtonLink>
        <ButtonLink to="/projects" size="lg" variant="outline-light">
          {t.projects}
        </ButtonLink>
      </div>
    </PageHeader>
  );
}
