import * as THREE from 'three';

/** Life-size Halloween gate: 2.0 m between the posts, about 2.7 m to the top of the arch. */
export interface Gate {
  group: THREE.Group;
  /** Call every frame with the time in seconds: flickers the candles and flaps the bats. */
  update: (time: number) => void;
  dispose: () => void;
}

const tex = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const pumpkinTexture = () => tex(256, 256, (g) => {
  g.fillStyle = '#e8650a';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#b84a00';
  g.lineWidth = 6;
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  g.fillStyle = '#ffe14d';
  g.beginPath(); g.moveTo(52, 110); g.lineTo(100, 110); g.lineTo(76, 70); g.fill();
  g.beginPath(); g.moveTo(156, 110); g.lineTo(204, 110); g.lineTo(180, 70); g.fill();
  g.beginPath(); g.moveTo(60, 160); g.lineTo(80, 190); g.lineTo(100, 168); g.lineTo(128, 196); g.lineTo(156, 168); g.lineTo(176, 190); g.lineTo(196, 160); g.lineTo(128, 150); g.fill();
});

const webTexture = () => tex(256, 256, (g) => {
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 360, Math.sin(a) * 360); g.stroke(); }
  for (let r = 36; r < 340; r += 44) {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      const rr = r - (i % 2 ? 7 : 0);
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.stroke();
  }
});

const bannerTexture = (text: string) => tex(1024, 256, (g) => {
  g.fillStyle = '#1b0b2e';
  g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#ff7a00';
  g.lineWidth = 12;
  g.strokeRect(12, 12, 1000, 232);
  g.fillStyle = '#ff9a1f';
  g.font = '800 112px system-ui, "Noto Sans Thai", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 512, 134, 940);
});

const glowTexture = () => tex(128, 128, (g) => {
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,200,80,1)');
  grad.addColorStop(0.35, 'rgba(255,120,20,0.55)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
});

const batShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 0.04);
  s.quadraticCurveTo(0.08, 0.14, 0.22, 0.1);
  s.quadraticCurveTo(0.18, 0.04, 0.26, -0.02);
  s.quadraticCurveTo(0.14, 0, 0.1, -0.1);
  s.quadraticCurveTo(0.04, -0.04, 0, -0.06);
  s.quadraticCurveTo(-0.04, -0.04, -0.1, -0.1);
  s.quadraticCurveTo(-0.14, 0, -0.26, -0.02);
  s.quadraticCurveTo(-0.18, 0.04, -0.22, 0.1);
  s.quadraticCurveTo(-0.08, 0.14, 0, 0.04);
  return new THREE.ShapeGeometry(s);
};

export function buildGate(banner: string): Gate {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => { disposables.push(o); return o; };

  const wood = keep(new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 }));
  const post = (side: number) => {
    const m = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.12, 0.17, 1.75, 10)), wood);
    m.position.set(side * 1.0, 0.875, 0);
    m.rotation.z = side * 0.02;
    group.add(m);
    for (let k = 0; k < 4; k++) {
      const knot = new THREE.Mesh(keep(new THREE.SphereGeometry(0.07 + k * 0.01, 8, 6)), wood);
      knot.position.set(side * 1.0 + (k % 2 ? 0.09 : -0.09), 0.35 + k * 0.4, (k % 2 ? 0.06 : -0.06));
      group.add(knot);
    }
  };
  post(-1);
  post(1);
  const arch = new THREE.Mesh(keep(new THREE.TorusGeometry(1.0, 0.12, 10, 32, Math.PI)), wood);
  arch.position.set(0, 1.75, 0);
  group.add(arch);
  for (const [x, y, rz] of [[-0.55, 2.62, 0.5], [0.4, 2.7, -0.6], [0.78, 2.5, -0.9]] as const) {
    const twig = new THREE.Mesh(keep(new THREE.ConeGeometry(0.03, 0.5, 5)), wood);
    twig.position.set(x, y, 0.03);
    twig.rotation.z = rz;
    group.add(twig);
  }

  const bannerMap = keep(bannerTexture(banner));
  const sign = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.4, 0.35)), keep(new THREE.MeshBasicMaterial({ map: bannerMap, side: THREE.DoubleSide })));
  sign.position.set(0, 2.3, 0.16);
  group.add(sign);
  for (const side of [-1, 1]) {
    const rope = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4)), wood);
    rope.position.set(side * 0.62, 2.55, 0.16);
    group.add(rope);
  }

  const pumpkinMap = keep(pumpkinTexture());
  const pumpkinMat = keep(new THREE.MeshStandardMaterial({ map: pumpkinMap, emissiveMap: pumpkinMap, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 }));
  const pumpkinGeo = keep(new THREE.SphereGeometry(0.2, 18, 14));
  const stem = keep(new THREE.CylinderGeometry(0.03, 0.04, 0.1, 6));
  const stemMat = keep(new THREE.MeshStandardMaterial({ color: 0x3b5a1c }));
  for (const [x, y, z, s, ry] of [[-1.35, 0.17, 0.2, 1.1, 0.5], [1.35, 0.17, 0.15, 1.2, -0.5], [-1.15, 0.12, 0.45, 0.7, 0.9], [1.1, 0.14, 0.5, 0.85, -0.9], [0, 2.98, 0, 0.9, 0]] as const) {
    const p = new THREE.Mesh(pumpkinGeo, pumpkinMat);
    p.scale.set(s, s * 0.85, s);
    p.position.set(x, y + (y > 2 ? 0.1 : 0.0), z);
    p.rotation.y = ry;
    const t = new THREE.Mesh(stem, stemMat);
    t.position.set(0, 0.2, 0);
    p.add(t);
    group.add(p);
  }

  const webMap = keep(webTexture());
  const webMat = keep(new THREE.MeshBasicMaterial({ map: webMap, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  const web = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.8, 0.8)), webMat);
  web.position.set(-0.6, 2.35, 0.03);
  web.rotation.z = -Math.PI / 2 + 0.2;
  group.add(web);
  const web2 = new THREE.Mesh(web.geometry, webMat);
  web2.position.set(0.6, 2.35, 0.03);
  web2.rotation.z = Math.PI + 0.2;
  group.add(web2);

  const ground = new THREE.Mesh(keep(new THREE.CircleGeometry(1.9, 40)), keep(new THREE.MeshBasicMaterial({ map: keep(tex(256, 256, (g) => {
    const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(120,40,180,0.45)');
    grad.addColorStop(0.7, 'rgba(255,100,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  })), transparent: true, depthWrite: false })));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.005;
  group.add(ground);

  // Candles: a warm light and a glow sprite that flicker.
  const glowMat = keep(new THREE.SpriteMaterial({ map: keep(glowTexture()), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  const candles: { sprite: THREE.Sprite; light: THREE.PointLight }[] = [];
  const candleBody = keep(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8));
  const candleMat = keep(new THREE.MeshStandardMaterial({ color: 0xf3ead2 }));
  for (const x of [-1.6, 1.6]) {
    const c = new THREE.Mesh(candleBody, candleMat);
    c.position.set(x, 0.11, 0.35);
    group.add(c);
    const sprite = new THREE.Sprite(glowMat);
    sprite.position.set(x, 0.3, 0.35);
    sprite.scale.set(0.35, 0.35, 1);
    group.add(sprite);
    const light = new THREE.PointLight(0xff8a2a, 1.2, 3.5);
    light.position.set(x, 0.4, 0.5);
    group.add(light);
    candles.push({ sprite, light });
  }
  group.add(new THREE.HemisphereLight(0xb9a6ff, 0x2a1a12, 1.1));
  const key = new THREE.DirectionalLight(0xffd9a8, 1.1);
  key.position.set(1.5, 3, 3);
  group.add(key);

  // Bats circle above the gate, flapping.
  const batMat = keep(new THREE.MeshBasicMaterial({ color: 0x0b0610, side: THREE.DoubleSide }));
  const batGeo = keep(batShape());
  const bats = Array.from({ length: 6 }, (_, i) => {
    const b = new THREE.Mesh(batGeo, batMat);
    group.add(b);
    return { b, phase: i * 1.7, r: 1.1 + (i % 3) * 0.35, y: 2.8 + (i % 2) * 0.45, speed: 0.5 + (i % 3) * 0.12 };
  });

  const update = (time: number) => {
    candles.forEach((c, i) => {
      const f = 0.85 + 0.15 * Math.sin(time * 9 + i * 2) * Math.sin(time * 5.3 + i);
      c.light.intensity = 1.2 * f;
      c.sprite.scale.setScalar(0.35 * f);
    });
    bats.forEach(({ b, phase, r, y, speed }) => {
      const a = time * speed + phase;
      b.position.set(Math.cos(a) * r, y + Math.sin(a * 2) * 0.12, Math.sin(a) * r * 0.6 + 0.3);
      b.rotation.y = -a + Math.PI / 2;
      b.scale.set(1, 1, 1);
      b.scale.x = 0.55 + 0.45 * Math.abs(Math.sin(time * 14 + phase));
    });
  };
  update(0);
  return { group, update, dispose: () => disposables.forEach((d) => d.dispose()) };
}
