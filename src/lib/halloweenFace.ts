import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { headRoll } from './faceEffects';

/** Switchable Halloween looks. All artwork is drawn here — no image files, no licensed characters. */
export const HALLOWEEN_LOOKS = ['pumpkin', 'skull', 'witch', 'vampire'] as const;
export type HalloweenLook = (typeof HALLOWEEN_LOOKS)[number];

const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const OUTER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const UPPER_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LOWER_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

const SANS = 'Manrope, "Noto Sans Thai", Inter, sans-serif';

interface Pt {
  x: number;
  y: number;
}

const P = (face: NormalizedLandmark[], i: number, w: number, h: number): Pt => ({ x: face[i].x * w, y: face[i].y * h });
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function oval(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  ctx.beginPath();
  OVAL.forEach((i, n) => {
    const p = P(face, i, w, h);
    if (n === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
}

function strokeIdx(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], idx: number[], w: number, h: number, color: string, width: number) {
  ctx.beginPath();
  idx.forEach((i, n) => {
    const p = P(face, i, w, h);
    if (n === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function layout(face: NormalizedLandmark[], w: number, h: number) {
  const top = P(face, 10, w, h);
  const chin = P(face, 152, w, h);
  const cheekL = P(face, 234, w, h);
  const cheekR = P(face, 454, w, h);
  const eyeL = face.length > 468 ? P(face, 468, w, h) : mid(P(face, 33, w, h), P(face, 133, w, h));
  const eyeR = face.length > 473 ? P(face, 473, w, h) : mid(P(face, 362, w, h), P(face, 263, w, h));
  const mouthL = P(face, 61, w, h);
  const mouthR = P(face, 291, w, h);
  const upper = P(face, 13, w, h);
  const lower = P(face, 14, w, h);
  const faceW = Math.max(1, dist(cheekL, cheekR));
  const faceH = Math.max(1, dist(top, chin));
  const angle = (headRoll(face, w, h) * Math.PI) / 180;
  const eyeW = Math.max(1, dist(P(face, 33, w, h), P(face, 133, w, h)));
  const openL = dist(P(face, 159, w, h), P(face, 145, w, h)) / (eyeW * 0.55);
  const openR = dist(P(face, 386, w, h), P(face, 374, w, h)) / (eyeW * 0.55);
  return {
    top, chin, cheekL, cheekR, eyeL, eyeR, mouthL, mouthR, upper, lower,
    faceW, faceH, angle, eyeW,
    nose: P(face, 1, w, h),
    mouthGap: dist(upper, lower),
    mouthW: Math.max(1, dist(mouthL, mouthR)),
    mouthAngle: Math.atan2(mouthR.y - mouthL.y, mouthR.x - mouthL.x),
    openL: Math.max(0, Math.min(1, openL)),
    openR: Math.max(0, Math.min(1, openR)),
  };
}

function paintPumpkinBody(ctx: CanvasRenderingContext2D, rx: number, ry: number) {
  const g = ctx.createRadialGradient(-rx * 0.28, -ry * 0.34, rx * 0.08, 0, 0, Math.max(rx, ry));
  g.addColorStop(0, '#ffd7a1');
  g.addColorStop(0.42, '#f97316');
  g.addColorStop(1, '#c2410c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(124, 45, 18, 0.38)';
  ctx.lineWidth = rx * 0.045;
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    ctx.beginPath();
    ctx.moveTo(i * rx * 0.15, -ry);
    ctx.quadraticCurveTo(i * rx * 0.22, 0, i * rx * 0.15, ry);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.32, -ry * 0.36, rx * 0.2, ry * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#9a3412';
  ctx.lineWidth = rx * 0.035;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath();
  ctx.moveTo(-rx * 0.05, -ry + 2);
  ctx.quadraticCurveTo(rx * 0.02, -ry - rx * 0.34, rx * 0.16, -ry - rx * 0.2);
  ctx.quadraticCurveTo(rx * 0.12, -ry - rx * 0.05, rx * 0.04, -ry + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#65a30d';
  ctx.beginPath();
  ctx.ellipse(rx * 0.24, -ry + rx * 0.02, rx * 0.16, rx * 0.065, -0.9, 0, Math.PI * 2);
  ctx.fill();
}

function carveTri(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, s: number) {
  const tri = (scale: number) => {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.7 * scale);
    ctx.lineTo(-s * 0.62 * scale, -s * 0.42 * scale);
    ctx.lineTo(s * 0.62 * scale, -s * 0.42 * scale);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#7c2d12';
  tri(1);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  tri(0.72);
  ctx.fill();
  ctx.restore();
}

function carveMouth(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, hw: number, mh: number) {
  const path = (scale: number) => {
    const steps = 5;
    ctx.beginPath();
    ctx.moveTo(-hw * scale, mh * 0.08 * scale);
    for (let i = 0; i <= steps; i++) {
      const px = (-hw + (2 * hw * i) / steps) * scale;
      const py = (i % 2 === 0 ? mh * 0.12 : mh) * scale;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#7c2d12';
  path(1);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  path(0.82);
  ctx.fill();
  ctx.restore();
}

function drawPumpkin(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const L = layout(face, w, h);
  const center = lerp(L.top, L.chin, 0.5);
  const rx = L.faceW * 0.72;
  const ry = L.faceH * 0.64;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(L.angle);
  paintPumpkinBody(ctx, rx, ry);
  ctx.restore();
  const eyeS = L.faceW * 0.2;
  carveTri(ctx, L.eyeL.x, L.eyeL.y, L.angle, eyeS);
  carveTri(ctx, L.eyeR.x, L.eyeR.y, L.angle, eyeS);
  const mh = Math.min(ry * 0.42, Math.max(L.mouthW * 0.28, L.mouthGap * 1.05));
  carveMouth(ctx, L.upper.x, L.upper.y, L.mouthAngle, L.mouthW * 0.42, mh);
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, dot: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = petal;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.ellipse(r * 0.58, 0, r * 0.46, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSkull(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const L = layout(face, w, h);
  ctx.save();
  oval(ctx, face, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(250, 247, 240, 0.8)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  const socket = (c: Pt) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(L.angle);
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(0, 0, L.faceW * 0.155, L.faceW * 0.105, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = L.faceW * 0.012;
    ctx.stroke();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = L.faceW * 0.007;
    ctx.beginPath();
    ctx.ellipse(0, 0, L.faceW * 0.12, L.faceW * 0.078, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  socket(L.eyeL);
  socket(L.eyeR);

  ctx.save();
  ctx.translate(L.nose.x, L.nose.y);
  ctx.rotate(L.angle);
  ctx.fillStyle = '#1c1917';
  const s = L.faceW * 0.055;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.45, -s * 1.3, 0, -s * 0.15);
  ctx.bezierCurveTo(s * 0.45, -s * 1.3, s * 1.5, -s * 0.2, 0, s * 0.9);
  ctx.fill();
  ctx.restore();

  strokeIdx(ctx, face, OUTER_LIP, w, h, '#1c1917', L.faceW * 0.018);
  drawTeeth(ctx, face, w, h, L.mouthGap, L.mouthW, L.mouthAngle);

  const dots = ['#e11d48', '#f59e0b', '#0d9488'];
  [103, 67, 109, 10, 338, 297, 332].forEach((i, n) => {
    const p = P(face, i, w, h);
    ctx.fillStyle = dots[n % dots.length];
    ctx.beginPath();
    ctx.arc(p.x, p.y, L.faceW * 0.02, 0, Math.PI * 2);
    ctx.fill();
  });

  flower(ctx, lerp(L.top, L.chin, 0.12).x, lerp(L.top, L.chin, 0.12).y, L.faceW * 0.11, '#e11d48', '#fde68a');
  const cheekBloom = (cheek: Pt) => lerp(lerp(cheek, L.chin, 0.22), L.nose, 0.28);
  const bL = cheekBloom(L.cheekL);
  const bR = cheekBloom(L.cheekR);
  ctx.fillStyle = 'rgba(244, 114, 182, 0.35)';
  for (const b of [bL, bR]) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, L.faceW * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  flower(ctx, bL.x, bL.y, L.faceW * 0.075, '#7c3aed', '#fde68a');
  flower(ctx, bR.x, bR.y, L.faceW * 0.075, '#0d9488', '#fb7185');
}

function drawTeeth(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number, gap: number, mouthW: number, angle: number) {
  const upper = P(face, 13, w, h);
  const show = Math.max(gap, mouthW * 0.07);
  ctx.save();
  ctx.beginPath();
  UPPER_INNER.forEach((i, n) => {
    const p = P(face, i, w, h);
    if (n === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  for (let i = LOWER_INNER.length - 1; i >= 0; i--) {
    const p = P(face, LOWER_INNER[i], w, h);
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  if (gap > mouthW * 0.06) ctx.clip();
  ctx.save();
  ctx.translate(upper.x, upper.y + show * 0.35);
  ctx.rotate(angle);
  ctx.fillStyle = '#f8fafc';
  const n = 6;
  const tw = (mouthW * 0.7) / n;
  for (let i = 0; i < n; i++) {
    ctx.fillRect(-mouthW * 0.35 + i * tw + tw * 0.14, -show * 0.55, tw * 0.72, show * 1.15);
    ctx.strokeStyle = 'rgba(28, 25, 23, 0.45)';
    ctx.lineWidth = Math.max(1, mouthW * 0.012);
    ctx.strokeRect(-mouthW * 0.35 + i * tw + tw * 0.14, -show * 0.55, tw * 0.72, show * 1.15);
  }
  ctx.restore();
  ctx.restore();
}

function drawWitch(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const L = layout(face, w, h);
  ctx.save();
  oval(ctx, face, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(110, 168, 72, 0.34)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  strokeIdx(ctx, face, [246, 161, 160, 159, 158, 157, 173], w, h, 'rgba(91, 33, 182, 0.85)', L.faceW * 0.04);
  strokeIdx(ctx, face, [466, 388, 387, 386, 385, 384, 398], w, h, 'rgba(91, 33, 182, 0.85)', L.faceW * 0.04);

  ctx.save();
  ctx.translate(L.top.x, L.top.y + L.faceH * 0.04);
  ctx.rotate(L.angle);
  const brimW = L.faceW * 1.5;
  const brimH = L.faceW * 0.3;
  const coneH = L.faceH * 0.92;
  const coneW = L.faceW * 0.72;
  const g = ctx.createLinearGradient(-coneW / 2, 0, coneW / 2, -coneH);
  g.addColorStop(0, '#0f172a');
  g.addColorStop(0.5, '#1e1b4b');
  g.addColorStop(1, '#312e81');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-coneW * 0.46, -brimH * 0.15);
  ctx.quadraticCurveTo(-coneW * 0.22, -coneH * 0.72, coneW * 0.02, -coneH);
  ctx.quadraticCurveTo(coneW * 0.2, -coneH * 0.62, coneW * 0.5, -brimH * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.ellipse(0, 0, brimW / 2, brimH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4c1d95';
  ctx.lineWidth = L.faceW * 0.014;
  ctx.stroke();
  ctx.fillStyle = '#c2410c';
  ctx.beginPath();
  ctx.moveTo(-coneW * 0.34, -brimH * 0.95);
  ctx.lineTo(coneW * 0.38, -brimH * 0.88);
  ctx.lineTo(coneW * 0.34, -brimH * 0.52);
  ctx.lineTo(-coneW * 0.3, -brimH * 0.58);
  ctx.closePath();
  ctx.fill();
  const bs = L.faceW * 0.07;
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-bs, -brimH * 0.92, bs * 2, bs * 1.35);
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(-bs * 0.55, -brimH * 0.78, bs * 1.1, bs * 0.7);
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(-coneW * 0.02, -coneH * 0.62, L.faceW * 0.04, 0, Math.PI * 2);
  ctx.fill();
  const sx = brimW * 0.38;
  const drop = L.faceW * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, L.faceW * 0.008);
  ctx.beginPath();
  ctx.moveTo(sx, brimH * 0.2);
  ctx.lineTo(sx, brimH * 0.2 + drop);
  ctx.stroke();
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(sx, brimH * 0.2 + drop, L.faceW * 0.032, L.faceW * 0.022, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = Math.max(1, L.faceW * 0.01);
  ctx.beginPath();
  ctx.moveTo(sx, brimH * 0.15 + drop);
  ctx.lineTo(sx - L.faceW * 0.07, brimH * 0.05 + drop);
  ctx.moveTo(sx, brimH * 0.15 + drop);
  ctx.lineTo(sx + L.faceW * 0.07, brimH * 0.08 + drop);
  ctx.moveTo(sx, brimH * 0.28 + drop);
  ctx.lineTo(sx - L.faceW * 0.06, brimH * 0.32 + drop);
  ctx.moveTo(sx, brimH * 0.28 + drop);
  ctx.lineTo(sx + L.faceW * 0.07, brimH * 0.3 + drop);
  ctx.stroke();
  ctx.restore();
}

function drawVampire(ctx: CanvasRenderingContext2D, face: NormalizedLandmark[], w: number, h: number) {
  const L = layout(face, w, h);
  ctx.save();
  oval(ctx, face, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(224, 231, 255, 0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(49, 10, 40, 0.32)';
  for (const eye of [L.eyeL, L.eyeR]) {
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y + L.faceW * 0.055, L.faceW * 0.09, L.faceW * 0.04, L.angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(L.top.x, L.top.y);
  ctx.rotate(L.angle);
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(-L.faceW * 0.46, -L.faceH * 0.02);
  ctx.quadraticCurveTo(-L.faceW * 0.12, L.faceH * 0.02, 0, L.faceH * 0.14);
  ctx.quadraticCurveTo(L.faceW * 0.12, L.faceH * 0.02, L.faceW * 0.46, -L.faceH * 0.02);
  ctx.lineTo(L.faceW * 0.5, -L.faceH * 0.28);
  ctx.lineTo(-L.faceW * 0.5, -L.faceH * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const iris = (c: Pt, open: number) => {
    const r = L.eyeW * 0.34 * (0.28 + 0.72 * open);
    const glow = ctx.createRadialGradient(c.x, c.y, r * 0.2, c.x, c.y, r * 2.4);
    glow.addColorStop(0, 'rgba(220, 38, 38, 0.55)');
    glow.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(c.x - r * 0.28, c.y - r * 0.28, Math.max(1, r * 0.16), 0, Math.PI * 2);
    ctx.fill();
  };
  iris(L.eyeL, L.openL);
  iris(L.eyeR, L.openR);

  const len = Math.max(L.mouthW * 0.16, L.mouthGap * 0.72);
  ctx.save();
  ctx.translate(L.upper.x, L.upper.y);
  ctx.rotate(L.mouthAngle);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1, L.mouthW * 0.02);
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.8)';
  ctx.fillStyle = '#fffef8';
  for (const side of [-0.22, 0.22]) {
    const x = side * L.mouthW;
    ctx.beginPath();
    ctx.moveTo(x - L.mouthW * 0.04, 0);
    ctx.lineTo(x + L.mouthW * 0.04, 0);
    ctx.lineTo(x, len);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(0.22 * L.mouthW, len, L.mouthW * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draws the chosen look on every detected face. Call while the selfie mirror transform is active. */
export function drawHalloweenFaces(ctx: CanvasRenderingContext2D, faces: NormalizedLandmark[][], look: HalloweenLook) {
  const { width: w, height: h } = ctx.canvas;
  if (w < 2 || h < 2) return;
  for (const face of faces) {
    if (face.length < 468) continue;
    ctx.save();
    if (look === 'pumpkin') drawPumpkin(ctx, face, w, h);
    else if (look === 'skull') drawSkull(ctx, face, w, h);
    else if (look === 'witch') drawWitch(ctx, face, w, h);
    else drawVampire(ctx, face, w, h);
    ctx.restore();
  }
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${SANS}`;
  while (s > 8 && ctx.measureText(text).width > maxWidth) {
    s *= 0.92;
    ctx.font = `${weight} ${s}px ${SANS}`;
  }
}

function miniPumpkin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#fdba74');
  g.addColorStop(1, '#c2410c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f6212';
  ctx.fillRect(-r * 0.1, -r * 1.2, r * 0.2, r * 0.4);
  ctx.restore();
}

function bat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flap: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-s * 0.55, -s * flap, -s, s * 0.05);
  ctx.quadraticCurveTo(-s * 0.45, s * 0.22, 0, s * 0.08);
  ctx.quadraticCurveTo(s * 0.45, s * 0.22, s, s * 0.05);
  ctx.quadraticCurveTo(s * 0.55, -s * flap, 0, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, s * 0.02, s * 0.12, s * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.06, -s * 0.12);
  ctx.lineTo(0, -s * 0.02);
  ctx.lineTo(s * 0.06, -s * 0.12);
  ctx.fill();
  ctx.restore();
}

function cobweb(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.012);
  const spokes = 7;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }
  for (let k = 1; k <= 4; k++) {
    const rr = (r * k) / 4;
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI / 2);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/**
 * Halloween photo frame in screen space. Resets the transform internally so caption text
 * stays readable when the camera image is mirrored.
 * Pass timeMs = 0 to keep bats still (reduced motion, or a still photo).
 */
export function drawHalloweenFrame(ctx: CanvasRenderingContext2D, title: string, subtitle: string, timeMs = 0) {
  const { width: w, height: h } = ctx.canvas;
  if (w < 2 || h < 2) return;
  const u = Math.min(w, h) / 100;
  const band = 16 * u;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  const vignette = ctx.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.28, w / 2, h * 0.46, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(28, 16, 40, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 1.15 * u;
  ctx.strokeRect(1.2 * u, 1.2 * u, w - 2.4 * u, h - 2.4 * u);
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.85)';
  ctx.lineWidth = 0.35 * u;
  ctx.strokeRect(2.6 * u, 2.6 * u, w - 5.2 * u, h - 5.2 * u);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  cobweb(ctx, 22 * u);
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  cobweb(ctx, 18 * u);
  ctx.restore();

  const flapAt = (i: number) => (timeMs ? 0.55 + Math.sin(timeMs / 220 + i) * 0.35 : 0.45);
  const bats: [number, number, number][] = [
    [0.22, 0.07, 3.1],
    [0.4, 0.045, 2.4],
    [0.58, 0.075, 2.8],
    [0.76, 0.05, 2.2],
  ];
  bats.forEach(([nx, ny, size], i) => bat(ctx, nx * w, ny * h, size * u, flapAt(i)));

  const fade = ctx.createLinearGradient(0, h - band * 1.45, 0, h);
  fade.addColorStop(0, 'rgba(28,16,40,0)');
  fade.addColorStop(0.4, 'rgba(28,16,40,0.82)');
  fade.addColorStop(1, 'rgba(28,16,40,0.95)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, h - band * 1.45, w, band * 1.45);
  miniPumpkin(ctx, 8 * u, h - band * 0.55, 3.4 * u);
  miniPumpkin(ctx, w - 8 * u, h - band * 0.55, 3.4 * u);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde68a';
  fitFont(ctx, title, w - 28 * u, 6.2 * u, '800');
  ctx.fillText(title, w / 2, h - band * 0.62);
  ctx.fillStyle = '#fdba74';
  fitFont(ctx, subtitle, w - 28 * u, 3.1 * u, '600');
  ctx.fillText(subtitle, w / 2, h - band * 0.28);
  ctx.restore();
}
