import { withLang, type Lang } from '../i18n/paths';
import { absoluteUrl } from './site';

export interface HreflangLink {
  hreflang: 'th' | 'en' | 'x-default';
  href: string;
}

/** Thai is the default language, so `x-default` points at the unprefixed URL. */
export function languageAlternates(contentPath: string): HreflangLink[] {
  const th = absoluteUrl(withLang(contentPath, 'th'));
  const en = absoluteUrl(withLang(contentPath, 'en'));
  return [
    { hreflang: 'th', href: th },
    { hreflang: 'en', href: en },
    { hreflang: 'x-default', href: th },
  ];
}

export function canonicalUrl(contentPath: string, lang: Lang): string {
  return absoluteUrl(withLang(contentPath, lang));
}
