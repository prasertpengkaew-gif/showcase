import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CATEGORY_COLOR, HALF, city, type Poi } from '../data/cityMap';
import { graph, type Route, type WalkPiece } from '../lib/cityGraph';
import { buildBuildings, buildRects, buildRoads, buildWalkshed, buildWater, makeWindowTextures } from '../lib/cityGeometry';

/** What the page needs to know about the camera (for the compass and the mini-map). */
export interface ViewState {
  x: number;
  z: number;
  /** Rotation of the map: 0 = north (−z) is up the screen. */
  azimuth: number;
  polar: number;
  distance: number;
  /** Ground area in view, as four points (x, z). */
  footprint: [number, number][];
}

export interface MapApi {
  flyTo(x: number, z: number, distance?: number): void;
  rotate(delta: number): void;
  tilt(delta: number): void;
  setView(view: 'iso' | 'top'): void;
  zoom(factor: number): void;
  resetNorth(): void;
  reset(): void;
}

interface MapSceneProps {
  night: boolean;
  /** Places currently shown (the others are hidden by the filters). */
  shown: ReadonlySet<string>;
  selectedId: string | null;
  startId: string | null;
  route: Route | null;
  walkPieces: WalkPiece[] | null;
  vehicles: boolean;
  animate: boolean;
  /** One entry per place, in the order of city.pois: the DOM label to move. */
  labelRefs: MutableRefObject<(HTMLElement | null)[]>;
  viewRef: MutableRefObject<ViewState>;
  apiRef: MutableRefObject<MapApi | null>;
  label: string;
}

const palette = (night: boolean) =>
  night
    ? {
        bg: '#050b18',
        ground: '#0b1526',
        road: '#1c2b47',
        bridge: '#25365a',
        marking: '#f5b94a',
        water: '#0a2a4d',
        park: '#0f3a27',
        plaza: '#18263f',
        building: '#7587a8',
        tree: '#1f6b3f',
        hemi: ['#4f6a9b', '#0b1526', 0.7] as const,
        sun: ['#9db6ff', 0.55] as const,
      }
    : {
        bg: '#d3e2f3',
        ground: '#e2e8ef',
        road: '#ffffff',
        bridge: '#f1f4f8',
        marking: '#d8dee8',
        water: '#a8d0f1',
        park: '#c3e4c6',
        plaza: '#f5f1e8',
        building: '#ffffff',
        tree: '#4ea36a',
        hemi: ['#ffffff', '#a9b4c4', 1.15] as const,
        sun: ['#fff4e0', 1.8] as const,
      };

type Palette = ReturnType<typeof palette>;

const poiTop = (p: Poi) => (p.id === 'skyline-hotel' ? 120 : 46);

// --- static city -------------------------------------------------------------------------------
function Buildings({ pal, night }: { pal: Palette; night: boolean }) {
  const geometry = useMemo(() => buildBuildings(), []);
  const textures = useMemo(() => makeWindowTextures(), []);
  useEffect(
    () => () => {
      geometry.dispose();
      textures.map.dispose();
      textures.emissive.dispose();
    },
    [geometry, textures],
  );
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        color={pal.building}
        map={textures.map}
        emissive="#ffffff"
        emissiveMap={textures.emissive}
        emissiveIntensity={night ? 0.85 : 0}
        roughness={0.85}
        metalness={0.02}
      />
    </mesh>
  );
}

function Streets({ pal }: { pal: Palette }) {
  const g = useMemo(() => buildRoads(), []);
  const offset = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;
  useEffect(() => () => Object.values(g).forEach((x) => x.dispose()), [g]);
  return (
    <>
      <mesh geometry={g.roads} receiveShadow>
        <meshStandardMaterial color={pal.road} roughness={0.95} {...offset} />
      </mesh>
      <mesh geometry={g.bridges} receiveShadow castShadow>
        <meshStandardMaterial color={pal.bridge} roughness={0.9} {...offset} />
      </mesh>
      <mesh geometry={g.parapets} castShadow>
        <meshStandardMaterial color={pal.bridge} roughness={0.9} />
      </mesh>
      <mesh geometry={g.markings}>
        <meshBasicMaterial color={pal.marking} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} toneMapped={false} />
      </mesh>
    </>
  );
}

function Land({ pal }: { pal: Palette }) {
  const water = useMemo(() => buildWater(), []);
  const parks = useMemo(() => buildRects(city.parks, 0.3), []);
  const plazas = useMemo(() => buildRects(city.plazas, 0.25), []);
  useEffect(
    () => () => {
      water.dispose();
      parks.dispose();
      plazas.dispose();
    },
    [water, parks, plazas],
  );
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[14000, 14000]} />
        <meshStandardMaterial color={pal.ground} roughness={1} />
      </mesh>
      <mesh geometry={water}>
        <meshStandardMaterial color={pal.water} roughness={0.25} metalness={0.1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
      <mesh geometry={parks} receiveShadow>
        <meshStandardMaterial color={pal.park} roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={plazas} receiveShadow>
        <meshStandardMaterial color={pal.plaza} roughness={1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    </>
  );
}

function Trees({ pal }: { pal: Palette }) {
  const canopy = useRef<THREE.InstancedMesh>(null);
  const trunk = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const c = canopy.current;
    const t = trunk.current;
    if (!c || !t) return;
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const base = new THREE.Color(pal.tree);
    city.trees.forEach((tree, i) => {
      m.compose(new THREE.Vector3(tree.x, 7 * tree.s, tree.z), new THREE.Quaternion(), new THREE.Vector3(4 * tree.s, 4.6 * tree.s, 4 * tree.s));
      c.setMatrixAt(i, m);
      c.setColorAt(i, color.copy(base).offsetHSL((Math.sin(i * 12.9898) % 1) * 0.03, 0, (Math.sin(i * 78.233) % 1) * 0.05));
      m.compose(new THREE.Vector3(tree.x, 2 * tree.s, tree.z), new THREE.Quaternion(), new THREE.Vector3(tree.s, 4 * tree.s, tree.s));
      t.setMatrixAt(i, m);
    });
    c.instanceMatrix.needsUpdate = t.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
  }, [pal.tree]);
  const n = city.trees.length;
  return (
    <>
      <instancedMesh ref={canopy} args={[undefined, undefined, n]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={trunk} args={[undefined, undefined, n]}>
        <cylinderGeometry args={[0.35, 0.5, 1, 6]} />
        <meshStandardMaterial color="#6b4f3a" roughness={1} />
      </instancedMesh>
    </>
  );
}

/** Cars driving around the streets. Purely decorative: it is not traffic data. */
function Vehicles({ night, animate }: { night: boolean; animate: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const N = 70;
  const cars = useMemo(() => {
    let seed = 99;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const usable = graph.adjacency.map((l, i) => (l.length >= 2 ? i : -1)).filter((i) => i >= 0);
    return Array.from({ length: N }, () => {
      const from = usable[Math.floor(rnd() * usable.length)];
      const next = graph.adjacency[from][Math.floor(rnd() * graph.adjacency[from].length)];
      return { from, to: next.to, t: rnd(), speed: 7 + rnd() * 7, hue: rnd() };
    });
  }, []);
  const palette = useMemo(() => ['#ffffff', '#f59e0b', '#ef4444', '#2563eb', '#334155', '#10b981'].map((c) => new THREE.Color(c)), []);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(5.2, 1.7, 2.3), up: new THREE.Vector3(0, 1, 0) }), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    cars.forEach((c, i) => mesh.setColorAt(i, palette[Math.floor(c.hue * palette.length)]));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cars, palette]);

  const place = (dt: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    cars.forEach((c, i) => {
      const a = city.nodes[c.from];
      const b = city.nodes[c.to];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      c.t += (c.speed * dt) / len;
      if (c.t >= 1) {
        const options = graph.adjacency[c.to].filter((l) => l.to !== c.from);
        const pick = options.length ? options[Math.floor(Math.random() * options.length)].to : c.from;
        c.from = c.to;
        c.to = pick;
        c.t = 0;
      }
      const A = city.nodes[c.from];
      const B = city.nodes[c.to];
      const dx = B.x - A.x;
      const dz = B.z - A.z;
      const l = Math.hypot(dx, dz) || 1;
      // Keep to the right-hand lane.
      const lane = 2.6;
      tmp.p.set(A.x + dx * c.t - (dz / l) * lane, 1.2, A.z + dz * c.t + (dx / l) * lane);
      tmp.q.setFromAxisAngle(tmp.up, Math.atan2(-dz, dx));
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      mesh.setMatrixAt(i, tmp.m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => place(0), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, dt) => {
    if (animate) place(Math.min(dt, 0.1));
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} emissive="#ffffff" emissiveIntensity={night ? 0.5 : 0} />
    </instancedMesh>
  );
}

// --- places --------------------------------------------------------------------------------------
/** A light beam and a ring on the ground for every place. They grow with the distance so they stay visible. */
function Beacons({ shown, selectedId, startId, animate }: { shown: ReadonlySet<string>; selectedId: string | null; startId: string | null; animate: boolean }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ camera, clock }) => {
    const pulse = animate ? 1 + 0.12 * Math.sin(clock.elapsedTime * 3) : 1;
    city.pois.forEach((p, i) => {
      const g = groups.current[i];
      if (!g) return;
      const dist = camera.position.distanceTo(g.position);
      const s = Math.min(3.2, Math.max(0.55, dist / 750));
      const emphasis = p.id === selectedId || p.id === startId ? 1.5 : 1;
      g.scale.set(s * emphasis, 1, s * emphasis);
      const ring = rings.current[i];
      if (ring) ring.scale.setScalar(p.id === selectedId ? pulse : 1);
    });
  });
  return (
    <>
      {city.pois.map((p, i) => {
        const isStart = p.id === startId;
        const color = isStart ? '#ffffff' : CATEGORY_COLOR[p.category];
        const on = p.id === selectedId || isStart;
        return (
          <group key={p.id} ref={(el) => void (groups.current[i] = el)} position={[p.x, 0, p.z]} visible={shown.has(p.id) || isStart}>
            <mesh position={[0, 60, 0]}>
              <cylinderGeometry args={[on ? 2.6 : 1.6, on ? 2.6 : 1.6, 120, 10, 1, true]} />
              <meshBasicMaterial color={color} transparent opacity={on ? 0.75 : 0.5} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={(el) => void (rings.current[i] = el)} rotation-x={-Math.PI / 2} position={[0, 1.2, 0]}>
              <ringGeometry args={[on ? 20 : 14, on ? 26 : 18, 40]} />
              <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
            </mesh>
            {isStart && (
              <mesh rotation-x={-Math.PI / 2} position={[0, 1.1, 0]}>
                <ringGeometry args={[27, 31, 40]} />
                <meshBasicMaterial color="#2563EB" transparent opacity={0.95} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function RouteLine({ route, animate }: { route: Route | null; animate: boolean }) {
  const dashed = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (animate && dashed.current) dashed.current.material.dashOffset -= dt * 22;
  });
  const points = useMemo(() => (route ? route.points.map((p) => new THREE.Vector3(p.x, 3, p.z)) : null), [route]);
  if (!points || points.length < 2) return null;
  return (
    <>
      <Line points={points} color="#ffffff" lineWidth={9} depthTest={false} renderOrder={10} />
      <Line ref={dashed as never} points={points} color="#2563EB" lineWidth={5} dashed dashSize={14} gapSize={9} depthTest={false} renderOrder={11} />
    </>
  );
}

function Walkshed({ pieces }: { pieces: WalkPiece[] | null }) {
  const geometry = useMemo(() => (pieces ? buildWalkshed(pieces) : null), [pieces]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} renderOrder={5}>
      <meshBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={-6} polygonOffsetUnits={-6} />
    </mesh>
  );
}

// --- camera --------------------------------------------------------------------------------------
const MIN_DIST = 90;
const MAX_DIST = 2300;
const HOME = { x: 0, z: 0, radius: 1750, phi: 0.95, theta: 0.55 };

function CameraRig({ apiRef, viewRef, animate, label }: Pick<MapSceneProps, 'apiRef' | 'viewRef' | 'animate' | 'label'>) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const goal = useRef<{ target: THREE.Vector3; position: THREE.Vector3 } | null>(null);
  const animateRef = useRef(animate);
  animateRef.current = animate;

  useEffect(() => {
    if (!controls) return;
    const stop = () => (goal.current = null);
    controls.addEventListener('start', stop);
    // Arrow keys pan the map when the canvas has focus.
    gl.domElement.tabIndex = 0;
    gl.domElement.setAttribute('role', 'application');
    gl.domElement.setAttribute('aria-label', label);
    controls.listenToKeyEvents(gl.domElement);
    return () => controls.removeEventListener('start', stop);
  }, [controls, gl, label]);

  useEffect(() => {
    if (!controls) return;
    const spherical = () => new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const go = (target: THREE.Vector3, s: THREE.Spherical) => {
      s.radius = Math.min(MAX_DIST, Math.max(MIN_DIST, s.radius));
      s.phi = Math.min(1.45, Math.max(0.05, s.phi));
      const position = target.clone().add(new THREE.Vector3().setFromSpherical(s));
      if (animateRef.current) goal.current = { target, position };
      else {
        goal.current = null;
        controls.target.copy(target);
        camera.position.copy(position);
        controls.update();
      }
    };
    apiRef.current = {
      flyTo: (x, z, distance) => {
        const s = spherical();
        s.radius = distance ?? Math.min(s.radius, 520);
        go(new THREE.Vector3(x, 0, z), s);
      },
      rotate: (d) => {
        const s = spherical();
        s.theta += d;
        go(controls.target.clone(), s);
      },
      tilt: (d) => {
        const s = spherical();
        s.phi += d;
        go(controls.target.clone(), s);
      },
      setView: (view) => {
        const s = spherical();
        s.phi = view === 'top' ? 0.05 : 0.95;
        go(controls.target.clone(), s);
      },
      zoom: (f) => {
        const s = spherical();
        s.radius *= f;
        go(controls.target.clone(), s);
      },
      resetNorth: () => {
        const s = spherical();
        s.theta = 0;
        go(controls.target.clone(), s);
      },
      reset: () => go(new THREE.Vector3(HOME.x, 0, HOME.z), new THREE.Spherical(HOME.radius, HOME.phi, HOME.theta)),
    };
    return () => {
      apiRef.current = null;
    };
  }, [controls, camera, apiRef]);

  const ndc = useMemo(() => [new THREE.Vector3(-1, -1, 0.5), new THREE.Vector3(1, -1, 0.5), new THREE.Vector3(1, 1, 0.5), new THREE.Vector3(-1, 1, 0.5)], []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    if (!controls) return;
    const g = goal.current;
    if (g) {
      const k = 1 - Math.exp(-dt * 5);
      controls.target.lerp(g.target, k);
      camera.position.lerp(g.position, k);
      if (controls.target.distanceTo(g.target) < 0.5 && camera.position.distanceTo(g.position) < 1) goal.current = null;
    }
    // Keep the view over the city.
    const limit = HALF + 100;
    const cx = Math.min(limit, Math.max(-limit, controls.target.x));
    const cz = Math.min(limit, Math.max(-limit, controls.target.z));
    if (cx !== controls.target.x || cz !== controls.target.z) {
      camera.position.x += cx - controls.target.x;
      camera.position.z += cz - controls.target.z;
      controls.target.x = cx;
      controls.target.z = cz;
    }
    // Report the view and the ground area it covers.
    const footprint = ndc.map((p) => {
      dir.copy(p).unproject(camera).sub(camera.position).normalize();
      const t = dir.y < -0.02 ? -camera.position.y / dir.y : 3500;
      const far = Math.min(t, 3500);
      return [camera.position.x + dir.x * far, camera.position.z + dir.z * far] as [number, number];
    });
    viewRef.current = {
      x: controls.target.x,
      z: controls.target.z,
      azimuth: controls.getAzimuthalAngle(),
      polar: controls.getPolarAngle(),
      distance: camera.position.distanceTo(controls.target),
      footprint,
    };
  });
  void size;
  return null;
}

/** Moves the DOM labels of the places so they follow the 3D scene. */
function PinProjector({ labelRefs }: { labelRefs: MapSceneProps['labelRefs'] }) {
  const points = useMemo(() => city.pois.map((p) => new THREE.Vector3(p.x, poiTop(p), p.z)), []);
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
        el.style.zIndex = String(Math.round((1 - v.z) * 100000));
        el.dataset.near = camera.position.distanceTo(p) < 800 ? '1' : '0';
      }
    });
  });
  return null;
}

export default function MapScene({ night, shown, selectedId, startId, route, walkPieces, vehicles, animate, labelRefs, viewRef, apiRef, label }: MapSceneProps) {
  const pal = palette(night);
  const start = useMemo(() => {
    const s = new THREE.Spherical(HOME.radius, HOME.phi, HOME.theta);
    return new THREE.Vector3().setFromSpherical(s).toArray();
  }, []);
  return (
    <Canvas
      className="!absolute inset-0"
      flat
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: start as [number, number, number], fov: 40, near: 10, far: 9000 }}
    >
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.bg, 1800, 5200]} />
      <hemisphereLight args={[pal.hemi[0], pal.hemi[1], pal.hemi[2]]} />
      <directionalLight
        position={[-420, 760, 340]}
        color={pal.sun[0]}
        intensity={pal.sun[1]}
        castShadow={!night}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1000}
        shadow-camera-right={1000}
        shadow-camera-top={1000}
        shadow-camera-bottom={-1000}
        shadow-camera-near={100}
        shadow-camera-far={2200}
        shadow-bias={-0.0004}
        shadow-normalBias={1.5}
      />
      <Land pal={pal} />
      <Streets pal={pal} />
      <Buildings pal={pal} night={night} />
      <Trees pal={pal} />
      {vehicles && <Vehicles night={night} animate={animate} />}
      <Walkshed pieces={walkPieces} />
      <RouteLine route={route} animate={animate} />
      <Beacons shown={shown} selectedId={selectedId} startId={startId} animate={animate} />
      <PinProjector labelRefs={labelRefs} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        screenSpacePanning={false}
        minDistance={MIN_DIST}
        maxDistance={MAX_DIST}
        minPolarAngle={0.05}
        maxPolarAngle={1.45}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        keyPanSpeed={24}
      />
      <CameraRig apiRef={apiRef} viewRef={viewRef} animate={animate} label={label} />
    </Canvas>
  );
}
