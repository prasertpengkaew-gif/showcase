import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

export interface MindARAnchor {
  group: Group;
  targetIndex: number;
  onTargetFound: (() => void) | null;
  onTargetLost: (() => void) | null;
}

export interface MindARThreeOptions {
  container: HTMLElement;
  imageTargetSrc: string;
  maxTrack?: number;
  uiLoading?: 'yes' | 'no';
  uiScanning?: 'yes' | 'no';
  uiError?: 'yes' | 'no';
  filterMinCF?: number | null;
  filterBeta?: number | null;
}

export class MindARThree {
  constructor(options: MindARThreeOptions);
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  video?: HTMLVideoElement;
  start(): Promise<void>;
  stop(): void;
  addAnchor(targetIndex: number): MindARAnchor;
}
