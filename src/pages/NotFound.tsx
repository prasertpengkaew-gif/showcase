import { ButtonLink } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound({ title = 'Page not found', message }: { title?: string; message?: string }) {
  useDocumentTitle(title);
  return (
    <PageHeader
      eyebrow="404"
      title={title}
      description={message ?? "The page you're looking for doesn't exist or has moved."}
    >
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink to="/" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink to="/projects" size="lg" variant="outline-light">
          Browse projects
        </ButtonLink>
      </div>
    </PageHeader>
  );
}
