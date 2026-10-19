import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { XR, useXR, type createXRStore } from '@react-three/xr';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EYE, type Hotspot, type TourRoom } from '../data/tour';

type XRStore = ReturnType<typeof createXRStore>;
const HOTSPOT_RADIUS = 4;

export interface TourSceneProps {
  room: TourRoom;
  store: XRStore;
  /** HTML labels rendered by the page, one per hotspot; the scene positions them each frame. */
  labelRefs: RefObject<(HTMLElement | null)[]>;
  motion: boolean;
  onHotspot: (h: Hotspot) => void;
  onLoaded: () => void;
  onError: () => void;
}

/** Direction from the camera position in the render to a point in the room. */
const directionTo = (p: [number, number, number]) =>
  new THREE.Vector3(p[0] - EYE[0], p[1] - EYE[1], p[2] - EYE[2]).normalize();

function Panorama({ src, onLoaded, onError }: { src: string; onLoaded: () => void; onError: () => void }) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let cancelled = false;
    new THREE.TextureLoader().load(
      src,
      (tex) => {
        if (cancelled) return tex.dispose();
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        const previous = scene.background;
        scene.background = tex;
        if (previous instanceof THREE.Texture) previous.dispose();
        invalidate();
        onLoaded();
      },
      undefined,
      () => !cancelled && onError(),
    );
    return () => {
      cancelled = true;
    };
  }, [src, scene, invalidate, onLoaded, onError]);
  return null;
}

function HotspotMarker({ hotspot, onSelect }: { hotspot: Hotspot; onSelect: () => void }) {
  const pos = useMemo(() => directionTo(hotspot.position).multiplyScalar(HOTSPOT_RADIUS), [hotspot]);
  const isDoor = hotspot.kind === 'door';
  // 3D marker — the only hotspot UI inside VR, where it is selected with the controller ray.
  return (
    <mesh
      position={pos}
      onClick={onSelect}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <circleGeometry args={[isDoor ? 0.12 : 0.08, 40]} />
      <meshBasicMaterial color={isDoor ? '#2563EB' : '#ffffff'} transparent opacity={0.85} depthTest={false} />
    </mesh>
  );
}

/** Moves each HTML label to its hotspot's on-screen position, hiding labels behind the viewer. */
function LabelProjector({ room, labelRefs, hidden }: { room: TourRoom; labelRefs: TourSceneProps['labelRefs']; hidden: boolean }) {
  const points = useMemo(
    () => room.hotspots.map((h) => directionTo(h.position).multiplyScalar(HOTSPOT_RADIUS)),
    [room],
  );
  const v = useMemo(() => new THREE.Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame(({ camera }) => {
    const els = labelRefs.current ?? [];
    points.forEach((p, i) => {
      const el = els[i];
      if (!el) return;
      v.copy(p).project(camera);
      const visible = !hidden && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) {
        const x = ((v.x + 1) / 2) * size.width;
        const y = ((1 - v.y) / 2) * size.height;
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    });
  });
  return null;
}

/** Keeps every marker facing the camera. */
function Billboards() {
  const scene = useThree((s) => s.scene);
  useFrame(({ camera }) => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.type === 'CircleGeometry') o.quaternion.copy(camera.quaternion);
    });
  });
  return null;
}

/** Points the camera from the device orientation (phones/tablets), keeping the current heading. */
function MotionControls({ enabled }: { enabled: boolean }) {
  const camera = useThree((s) => s.camera);
  const orientation = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const headingOffset = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      orientation.current = null;
      headingOffset.current = null;
      return;
    }
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      orientation.current = { alpha: e.alpha, beta: e.beta, gamma: e.gamma };
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [enabled]);

  const euler = useMemo(() => new THREE.Euler(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const screenFix = useMemo(() => new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)), []);
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const screenQ = useMemo(() => new THREE.Quaternion(), []);
  const headingQ = useMemo(() => new THREE.Quaternion(), []);
  const yAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame(() => {
    const o = orientation.current;
    if (!enabled || !o) return;
    const deg = THREE.MathUtils.DEG2RAD;
    const screenAngle = (screen.orientation?.angle ?? 0) * deg;
    // Standard device-orientation → camera mapping (same maths as three's former DeviceOrientationControls).
    euler.set(o.beta * deg, o.alpha * deg, -o.gamma * deg, 'YXZ');
    q.setFromEuler(euler).multiply(screenFix).multiply(screenQ.setFromAxisAngle(zAxis, -screenAngle));
    if (headingOffset.current === null) {
      // Align the device's first reading with where the camera was already looking.
      const camYaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
      const devYaw = new THREE.Euler().setFromQuaternion(q, 'YXZ').y;
      headingOffset.current = camYaw - devYaw;
    }
    headingQ.setFromAxisAngle(yAxis, headingOffset.current);
    camera.quaternion.copy(headingQ.multiply(q));
  });
  return null;
}

function Controls({ room, motion }: { room: TourRoom; motion: boolean }) {
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControlsImpl>(null);
  const inXR = useXR((s) => s.session != null);

  // Face the room's point of interest on arrival.
  useEffect(() => {
    const d = directionTo(room.lookAt);
    camera.position.copy(d.clone().multiplyScalar(-0.01));
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [room, camera]);

  // Zoom by changing the field of view (moving the camera would break the panorama).
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.03, 35, 90);
      camera.updateProjectionMatrix();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl, camera]);

  if (inXR || motion) return null;
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.35}
      target={[0, 0, 0]}
    />
  );
}

function SceneContent({ room, labelRefs, motion, onHotspot, onLoaded, onError }: Omit<TourSceneProps, 'store'>) {
  const inXR = useXR((s) => s.session != null);
  return (
    <>
      <Panorama src={room.panorama} onLoaded={onLoaded} onError={onError} />
      <Controls room={room} motion={motion} />
      <MotionControls enabled={motion && !inXR} />
      <Billboards />
      {room.hotspots.map((h, i) => (
        <HotspotMarker key={`${room.id}-${i}`} hotspot={h} onSelect={() => onHotspot(h)} />
      ))}
      <LabelProjector room={room} labelRefs={labelRefs} hidden={inXR} />
    </>
  );
}

export default function TourScene({ store, ...props }: TourSceneProps) {
  const [dpr] = useState<[number, number]>([1, 2]);
  return (
    <Canvas className="!absolute inset-0 touch-none" dpr={dpr} camera={{ fov: 75, near: 0.01, far: 100, position: [0, 0, 0.01] }}>
      <XR store={store}>
        <SceneContent {...props} />
      </XR>
    </Canvas>
  );
}
