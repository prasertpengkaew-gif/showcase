// Validates every .glb/.gltf in public/models with the official Khronos glTF validator.
// Usage: npm run validate:models
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import validator from 'gltf-validator';

const modelsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/models');
const files = (await readdir(modelsDir)).filter((f) => /\.(glb|gltf)$/i.test(f));

if (files.length === 0) {
  console.log('No models found in public/models.');
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const fullPath = path.join(modelsDir, file);
  const data = new Uint8Array(await readFile(fullPath));
  const report = await validator.validateBytes(data, {
    uri: file,
    externalResourceFunction: (uri) =>
      readFile(path.join(modelsDir, decodeURIComponent(uri))).then((b) => new Uint8Array(b)),
  });
  const { numErrors, numWarnings } = report.issues;
  const info = report.info ?? {};
  const status = numErrors === 0 ? 'OK  ' : 'FAIL';
  if (numErrors > 0) failed++;
  console.log(
    `${status} ${file.padEnd(20)} errors=${numErrors} warnings=${numWarnings} ` +
      `animations=${info.animationCount ?? 0} materials=${info.materialCount ?? 0} ` +
      `extensions=${(info.extensionsUsed ?? []).join(',') || 'none'}`,
  );
  for (const msg of report.issues.messages.filter((m) => m.severity === 0).slice(0, 5)) {
    console.log(`     ${msg.code}: ${msg.message} (${msg.pointer ?? ''})`);
  }
}

process.exit(failed > 0 ? 1 : 0);
