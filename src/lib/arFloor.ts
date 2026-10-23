export interface FloorPoint {
  x: number;
  z: number;
  /** False when the camera looks at or above the horizon, so the spot is a guess straight ahead. */
  hit: boolean;
}

/**
 * Where a ray from the camera meets the floor plane y = `floorY`. `from` is the camera position and `dir` the direction it
 * looks (any length). The horizontal distance from the camera is kept between `min` and `max` metres so the gate never
 * lands under the user's feet or far out of reach; looking at or above the horizon gives a guess `3` m straight ahead.
 */
export const floorHitFrom = (from: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, floorY = 0, min = 1.5, max = 8): FloorPoint => {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const [dx, dy, dz] = [dir.x / len, dir.y / len, dir.z / len];
  const flat = Math.hypot(dx, dz) || 1;
  const hit = dy < -0.05 && from.y > floorY;
  const reach = hit ? ((from.y - floorY) / -dy) * flat : 3;
  const d = Math.min(max, Math.max(min, reach));
  return { x: from.x + (dx / flat) * d, z: from.z + (dz / flat) * d, hit };
};

/**
 * Same, for the sensor-only mode where the camera sits at the origin, `height` metres above the floor.
 * shortcut: assumes a flat floor and a fixed phone height; true tracking needs the 8th Wall engine or the system AR viewer.
 */
export const floorHit = (dir: { x: number; y: number; z: number }, height: number, min = 1.5, max = 8): FloorPoint =>
  floorHitFrom({ x: 0, y: height, z: 0 }, dir, 0, min, max);

/** Turns an object at (x, z) so its front (+Z) faces a viewer at (fromX, fromZ), the origin by default. Radians. */
export const yawFacingOrigin = (x: number, z: number, fromX = 0, fromZ = 0) => Math.atan2(fromX - x, fromZ - z);

/** The part of a video of size src that fills a box of size dst without stretching (object-fit: cover). */
export const coverRect = (srcW: number, srcH: number, dstW: number, dstH: number) => {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { sx: ((w - dstW) / 2) / scale, sy: ((h - dstH) / 2) / scale, sw: dstW / scale, sh: dstH / scale };
};
