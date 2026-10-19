/** Feature and platform detection used for honest AR compatibility messaging. */

export type ARPlatform = 'ios' | 'android' | 'desktop' | 'other-mobile';

export interface DeviceCapabilities {
  platform: ARPlatform;
  secureContext: boolean;
  webgl: boolean;
  /** WebXR immersive-ar session support (Chrome on ARCore Android). null while unknown. */
  webxrAR: boolean | null;
}

export function detectPlatform(): ARPlatform {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as Mac; touch points distinguish it.
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mobi|Tablet/i.test(ua)) return 'other-mobile';
  return 'desktop';
}

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export async function detectWebXRAR(): Promise<boolean> {
  const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
  if (!xr) return false;
  try {
    return await xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}
