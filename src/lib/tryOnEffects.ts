import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * Simple 2D try-on overlays positioned from MediaPipe Pose landmarks. These are
 * illustrative product placements, not cloth simulation.
 */
export type TryOnItem = 'hat' | 'necklace' | 'shirt' | 'watch';
export type ShirtColor = 'navy' | 'blue' | 'white';

const SHIRT: Record<ShirtColor, { fill: string; shade: string; text: string }> = {
  navy: { fill: '#16213a', shade: '#0b1220', text: '#5b8ef5' },
  blue: { fill: '#2f6bf0', shade: '#1d4ed8', text: '#ffffff' },
  white: { fill: '#f5f7fa', shade: '#d5dbe4', text: '#2563EB' },
};

// MediaPipe Pose landmark indices
const P = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
};

const MIN_VISIBILITY = 0.5;

interface V {
  x: number;
  y: number;
}

const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, s: number): V => ({ x: a.x * s, y: a.y * s });
const mid = (a: V, b: V): V => mul(add(a, b), 0.5);
const len = (a: V) => Math.hypot(a.x, a.y);
const norm = (a: V): V => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};

export interface Body {
  pt: (i: number) => V;
  visible: (...idx: number[]) => boolean;
  clearlyVisible: (i: number) => boolean;
  shoulderWidth: number;
  /** Unit vector pointing "up" the torso, from hips (or below) to shoulders. */
  up: V;
}

export function readBody(pose: NormalizedLandmark[], w: number, h: number): Body | null {
  const pt = (i: number): V => ({ x: pose[i].x * w, y: pose[i].y * h });
  const visible = (...idx: number[]) => idx.every((i) => (pose[i]?.visibility ?? 0) >= MIN_VISIBILITY);
  if (!visible(P.leftShoulder, P.rightShoulder)) return null;
  const ls = pt(P.leftShoulder);
  const rs = pt(P.rightShoulder);
  const shoulderWidth = len(sub(ls, rs));
  const shoulderMid = mid(ls, rs);
  let up: V;
  if (visible(P.leftHip, P.rightHip)) {
    up = norm(sub(shoulderMid, mid(pt(P.leftHip), pt(P.rightHip))));
  } else {
    // Perpendicular to the shoulder line, pointing toward the head.
    const s = norm(sub(ls, rs));
    up = { x: s.y, y: -s.x };
    if (visible(P.nose) && (pt(P.nose).y - shoulderMid.y) * up.y < 0) up = mul(up, -1);
  }
  const clearlyVisible = (i: number) => (pose[i]?.visibility ?? 0) >= 0.85;
  return { pt, visible, clearlyVisible, shoulderWidth, up };
}

function drawHat(ctx: CanvasRenderingContext2D, b: Body, mirrored: boolean) {
  if (!b.visible(P.nose)) return;
  const earsVisible = b.visible(P.leftEar, P.rightEar);
  const left = earsVisible ? b.pt(P.leftEar) : b.pt(P.leftEye);
  const right = earsVisible ? b.pt(P.rightEar) : b.pt(P.rightEye);
  const headW = Math.max(len(sub(left, right)) * (earsVisible ? 1.55 : 2.6), b.shoulderWidth * 0.48);
  const eyes = mid(b.pt(P.leftEye), b.pt(P.rightEye));
  const center = add(eyes, mul(b.up, headW * 0.3));
  const angle = Math.atan2(-b.up.x, b.up.y) + Math.PI;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  const crownH = headW * 0.48;
  // Brim
  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.ellipse(0, 0, headW * 0.62, headW * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // Crown
  const g = ctx.createLinearGradient(0, -crownH, 0, 0);
  g.addColorStop(0, '#2563EB');
  g.addColorStop(1, '#1d3fa8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-headW * 0.5, 0);
  ctx.bezierCurveTo(-headW * 0.5, -crownH * 1.25, headW * 0.5, -crownH * 1.25, headW * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  // Button and logo
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -crownH * 0.93, headW * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 ${headW * 0.16}px Manrope, Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (mirrored) ctx.scale(-1, 1); // keep text readable in the selfie view
  ctx.fillText('N.', 0, -crownH * 0.45);
  ctx.restore();
}

function neckPoints(b: Body) {
  const ls = b.pt(P.leftShoulder);
  const rs = b.pt(P.rightShoulder);
  const sw = b.shoulderWidth;
  const base = add(mid(ls, rs), mul(b.up, sw * 0.1));
  const towardLeft = norm(sub(ls, rs));
  return { base, side: towardLeft, sw };
}

function drawNecklace(ctx: CanvasRenderingContext2D, b: Body) {
  const { base, side, sw } = neckPoints(b);
  const a = add(base, mul(side, sw * 0.17));
  const c = add(base, mul(side, -sw * 0.17));
  const low = add(base, mul(b.up, -sw * 0.32));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = Math.max(2, sw * 0.022);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(low.x, low.y, c.x, c.y);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = Math.max(1, sw * 0.011);
  ctx.setLineDash([sw * 0.02, sw * 0.012]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Pendant at the lowest point of the curve
  const pendant = add(mid(mid(a, c), low), mul(b.up, -sw * 0.02));
  const r = sw * 0.045;
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#a16207';
  ctx.lineWidth = Math.max(1, sw * 0.008);
  ctx.beginPath();
  ctx.moveTo(pendant.x, pendant.y - r);
  ctx.lineTo(pendant.x + r * 0.8, pendant.y);
  ctx.lineTo(pendant.x, pendant.y + r * 1.3);
  ctx.lineTo(pendant.x - r * 0.8, pendant.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.arc(pendant.x, pendant.y + r * 0.1, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShirt(ctx: CanvasRenderingContext2D, b: Body, color: ShirtColor, mirrored: boolean) {
  const c = SHIRT[color];
  const ls = b.pt(P.leftShoulder);
  const rs = b.pt(P.rightShoulder);
  const sw = b.shoulderWidth;
  const down = mul(b.up, -1);
  const side = norm(sub(ls, rs));
  const lh = b.visible(P.leftHip) ? b.pt(P.leftHip) : add(ls, mul(down, sw * 1.35));
  const rh = b.visible(P.rightHip) ? b.pt(P.rightHip) : add(rs, mul(down, sw * 1.35));

  // Sleeves first, so the body overlaps them
  const sleeve = (shoulder: V, elbowIdx: number, dir: 1 | -1) => {
    const outerShoulder = add(shoulder, mul(side, dir * sw * 0.08));
    const toward = b.visible(elbowIdx) ? norm(sub(b.pt(elbowIdx), shoulder)) : norm(add(mul(side, dir), down));
    const width = sw * 0.3;
    const end = add(outerShoulder, mul(toward, sw * 0.42));
    const perp = { x: -toward.y, y: toward.x };
    ctx.fillStyle = c.shade;
    ctx.beginPath();
    ctx.moveTo(...xy(add(outerShoulder, mul(perp, width / 2))));
    ctx.lineTo(...xy(add(end, mul(perp, width / 2.4))));
    ctx.lineTo(...xy(add(end, mul(perp, -width / 2.4))));
    ctx.lineTo(...xy(add(outerShoulder, mul(perp, -width / 2))));
    ctx.closePath();
    ctx.fill();
  };
  sleeve(ls, P.leftElbow, 1);
  sleeve(rs, P.rightElbow, -1);

  const { base } = neckPoints(b);
  const neckL = add(base, mul(side, sw * 0.16));
  const neckR = add(base, mul(side, -sw * 0.16));
  const neckLow = add(base, mul(down, sw * 0.16));
  const shoulderL = add(add(ls, mul(side, sw * 0.1)), mul(b.up, sw * 0.04));
  const shoulderR = add(add(rs, mul(side, -sw * 0.1)), mul(b.up, sw * 0.04));
  const hemL = add(add(lh, mul(side, sw * 0.1)), mul(down, sw * 0.12));
  const hemR = add(add(rh, mul(side, -sw * 0.1)), mul(down, sw * 0.12));

  const g = ctx.createLinearGradient(shoulderR.x, shoulderR.y, shoulderL.x, shoulderL.y);
  g.addColorStop(0, c.shade);
  g.addColorStop(0.5, c.fill);
  g.addColorStop(1, c.shade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(...xy(neckR));
  ctx.lineTo(...xy(shoulderR));
  ctx.lineTo(...xy(hemR));
  ctx.lineTo(...xy(hemL));
  ctx.lineTo(...xy(shoulderL));
  ctx.lineTo(...xy(neckL));
  ctx.quadraticCurveTo(neckLow.x, neckLow.y, neckR.x, neckR.y);
  ctx.closePath();
  ctx.fill();

  // Chest print, rotated with the torso
  const chest = add(base, mul(down, sw * 0.62));
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.rotate(Math.atan2(side.y, side.x));
  if (mirrored) ctx.scale(-1, 1);
  ctx.fillStyle = c.text;
  ctx.font = `800 ${sw * 0.13}px Manrope, Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NERD', 0, 0);
  ctx.font = `600 ${sw * 0.055}px Inter, sans-serif`;
  ctx.fillText('STUDIO', 0, sw * 0.11);
  ctx.restore();
}

function drawWatch(ctx: CanvasRenderingContext2D, b: Body, wristIdx: number, elbowIdx: number) {
  // Wrists are often hidden (crossed arms, out of frame); only draw when clearly visible.
  if (!b.visible(elbowIdx) || !b.clearlyVisible(wristIdx)) return;
  const wrist = b.pt(wristIdx);
  const elbow = b.pt(elbowIdx);
  const forearm = sub(wrist, elbow);
  const dir = norm(forearm);
  const at = sub(wrist, mul(dir, len(forearm) * 0.1));
  const width = Math.max(10, b.shoulderWidth * 0.13);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(Math.atan2(dir.y, dir.x));
  // Band across the forearm
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.roundRect(-width * 0.28, -width * 0.62, width * 0.56, width * 1.24, width * 0.12);
  ctx.fill();
  // Case and face
  ctx.fillStyle = '#d1d5db';
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1220';
  ctx.beginPath();
  ctx.arc(0, 0, width * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b8ef5';
  ctx.lineWidth = Math.max(1, width * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.2, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -width * 0.14);
  ctx.stroke();
  ctx.restore();
}

const xy = (v: V): [number, number] => [v.x, v.y];

export function drawTryOn(
  ctx: CanvasRenderingContext2D,
  poses: NormalizedLandmark[][],
  items: ReadonlySet<TryOnItem>,
  shirtColor: ShirtColor,
  /** True when the canvas is drawn with a horizontal flip (selfie preview). */
  mirrored = false,
): number {
  const { width: w, height: h } = ctx.canvas;
  let people = 0;
  for (const pose of poses) {
    const body = readBody(pose, w, h);
    if (!body) continue;
    people++;
    if (items.has('shirt')) drawShirt(ctx, body, shirtColor, mirrored);
    if (items.has('necklace')) drawNecklace(ctx, body);
    if (items.has('watch')) {
      drawWatch(ctx, body, P.leftWrist, P.leftElbow);
      drawWatch(ctx, body, P.rightWrist, P.rightElbow);
    }
    if (items.has('hat')) drawHat(ctx, body, mirrored);
  }
  return people;
}
