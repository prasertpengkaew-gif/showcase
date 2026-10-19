import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type FaceEffect = 'mesh' | 'glasses' | 'crown';

/** Connections are passed in from FaceLandmarker so this module needs no runtime import. */
export interface MeshConnections {
  tesselation: { start: number; end: number }[];
  contours: { start: number; end: number }[];
}

// MediaPipe face mesh landmark indices
const L = {
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  foreheadTop: 10,
  chin: 152,
  cheekLeft: 234,
  cheekRight: 454,
  noseBridge: 168,
};

const ACCENT = '#2563EB';

interface Point {
  x: number;
  y: number;
}

const px = (lm: NormalizedLandmark, w: number, h: number): Point => ({ x: lm.x * w, y: lm.y * h });
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Head roll in degrees, from the line between the eyes (positive = tilted clockwise in the image). */
export function headRoll(face: NormalizedLandmark[], w: number, h: number): number {
  const a = px(face[L.leftEyeOuter], w, h);
  const b = px(face[L.rightEyeOuter], w, h);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Axis-aligned bounding box of the face in pixels. */
export function faceBox(face: NormalizedLandmark[], w: number, h: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of face) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX * w, y: minY * h, width: (maxX - minX) * w, height: (maxY - minY) * h };
}

function drawMesh(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number, conn: MeshConnections) {
  const scale = Math.max(1, w / 900);
  ctx.lineWidth = 0.6 * scale;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  for (const { start, end } of conn.tesselation) {
    ctx.moveTo(face[start].x * w, face[start].y * h);
    ctx.lineTo(face[end].x * w, face[end].y * h);
  }
  ctx.stroke();
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = ACCENT;
  ctx.beginPath();
  for (const { start, end } of conn.contours) {
    ctx.moveTo(face[start].x * w, face[start].y * h);
    ctx.lineTo(face[end].x * w, face[end].y * h);
  }
  ctx.stroke();

  const box = faceBox(face, w, h);
  const pad = box.width * 0.08;
  const c = Math.min(box.width, box.height) * 0.18;
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#ffffff';
  const x0 = box.x - pad;
  const y0 = box.y - pad;
  const x1 = box.x + box.width + pad;
  const y1 = box.y + box.height + pad;
  ctx.beginPath();
  // Corner brackets
  ctx.moveTo(x0, y0 + c);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + c, y0);
  ctx.moveTo(x1 - c, y0);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1, y0 + c);
  ctx.moveTo(x1, y1 - c);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - c, y1);
  ctx.moveTo(x0 + c, y1);
  ctx.lineTo(x0, y1);
  ctx.lineTo(x0, y1 - c);
  ctx.stroke();
}

function drawGlasses(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const eyeL = mid(px(face[L.leftEyeOuter], w, h), px(face[L.leftEyeInner], w, h));
  const eyeR = mid(px(face[L.rightEyeInner], w, h), px(face[L.rightEyeOuter], w, h));
  const d = dist(eyeL, eyeR);
  const angle = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const center = mid(eyeL, eyeR);
  const lensW = d * 0.86;
  const lensH = d * 0.58;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  const lens = (cx: number) => {
    const g = ctx.createLinearGradient(0, -lensH / 2, 0, lensH / 2);
    g.addColorStop(0, 'rgba(15,23,42,0.92)');
    g.addColorStop(1, 'rgba(37,99,235,0.78)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx - lensW / 2, -lensH / 2, lensW, lensH, lensH * 0.42);
    ctx.fill();
    ctx.lineWidth = d * 0.06;
    ctx.strokeStyle = '#0B1220';
    ctx.stroke();
    // Highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = d * 0.025;
    ctx.beginPath();
    ctx.moveTo(cx - lensW * 0.3, -lensH * 0.22);
    ctx.lineTo(cx - lensW * 0.05, -lensH * 0.32);
    ctx.stroke();
  };
  lens(-d / 2);
  lens(d / 2);
  // Bridge and temples
  ctx.strokeStyle = '#0B1220';
  ctx.lineWidth = d * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-d / 2 + lensW / 2, -lensH * 0.12);
  ctx.quadraticCurveTo(0, -lensH * 0.32, d / 2 - lensW / 2, -lensH * 0.12);
  ctx.moveTo(-d / 2 - lensW / 2, -lensH * 0.18);
  ctx.lineTo(-d / 2 - lensW * 0.78, -lensH * 0.05);
  ctx.moveTo(d / 2 + lensW / 2, -lensH * 0.18);
  ctx.lineTo(d / 2 + lensW * 0.78, -lensH * 0.05);
  ctx.stroke();
  ctx.restore();
}

function drawCrown(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const top = px(face[L.foreheadTop], w, h);
  const chin = px(face[L.chin], w, h);
  const faceW = dist(px(face[L.cheekLeft], w, h), px(face[L.cheekRight], w, h));
  const faceH = dist(top, chin);
  const angle = (headRoll(face, w, h) * Math.PI) / 180;
  const crownW = faceW * 0.8;
  const crownH = faceH * 0.38;

  ctx.save();
  // Sit the crown just above the forehead, along the head's up direction.
  ctx.translate(top.x + Math.sin(angle) * faceH * 0.12, top.y - Math.cos(angle) * faceH * 0.12);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, -crownH, 0, 0);
  g.addColorStop(0, '#fde68a');
  g.addColorStop(1, '#d97706');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = faceW * 0.02;
  ctx.lineJoin = 'round';
  const half = crownW / 2;
  ctx.beginPath();
  ctx.moveTo(-half, 0);
  ctx.lineTo(-half, -crownH * 0.55);
  ctx.lineTo(-half * 0.5, -crownH * 0.25);
  ctx.lineTo(0, -crownH);
  ctx.lineTo(half * 0.5, -crownH * 0.25);
  ctx.lineTo(half, -crownH * 0.55);
  ctx.lineTo(half, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Jewels
  for (const [x, y, r, color] of [
    [0, -crownH * 0.42, faceW * 0.045, ACCENT],
    [-half * 0.6, -crownH * 0.18, faceW * 0.03, '#ef4444'],
    [half * 0.6, -crownH * 0.18, faceW * 0.03, '#10b981'],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws the chosen effect for every detected face. */
export function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: NormalizedLandmark[][],
  effect: FaceEffect,
  conn: MeshConnections,
) {
  const { width: w, height: h } = ctx.canvas;
  for (const face of faces) {
    if (effect === 'mesh') drawMesh(ctx, face, w, h, conn);
    else if (effect === 'glasses') drawGlasses(ctx, face, w, h);
    else drawCrown(ctx, face, w, h);
  }
}
