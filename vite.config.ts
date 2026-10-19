import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
