/** Branded photo frames for the event photo booth, drawn on top of the camera image. */
export type FrameTheme = 'neon' | 'gold' | 'fest';

const SANS = 'Manrope, "Noto Sans Thai", Inter, sans-serif';
const SERIF = 'Georgia, "Noto Serif Thai", "Noto Sans Thai", serif';
const CONFETTI = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'];

/** Sets the largest font (up to `size`) at which `text` fits in `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, style: string, family: string) {
  let s = size;
  ctx.font = `${style} ${s}px ${family}`;
  while (s > 8 && ctx.measureText(text).width > maxWidth) {
    s *= 0.92;
    ctx.font = `${style} ${s}px ${family}`;
  }
}

/** Small deterministic PRNG so confetti stays put between frames. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function confetti(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, u: number, seed: number) {
  const rnd = seeded(seed);
  const count = Math.round(w / (u * 2.2));
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(x + rnd() * w, y + rnd() * h);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = CONFETTI[i % CONFETTI.length];
    if (rnd() > 0.5) ctx.fillRect(-u * 0.9, -u * 0.35, u * 1.8, u * 0.7);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, u * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawEventFrame(ctx: CanvasRenderingContext2D, theme: FrameTheme, title: string, subtitle: string) {
  const { width: w, height: h } = ctx.canvas;
  const u = Math.min(w, h) / 100;
  const band = 18 * u;
  const textW = w - 16 * u;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (theme === 'neon') {
    const fade = ctx.createLinearGradient(0, h - band - 10 * u, 0, h);
    fade.addColorStop(0, 'rgba(11,18,32,0)');
    fade.addColorStop(0.45, 'rgba(11,18,32,0.88)');
    fade.addColorStop(1, 'rgba(11,18,32,0.96)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, h - band - 10 * u, w, band + 10 * u);
    const line = ctx.createLinearGradient(0, 0, w, h);
    line.addColorStop(0, '#2563EB');
    line.addColorStop(1, '#22d3ee');
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.4 * u;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 3 * u;
    ctx.strokeRect(2.5 * u, 2.5 * u, w - 5 * u, h - 5 * u);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, title, textW, 7 * u, '800', SANS);
    ctx.fillText(title, w / 2, h - band * 0.7);
    ctx.fillStyle = '#93c5fd';
    fitFont(ctx, subtitle, textW, 3.4 * u, '600', SANS);
    ctx.fillText(subtitle, w / 2, h - band * 0.35);
  } else if (theme === 'gold') {
    const edge = 3.5 * u;
    ctx.fillStyle = '#f8f3e7';
    ctx.fillRect(0, 0, w, edge);
    ctx.fillRect(0, 0, edge, h);
    ctx.fillRect(w - edge, 0, edge, h);
    ctx.fillRect(0, h - band, w, band);
    ctx.strokeStyle = '#b8893b';
    ctx.lineWidth = 0.45 * u;
    ctx.strokeRect(edge + 1.2 * u, edge + 1.2 * u, w - 2 * edge - 2.4 * u, h - band - edge - 2.4 * u);
    ctx.fillStyle = '#3b2f1e';
    fitFont(ctx, title, textW, 6.6 * u, 'italic 600', SERIF);
    ctx.fillText(title, w / 2, h - band * 0.6);
    ctx.fillStyle = '#8a6d3b';
    fitFont(ctx, subtitle.toUpperCase(), textW, 3 * u, '600', SANS);
    ctx.fillText(subtitle.toUpperCase(), w / 2, h - band * 0.22);
  } else {
    confetti(ctx, 0, 0, w, 9 * u, u, 7);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - band, w, band);
    confetti(ctx, 0, h - band - 4 * u, w, 4 * u, u, 31);
    ctx.fillStyle = '#ffffff';
    fitFont(ctx, title, textW, 7 * u, '800', SANS);
    ctx.fillText(title, w / 2, h - band * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    fitFont(ctx, subtitle, textW, 3.4 * u, '700', SANS);
    ctx.fillText(subtitle, w / 2, h - band * 0.22);
  }
  ctx.restore();
}

/** A customer's own frame: a transparent PNG laid over the photo, scaled to cover it. */
export function drawImageFrame(ctx: CanvasRenderingContext2D, frame: ImageBitmap) {
  const { width: w, height: h } = ctx.canvas;
  const k = Math.max(w / frame.width, h / frame.height);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(frame, (w - frame.width * k) / 2, (h - frame.height * k) / 2, frame.width * k, frame.height * k);
  ctx.restore();
}
