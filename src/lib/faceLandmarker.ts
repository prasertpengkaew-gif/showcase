import type { FaceLandmarker } from '@mediapipe/tasks-vision';

const MODEL_URL = '/models/face/face_landmarker.task';
const WASM_BASE = '/mediapipe';

/** Loads the face model (GPU, falling back to CPU). The MediaPipe runtime is only fetched when this is called. */
export async function createFaceLandmarker(mode: 'VIDEO' | 'IMAGE', numFaces = 4): Promise<FaceLandmarker> {
  const vision = await import('@mediapipe/tasks-vision');
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
  const create = (delegate: 'GPU' | 'CPU') =>
    vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: mode,
      numFaces,
      outputFaceBlendshapes: true,
    });
  return create('GPU').catch(() => create('CPU'));
}
