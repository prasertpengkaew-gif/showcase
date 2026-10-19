/** Faces of the AR cube. Each face's marker frame is given by its axes in the cube frame. */
export type CubeFace = 'front' | 'right' | 'back' | 'left' | 'top' | 'bottom';

export interface CubeFaceDef {
  face: CubeFace;
  id: number;
  /** Marker x, y and z (out of the face) axes expressed in the cube frame (x right, y up, z toward the viewer). */
  axes: { x: [number, number, number]; y: [number, number, number]; z: [number, number, number] };
}

// Axes follow from folding the cross-shaped net printed by the sheet: front in the middle,
// left / right / back to its sides, top above and bottom below.
export const CUBE_FACES: CubeFaceDef[] = [
  { face: 'front', id: 20, axes: { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] } },
  { face: 'right', id: 21, axes: { x: [0, 0, -1], y: [0, 1, 0], z: [1, 0, 0] } },
  { face: 'back', id: 22, axes: { x: [-1, 0, 0], y: [0, 1, 0], z: [0, 0, -1] } },
  { face: 'left', id: 23, axes: { x: [0, 0, 1], y: [0, 1, 0], z: [-1, 0, 0] } },
  { face: 'top', id: 24, axes: { x: [1, 0, 0], y: [0, 0, -1], z: [0, 1, 0] } },
  { face: 'bottom', id: 25, axes: { x: [1, 0, 0], y: [0, 0, 1], z: [0, -1, 0] } },
];

/** Cube edge in marker-edge units: the marker plus its one-cell white border (10 cells vs. 8). */
export const CUBE_EDGE = 10 / 8;

export const CUBE_MODELS = ['sneaker', 'robot', 'fox', 'car', 'chair'] as const;
export type CubeModel = (typeof CUBE_MODELS)[number];
