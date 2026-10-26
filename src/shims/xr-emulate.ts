/**
 * Stand-in for `@pmndrs/xr/dist/emulate.js`.
 * Real WebXR sessions do not import this module when `emulate` is false.
 */
export function emulate(): never {
  throw new Error('The WebXR emulator is not included in this build.');
}
