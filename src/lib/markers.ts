import { Matrix4, Quaternion, Vector3 } from 'three';
import { AR } from '../vendor/aruco/aruco.js';

/** Marker dictionary: ArUco MIP 36h12 (250 ids, strong error checking, so few false detections). */
export const DICTIONARY = 'ARUCO_MIP_36h12';
export const MARKER_COUNT = 250;

export interface Point {
  x: number;
  y: number;
}

/** A marker followed by the tracker. Positions are in three.js camera space, in marker-edge units. */
export interface TrackedMarker {
  id: number;
  /** Corners in video pixels, clockwise from the marker's own top-left. */
  corners: Point[];
  center: Point;
  /** Average edge length on screen, in video pixels. */
  sizePx: number;
  position: Vector3;
  quaternion: Quaternion;
  /** Marker-to-camera transform for three.js: x right, y up, z out of the marker toward the viewer. */
  matrix: Matrix4;
  /** Frames since it was last really detected (0 = seen in this frame). */
  missed: number;
}

/** Frames a marker is kept after it was last seen, so one missed detection doesn't make it flicker. */
const HOLD_FRAMES = 5;
const DETECT_WIDTH = 640;

/** Solves the 3x3 homography mapping `src` to `dst` (4 point pairs) by Gaussian elimination. */
function homography(src: Point[], dst: Point[]): number[] | null {
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < 1e-12) return null;
    [a[c], a[p]] = [a[p], a[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = a[r][c] / a[c][c];
      for (let k = c; k < 9; k++) a[r][k] -= f * a[c][k];
    }
  }
  return [...a.map((row, i) => row[8] / row[i]), 1];
}

/** Unit-edge marker corners (TL, TR, BR, BL) with Y pointing up. */
const MODEL: Point[] = [
  { x: -0.5, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 0.5, y: -0.5 },
  { x: -0.5, y: -0.5 },
];

/**
 * Camera pose of a square marker from its four corners, assuming a typical phone/webcam field of
 * view (focal length ≈ 0.85 × the longer image side). Returns the marker-to-camera matrix for
 * three.js, in units of the marker's edge length.
 */
export function markerPose(corners: Point[], width: number, height: number, out = new Matrix4()): Matrix4 | null {
  const f = 0.85 * Math.max(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const norm = corners.map((p) => ({ x: (p.x - cx) / f, y: (p.y - cy) / f }));
  const h = homography(MODEL, norm);
  if (!h) return null;
  // H = λ [r1 r2 t] with λ > 0 because the marker is in front of the camera.
  const l = 1 / Math.hypot(h[0], h[3], h[6]);
  let r1 = new Vector3(h[0], h[3], h[6]).multiplyScalar(l);
  let r2 = new Vector3(h[1], h[4], h[7]).multiplyScalar(l);
  const t = new Vector3(h[2], h[5], h[8]).multiplyScalar(l);
  r1 = r1.normalize();
  r2 = r2.sub(r1.clone().multiplyScalar(r1.dot(r2))).normalize();
  const r3 = new Vector3().crossVectors(r1, r2);
  // From OpenCV camera axes (y down, z forward) to three.js (y up, z toward the viewer).
  const flip = (v: Vector3) => v.set(v.x, -v.y, -v.z);
  flip(r1);
  flip(r2);
  flip(r3);
  flip(t);
  return out.makeBasis(r1, r2, r3).setPosition(t);
}

interface Track extends TrackedMarker {
  seen: boolean;
}

/** Finds square fiducial markers in video frames and keeps a smoothed pose for each. */
export class MarkerTracker {
  private detector = new AR.Detector({ dictionaryName: DICTIONARY });
  private tracks = new Map<number, Track>();
  private small = document.createElement('canvas');
  private smallCtx = this.small.getContext('2d', { willReadFrequently: true })!;

  /** `only`: ignore every other id (cuts false detections when the ids in use are known). */
  update(video: HTMLVideoElement, only?: ReadonlySet<number>): TrackedMarker[] {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.min(1, DETECT_WIDTH / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    if (this.small.width !== w || this.small.height !== h) {
      this.small.width = w;
      this.small.height = h;
    }
    this.smallCtx.drawImage(video, 0, 0, w, h);
    const found = this.detector.detect(this.smallCtx.getImageData(0, 0, w, h));

    for (const t of this.tracks.values()) t.seen = false;
    for (const m of found) {
      if (only && !only.has(m.id)) continue;
      // The same id twice in one image (e.g. a printed copy): keep the larger one.
      const corners = m.corners.map((c) => ({ x: c.x / scale, y: c.y / scale }));
      const prev = this.tracks.get(m.id);
      if (prev?.seen && prev.sizePx >= edge(corners)) continue;
      const matrix = markerPose(corners, vw, vh);
      if (!matrix) continue;
      const position = new Vector3().setFromMatrixPosition(matrix);
      const quaternion = new Quaternion().setFromRotationMatrix(matrix);
      if (prev && !prev.seen) {
        // Smooth jitter, but follow fast moves: blend less the further the marker has moved.
        const move = prev.center.x - (corners[0].x + corners[2].x) / 2;
        const k = Math.abs(move) > vw * 0.15 ? 1 : 0.55;
        position.lerp(prev.position, 1 - k);
        quaternion.slerp(prev.quaternion, 1 - k);
        corners.forEach((c, i) => {
          c.x = c.x * k + prev.corners[i].x * (1 - k);
          c.y = c.y * k + prev.corners[i].y * (1 - k);
        });
      }
      const sizePx = edge(corners);
      this.tracks.set(m.id, {
        id: m.id,
        corners,
        center: { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 },
        sizePx,
        position,
        quaternion,
        matrix: new Matrix4().compose(position, quaternion, new Vector3(1, 1, 1)),
        missed: 0,
        seen: true,
      });
    }
    const out: TrackedMarker[] = [];
    for (const [id, t] of this.tracks) {
      if (!t.seen) t.missed++;
      if (t.missed > HOLD_FRAMES) this.tracks.delete(id);
      else out.push(t);
    }
    return out;
  }

  reset() {
    this.tracks.clear();
  }
}

function edge(c: Point[]) {
  let s = 0;
  for (let i = 0; i < 4; i++) s += Math.hypot(c[i].x - c[(i + 1) % 4].x, c[i].y - c[(i + 1) % 4].y);
  return s / 4;
}

/** The marker's cells as a string of '0'/'1', for printing. */
export function markerBits(id: number): { bits: string; size: number } {
  dictionary ??= new AR.Dictionary(DICTIONARY);
  return { bits: dictionary.codeList[id], size: dictionary.markSize - 2 };
}

let dictionary: InstanceType<typeof AR.Dictionary> | undefined;
