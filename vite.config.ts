import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const xrEmulateStub = fileURLToPath(new URL('./src/shims/xr-emulate.ts', import.meta.url));

/**
 * @pmndrs/xr only loads its emulator from a dynamic import, but the bundler still
 * emits that graph: IWER plus the music_room / living_room captures (several MB).
 * This site calls createXRStore({ emulate: false }), so real WebXR never reaches
 * that import. Point the import at a tiny stub and leave the rest of the XR runtime.
 */
function dropXREmulator(): Plugin {
  return {
    name: 'drop-xr-emulator',
    enforce: 'pre',
    resolveId(source, importer) {
      const spec = source.replaceAll('\\', '/');
      const from = (importer ?? '').replaceAll('\\', '/');
      const emulateEntry = spec === './emulate.js' || spec.endsWith('/@pmndrs/xr/dist/emulate.js');
      if (emulateEntry && (from.includes('/@pmndrs/xr/') || spec.includes('/@pmndrs/xr/'))) {
        return xrEmulateStub;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [dropXREmulator(), react(), tailwindcss()],
  server: {
    // Listen on the LAN so you can open the dev server from a phone.
    // Note: phones need HTTPS for WebXR — see README "Testing AR on a phone".
    host: true,
  },
  build: {
    // three.js and model-viewer are large but only load on pages that use 3D (lazy chunks).
    chunkSizeWarningLimit: 1200,
  },
});
