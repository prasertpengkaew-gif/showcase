import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Clone, ContactShadows, Environment, Lightformer, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import { XR, XROrigin, useXR, useXRControllerLocomotion, type createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { models } from '../data/models';
import type { ModelId } from '../types/project';

type XRStore = ReturnType<typeof createXRStore>;

/** Where each model stands in the showroom (metres; the visitor starts at z = 2.4 facing -z). */
const EXHIBITS: { id: ModelId; position: [number, number, number]; rotationY: number; plinth?: number }[] = [
  { id: 'sofa', position: [-1.9, 0, -2.6], rotationY: 0.35 },
  { id: 'chair', position: [0, 0, -2.3], rotationY: 0.1 },
  { id: 'robot', position: [1.9, 0, -2.5], rotationY: -0.45 },
  { id: 'car', position: [2.7, 0, -1.3], rotationY: -1.0, plinth: 0.6 },
  { id: 'fox', position: [-2.6, 0, -1.0], rotationY: 1.1 },
];

function Exhibit({ id, position, rotationY, plinth = 0, animate }: (typeof EXHIBITS)[number] & { animate: boolean }) {
  const { scene } = useGLTF(models[id].src);
  return (
    <group position={position} rotation-y={rotationY}>
      {plinth > 0 && (
        <mesh position={[0, plinth / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.85, plinth, 0.85]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      )}
      <group position-y={plinth}>
        {id === 'robot' || id === 'fox' ? <AnimatedExhibit id={id} animate={animate} /> : <Clone object={scene} />}
      </group>
    </group>
  );
}

/** Skinned models need a proper skeleton clone, and play their idle clip. */
function AnimatedExhibit({ id, animate }: { id: ModelId; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(models[id].src);
  const clone = useMemo(() => cloneSkinned(scene), [scene]);
  const { actions } = useAnimations(animations, group);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const action = actions[models[id].defaultAnimation ?? ''];
    if (!action) return;
    action.reset().play();
    if (!animate) {
      action.paused = true;
      action.time = 0.6;
    }
    invalidate();
    return () => {
      action.stop();
    };
  }, [actions, animate, id, invalidate]);

  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
}

function Room() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="#b8bec8" roughness={0.75} />
      </mesh>
      {/* Back and side walls */}
      <mesh position={[0, 1.6, -4]}>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#f7f8fa" roughness={0.95} />
      </mesh>
      <mesh position={[-4.5, 1.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#eef1f5" roughness={0.95} />
      </mesh>
      <mesh position={[4.5, 1.6, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[12, 3.2]} />
        <meshStandardMaterial color="#eef1f5" roughness={0.95} />
      </mesh>
      {/* Accent stripe on the back wall */}
      <mesh position={[0, 0.06, -3.99]}>
        <planeGeometry args={[12, 0.12]} />
        <meshBasicMaterial color="#2563EB" />
      </mesh>
    </group>
  );
}

/** Thumbstick locomotion inside a VR session (left stick moves, right stick turns). */
function Locomotion() {
  const origin = useRef<THREE.Group>(null);
  useXRControllerLocomotion(origin, { speed: 1.6 });
  return <XROrigin ref={origin} position={[0, 0, 2.4]} />;
}

function DesktopControls() {
  const inVR = useXR((s) => s.session != null);
  if (inVR) return null;
  return (
    <OrbitControls
      makeDefault
      target={[0, 0.9, -1.2]}
      enablePan={false}
      minDistance={1.2}
      maxDistance={5.5}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}

export interface VRSceneProps {
  store: XRStore;
  animate: boolean;
}

/** Walk-around showroom: page view uses orbit controls; on a headset the same scene runs in WebXR VR. */
export default function VRScene({ store, animate }: VRSceneProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      shadows="percentage"
      dpr={[1, 2]}
      frameloop={animate ? 'always' : 'demand'}
      camera={{ position: [0, 1.6, 2.6], fov: 55, near: 0.05, far: 60 }}
      gl={{ antialias: true }}
      aria-hidden
    >
      <XR store={store}>
        <color attach="background" args={['#f3f5f8']} />
        <hemisphereLight args={['#ffffff', '#c3cad6', 1.4]} />
        <directionalLight
          position={[3, 6, 3]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <Suspense fallback={null}>
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={2} position={[0, 4, 2]} scale={[8, 2, 1]} />
            <Lightformer form="rect" intensity={1} position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
            <Lightformer form="rect" intensity={1} position={[5, 2, 0]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
          </Environment>
          <Room />
          {EXHIBITS.map((e) => (
            <Exhibit key={e.id} {...e} animate={animate} />
          ))}
          <ContactShadows position={[0, 0.003, 0]} opacity={0.4} scale={12} blur={2.2} far={2.5} frames={1} />
        </Suspense>
        <Locomotion />
        <DesktopControls />
      </XR>
    </Canvas>
  );
}

for (const e of EXHIBITS) useGLTF.preload(models[e.id].src);
