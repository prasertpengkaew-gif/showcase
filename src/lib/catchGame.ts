/** "Catch the stars": items fall from the top, the player's hands (or pointer) catch them. */
export type ItemKind = 'star' | 'gem' | 'bomb';

interface Item {
  x: number;
  y: number;
  vy: number;
  r: number;
  kind: ItemKind;
  spin: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
}

export interface Hand {
  x: number;
  y: number;
}

export const POINTS: Record<ItemKind, number> = { star: 10, gem: 25, bomb: -20 };
const COLORS: Record<ItemKind, string> = { star: '#facc15', gem: '#38bdf8', bomb: '#f43f5e' };

export class CatchGame {
  score = 0;
  caught = 0;
  timeLeft: number;
  private items: Item[] = [];
  private popups: Popup[] = [];
  private spawnIn = 0;
  private elapsed = 0;

  constructor(
    private w: number,
    private h: number,
    readonly duration = 30,
  ) {
    this.timeLeft = duration;
  }

  get over() {
    return this.timeLeft <= 0;
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  /** Hand radius in pixels, shared by the hit test and the drawn catcher. */
  get handRadius() {
    return Math.min(this.w, this.h) * 0.075;
  }

  private spawn() {
    const roll = Math.random();
    const kind: ItemKind = roll < 0.12 ? 'gem' : roll < 0.3 ? 'bomb' : 'star';
    const r = Math.min(this.w, this.h) * (kind === 'gem' ? 0.04 : 0.048);
    // Speeds up as the round goes on.
    const pace = 1 + this.elapsed / this.duration;
    this.items.push({
      x: r + Math.random() * (this.w - 2 * r),
      y: -r,
      vy: this.h * (0.22 + Math.random() * 0.12) * pace,
      r,
      kind,
      spin: Math.random() * Math.PI,
    });
  }

  step(dt: number, hands: Hand[]) {
    if (this.over) return;
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    this.timeLeft = Math.max(0, this.duration - this.elapsed);
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawn();
      this.spawnIn = 0.75 - 0.4 * (this.elapsed / this.duration);
    }
    const hr = this.handRadius;
    this.items = this.items.filter((it) => {
      it.y += it.vy * dt;
      it.spin += dt * 2;
      const hit = hands.some((hd) => Math.hypot(hd.x - it.x, hd.y - it.y) < hr + it.r);
      if (hit) {
        const pts = POINTS[it.kind];
        this.score = Math.max(0, this.score + pts);
        if (pts > 0) this.caught++;
        this.popups.push({ x: it.x, y: it.y, text: pts > 0 ? `+${pts}` : `${pts}`, color: COLORS[it.kind], age: 0 });
        return false;
      }
      return it.y - it.r < this.h;
    });
    this.popups = this.popups.filter((p) => (p.age += dt) < 0.8);
  }

  draw(ctx: CanvasRenderingContext2D, hands: Hand[]) {
    const u = Math.min(this.w, this.h);
    for (const it of this.items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.kind === 'bomb' ? 0 : it.spin);
      ctx.fillStyle = COLORS[it.kind];
      ctx.strokeStyle = 'rgba(11,18,32,0.75)';
      ctx.lineWidth = u * 0.006;
      ctx.beginPath();
      if (it.kind === 'star') {
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const rr = i % 2 ? it.r * 0.45 : it.r;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
      } else if (it.kind === 'gem') {
        ctx.moveTo(0, -it.r);
        ctx.lineTo(it.r * 0.85, -it.r * 0.2);
        ctx.lineTo(0, it.r);
        ctx.lineTo(-it.r * 0.85, -it.r * 0.2);
      } else {
        ctx.arc(0, 0, it.r * 0.85, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (it.kind === 'bomb') {
        // Fuse and an "×" so the bad item is not told apart by colour alone.
        ctx.strokeStyle = '#0B1220';
        ctx.lineWidth = u * 0.008;
        ctx.beginPath();
        ctx.moveTo(-it.r * 0.35, -it.r * 0.35);
        ctx.lineTo(it.r * 0.35, it.r * 0.35);
        ctx.moveTo(it.r * 0.35, -it.r * 0.35);
        ctx.lineTo(-it.r * 0.35, it.r * 0.35);
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(it.r * 0.55, -it.r * 0.95, it.r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    for (const hd of hands) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(hd.x, hd.y, this.handRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37,99,235,0.28)';
      ctx.fill();
      ctx.lineWidth = u * 0.008;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of this.popups) {
      ctx.globalAlpha = 1 - p.age / 0.8;
      ctx.font = `800 ${u * 0.06}px Manrope, sans-serif`;
      ctx.lineWidth = u * 0.01;
      ctx.strokeStyle = '#0B1220';
      ctx.strokeText(p.text, p.x, p.y - p.age * u * 0.15);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - p.age * u * 0.15);
    }
    ctx.globalAlpha = 1;
  }
}
