import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { en, type Dictionary } from './en';
import { th } from './th';
import { categoryTh, modelsTh, projectsTh, servicesTh } from './content.th';
import { projects as projectsEn } from '../data/projects';
import { services as servicesEn, type Service } from '../data/services';
import { models as modelsEn } from '../data/models';
import type { ModelAsset, ModelId, Project, ProjectCategory } from '../types/project';
import { isPrivatePath, langFromPath, withLang, type Lang } from './paths';

export type { Lang };

const dictionaries: Record<Lang, Dictionary> = { en, th };
const STORAGE_KEY = 'lang';

/**
 * Language for private pages (`/booth`, `/p`), which have no translated URL.
 * Public pages take their language from the path and do not read this.
 * Crawlers announce English, so a booth URL they open still renders Thai.
 */
function privateLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'th') return saved;
  } catch {
    // Storage can be unavailable (private mode); fall through to the browser language.
  }
  if (typeof navigator !== 'undefined' && /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) return 'th';
  return navigator.language?.toLowerCase().startsWith('th') ? 'th' : 'en';
}

function remember(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const privatePage = isPrivatePath(location.pathname);
  // Booth and guest-photo pages keep a language of their own (the event's, or the visitor's).
  const [boothLang, setBoothLang] = useState<Lang>(privateLang);
  const lang = privatePage ? boothLang : langFromPath(location.pathname);

  const setLang = useCallback(
    (next: Lang) => {
      remember(next);
      setBoothLang(next);
      if (isPrivatePath(location.pathname)) return;
      const here = `${location.pathname}${location.search}${location.hash}`;
      const target = withLang(here, next);
      if (target !== here) navigate(target);
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggle: () => setLang(lang === 'en' ? 'th' : 'en') }),
    [lang, setLang],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

/** Interface text for the current language. */
export const useT = (): Dictionary => dictionaries[useLanguage().lang];

// ---------------------------------------------------------------------------
// Localized data
// ---------------------------------------------------------------------------

function localizeProject(p: Project, lang: Lang): Project {
  const t = lang === 'th' ? projectsTh[p.slug] : undefined;
  if (!t) return p;
  const [coverAlt, ...galleryAlts] = t.alts;
  return {
    ...p,
    title: t.title,
    summary: t.summary,
    overview: t.overview,
    challenge: t.challenge,
    approach: t.approach,
    deliverables: t.deliverables,
    platforms: t.platforms,
    cover: { ...p.cover, alt: coverAlt },
    gallery: p.gallery.map((img, i) => ({ ...img, alt: galleryAlts[i] ?? img.alt })),
    video: p.video && t.videoDescription ? { ...p.video, description: t.videoDescription } : p.video,
    tryIt: p.tryIt && t.tryIt ? t.tryIt : p.tryIt,
  };
}

export function useProjects(): Project[] {
  const { lang } = useLanguage();
  return useMemo(() => projectsEn.map((p) => localizeProject(p, lang)), [lang]);
}

/** Same-category projects first, then others, excluding the current one. */
export function relatedProjects(all: Project[], project: Project, limit = 3): Project[] {
  const others = all.filter((p) => p.slug !== project.slug);
  const same = others.filter((p) => p.category === project.category);
  const rest = others.filter((p) => p.category !== project.category);
  return [...same, ...rest].slice(0, limit);
}

export function useServices(): Service[] {
  const { lang } = useLanguage();
  return useMemo(
    () =>
      servicesEn.map((s) => {
        const t = lang === 'th' ? servicesTh[s.id] : undefined;
        return t ? { ...s, ...t } : s;
      }),
    [lang],
  );
}

export function useModels(): Record<ModelId, ModelAsset> {
  const { lang } = useLanguage();
  return useMemo(() => {
    if (lang === 'en') return modelsEn;
    const out = { ...modelsEn };
    for (const id of Object.keys(out) as ModelId[]) out[id] = { ...out[id], ...modelsTh[id] };
    return out;
  }, [lang]);
}

export function useCategoryLabel(): (c: ProjectCategory) => string {
  const { lang } = useLanguage();
  return useCallback((c: ProjectCategory) => (lang === 'th' ? categoryTh[c] : c), [lang]);
}
