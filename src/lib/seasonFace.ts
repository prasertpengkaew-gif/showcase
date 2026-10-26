import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { headRoll } from './faceEffects';
import { drawHalloweenFaces, drawHalloweenFrame, HALLOWEEN_LOOKS, type HalloweenLook } from './halloweenFace';
import { SEASON_THEMES, type SeasonTheme } from './season';

/** Looks the landing page can draw. Halloween reuses the event filter pipeline. */
export const SEASON_LOOKS: Record<SeasonTheme, readonly string[]> = {
  halloween: HALLOWEEN_LOOKS,
  loy: ['krathong', 'lotus', 'lantern'],
  christmas: ['santa', 'antlers', 'star'],
};

const SANS = 'Manrope, "Noto Sans Thai", Inter, sans-serif';

interface Pt {
  x: number;
  y: number;
}

interface Metrics {
  center: Pt;
  faceW: number;
  faceH: number;
  angle: number;
  top: Pt;
  forehead: Pt;
}

const pt = (face: NormalizedLandmark[], i: number, w: number, h: number): Pt => ({ x: face[i].x * w, y: face[i].y * h });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function metrics(face: NormalizedLandmark[], w: number, h: number): Metrics {
  const top = pt(face, 10, w, h);
  const chin = pt(face, 152, w, h);
  const cheekL = pt(face, 234, w, h);
  const cheekR = pt(face, 454, w, h);
  return {
    top,
    forehead: { x: top.x, y: top.y + dist(top, chin) * 0.08 },
    center: { x: (cheekL.x + cheekR.x) / 2, y: (top.y + chin.y) / 2 },
    faceW: Math.max(1, dist(cheekL, cheekR)),
    faceH: Math.max(1, dist(top, chin)),
    angle: (headRoll(face, w, h) * Math.PI) / 180,
  };
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${SANS}`;
  while (s > 8 && ctx.measureText(text).width > maxWidth) {
    s *= 0.92;
    ctx.font = `${weight} ${s}px ${SANS}`;
  }
}

function leaf(ctx: CanvasRenderingContext2D, length: number, width: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width, length * 0.45, 0, length);
  ctx.quadraticCurveTo(-width, length * 0.45, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 83, 45, 0.45)';
  ctx.lineWidth = Math.max(1, width * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, length * 0.08);
  ctx.lineTo(0, length * 0.92);
  ctx.stroke();
}

function lotus(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#f9a8d4';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.48, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, r: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const inner = outer + Math.PI / 5;
    ctx.lineTo(Math.cos(outer) * r, Math.sin(outer) * r);
    ctx.lineTo(Math.cos(inner) * r * 0.42, Math.sin(inner) * r * 0.42);
  }
  ctx.closePath();
  ctx.fill();
}

function drawKrathong(ctx: CanvasRenderingContext2D, m: Metrics) {
  const r = m.faceW * 0.72;
  ctx.translate(m.center.x, m.center.y - m.faceH * 0.08);
  ctx.rotate(m.angle);
  for (let i = 0; i < 7; i++) {
    ctx.save();
    ctx.rotate((i / 7) * Math.PI * 2);
    ctx.translate(0, r * 0.15);
    leaf(ctx, r * 0.95, r * 0.28, i % 2 ? '#4d7c0f' : '#65a30d');
    ctx.restore();
  }
  lotus(ctx, r * 0.42);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-r * 0.06, -r * 0.72, r * 0.12, r * 0.38);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.78, r * 0.1, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLotus(ctx: CanvasRenderingContext2D, m: Metrics) {
  ctx.translate(m.top.x, m.top.y + m.faceH * 0.02);
  ctx.rotate(m.angle);
  lotus(ctx, m.faceW * 0.28);
}

function drawLantern(ctx: CanvasRenderingContext2D, m: Metrics) {
  const r = m.faceW * 0.34;
  const y = m.top.y - m.faceH * 0.42;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.moveTo(m.top.x, m.top.y);
  ctx.lineTo(m.top.x, y + r);
  ctx.stroke();
  ctx.translate(m.top.x, y);
  ctx.rotate(m.angle);
  const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
  glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.stroke();
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(-r * 0.8, -r * 0.12, r * 1.6, r * 0.1);
  ctx.fillRect(-r * 0.8, r * 0.55, r * 1.6, r * 0.1);
}

function drawSanta(ctx: CanvasRenderingContext2D, m: Metrics) {
  const w = m.faceW;
  ctx.translate(m.center.x, m.top.y);
  ctx.rotate(m.angle);
  ctx.fillStyle = '#e11d2e';
  ctx.beginPath();
  ctx.moveTo(-w * 0.55, w * 0.08);
  ctx.quadraticCurveTo(-w * 0.1, -w * 0.95, w * 0.15, -w * 1.15);
  ctx.quadraticCurveTo(w * 0.35, -w * 0.35, w * 0.58, w * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(0, w * 0.08, w * 0.62, w * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.2, -w * 1.12, w * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawAntlers(ctx: CanvasRenderingContext2D, m: Metrics) {
  const s = m.faceW;
  ctx.translate(m.center.x, m.top.y);
  ctx.rotate(m.angle);
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.22, s * 0.05);
    ctx.quadraticCurveTo(side * s * 0.55, -s * 0.35, side * s * 0.42, -s * 0.85);
    ctx.moveTo(side * s * 0.38, -s * 0.35);
    ctx.quadraticCurveTo(side * s * 0.7, -s * 0.4, side * s * 0.78, -s * 0.62);
    ctx.moveTo(side * s * 0.4, -s * 0.58);
    ctx.quadraticCurveTo(side * s * 0.62, -s * 0.7, side * s * 0.58, -s * 0.95);
    ctx.stroke();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, m: Metrics) {
  ctx.translate(m.top.x, m.top.y - m.faceH * 0.02);
  ctx.rotate(m.angle);
  star(ctx, m.faceW * 0.28, '#facc15');
}

const DRAW: Record<string, (ctx: CanvasRenderingContext2D, m: Metrics) => void> = {
  krathong: drawKrathong,
  lotus: drawLotus,
  lantern: drawLantern,
  santa: drawSanta,
  antlers: drawAntlers,
  star: drawStar,
};

/** Draws the chosen seasonal look on every detected face. Call while the selfie mirror transform is active. */
export function drawSeasonFaces(ctx: CanvasRenderingContext2D, faces: NormalizedLandmark[][], theme: SeasonTheme, look: string) {
  const { width: w, height: h } = ctx.canvas;
  if (w < 2 || h < 2) return;
  if (theme === 'halloween' && (HALLOWEEN_LOOKS as readonly string[]).includes(look)) {
    drawHalloweenFaces(ctx, faces, look as HalloweenLook);
    return;
  }
  const paint = DRAW[look];
  if (!paint) return;
  for (const face of faces) {
    if (face.length < 468) continue;
    ctx.save();
    paint(ctx, metrics(face, w, h));
    ctx.restore();
  }
}

function band(ctx: CanvasRenderingContext2D, color: string) {
  const { width: w, height: h } = ctx.canvas;
  const u = Math.min(w, h) / 100;
  const height = 16 * u;
  ctx.fillStyle = color;
  ctx.fillRect(0, h - height * 1.35, w, height * 1.35);
  return { w, h, u, height };
}

function caption(ctx: CanvasRenderingContext2D, title: string, subtitle: string, titleColor: string, subColor: string, w: number, h: number, u: number, height: number) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleColor;
  fitFont(ctx, title, w - 16 * u, 5.6 * u, '800');
  ctx.fillText(title, w / 2, h - height * 0.78);
  ctx.fillStyle = subColor;
  fitFont(ctx, subtitle, w - 16 * u, 2.8 * u, '600');
  ctx.fillText(subtitle, w / 2, h - height * 0.32);
}

/**
 * Seasonal photo frame in screen space. Resets the transform so the caption stays readable
 * when the camera image is mirrored. Pass timeMs = 0 to hold the decoration still.
 */
export function drawSeasonFrame(ctx: CanvasRenderingContext2D, theme: SeasonTheme, title: string, subtitle: string, timeMs = 0) {
  if (!SEASON_THEMES.includes(theme)) return;
  if (theme === 'halloween') {
    drawHalloweenFrame(ctx, title, subtitle, timeMs);
    return;
  }
  const { width: w, height: h } = ctx.canvas;
  if (w < 2 || h < 2) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  const u = Math.min(w, h) / 100;

  if (theme === 'loy') {
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2 * u;
    ctx.strokeRect(1.4 * u, 1.4 * u, w - 2.8 * u, h - 2.8 * u);
    ctx.save();
    ctx.translate(3 * u, 3 * u);
    leaf(ctx, 14 * u, 4 * u, '#65a30d');
    ctx.restore();
    ctx.save();
    ctx.translate(w - 3 * u, 3 * u);
    ctx.scale(-1, 1);
    leaf(ctx, 14 * u, 4 * u, '#4d7c0f');
    ctx.restore();
    const { height } = band(ctx, '#0f3d3e');
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(8 * u, h - height * 0.7, 2.2 * u, 0, Math.PI * 2);
    ctx.arc(w - 8 * u, h - height * 0.7, 2.2 * u, 0, Math.PI * 2);
    ctx.fill();
    caption(ctx, title, subtitle, '#fef3c7', '#fcd34d', w, h, u, height);
  } else {
    ctx.strokeStyle = '#e11d2e';
    ctx.lineWidth = 1.3 * u;
    ctx.strokeRect(1.2 * u, 1.2 * u, w - 2.4 * u, h - 2.4 * u);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 0.45 * u;
    ctx.strokeRect(2.8 * u, 2.8 * u, w - 5.6 * u, h - 5.6 * u);
    const flakes = 14;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < flakes; i++) {
      const drift = timeMs ? Math.sin(timeMs / 500 + i) * 4 * u : 0;
      const x = ((i + 0.5) / flakes) * w + drift;
      const y = (4 + (i % 3) * 3) * u;
      ctx.beginPath();
      ctx.arc(x, y, (i % 2 ? 1.1 : 0.7) * u, 0, Math.PI * 2);
      ctx.fill();
    }
    const { height } = band(ctx, '#7f1d1d');
    caption(ctx, title, subtitle, '#ffffff', '#fecaca', w, h, u, height);
  }
  ctx.restore();
}
