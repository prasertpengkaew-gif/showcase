import { useMemo, useRef, type ReactElement, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { MACHINES, STATUS_COLOR, type MachineKind, type MachineReading, type MachineSpec, type MachineStatus } from '../lib/twin';

const LABEL_HEIGHT = 2.7;
const BELT = { from: -7.4, to: 8.2, z: 0, y: 0.78, width: 0.9 };

interface SceneProps {
  readings: Record<string, MachineReading>;
  selected: string | null;
  onSelect: (id: string) => void;
  animate: boolean;
  /** One HTML label per machine (in MACHINES order), positioned every frame. */
  labelRefs: RefObject<(HTMLElement | null)[]>;
}

function StackLight({ status, animate }: { status: MachineStatus; animate: boolean }) {
  const red = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (red.current && status === 'fault') {
      red.current.emissiveIntensity = animate ? (Math.sin(clock.elapsedTime * 8) > 0 ? 3 : 0.4) : 3;
    }
  });
  const seg = (color: string, on: boolean, y: number, ref?: RefObject<THREE.MeshStandardMaterial | null>) => (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={[0.09, 0.09, 0.14, 20]} />
      <meshStandardMaterial
        ref={ref}
        color={on ? color : '#334155'}
        emissive={color}
        emissiveIntensity={on ? 2.2 : 0}
        toneMapped={false}
      />
    </mesh>
  );
  return (
    <group>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      {seg(STATUS_COLOR.running, status === 'running', 0.05)}
      {seg(STATUS_COLOR.warning, status === 'warning', 0.2)}
      {seg(STATUS_COLOR.fault, status === 'fault', 0.35, red)}
    </group>
  );
}

const metal = { color: '#cbd5e1', metalness: 0.6, roughness: 0.35 };
const body = { color: '#e2e8f0', metalness: 0.1, roughness: 0.6 };
const dark = { color: '#1e293b', metalness: 0.3, roughness: 0.5 };
const accent = { color: '#2563EB', metalness: 0.2, roughness: 0.5 };

function Cnc() {
  return (
    <group>
      <RoundedBox args={[1.8, 1.7, 1.4]} radius={0.06} position={[0, 0.85, 0]} castShadow>
        <meshStandardMaterial {...body} />
      </RoundedBox>
      <mesh position={[0.15, 1.0, 0.71]}>
        <planeGeometry args={[1.0, 0.8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[-0.68, 1.05, 0.72]}>
        <boxGeometry args={[0.3, 0.45, 0.04]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 1.72, 0]}>
        <boxGeometry args={[1.82, 0.06, 1.42]} />
        <meshStandardMaterial {...accent} />
      </mesh>
    </group>
  );
}

function RobotArm({ running, animate }: { running: boolean; animate: boolean }) {
  const base = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const fore = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!animate || !running || !base.current || !upper.current || !fore.current) return;
    const t = clock.elapsedTime;
    base.current.rotation.y = Math.sin(t * 1.1) * 1.2;
    upper.current.rotation.z = -0.5 + Math.sin(t * 2.2) * 0.25;
    fore.current.rotation.z = 1.1 + Math.sin(t * 2.2 + 1) * 0.3;
  });
  return (
    <group>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.55, 0.3, 32]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <group ref={base} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 0.4, 24]} />
          <meshStandardMaterial {...accent} />
        </mesh>
        <group ref={upper} position={[0, 0.4, 0]} rotation={[0, 0, -0.5]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <boxGeometry args={[0.22, 1.1, 0.22]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <group ref={fore} position={[0, 1.1, 0]} rotation={[0, 0, 1.1]}>
            <mesh position={[0, 0.45, 0]} castShadow>
              <boxGeometry args={[0.18, 0.9, 0.18]} />
              <meshStandardMaterial {...metal} />
            </mesh>
            <mesh position={[0, 0.95, 0]}>
              <boxGeometry args={[0.3, 0.12, 0.16]} />
              <meshStandardMaterial {...dark} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function Press({ running, animate }: { running: boolean; animate: boolean }) {
  const ram = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ram.current) return;
    ram.current.position.y = animate && running ? 1.35 - Math.max(0, Math.sin(clock.elapsedTime * 3)) * 0.35 : 1.35;
  });
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[1.5, 0.6, 1.2]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.2, 0]} castShadow>
          <boxGeometry args={[0.18, 1.8, 1.0]} />
          <meshStandardMaterial {...body} />
        </mesh>
      ))}
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[1.5, 0.3, 1.1]} />
        <meshStandardMaterial {...accent} />
      </mesh>
      <mesh ref={ram} position={[0, 1.35, 0]}>
        <boxGeometry args={[0.9, 0.35, 0.8]} />
        <meshStandardMaterial {...metal} />
      </mesh>
    </group>
  );
}

function QcGantry() {
  return (
    <group>
      {[-0.7, 0.7].map((z) => (
        <mesh key={z} position={[0, 0.9, z]} castShadow>
          <boxGeometry args={[0.12, 1.8, 0.12]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 0]} castShadow>
        <boxGeometry args={[0.2, 0.16, 1.6]} />
        <meshStandardMaterial {...body} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.3, 0.25, 0.3]} />
        <meshStandardMaterial {...dark} />
      </mesh>
      <mesh position={[0, 1.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.11, 24]} />
        <meshBasicMaterial color="#5b8ef5" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Packer() {
  return (
    <group>
      <RoundedBox args={[1.6, 1.4, 1.5]} radius={0.05} position={[0, 0.7, 0]} castShadow>
        <meshStandardMaterial {...body} />
      </RoundedBox>
      <mesh position={[0, 1.42, 0]}>
        <boxGeometry args={[1.62, 0.06, 1.52]} />
        <meshStandardMaterial {...accent} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[1.25, 0.2 + i * 0.36, -0.2]} castShadow>
          <boxGeometry args={[0.5, 0.34, 0.5]} />
          <meshStandardMaterial color="#c8a27a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

const MODELS: Record<MachineKind, (p: { running: boolean; animate: boolean }) => ReactElement> = {
  cnc: () => <Cnc />,
  robot: (p) => <RobotArm {...p} />,
  press: (p) => <Press {...p} />,
  qc: () => <QcGantry />,
  pack: () => <Packer />,
};

function Machine({
  spec,
  reading,
  selected,
  onSelect,
  animate,
}: {
  spec: MachineSpec;
  reading?: MachineReading;
  selected: boolean;
  onSelect: () => void;
  animate: boolean;
}) {
  const status = reading?.status ?? 'idle';
  const Model = MODELS[spec.kind];
  return (
    <group
      position={[spec.position[0], 0, spec.position[1]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <Model running={status === 'running' || status === 'warning'} animate={animate} />
      <group position={[0.75, 2.1, -0.55]}>
        <StackLight status={status} animate={animate} />
      </group>
      {/* Floor marking: status colour, thicker and blue when selected */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[1.25, selected ? 1.4 : 1.3, 64]} />
        <meshBasicMaterial color={selected ? '#2563EB' : STATUS_COLOR[status]} transparent opacity={selected ? 1 : 0.55} />
      </mesh>
    </group>
  );
}

/** Products travelling along the belt; the belt stops when any machine on the line faults. */
function Products({ moving, animate }: { moving: boolean; animate: boolean }) {
  const count = 14;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const offset = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const length = BELT.to - BELT.from;
  useFrame((_, dt) => {
    if (!mesh.current) return;
    if (moving && animate) offset.current = (offset.current + dt * 0.9) % length;
    for (let i = 0; i < count; i++) {
      const x = BELT.from + ((i * length) / count + offset.current) % length;
      dummy.position.set(x, BELT.y + 0.16, BELT.z);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} castShadow>
      <boxGeometry args={[0.36, 0.3, 0.36]} />
      <meshStandardMaterial color="#c8a27a" roughness={0.85} />
    </instancedMesh>
  );
}

function Conveyor() {
  const length = BELT.to - BELT.from;
  const cx = (BELT.from + BELT.to) / 2;
  return (
    <group>
      <mesh position={[cx, BELT.y, BELT.z]} receiveShadow castShadow>
        <boxGeometry args={[length, 0.08, BELT.width]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx, BELT.y + 0.05, BELT.z + s * (BELT.width / 2 + 0.03)]}>
          <boxGeometry args={[length, 0.1, 0.06]} />
          <meshStandardMaterial color="#facc15" />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => BELT.from + 0.3 + (i * (length - 0.6)) / 8).map((x) => (
        <mesh key={x} position={[x, BELT.y / 2, BELT.z]} castShadow>
          <boxGeometry args={[0.12, BELT.y, 0.7]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
      ))}
    </group>
  );
}

function FloorMarkings() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#d7dce3';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = 'rgba(100,116,139,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 7);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[22, 14]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {/* Walkway lines */}
      {[-3.6, 3.6].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0.006, z]}>
          <planeGeometry args={[17, 0.12]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      ))}
    </group>
  );
}

function LabelProjector({ labelRefs }: { labelRefs: SceneProps['labelRefs'] }) {
  const points = useMemo(() => MACHINES.map((m) => new THREE.Vector3(m.position[0], LABEL_HEIGHT, m.position[1])), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame(({ camera }) => {
    const els = labelRefs.current ?? [];
    points.forEach((p, i) => {
      const el = els[i];
      if (!el) return;
      v.copy(p).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) {
        el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`;
      }
    });
  });
  return null;
}

export default function TwinScene({ readings, selected, onSelect, animate, labelRefs }: SceneProps) {
  const lineMoving = !Object.values(readings).some((r) => r.status === 'fault');
  return (
    <Canvas
      className="!absolute inset-0"
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [0.3, 13, 17.5], fov: 38, near: 0.1, far: 80 }}
      onPointerMissed={() => undefined}
    >
      <color attach="background" args={['#eef1f5']} />
      <hemisphereLight args={['#ffffff', '#9aa3af', 1.1]} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={1.6} position={[0, 6, 4]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-8, 3, 0]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
      </Environment>
      <FloorMarkings />
      <Conveyor />
      <Products moving={lineMoving} animate={animate} />
      {MACHINES.map((m) => (
        <Machine
          key={m.id}
          spec={m}
          reading={readings[m.id]}
          selected={selected === m.id}
          onSelect={() => onSelect(m.id)}
          animate={animate}
        />
      ))}
      <ContactShadows position={[0, 0.003, 0]} opacity={0.35} scale={24} blur={2.5} far={4} frames={1} />
      <LabelProjector labelRefs={labelRefs} />
      <OrbitControls
        makeDefault
        target={[0.5, 0.6, 0]}
        enablePan={false}
        minDistance={7}
        maxDistance={28}
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
      />
    </Canvas>
  );
}
