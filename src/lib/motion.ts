export interface Cell {
  x: number;
  y: number;
  strength: number;
}

/**
 * Compares two grey frames (one byte per pixel) and returns the grid cells where something moved.
 * `strength` is the average change in the cell, 0–255; cells below `threshold` are left out.
 */
export const movingCells = (prev: Uint8ClampedArray, next: Uint8ClampedArray, width: number, height: number, cell = 8, threshold = 24): Cell[] => {
  const out: Cell[] = [];
  for (let cy = 0; cy + cell <= height; cy += cell) {
    for (let cx = 0; cx + cell <= width; cx += cell) {
      let sum = 0;
      for (let y = cy; y < cy + cell; y++) for (let x = cx; x < cx + cell; x++) sum += Math.abs(next[y * width + x] - prev[y * width + x]);
      const strength = sum / (cell * cell);
      if (strength >= threshold) out.push({ x: (cx + cell / 2) / width, y: (cy + cell / 2) / height, strength });
    }
  }
  return out;
};

/** RGBA pixels to one grey byte per pixel. */
export const toGrey = (rgba: Uint8ClampedArray): Uint8ClampedArray => {
  const grey = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0; i < grey.length; i++) grey[i] = (rgba[i * 4] * 77 + rgba[i * 4 + 1] * 150 + rgba[i * 4 + 2] * 29) >> 8;
  return grey;
};
