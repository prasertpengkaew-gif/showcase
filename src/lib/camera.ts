export type CameraProblem = 'denied' | 'no-camera' | 'insecure' | 'error';

/** Maps getUserMedia failures to a problem we can explain to the visitor. */
export function cameraProblem(err: unknown): CameraProblem {
  if (!window.isSecureContext) return 'insecure';
  const name = (err as DOMException | undefined)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') return 'no-camera';
  return 'error';
}

/**
 * Asks for camera permission up front so failures can be explained clearly, then releases
 * the camera. Libraries that open their own stream afterwards reuse the granted permission.
 */
export async function requestCamera(facingMode: 'user' | 'environment'): Promise<CameraProblem | null> {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices?.getUserMedia) return 'no-camera';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    return null;
  } catch (err) {
    return cameraProblem(err);
  }
}
