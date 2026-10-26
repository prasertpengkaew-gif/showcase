import { demos } from '../data/demos';
import { projects } from '../data/projects';
import { stripLang } from '../i18n/paths';

export const DEFAULT_SHARE_IMAGE = '/og-image.png';

export interface ShareImage {
  /** Path the page advertises. Derivatives are JPEG files written at build time. */
  src: string;
  width: number;
  height: number;
  type: 'image/png' | 'image/jpeg';
  /** Original file under public/, when a 1200×630 JPEG is generated from it. */
  source?: string;
}

/** File name (no directory, no extension) for a generated share image. */
export function shareImageSlug(source: string): string {
  return source
    .replace(/^\/+/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function sourceFor(contentPath: string): string | undefined {
  const demo = demos.find((item) => item.to === contentPath);
  if (demo?.image) return demo.image;
  const slug = contentPath.match(/^\/projects\/([^/]+)$/)?.[1];
  if (!slug) return undefined;
  return projects.find((project) => project.slug === slug)?.cover.src;
}

/**
 * Share image for a public page. Demo previews and project covers are used when
 * the page has one; everything else keeps the site card. Callers turn the
 * source into an absolute URL on the canonical domain.
 */
export function shareImageFor(pagePath: string): ShareImage {
  const source = sourceFor(stripLang(pagePath.split(/[?#]/)[0] || '/'));
  if (!source || source === DEFAULT_SHARE_IMAGE) {
    return { src: DEFAULT_SHARE_IMAGE, width: 1200, height: 630, type: 'image/png' };
  }
  return {
    src: `/og/${shareImageSlug(source)}.jpg`,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    source,
  };
}
