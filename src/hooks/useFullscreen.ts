import { useCallback, useEffect, useState, type RefObject } from 'react';

type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

/**
 * Full screen for a page section. Uses the Fullscreen API where it exists; iPhone Safari only
 * allows it for <video>, so there (and if the request is refused) the element is shown as a
 * fixed overlay covering the viewport instead. `mode` tells the caller which one is active.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [mode, setMode] = useState<'off' | 'native' | 'overlay'>('off');

  useEffect(() => {
    const doc = document as WebkitDocument;
    const onChange = () => {
      const current = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      setMode((m) => (current && current === ref.current ? 'native' : m === 'native' ? 'off' : m));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [ref]);

  // Overlay mode: lock page scroll and let Escape close it, like real full screen.
  useEffect(() => {
    if (mode !== 'overlay') return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMode('off');
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mode]);

  const enter = useCallback(async () => {
    const el = ref.current as WebkitElement | null;
    if (!el) return;
    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    try {
      if (!request) throw new Error('unsupported');
      await request();
      setMode('native');
    } catch {
      setMode('overlay');
    }
  }, [ref]);

  const exit = useCallback(() => {
    const doc = document as WebkitDocument;
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    }
    setMode('off');
  }, []);

  return { mode, isFull: mode !== 'off', enter, exit };
}
