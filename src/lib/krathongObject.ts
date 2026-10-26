import * as THREE from 'three';
import type { Placeable } from '../components/FloorAR';

/** A floor-sized krathong: banana leaves, flowers and a candle. The origin sits on the floor. */
export function buildKrathong(): Placeable {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(item: T) => {
    disposables.push(item);
    return item;
  };

  const leafMat = keep(new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.75, side: THREE.DoubleSide }));
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.14, 0.12, 0.02, 0.42);
  leafShape.quadraticCurveTo(0, 0.2, -0.02, 0.42);
  leafShape.quadraticCurveTo(-0.14, 0.12, 0, 0);
  const leafGeo = keep(new THREE.ShapeGeometry(leafShape));
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const angle = (i / 8) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.06, 0.02, Math.sin(angle) * 0.06);
    leaf.rotation.x = -Math.PI / 2.35;
    leaf.rotation.y = -angle + Math.PI / 2;
    group.add(leaf);
  }

  const base = new THREE.Mesh(
    keep(new THREE.CircleGeometry(0.16, 20)),
    keep(new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 })),
  );
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.03;
  group.add(base);

  const petal = keep(new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 0.45 }));
  const petalGeo = keep(new THREE.SphereGeometry(0.035, 10, 8));
  for (let i = 0; i < 6; i++) {
    const bloom = new THREE.Mesh(petalGeo, petal);
    const angle = (i / 6) * Math.PI * 2;
    bloom.position.set(Math.cos(angle) * 0.09, 0.06, Math.sin(angle) * 0.09);
    bloom.scale.set(1, 0.7, 1.3);
    group.add(bloom);
  }
  const heart = new THREE.Mesh(
    keep(new THREE.SphereGeometry(0.04, 10, 8)),
    keep(new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.4 })),
  );
  heart.position.y = 0.07;
  group.add(heart);

  const candle = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.02, 0.022, 0.11, 10)),
    keep(new THREE.MeshStandardMaterial({ color: 0xf8f1d8, roughness: 0.5 })),
  );
  candle.position.y = 0.12;
  group.add(candle);

  const flame = new THREE.Mesh(
    keep(new THREE.SphereGeometry(0.028, 8, 8)),
    keep(new THREE.MeshBasicMaterial({ color: 0xffb703 })),
  );
  flame.position.y = 0.2;
  flame.scale.y = 1.5;
  group.add(flame);
  const light = new THREE.PointLight(0xff9f1c, 1.1, 1.6);
  light.position.y = 0.22;
  group.add(light);

  return {
    group,
    update(time) {
      const pulse = 1 + Math.sin(time * 9) * 0.12;
      flame.scale.set(pulse, 1.5 * pulse, pulse);
      light.intensity = 1 + Math.sin(time * 9) * 0.35;
    },
    dispose() {
      disposables.forEach((item) => item.dispose());
    },
  };
}
