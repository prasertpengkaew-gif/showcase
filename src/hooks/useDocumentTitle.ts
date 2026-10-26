import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig } from '../config/site';
import { useLanguage, useT } from '../i18n';
import { stripLang } from '../i18n/paths';
import { canonicalUrl, languageAlternates } from '../seo/alternates';
import { seoFor } from '../seo/pages';
import { shareImageFor } from '../seo/shareImage';
import { absoluteUrl } from '../seo/site';

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (hreflang) el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}

function clearIndexableLinks() {
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
}

/**
 * Sets the tab title and, for pages that have search copy in src/seo/pages.ts, the meta
 * description, canonical URL, language alternates and social-share tags. The static HTML
 * written at build time carries the same values, so they do not change when the app starts.
 */
export function useDocumentTitle(title?: string): void {
  const { tagline } = useT();
  const { lang } = useLanguage();
  const { pathname } = useLocation();
  useEffect(() => {
    const contentPath = stripLang(pathname);
    const seo = seoFor(contentPath, lang);
    const full = seo?.title ?? (title ? `${title} — ${siteConfig.name}` : `${siteConfig.name} — ${tagline}`);
    document.title = full;
    if (!seo) {
      clearIndexableLinks();
      return;
    }
    const canonical = canonicalUrl(contentPath, lang);
    const image = shareImageFor(contentPath);
    const imageUrl = absoluteUrl(image.src);
    setMeta('meta[name="description"]', 'name', 'description', seo.description);
    setLink('canonical', canonical);
    for (const alt of languageAlternates(contentPath)) setLink('alternate', alt.href, alt.hreflang);
    setMeta('meta[property="og:title"]', 'property', 'og:title', seo.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', seo.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'en' ? 'en_US' : 'th_TH');
    setMeta('meta[property="og:locale:alternate"]', 'property', 'og:locale:alternate', lang === 'en' ? 'th_TH' : 'en_US');
    setMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    setMeta('meta[property="og:image:width"]', 'property', 'og:image:width', String(image.width));
    setMeta('meta[property="og:image:height"]', 'property', 'og:image:height', String(image.height));
    setMeta('meta[property="og:image:type"]', 'property', 'og:image:type', image.type);
    setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', seo.title);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', seo.title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', seo.description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
  }, [title, tagline, lang, pathname]);
}
