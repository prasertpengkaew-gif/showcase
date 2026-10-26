import { Link } from '../i18n/Link';
import { siteConfig } from '../config/site';
import { useT } from '../i18n';

export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const t = useT();
  const text = tone === 'light' ? 'text-white' : 'text-ink';
  return (
    <Link to="/" className={`flex items-center gap-2.5 font-display text-[17px] font-bold ${text}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden focusable="false">
        <rect width="32" height="32" rx="8" fill={tone === 'light' ? '#ffffff' : '#0B1220'} fillOpacity={tone === 'light' ? 0.08 : 1} />
        <path d="M10 22V10l12 12V10" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24.5" cy="24.5" r="1.8" fill="#fff" />
      </svg>
      <span>{siteConfig.name}</span>
      <span className="sr-only">{t.nav.homeSuffix}</span>
    </Link>
  );
}
