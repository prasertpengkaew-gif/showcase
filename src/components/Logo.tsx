import { Link } from 'react-router-dom';
import { siteConfig } from '../config/site';

export function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const text = tone === 'light' ? 'text-white' : 'text-ink';
  return (
    <Link to="/" className={`flex items-center gap-2.5 font-display text-[17px] font-bold ${text}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden focusable="false">
        <rect width="32" height="32" rx="8" fill={tone === 'light' ? '#ffffff' : '#0B1220'} fillOpacity={tone === 'light' ? 0.08 : 1} />
        <path d="M8 10l8 13 8-13" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="9" r="2" fill="#fff" />
      </svg>
      <span>{siteConfig.name}</span>
      <span className="sr-only">— home</span>
    </Link>
  );
}
