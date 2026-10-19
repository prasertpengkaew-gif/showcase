import { Matrix4, Quaternion, Vector3 } from 'three';
import { CUBE_EDGE, CUBE_FACES } from '../data/cube';
import type { TrackedMarker } from './markers';

/** cube ← face transforms: the face's marker frame placed on the cube's surface. */
const FACE_TO_CUBE = new Map(
  CUBE_FACES.map((f) => {
    const x = new Vector3(...f.axes.x);
    const y = new Vector3(...f.axes.y);
    const z = new Vector3(...f.axes.z);
    return [f.id, new Matrix4().makeBasis(x, y, z).setPosition(z.clone().multiplyScalar(CUBE_EDGE / 2))] as const;
  }),
);
const INVERSE = new Map([...FACE_TO_CUBE].map(([id, m]) => [id, m.clone().invert()] as const));

export interface CubePose {
  matrix: Matrix4;
  /** Faces that contributed. */
  faces: number[];
}

/**
 * Pose of the cube's centre from every face currently in view. Each face gives a full estimate;
 * they are blended with more weight on big, face-on markers, which are the most accurate.
 */
export function cubePose(markers: TrackedMarker[]): CubePose | null {
  const parts: { pos: Vector3; q: Quaternion; w: number }[] = [];
  const faces: number[] = [];
  for (const m of markers) {
    const inv = INVERSE.get(m.id);
    if (!inv || m.missed > 1) continue;
    // How square-on the face is to the camera (1 = facing it, 0 = edge-on).
    const toCamera = m.position.clone().negate().normalize();
    const normal = new Vector3(0, 0, 1).applyQuaternion(m.quaternion);
    const frontal = normal.dot(toCamera);
    if (frontal < 0.2) continue;
    const cube = m.matrix.clone().multiply(inv);
    const pos = new Vector3();
    const q = new Quaternion();
    cube.decompose(pos, q, new Vector3());
    parts.push({ pos, q, w: m.sizePx * frontal * frontal });
    faces.push(m.id);
  }
  if (!parts.length) return null;
  const total = parts.reduce((a, p) => a + p.w, 0);
  const pos = new Vector3();
  const qs = new Quaternion(0, 0, 0, 0);
  const ref = parts[0].q;
  for (const p of parts) {
    const k = p.w / total;
    pos.addScaledVector(p.pos, k);
    // q and -q are the same rotation: flip to the reference's hemisphere before averaging.
    const sign = p.q.dot(ref) < 0 ? -1 : 1;
    qs.set(qs.x + p.q.x * k * sign, qs.y + p.q.y * k * sign, qs.z + p.q.z * k * sign, qs.w + p.q.w * k * sign);
  }
  qs.normalize();
  return { matrix: new Matrix4().compose(pos, qs, new Vector3(1, 1, 1)), faces };
}
