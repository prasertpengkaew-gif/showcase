import { useEffect } from 'react';
import { siteConfig } from '../config/site';

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} — ${siteConfig.name}` : `${siteConfig.name} — ${siteConfig.tagline}`;
  }, [title]);
}
