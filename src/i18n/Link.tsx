import { Link as RouterLink, NavLink as RouterNavLink, type LinkProps, type NavLinkProps, type To } from 'react-router-dom';
import { useLanguage } from './index';
import { withLang, type Lang } from './paths';

function localizeTo(to: To, lang: Lang): To {
  if (typeof to === 'string') return withLang(to, lang);
  if (typeof to === 'object' && to && typeof to.pathname === 'string') {
    const search = to.search ? (String(to.search).startsWith('?') ? String(to.search) : `?${to.search}`) : '';
    const hash = to.hash ? (String(to.hash).startsWith('#') ? String(to.hash) : `#${to.hash}`) : '';
    const next = withLang(`${to.pathname}${search}${hash}`, lang);
    const hashAt = next.indexOf('#');
    const beforeHash = hashAt >= 0 ? next.slice(0, hashAt) : next;
    const queryAt = beforeHash.indexOf('?');
    return {
      ...to,
      pathname: queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash,
      search: queryAt >= 0 ? beforeHash.slice(queryAt) : '',
      hash: hashAt >= 0 ? next.slice(hashAt) : '',
    };
  }
  return to;
}

/** In-app link that stays on the current language's URLs. */
export function Link({ to, ...rest }: LinkProps) {
  const { lang } = useLanguage();
  return <RouterLink to={localizeTo(to, lang)} {...rest} />;
}

/** In-app nav link that stays on the current language's URLs. */
export function NavLink({ to, ...rest }: NavLinkProps) {
  const { lang } = useLanguage();
  return <RouterNavLink to={localizeTo(to, lang)} {...rest} />;
}
