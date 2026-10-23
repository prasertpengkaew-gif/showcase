export interface FloorPoint {
  x: number;
  z: number;
  /** False when the camera looks at or above the horizon, so the spot is a guess straight ahead. */
  hit: boolean;
}

/**
 * Where a ray from the phone camera meets the floor. The camera sits at the origin, `height` metres above the floor,
 * and `dir` is the direction it looks (any length). The distance is kept between `min` and `max` metres so the
 * gate never lands under the user's feet or far out of reach.
 * shortcut: assumes a flat floor and a fixed phone height; true floor detection needs WebXR, which iPhones lack.
 */
export const floorHit = (dir: { x: number; y: number; z: number }, height: number, min = 1.5, max = 8): FloorPoint => {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const [dx, dy, dz] = [dir.x / len, dir.y / len, dir.z / len];
  const flat = Math.hypot(dx, dz) || 1;
  const hit = dy < -0.05;
  const reach = hit ? (height / -dy) * flat : 3;
  const d = Math.min(max, Math.max(min, reach));
  return { x: (dx / flat) * d, z: (dz / flat) * d, hit };
};

/** Turns an object at (x, z) so its front (+Z) faces the camera at the origin. Radians. */
export const yawFacingOrigin = (x: number, z: number) => Math.atan2(-x, -z);

/** The part of a video of size src that fills a box of size dst without stretching (object-fit: cover). */
export const coverRect = (srcW: number, srcH: number, dstW: number, dstH: number) => {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { sx: ((w - dstW) / 2) / scale, sy: ((h - dstH) / 2) / scale, sw: dstW / scale, sh: dstH / scale };
};
