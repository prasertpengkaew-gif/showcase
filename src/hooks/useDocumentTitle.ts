import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig } from '../config/site';
import { useLanguage, useT } from '../i18n';
import { seoFor } from '../seo/pages';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Sets the tab title and, for pages that have search copy in src/seo/pages.ts, the meta
 * description and social-share text too. The static HTML written at build time carries the same
 * text, so it does not change when the app starts.
 */
export function useDocumentTitle(title?: string): void {
  const { tagline } = useT();
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  useEffect(() => {
    const seo = seoFor(pathname, lang);
    const full = seo?.title ?? (title ? `${title} — ${siteConfig.name}` : `${siteConfig.name} — ${tagline}`);
    document.title = full;
    if (seo) {
      setMeta('meta[name="description"]', 'name', 'description', seo.description);
      setMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
      setMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
    }
  }, [title, tagline, lang, pathname]);
}
