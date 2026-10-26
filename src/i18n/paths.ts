/**
 * Public pages have two URLs. Thai stays on the existing path (`/projects`).
 * English is the same path under `/en` (`/en/projects`, and `/en` for the home page).
 * Booth and guest-photo URLs are private and are not translated.
 */
export type Lang = 'en' | 'th';

const PRIVATE = /^\/(?:booth|p)(?:\/|$)/;

export function langFromPath(pathname: string): Lang {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname || '/';
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'th';
}

/** Path without a language prefix and without a trailing slash (except `/`). */
export function stripLang(pathname: string): string {
  let path = pathname || '/';
  if (path.length > 1) path = path.replace(/\/+$/, '');
  if (path === '/en') return '/';
  if (path.startsWith('/en/')) return path.slice(3) || '/';
  return path || '/';
}

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE.test(stripLang(pathname));
}

/**
 * Point an in-app path at `lang`. External, hash-only and relative paths are left alone.
 * Private booth and guest-photo paths are never prefixed.
 */
export function withLang(to: string, lang: Lang): string {
  if (!to || to.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(to)) return to;
  const hashAt = to.indexOf('#');
  const hash = hashAt >= 0 ? to.slice(hashAt) : '';
  const beforeHash = hashAt >= 0 ? to.slice(0, hashAt) : to;
  const queryAt = beforeHash.indexOf('?');
  const search = queryAt >= 0 ? beforeHash.slice(queryAt) : '';
  const pathname = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  if (!pathname.startsWith('/')) return to;
  const bare = stripLang(pathname);
  if (isPrivatePath(bare)) return bare + search + hash;
  const localized = lang === 'en' ? (bare === '/' ? '/en' : `/en${bare}`) : bare;
  return localized + search + hash;
}

/** The other language's URL for the same page, keeping the query and hash. */
export function alternatePath(to: string): string {
  const pathname = to.split(/[?#]/)[0] || '/';
  return withLang(to, langFromPath(pathname) === 'en' ? 'th' : 'en');
}
