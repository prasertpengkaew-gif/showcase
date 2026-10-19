import { useEffect, useState } from 'react';
import { detectPlatform, detectWebXRAR, hasWebGL, type DeviceCapabilities } from '../lib/device';

let cachedWebGL: boolean | undefined;

export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(() => ({
    platform: detectPlatform(),
    secureContext: window.isSecureContext,
    webgl: (cachedWebGL ??= hasWebGL()),
    webxrAR: null,
  }));

  useEffect(() => {
    let cancelled = false;
    detectWebXRAR().then((supported) => {
      if (!cancelled) setCaps((c) => ({ ...c, webxrAR: supported }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return caps;
}
