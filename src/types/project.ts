export const PROJECT_CATEGORIES = [
  'Industrial',
  'Product',
  'Education',
  'Marketing',
  'Real Estate',
  'Automotive',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export type ModelId = 'chair' | 'robot' | 'car' | 'fox' | 'sofa' | 'sneaker' | 'dragon';

/** A 3D asset that can be shown in the viewer and placed in AR. */
export interface ModelAsset {
  id: ModelId;
  name: string;
  /** Path to a .glb or .gltf file, relative to /public or an absolute HTTPS URL. */
  src: string;
  /** Optional Apple USDZ file. If omitted, model-viewer generates one for Quick Look on the fly. */
  iosSrc?: string;
  /** Still image shown while the model loads. */
  poster: string;
  /** Text alternative describing the model for screen readers. */
  alt: string;
  /** Real-world bounding size, shown to users before they place it in AR. */
  dimensions: string;
  /** Material variants embedded with KHR_materials_variants (exact names from the file). */
  variants?: string[];
  /** Animation clip names embedded in the file. */
  animations?: string[];
  defaultAnimation?: string;
  cameraOrbit?: string;
  /** Point the camera orbits around, e.g. 'auto 0.2m auto'. Defaults to the model's centre. */
  cameraTarget?: string;
  credit: ModelCredit;
}

export interface ModelCredit {
  title: string;
  author: string;
  license: 'CC0 1.0' | 'CC BY 4.0';
  sourceUrl: string;
  notes?: string;
}

export interface ProjectImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProjectVideo {
  /** Listed in order of preference; the browser plays the first format it supports. */
  sources: { src: string; type: 'video/webm' | 'video/mp4' }[];
  poster: string;
  /** Plain-language description of what happens in the video. */
  description: string;
}

/** A hands-on checklist shown instead of a video: things the visitor can try in the live viewer. */
export interface ProjectTryIt {
  title: string;
  steps: string[];
}

export interface Project {
  slug: string;
  title: string;
  category: ProjectCategory;
  /** One sentence used on cards. */
  summary: string;
  /** Paragraphs for the detail page. */
  overview: string[];
  challenge: string;
  approach: string[];
  deliverables: string[];
  technologies: string[];
  platforms: string[];
  modelId: ModelId;
  cover: ProjectImage;
  gallery: ProjectImage[];
  /** Demo video. Projects without one should provide `tryIt` instead. */
  video?: ProjectVideo;
  tryIt?: ProjectTryIt;
  /**
   * 'concept' marks studio demonstration work built with openly licensed sample assets.
   * Use 'client' only for real, approved case studies.
   */
  kind: 'concept' | 'client';
  featured?: boolean;
}
