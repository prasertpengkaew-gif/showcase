import { markerBits } from './markers';

const INK = '#0B1220';
const SANS = 'Manrope, "Noto Sans Thai", Inter, sans-serif';

/**
 * Draws marker `id` into a square area: a one-cell white quiet zone, a black frame and the code
 * cells (white = 1). `px` is the whole square including the quiet zone.
 */
export function drawMarker(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, px: number) {
  const { bits, size } = markerBits(id);
  const cell = px / (size + 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, px, px);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + cell, y + cell, cell * (size + 2), cell * (size + 2));
  ctx.fillStyle = '#fff';
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (bits[r * size + c] === '1') ctx.fillRect(x + (c + 2) * cell - 0.4, y + (r + 2) * cell - 0.4, cell + 0.8, cell + 0.8);
}

export interface SheetCard {
  id: number;
  title: string;
  subtitle?: string;
  /** Accent colour for the card edge. */
  color?: string;
}

export interface SheetOptions {
  heading: string;
  note?: string;
  cards: SheetCard[];
  columns: number;
  /** Marker square size as a share of the card width. */
  markerShare?: number;
}

/** An A4-portrait sheet (at about 150 dpi) with a grid of marker cards, ready to print. */
export function buildSheet({ heading, note, cards, columns, markerShare = 0.78 }: SheetOptions): HTMLCanvasElement {
  const W = 1240;
  const H = 1754;
  const margin = 80;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.font = `800 52px ${SANS}`;
  ctx.fillText(heading, margin, margin + 40);
  if (note) {
    ctx.fillStyle = '#475569';
    ctx.font = `500 26px ${SANS}`;
    wrap(ctx, note, margin, margin + 84, W - 2 * margin, 36);
  }
  const top = margin + 190;
  const gap = 40;
  const rows = Math.ceil(cards.length / columns);
  const cw = (W - 2 * margin - gap * (columns - 1)) / columns;
  const ch = Math.min(cw * 1.25, (H - top - margin - gap * (rows - 1)) / rows);
  cards.forEach((card, i) => {
    const x = margin + (i % columns) * (cw + gap);
    const y = top + Math.floor(i / columns) * (ch + gap);
    ctx.strokeStyle = card.color ?? '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, 24);
    ctx.stroke();
    const mp = Math.min(cw * markerShare, ch - 110);
    drawMarker(ctx, card.id, x + (cw - mp) / 2, y + 16, mp);
    ctx.textAlign = 'center';
    ctx.fillStyle = INK;
    ctx.font = `800 ${Math.round(Math.min(46, cw / 6))}px ${SANS}`;
    ctx.fillText(card.title, x + cw / 2, y + 16 + mp + 46);
    if (card.subtitle) {
      ctx.fillStyle = '#64748b';
      ctx.font = `500 ${Math.round(Math.min(24, cw / 12))}px ${SANS}`;
      ctx.fillText(card.subtitle, x + cw / 2, y + 16 + mp + 78);
    }
    ctx.textAlign = 'left';
  });
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText('TheNerdStudio · AR markers (ArUco MIP 36h12)', margin, H - margin / 2);
  return canvas;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  // Thai has no spaces between words, so fall back to splitting by character when a "word" is too long.
  const words = text.includes(' ') ? text.split(' ') : Array.from(text);
  const sep = text.includes(' ') ? ' ' : '';
  let line = '';
  for (const w of words) {
    const test = line ? line + sep + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lineHeight;
    } else line = test;
  }
  ctx.fillText(line, x, y);
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

/** Net of a paper cube (A4 landscape, about 150 dpi): a cross of six marker faces with glue tabs. */
export function buildCubeSheet(opts: {
  heading: string;
  note: string;
  glue: string;
  /** Marker ids by net position. */
  ids: { front: number; right: number; back: number; left: number; top: number; bottom: number };
}): HTMLCanvasElement {
  const W = 1754;
  const H = 1240;
  const s = 320;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 44px ${SANS}`;
  ctx.fillText(opts.heading, 70, 80);
  ctx.fillStyle = '#475569';
  ctx.font = `500 24px ${SANS}`;
  wrap(ctx, opts.note, 70, 120, W - 140, 32);

  const ox = (W - 4 * s) / 2;
  const oy = 215;
  const at = (col: number, row: number) => ({ x: ox + col * s, y: oy + row * s });
  const faces = [
    { id: opts.ids.top, ...at(1, 0) },
    { id: opts.ids.left, ...at(0, 1) },
    { id: opts.ids.front, ...at(1, 1) },
    { id: opts.ids.right, ...at(2, 1) },
    { id: opts.ids.back, ...at(3, 1) },
    { id: opts.ids.bottom, ...at(1, 2) },
  ];
  // Glue tabs (trapezoids) on the edges that have no neighbour.
  const tab = 36;
  const tabs: [number, number, number, number, number, number, number, number][] = [];
  const t = at(1, 0);
  const b = at(1, 2);
  const bk = at(3, 1);
  tabs.push([t.x, t.y, t.x + s, t.y, t.x + s - tab, t.y - tab, t.x + tab, t.y - tab]); // top, upper edge
  tabs.push([t.x, t.y, t.x, t.y + s, t.x - tab, t.y + s - tab, t.x - tab, t.y + tab]); // top, left edge
  tabs.push([t.x + s, t.y, t.x + s, t.y + s, t.x + s + tab, t.y + s - tab, t.x + s + tab, t.y + tab]); // top, right edge
  tabs.push([b.x, b.y + s, b.x + s, b.y + s, b.x + s - tab, b.y + s + tab, b.x + tab, b.y + s + tab]); // bottom, lower edge
  tabs.push([b.x, b.y, b.x, b.y + s, b.x - tab, b.y + s - tab, b.x - tab, b.y + tab]); // bottom, left edge
  tabs.push([b.x + s, b.y, b.x + s, b.y + s, b.x + s + tab, b.y + s - tab, b.x + s + tab, b.y + tab]); // bottom, right edge
  tabs.push([bk.x + s, bk.y, bk.x + s, bk.y + s, bk.x + s + tab, bk.y + s - tab, bk.x + s + tab, bk.y + tab]); // back, right edge
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (const q of tabs) {
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(q[2], q[3]);
    ctx.lineTo(q[4], q[5]);
    ctx.lineTo(q[6], q[7]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (const f of faces) drawMarker(ctx, f.id, f.x, f.y, s);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 2;
  for (const f of faces) ctx.strokeRect(f.x, f.y, s, s);
  ctx.setLineDash([]);
  ctx.fillStyle = '#64748b';
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText(opts.glue, 70, 165);
  ctx.font = `500 22px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText('TheNerdStudio · AR cube', W - 70, H - 40);
  return canvas;
}
