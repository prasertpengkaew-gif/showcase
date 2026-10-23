// Loads the 8th Wall engine binary (SLAM world tracking, works in iPhone Safari) only when a visitor asks for AR.
// Licence: https://github.com/8thwall/engine/blob/main/LICENSE (free to use and distribute, not for paid products built on it).
const SRC = 'https://cdn.jsdelivr.net/npm/@8thwall/engine-binary@1/dist/xr.js';

/** The engine has no type definitions; only the few calls we use are touched. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type XR8 = any;

export const loadXR8 = (timeoutMs = 25000): Promise<XR8> =>
  new Promise((resolve, reject) => {
    const w = window as unknown as { XR8?: XR8 };
    if (w.XR8) return resolve(w.XR8);
    const timer = window.setTimeout(() => reject(new Error('The AR engine took too long to load')), timeoutMs);
    window.addEventListener('xrloaded', () => { window.clearTimeout(timer); resolve(w.XR8); }, { once: true });
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.preloadChunks = 'slam';
    script.onerror = () => { window.clearTimeout(timer); reject(new Error('The AR engine could not be loaded')); };
    document.head.appendChild(script);
  });
