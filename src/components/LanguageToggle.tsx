import { Link, useLocation } from 'react-router-dom';
import { useT } from '../i18n';
import { alternatePath, langFromPath } from '../i18n/paths';

/** Goes to the same page in the other language. */
export function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { pathname, search, hash } = useLocation();
  const t = useT();
  const other = langFromPath(pathname) === 'en' ? 'th' : 'en';
  const labelLang = t.switchTo === 'English' ? 'en' : 'th';
  const short = labelLang === 'en' ? 'EN' : 'TH';
  return (
    <Link
      to={alternatePath(`${pathname}${search}${hash}`)}
      hrefLang={other}
      lang={labelLang}
      className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        tone === 'light'
          ? 'border-white/20 text-white hover:border-white/50 hover:bg-white/5'
          : 'border-line text-ink hover:border-slate-300 hover:bg-surface'
      }`}
    >
      <span aria-hidden>{short}</span>
      <span className="sr-only">{short} — {t.switchLabel}</span>
    </Link>
  );
}
