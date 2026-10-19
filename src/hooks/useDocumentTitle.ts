import { useEffect } from 'react';
import { siteConfig } from '../config/site';
import { useT } from '../i18n';

export function useDocumentTitle(title?: string): void {
  const { tagline } = useT();
  useEffect(() => {
    document.title = title ? `${title} — ${siteConfig.name}` : `${siteConfig.name} — ${tagline}`;
  }, [title, tagline]);
}
