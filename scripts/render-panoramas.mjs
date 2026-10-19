// Renders the 360° panoramas used by the Virtual Tour page: a small virtual show unit
// (living room, creative studio, car showroom) built from the GLB models in public/models.
// Each room is rendered with a CubeCamera and converted to a 4096×2048 equirectangular JPEG
// that matches three.js's EquirectangularReflectionMapping convention.
//
// Usage: node scripts/render-panoramas.mjs   (needs `npx playwright install chromium`)
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public/tour');
const W = 4096;
const H = 2048;

const page = String.raw`<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{ "imports": {
  "three": "/node_modules/three/build/three.module.js",
  "three/addons/": "/node_modules/three/examples/jsm/"
} }</script></head><body>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${W}, ${H}, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const cache = {};
const load = async (id) => (cache[id] ??= await loader.loadAsync('/models/' + id + '.glb'));

function canvasTexture(draw, w = 1024, h = 1024, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}
const woodTex = canvasTexture((ctx, w, h) => {
  const planks = 8;
  for (let i = 0; i < planks; i++) {
    const base = 150 + Math.random() * 25;
    ctx.fillStyle = 'rgb(' + base + ',' + (base * 0.72) + ',' + (base * 0.48) + ')';
    ctx.fillRect(0, (i * h) / planks, w, h / planks);
    for (let g = 0; g < 60; g++) {
      ctx.strokeStyle = 'rgba(70,40,20,' + (Math.random() * 0.12) + ')';
      ctx.beginPath(); const y = (i + Math.random()) * h / planks;
      ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,25,15,0.5)'; ctx.fillRect(0, (i * h) / planks, w, 3);
  }
}, 1024, 1024, [3, 3]);
const concreteTex = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#9aa1ab'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = 120 + Math.random() * 60; ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 6) + ',0.18)'; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  ctx.strokeStyle = 'rgba(60,66,74,0.35)'; ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo((i * w) / 4, 0); ctx.lineTo((i * w) / 4, h); ctx.moveTo(0, (i * h) / 4); ctx.lineTo(w, (i * h) / 4); ctx.stroke(); }
}, 1024, 1024, [3, 3]);
const rugTex = canvasTexture((ctx, w, h) => {
  ctx.fillStyle = '#d9d2c5'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 26; ctx.strokeRect(60, 60, w - 120, h - 120);
  ctx.strokeStyle = '#b8ae9c'; ctx.lineWidth = 6; ctx.strokeRect(120, 120, w - 240, h - 240);
  for (let i = 0; i < 20000; i++) { ctx.fillStyle = 'rgba(120,110,95,0.08)'; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});

function std(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }); }

/** Box room centred on the origin; openings are cut by leaving wall gaps for doorways. */
function room(scene, { w, d, h, wall, floor, ceiling = '#f3f4f6' }) {
  const g = new THREE.Group();
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floor);
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
  const ce = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(ceiling)); ce.rotation.x = Math.PI / 2; ce.position.y = h; g.add(ce);
  const mk = (len, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), std(wall)); m.position.set(x, h / 2, z); m.rotation.y = ry; m.receiveShadow = true; g.add(m); };
  mk(w, 0, -d / 2, 0); mk(w, 0, d / 2, Math.PI); mk(d, -w / 2, 0, Math.PI / 2); mk(d, w / 2, 0, -Math.PI / 2);
  // Skirting boards
  const skirt = std('#e5e7eb');
  for (const [len, x, z, ry] of [[w, 0, -d / 2 + 0.01, 0], [w, 0, d / 2 - 0.01, Math.PI], [d, -w / 2 + 0.01, 0, Math.PI / 2], [d, w / 2 - 0.01, 0, -Math.PI / 2]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.02), skirt); s.position.set(x, 0.05, z); s.rotation.y = ry; g.add(s);
  }
  scene.add(g);
}

/** Doorway on a wall: dark opening with a frame and an overhead light strip. */
function doorway(scene, { x, z, ry }) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const open = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.15), new THREE.MeshBasicMaterial({ color: '#141a26' }));
  open.position.set(0, 1.075, 0.012); g.add(open);
  const frameMat = std('#ffffff', { roughness: 0.4 });
  for (const [w, h, px, py] of [[0.08, 2.23, -0.59, 1.115], [0.08, 2.23, 0.59, 1.115], [1.26, 0.08, 0, 2.19]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), frameMat); f.position.set(px, py, 0.02); g.add(f);
  }
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.03), new THREE.MeshBasicMaterial({ color: '#2563EB' }));
  glow.position.set(0, 2.3, 0.02); g.add(glow);
  scene.add(g);
}

async function artwork(scene, { src, x, y, z, ry, w = 1.2, h = 0.8 }) {
  const tex = await texLoader.loadAsync(src); tex.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), std('#111827', { roughness: 0.5 })); g.add(frame);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); pic.position.z = 0.021; g.add(pic);
  scene.add(g);
}

function windowPane(scene, { x, z, ry, w = 2.4, h = 1.6, y = 1.5 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
  const sky = canvasTexture((ctx, cw, chh) => {
    const gr = ctx.createLinearGradient(0, 0, 0, chh); gr.addColorStop(0, '#9cc3ef'); gr.addColorStop(0.7, '#dcebf8'); gr.addColorStop(1, '#a9b8a0');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cw, chh);
    ctx.fillStyle = '#7f9a77'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(Math.random() * cw, chh * 0.86, 40 + Math.random() * 70, 0, Math.PI * 2); ctx.fill(); }
  }, 512, 384);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: sky })); pane.position.z = 0.01; g.add(pane);
  const fm = std('#f9fafb', { roughness: 0.4 });
  for (const [bw, bh, px, py] of [[w + 0.1, 0.06, 0, h / 2], [w + 0.1, 0.06, 0, -h / 2], [0.06, h, -w / 2, 0], [0.06, h, w / 2, 0], [0.04, h, 0, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.06), fm); b.position.set(px, py, 0.03); g.add(b);
  }
  scene.add(g);
  // Daylight entering through the window
  const light = new THREE.SpotLight('#fff6e8', 30, 12, 0.9, 0.6, 1.5);
  const p = new THREE.Vector3(0, 0.3, 0.6).applyEuler(new THREE.Euler(0, ry, 0)).add(new THREE.Vector3(x, y, z));
  light.position.copy(p); light.target.position.set(0, 0, 0); light.castShadow = true; light.shadow.mapSize.set(2048, 2048);
  scene.add(light, light.target);
}

async function place(scene, id, { x = 0, y = 0, z = 0, ry = 0, scale = 1, anim, time = 0.5 }) {
  const gltf = await load(id);
  const obj = anim ? cloneSkinned(gltf.scene) : gltf.scene.clone(true);
  obj.position.set(x, y, z); obj.rotation.y = ry; obj.scale.setScalar(scale);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(obj);
  if (anim) {
    const mixer = new THREE.AnimationMixer(obj);
    const clip = gltf.animations.find((a) => a.name === anim);
    if (clip) { mixer.clipAction(clip).play(); mixer.setTime(time); }
  }
}

function ceilingLights(scene, positions, color = '#fff4e0', intensity = 6) {
  for (const [x, z] of positions) {
    const panel = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), new THREE.MeshBasicMaterial({ color: '#fffaf0' }));
    panel.rotation.x = Math.PI / 2; panel.position.set(x, 2.79, z); scene.add(panel);
    const l = new THREE.PointLight(color, intensity, 9, 1.6); l.position.set(x, 2.6, z); scene.add(l);
  }
}

function plinth(scene, { x, z, w = 1.1, h = 0.55, d = 1.1, color = '#f8fafc' }) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color, { roughness: 0.35 }));
  m.position.set(x, h / 2, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  return h;
}

const ROOMS = {
  async living(scene) {
    room(scene, { w: 7, d: 6, h: 2.8, wall: '#ece7df', floor: std('#ffffff', { map: woodTex, roughness: 0.55 }) });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), std('#ffffff', { map: rugTex })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, -1.3); rug.receiveShadow = true; scene.add(rug);
    await place(scene, 'sofa', { x: 0, z: -2.35, ry: 0 });
    await place(scene, 'chair', { x: 1.9, z: -1.0, ry: -1.05 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.42, 48), std('#1f2937', { roughness: 0.3, metalness: 0.2 })); table.position.set(0, 0.21, -1.15); table.castShadow = true; scene.add(table);
    await artwork(scene, { src: '/images/projects/sneaker-launch-experience/cover.webp', x: -0.75, y: 1.75, z: -2.98, ry: 0, w: 1.05, h: 0.7 });
    await artwork(scene, { src: '/images/projects/wildlife-field-lesson/cover.webp', x: 0.75, y: 1.75, z: -2.98, ry: 0, w: 1.05, h: 0.7 });
    windowPane(scene, { x: -3.48, z: -0.6, ry: Math.PI / 2 });
    doorway(scene, { x: 3.49, z: 1.2, ry: -Math.PI / 2 });
    ceilingLights(scene, [[-1.4, -1], [1.4, -1], [0, 1.4]]);
  },
  async studio(scene) {
    room(scene, { w: 7, d: 6, h: 2.8, wall: '#e8edf3', floor: std('#ffffff', { map: concreteTex, roughness: 0.7 }) });
    await place(scene, 'robot', { x: 1.3, z: -2.0, ry: -0.35, anim: 'Wave', time: 0.7 });
    await place(scene, 'fox', { x: -1.7, z: -1.6, ry: 0.9, anim: 'Survey', time: 1.2 });
    const h = plinth(scene, { x: 0, z: -2.5, w: 0.6, h: 0.95, d: 0.6 });
    await place(scene, 'sneaker', { x: 0, y: h, z: -2.5, ry: -0.6, scale: 1.6 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.8), std('#f8fafc', { roughness: 0.4 })); desk.position.set(-2.4, 0.74, 1.2); desk.castShadow = true; scene.add(desk);
    for (const [lx, lz] of [[-3.2, 0.85], [-1.6, 0.85], [-3.2, 1.55], [-1.6, 1.55]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.74, 0.04), std('#111827')); leg.position.set(lx, 0.37, lz); scene.add(leg); }
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.03), std('#0b1220', { roughness: 0.2 })); screen.position.set(-2.4, 1.1, 1.45); screen.rotation.y = Math.PI; scene.add(screen);
    await artwork(scene, { src: '/images/projects/interactive-brand-mascot/cover.webp', x: 3.48, y: 1.6, z: -0.6, ry: -Math.PI / 2, w: 1.5, h: 1.0 });
    doorway(scene, { x: -3.49, z: -1.2, ry: Math.PI / 2 });
    doorway(scene, { x: 1.6, z: 2.99, ry: Math.PI });
    ceilingLights(scene, [[-1.4, -1], [1.4, -1], [0, 1.4]], '#f5f8ff', 7);
  },
  async showroom(scene) {
    room(scene, { w: 8, d: 7, h: 3.2, wall: '#2a303b', floor: std('#5d6472', { map: concreteTex, roughness: 0.35, metalness: 0.05 }), ceiling: '#1f2430' });
    const h = plinth(scene, { x: 0, z: -2.0, w: 2.4, h: 0.3, d: 2.4, color: '#e5e7eb' });
    await place(scene, 'car', { x: 0, y: h, z: -2.0, ry: 0.7, scale: 2.6 });
    await place(scene, 'chair', { x: -2.4, z: -2.4, ry: 0.6 });
    await artwork(scene, { src: '/images/projects/scale-model-showroom/cover.webp', x: 3.98, y: 1.7, z: -1.0, ry: -Math.PI / 2, w: 1.8, h: 1.2 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.05), new THREE.MeshBasicMaterial({ color: '#2563EB' })); strip.position.set(0, 0.25, -3.49); scene.add(strip);
    doorway(scene, { x: 1.6, z: 3.49, ry: Math.PI });
    for (const [x, z] of [[0, -2.0], [-2.4, -2.4]]) {
      const s = new THREE.SpotLight('#ffffff', 45, 10, 0.5, 0.5, 1.4); s.position.set(x + 0.5, 3.1, z + 1.2); s.target.position.set(x, 0.4, z); s.castShadow = true; s.shadow.mapSize.set(2048, 2048); scene.add(s, s.target);
    }
    ceilingLights(scene, [[-2, 1.5], [2, 1.5]], '#e8eefc', 4);
  },
};

const eqMat = new THREE.ShaderMaterial({
  uniforms: { cube: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: [
    'uniform samplerCube cube; varying vec2 vUv;',
    'void main(){',
    '  float lon = (vUv.x - 0.5) * 6.28318530718;',
    '  float lat = (vUv.y - 0.5) * 3.14159265359;',
    '  vec3 dir = vec3(cos(lon) * cos(lat), sin(lat), sin(lon) * cos(lat));',
    '  gl_FragColor = textureCube(cube, dir);',
    '  #include <tonemapping_fragment>',
    '  #include <colorspace_fragment>',
    '}',
  ].join('\n'),
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), eqMat);
const quadScene = new THREE.Scene(); quadScene.add(quad);
const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

window.renderRoom = async (name) => {
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 0.35));
  await ROOMS[name](scene);
  const target = new THREE.WebGLCubeRenderTarget(1536, { type: THREE.HalfFloatType, generateMipmaps: false });
  const cam = new THREE.CubeCamera(0.05, 50, target);
  cam.position.set(0, 1.55, 0.3);
  scene.add(cam);
  cam.update(renderer, scene);
  eqMat.uniforms.cube.value = target.texture;
  renderer.setRenderTarget(null);
  renderer.render(quadScene, quadCam);
  return renderer.domElement.toDataURL('image/jpeg', 0.84);
};
window.ready = true;
</script></body></html>`;

const types = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    if (url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end(page);
    const file = url.startsWith('/node_modules/') ? path.join(root, path.normalize(url)) : path.join(root, 'public', path.normalize(url));
    if (!file.startsWith(root)) throw new Error('outside');
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const tab = await browser.newPage({ viewport: { width: 800, height: 400 } });
tab.on('pageerror', (e) => console.error('page error:', e.message));
await tab.goto(`http://127.0.0.1:${server.address().port}/`);
await tab.waitForFunction(() => window.ready);
await mkdir(outDir, { recursive: true });
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
for (const name of ['living', 'studio', 'showroom'].filter((n) => !only || n === only)) {
  const dataUrl = await tab.evaluate((n) => window.renderRoom(n), name);
  await writeFile(path.join(outDir, `${name}.jpg`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('panorama', name);
}
await browser.close();
server.close();
