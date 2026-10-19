import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { models } from '../data/models';

const ROBOT_SRC = models.robot.src;
const ACCENT = '#2563EB';

/** Draws the phone's on-screen AR interface into a texture. */
function useScreenTexture() {
  return useMemo(() => {
    const w = 540;
    const h = 1140;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // "Camera feed": a dim room with a floor plane
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2a3346');
    bg.addColorStop(0.55, '#1b2233');
    bg.addColorStop(1, '#131a28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = 640 + i * i * 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * 22, 640);
      ctx.lineTo(w / 2 + i * 120, h);
      ctx.stroke();
    }

    // Placement reticle
    ctx.save();
    ctx.translate(w / 2, 820);
    ctx.scale(1, 0.38);
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, 200, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Top status pill
    const pill = (x: number, y: number, pw: number, ph: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, pw, ph, ph / 2);
      ctx.fill();
    };
    pill(w / 2 - 150, 110, 300, 64, 'rgba(11,18,32,0.72)');
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Surface detected', w / 2 + 14, 143);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(w / 2 - 112, 142, 8, 0, Math.PI * 2);
    ctx.fill();

    // Size label
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillText('Service Robot  ·  120 cm', w / 2, 980);

    // Primary action
    pill(70, 1020, w - 140, 76, ACCENT);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 28px Inter, system-ui, sans-serif';
    ctx.fillText('Place in your space', w / 2, 1058);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
}

function Phone({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const screen = useScreenTexture();

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.y = 0.95 + Math.sin(t * 0.8) * 0.04;
    group.current.rotation.y = 0.32 + Math.sin(t * 0.4) * 0.05;
  });

  return (
    <group ref={group} position={[-0.62, 0.95, 0.9]} rotation={[-0.06, 0.32, 0.05]}>
      <RoundedBox args={[0.62, 1.28, 0.06]} radius={0.075} smoothness={6}>
        <meshPhysicalMaterial color="#1a2131" metalness={0.6} roughness={0.32} clearcoat={1} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0, 0.031]}>
        <planeGeometry args={[0.575, 1.215]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      {/* Dynamic island */}
      <mesh position={[0, 0.56, 0.032]}>
        <planeGeometry args={[0.15, 0.036]} />
        <meshBasicMaterial color="#05070c" />
      </mesh>
    </group>
  );
}

function Robot({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ROBOT_SRC);
  const { actions } = useAnimations(animations, group);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [scene]);

  useEffect(() => {
    const idle = actions.Idle;
    const wave = actions.Wave;
    if (!idle) return;
    idle.reset().play();
    if (!animate) {
      // Static, mid-idle pose for reduced motion.
      idle.paused = true;
      idle.time = 0.6;
      invalidate();
      return;
    }
    // Wave once shortly after appearing, then settle back into idle.
    let back: number | undefined;
    const start = window.setTimeout(() => {
      if (!wave) return;
      wave.reset().setLoop(THREE.LoopOnce, 1);
      wave.clampWhenFinished = true;
      wave.play();
      idle.crossFadeTo(wave, 0.3, false);
      back = window.setTimeout(() => {
        idle.reset().play();
        wave.crossFadeTo(idle, 0.4, false);
      }, Math.max(0, wave.getClip().duration - 0.4) * 1000);
    }, 1200);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(back);
    };
  }, [actions, animate, invalidate]);

  return (
    <group ref={group} position={[0.5, 0, -0.25]} rotation={[0, -0.3, 0]} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

function Reticle({ animate }: { animate: boolean }) {
  const outer = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!animate || !outer.current) return;
    const s = 1 + ((clock.getElapsedTime() * 0.5) % 1) * 0.35;
    outer.current.scale.setScalar(s);
    (outer.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1.35 - s) / 0.35;
  });
  return (
    <group position={[0.5, 0.004, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.52, 0.545, 96]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh ref={outer}>
        <ringGeometry args={[0.6, 0.612, 96]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.3} toneMapped={false} />
      </mesh>
    </group>
  );
}

function FloorGrid() {
  const texture = useMemo(() => {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    return t;
  }, []);
  const alpha = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={texture} alphaMap={alpha} transparent depthWrite={false} />
    </mesh>
  );
}

/** Pulls the camera back on narrow canvases so the phone and robot both stay in frame. */
function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const distance = aspect < 0.9 ? 4.9 : aspect < 1.2 ? 4.1 : 4.0;
    camera.position.set(0.05, 1.25, distance);
    camera.lookAt(0, 0.66, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export interface HeroSceneProps {
  animate: boolean;
}

/** Real-time 3D hero: a phone showing an AR placement UI next to the placed model. */
export default function HeroScene({ animate }: HeroSceneProps) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      frameloop={animate ? 'always' : 'demand'}
      camera={{ position: [0.2, 1.35, 4.4], fov: 34, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <CameraRig />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 3]} intensity={1.6} />
      <directionalLight position={[-4, 2, -2]} intensity={0.6} color="#93b4ff" />
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.2} position={[0, 4, 2]} scale={[6, 2, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-4, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#bcd0ff" />
          <Lightformer form="rect" intensity={0.8} position={[4, 1, -1]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
        </Environment>
        <FloorGrid />
        <Reticle animate={animate} />
        <Robot animate={animate} />
        <Phone animate={animate} />
        <ContactShadows position={[0, 0.002, 0]} opacity={0.55} scale={6} blur={2.4} far={2} frames={animate ? Infinity : 1} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(ROBOT_SRC);
