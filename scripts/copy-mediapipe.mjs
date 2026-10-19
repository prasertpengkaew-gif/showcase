// Copies MediaPipe's WebAssembly runtime from node_modules into public/mediapipe so the
// Face AR page can load it from this site (no third-party CDN). Runs before dev/build.
import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const to = path.join(root, 'public/mediapipe');

await mkdir(to, { recursive: true });
// The page uses the classic (non-module) loader; the SIMD and no-SIMD builds cover all browsers.
const files = (await readdir(from)).filter((f) => /^vision_wasm_(nosimd_)?internal\.(js|wasm)$/.test(f));
for (const f of files) await cp(path.join(from, f), path.join(to, f));
console.log(`Copied ${files.length} MediaPipe runtime files to public/mediapipe`);
