import { useCallback, useEffect, useRef, useState } from 'react';
import { DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { MarkerTracker, type TrackedMarker } from '../lib/markers';
import { cameraProblem, type CameraProblem } from '../lib/camera';

export type MarkerStatus = 'idle' | 'starting-camera' | 'loading' | 'running' | CameraProblem;

export interface MarkerScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
}

export interface MarkerFrame {
  markers: TrackedMarker[];
  width: number;
  height: number;
  /** Seconds since the previous frame. */
  dt: number;
  /** Seconds since the camera started. */
  time: number;
}

export interface MarkerHandlers {
  /** Builds the 3D content once per camera start; may return a cleanup function. */
  setup?: (s: MarkerScene) => void | (() => void);
  /** Moves the 3D content to follow the markers. Runs before the scene is drawn. */
  frame?: (f: MarkerFrame, s: MarkerScene) => void;
  /** Draws 2D graphics on top of the video and the 3D scene (labels, outlines). */
  overlay?: (ctx: CanvasRenderingContext2D, f: MarkerFrame) => void;
  /** Only these marker ids are tracked; others are ignored. */
  only?: ReadonlySet<number>;
}

/**
 * Camera + marker tracking + 3D overlay in one canvas. The video, the three.js scene and the 2D
 * overlay are composited into `canvasRef`, so full screen and "save photo" just work.
 */
export function useMarkerCamera(handlers: MarkerHandlers) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [status, setStatus] = useState<MarkerStatus>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [ids, setIds] = useState<number[]>([]);

  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  const stop = useCallback(() => {
    teardown();
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setIds([]);
    setStatus('idle');
  }, [teardown]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    teardown();
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setStatus('loading');
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      video.srcObject = stream;
      await video.play();

      const renderer = new WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);
      const scene = new Scene();
      scene.add(new HemisphereLight(0xffffff, 0x8899aa, 2.2));
      const sun = new DirectionalLight(0xffffff, 2);
      sun.position.set(0.5, 1, 1);
      scene.add(sun);
      const camera = new PerspectiveCamera(60, 16 / 9, 0.01, 500);
      const s: MarkerScene = { scene, camera, renderer };
      const userCleanup = handlersRef.current.setup?.(s);
      const tracker = new MarkerTracker();
      const ctx = canvas.getContext('2d')!;

      let lastTime = -1;
      let last = performance.now();
      const t0 = last;
      let lastIds = '';
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (video.readyState < 2 || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        const now = performance.now();
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          // Matches the focal length assumed by markerPose().
          camera.fov = (2 * Math.atan(h / (2 * 0.85 * Math.max(w, h))) * 180) / Math.PI;
          camera.updateProjectionMatrix();
        }
        const markers = tracker.update(video, handlersRef.current.only);
        const frame: MarkerFrame = { markers, width: w, height: h, dt, time: (now - t0) / 1000 };
        ctx.drawImage(video, 0, 0, w, h);
        handlersRef.current.frame?.(frame, s);
        renderer.render(scene, camera);
        ctx.drawImage(renderer.domElement, 0, 0, w, h);
        handlersRef.current.overlay?.(ctx, frame);

        const seen = markers
          .filter((m) => m.missed === 0)
          .map((m) => m.id)
          .sort((a, b) => a - b);
        const key = seen.join(',');
        if (key !== lastIds) {
          lastIds = key;
          setIds(seen);
        }
      };
      cleanupRef.current = () => {
        userCleanup?.();
        renderer.dispose();
      };
      setStatus('running');
      tick();
    } catch (err) {
      teardown();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Marker camera failed to start', err);
      setStatus(problem);
    }
  }, [teardown]);

  const capture = useCallback((filename: string) => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }, []);

  return { videoRef, canvasRef, status, ids, start, stop, capture, running: status === 'running' };
}
