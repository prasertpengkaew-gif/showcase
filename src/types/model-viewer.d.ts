import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/** Attributes we use on Google's <model-viewer> custom element. */
interface ModelViewerAttributes extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  src?: string;
  'ios-src'?: string;
  poster?: string;
  alt?: string;
  ar?: string;
  'ar-modes'?: string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  'camera-controls'?: string;
  'auto-rotate'?: string;
  'auto-rotate-delay'?: number | string;
  'rotation-per-second'?: string;
  'interaction-prompt'?: 'auto' | 'none';
  'touch-action'?: string;
  'camera-orbit'?: string;
  'min-camera-orbit'?: string;
  'max-camera-orbit'?: string;
  'field-of-view'?: string;
  'shadow-intensity'?: number | string;
  'shadow-softness'?: number | string;
  exposure?: number | string;
  'environment-image'?: string;
  'tone-mapping'?: string;
  'variant-name'?: string;
  'animation-name'?: string;
  'animation-crossfade-duration'?: number | string;
  autoplay?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'manual';
  'interpolation-decay'?: number | string;
  'disable-tap'?: string;
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes;
    }
  }
}
