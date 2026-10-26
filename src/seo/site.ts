/** Canonical origin. Prerender, the sitemap and the live head tags all read this. */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ||
  (typeof process !== 'undefined' ? process.env.VITE_SITE_URL : '') ||
  'https://www.thenerdstudio.space'
).replace(/\/+$/, '');

export function absoluteUrl(path: string): string {
  return SITE_URL + (path === '/' ? '/' : path);
}
