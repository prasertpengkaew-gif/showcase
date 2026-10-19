import { useLanguage, useT } from '../i18n';

/** Switches the interface between Thai and English. */
export function LanguageToggle({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const { toggle } = useLanguage();
  const t = useT();
  return (
    <button
      type="button"
      onClick={toggle}
      lang={t.switchTo === 'English' ? 'en' : 'th'}
      className={`inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
        tone === 'light'
          ? 'border-white/20 text-white hover:border-white/50 hover:bg-white/5'
          : 'border-line text-ink hover:border-slate-300 hover:bg-surface'
      }`}
    >
      <span aria-hidden>{t.switchTo === 'English' ? 'EN' : 'TH'}</span>
      <span className="sr-only">{t.switchTo === 'English' ? 'EN' : 'TH'} — {t.switchLabel}</span>
    </button>
  );
}
