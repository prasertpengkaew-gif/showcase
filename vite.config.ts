import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cspExtraFromEnv, securityHeaders } from './scripts/csp.mjs';

const xrEmulateStub = fileURLToPath(new URL('./src/shims/xr-emulate.ts', import.meta.url));

/**
 * @pmndrs/xr only loads its emulator from a dynamic import, but the bundler still
 * emits that graph: IWER plus the music_room / living_room captures (several MB).
 * This site calls createXRStore({ emulate: false }), so real WebXR never reaches
 * that import. Point the import at a tiny stub and leave the rest of the XR runtime.
 */
/**
 * Sends the production CSP (and the other security headers) on every response.
 * `npm run dev` leaves them off so React Fast Refresh's inline preamble and the
 * HMR websocket keep working. The e2e servers set CSP_ENFORCE=1 and turn HMR off,
 * and `vite preview` always enforces the deployed policy.
 * Extras (CSP_EXTRA_CONNECT / CSP_EXTRA_IMG) are read when the server starts, so
 * each e2e server can allow its own mock origin without changing the deployed policy.
 */
function securityHeadersPlugin(): Plugin {
  const attach = (middlewares: Connect.Server, extra: ReturnType<typeof cspExtraFromEnv>) => {
    const headers = securityHeaders(extra);
    middlewares.use((_req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      for (const header of headers) res.setHeader(header.key, header.value);
      next();
    });
  };
  return {
    name: 'security-headers',
    configureServer(server) {
      if (process.env.CSP_ENFORCE !== '1') return;
      attach(server.middlewares, cspExtraFromEnv());
    },
    configurePreviewServer(server) {
      attach(server.middlewares, {});
    },
  };
}

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
  plugins: [dropXREmulator(), react(), tailwindcss(), securityHeadersPlugin()],
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
