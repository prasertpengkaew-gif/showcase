import { useEffect, useRef } from 'react';
import { drawMarker } from '../lib/markerSheet';

/** A marker drawn on a canvas, for showing on the page (to point a phone at) or for printing. */
export function MarkerImage({ id, label, size = 160, className = '' }: { id: number; label: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const px = Math.round(size * (window.devicePixelRatio || 1));
    canvas.width = px;
    canvas.height = px;
    drawMarker(canvas.getContext('2d')!, id, 0, 0, px);
  }, [id, size]);
  return <canvas ref={ref} role="img" aria-label={label} style={{ width: size, height: size }} className={`rounded-lg border border-line ${className}`} />;
}
