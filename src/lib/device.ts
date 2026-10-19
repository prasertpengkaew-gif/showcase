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

export type InAppBrowser = 'line' | 'facebook' | 'instagram' | 'tiktok' | 'other';

/**
 * Detects the built-in browsers of chat and social apps. They often block the camera, WebXR
 * or AR Quick Look, so the site suggests opening the page in the phone's own browser.
 */
export function detectInAppBrowser(ua = navigator.userAgent): InAppBrowser | null {
  if (/\bLine\//i.test(ua)) return 'line';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'facebook';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'tiktok';
  if (/KAKAOTALK|MicroMessenger|; wv\)/i.test(ua)) return 'other';
  return null;
}

/** A link that opens the current page outside the in-app browser, where the platform allows it. */
export function externalBrowserUrl(app: InAppBrowser, href = window.location.href): string | null {
  const url = new URL(href);
  // LINE documents this parameter for opening links in the default browser.
  if (app === 'line') {
    url.searchParams.set('openExternalBrowser', '1');
    return url.toString();
  }
  if (detectPlatform() === 'android') {
    return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(':', '')};package=com.android.chrome;end`;
  }
  // iOS has no reliable way to leave an in-app browser from a link.
  return null;
}
