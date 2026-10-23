import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Placeable } from '../components/FloorAR';

/** Loads the swimming dragon and lights it, for the floor AR camera. The model is about 2.5 m long, head to the right. */
export async function buildDragon(): Promise<Placeable> {
  const gltf = await new GLTFLoader().loadAsync('/models/dragon.glb');
  const group = new THREE.Group();
  group.add(gltf.scene);
  group.add(new THREE.HemisphereLight(0xffffff, 0x9999aa, 3.2));
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(2, 4, 3);
  group.add(sun);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.6);
  rim.position.set(-3, 2, -2);
  group.add(rim);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
  let last = 0;
  return {
    group,
    update: (time) => { mixer.update(time - last); last = time; },
    dispose: () => {
      mixer.stopAllAction();
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      });
    },
  };
}
