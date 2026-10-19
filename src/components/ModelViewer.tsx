import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';
import type { ModelAsset } from '../types/project';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { useInView } from '../hooks/useInView';
import { ARSupportNotice } from './ARSupportNotice';
import { AlertIcon, PauseIcon, PlayIcon, RotateIcon, ScanIcon } from './Icons';

export type ViewerStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type ARStatus = 'not-presenting' | 'session-started' | 'object-placed' | 'failed';

export interface ModelViewerProps {
  model: ModelAsset;
  /** Material variant name from model.variants. */
  variant?: string;
  /** Animation clip from model.animations. Plays on loop. */
  animation?: string;
  /** Show the AR button and compatibility notice. */
  ar?: boolean;
  /** Show rotate / zoom / reset buttons. */
  controls?: boolean;
  /** Slowly orbit when idle. Always disabled for reduced-motion users. */
  autoRotate?: boolean;
  /** Wait until the viewer is near the viewport before loading the 3D library and model. */
  lazy?: boolean;
  /** Classes for the 3D viewport itself — set its height here. */
  className?: string;
  /** Extra controls rendered between the toolbar and the AR notice. */
  children?: ReactNode;
  /** Accessible label for the viewer region. */
  label?: string;
  onStatusChange?: (status: ViewerStatus) => void;
}

let moduleLoad: Promise<unknown> | null = null;
const loadModelViewer = () => (moduleLoad ??= import('@google/model-viewer'));

const AR_MESSAGES: Record<ARStatus, string> = {
  'not-presenting': '',
  'session-started': 'AR started — move your phone slowly to find a surface.',
  'object-placed': 'Placed. Pinch to resize, drag to move, two fingers to rotate.',
  failed: 'AR could not start on this device. You can keep exploring in 3D.',
};

export function ModelViewer({
  model,
  variant,
  animation,
  ar = true,
  controls = true,
  autoRotate = true,
  lazy = true,
  className = 'h-[420px]',
  children,
  label,
  onStatusChange,
}: ModelViewerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const caps = useDeviceCapabilities();
  const { ref: containerRef, inView } = useInView<HTMLDivElement>('300px');
  const viewerRef = useRef<ModelViewerElement | null>(null);

  const [moduleReady, setModuleReady] = useState(false);
  const [moduleError, setModuleError] = useState(false);
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [canAR, setCanAR] = useState<boolean | null>(null);
  const [arStatus, setARStatus] = useState<ARStatus>('not-presenting');
  const [rotating, setRotating] = useState(autoRotate && !reducedMotion);

  const shouldLoad = !lazy || inView;

  useEffect(() => setRotating(autoRotate && !reducedMotion), [autoRotate, reducedMotion]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    loadModelViewer()
      .then(() => !cancelled && setModuleReady(true))
      .catch((err) => {
        console.error('Failed to load model-viewer', err);
        if (!cancelled) setModuleError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  const updateStatus = useCallback(
    (s: ViewerStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange],
  );

  // Reset state when the model changes.
  useEffect(() => {
    setProgress(0);
    setCanAR(null);
    setARStatus('not-presenting');
  }, [model.src, attempt]);

  // Wire custom element events.
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !moduleReady) return;
    updateStatus('loading');

    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ totalProgress: number }>).detail.totalProgress;
      setProgress(p);
    };
    const onLoad = () => {
      updateStatus('loaded');
      setCanAR(el.canActivateAR);
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: string }>).detail;
      // Only treat model load failures as fatal; WebXR failures surface through ar-status.
      if (!detail?.type || detail.type === 'loadfailure') updateStatus('error');
    };
    const onARStatus = (e: Event) => {
      setARStatus((e as CustomEvent<{ status: ARStatus }>).detail.status);
    };

    el.addEventListener('progress', onProgress);
    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);
    el.addEventListener('ar-status', onARStatus);
    if (el.loaded) onLoad();
    return () => {
      el.removeEventListener('progress', onProgress);
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      el.removeEventListener('ar-status', onARStatus);
    };
  }, [moduleReady, model.src, attempt, updateStatus]);

  // Restart the selected animation when it changes.
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || status !== 'loaded' || !animation) return;
    if (reducedMotion) {
      el.pause();
    } else {
      el.play({ repetitions: Infinity, pingpong: false });
    }
  }, [animation, status, reducedMotion]);

  const orbitBy = (deltaDeg: number) => {
    const el = viewerRef.current;
    if (!el) return;
    const orbit = el.getCameraOrbit();
    el.cameraOrbit = `${orbit.theta + (deltaDeg * Math.PI) / 180}rad ${orbit.phi}rad ${orbit.radius}m`;
  };
  const zoomBy = (steps: number) => viewerRef.current?.zoom(steps);
  const resetView = () => {
    const el = viewerRef.current;
    if (!el) return;
    el.cameraOrbit = model.cameraOrbit ?? '0deg 75deg auto';
    el.cameraTarget = model.cameraTarget ?? 'auto auto auto';
    el.fieldOfView = 'auto';
  };

  const loaded = status === 'loaded';
  const arMessage = AR_MESSAGES[arStatus];

  const toolbarButton =
    'grid h-10 w-10 place-items-center rounded-full text-slate-700 transition-colors hover:bg-slate-900/5 hover:text-ink disabled:opacity-40';

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={containerRef}
        role="region"
        aria-label={label ?? `3D viewer: ${model.name}`}
        className={`relative min-h-[320px] overflow-hidden rounded-2xl ${className} border border-line bg-[linear-gradient(180deg,#eef2f7_0%,#d9e0ea_100%)]`}
      >
        {moduleError ? (
          <ViewerError message="The 3D viewer could not be loaded. Check your connection and reload the page." />
        ) : !caps.webgl ? (
          <>
            <img src={model.poster} alt={model.alt} className="absolute inset-0 h-full w-full object-cover" />
            <ViewerError message="Your browser has WebGL turned off or unsupported, so this is a still image of the model." />
          </>
        ) : moduleReady ? (
          <model-viewer
            key={`${model.src}-${attempt}`}
            ref={(el: HTMLElement | null) => {
              viewerRef.current = el as ModelViewerElement | null;
            }}
            src={model.src}
            {...(model.iosSrc ? { 'ios-src': model.iosSrc } : {})}
            poster={model.poster}
            alt={model.alt}
            camera-controls=""
            touch-action="pan-y"
            camera-orbit={model.cameraOrbit}
            {...(model.cameraTarget ? { 'camera-target': model.cameraTarget } : {})}
            shadow-intensity="1"
            shadow-softness="0.9"
            exposure="1"
            environment-image="neutral"
            interaction-prompt={reducedMotion ? 'none' : 'auto'}
            interpolation-decay={reducedMotion ? 1 : 80}
            {...(rotating ? { 'auto-rotate': '', 'auto-rotate-delay': 1500, 'rotation-per-second': '18deg' } : {})}
            {...(variant ? { 'variant-name': variant } : {})}
            {...(animation ? { 'animation-name': animation, 'animation-crossfade-duration': 400 } : {})}
            {...(animation && !reducedMotion ? { autoplay: '' } : {})}
            {...(ar
              ? { ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-scale': 'auto', 'ar-placement': 'floor' }
              : {})}
          >
            {ar && (
              <button
                slot="ar-button"
                type="button"
                className="absolute right-4 bottom-4 inline-flex h-11 items-center gap-2 rounded-full bg-electric-600 px-5 text-sm font-semibold text-white shadow-lg shadow-navy-900/20 hover:bg-electric-700"
              >
                <ScanIcon /> View in your space
              </button>
            )}
            <div slot="progress-bar" />
          </model-viewer>
        ) : (
          <img
            src={model.poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        )}

        {/* Loading overlay */}
        {caps.webgl && !moduleError && status !== 'loaded' && status !== 'error' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4" role="status" aria-live="polite">
            <div className="mx-auto max-w-xs rounded-full bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Loading {model.name}…</span>
                <span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-electric-600 transition-[width] duration-200"
                  style={{ width: `${Math.max(4, progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <ViewerError
            message={`We couldn't load the ${model.name} model. The file may be missing or your connection dropped.`}
            onRetry={() => setAttempt((a) => a + 1)}
          />
        )}

        {arMessage && (
          <p
            role="status"
            className="absolute inset-x-4 top-4 rounded-xl bg-navy-900/90 px-4 py-3 text-sm text-white backdrop-blur"
          >
            {arMessage}
          </p>
        )}
      </div>

      {controls && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="toolbar"
            aria-label="Viewer controls"
            className="flex items-center gap-0.5 rounded-full border border-line bg-white p-1"
          >
            <button type="button" className={toolbarButton} onClick={() => orbitBy(-30)} disabled={!loaded} aria-label="Rotate left">
              <RotateIcon className="-scale-x-100" />
            </button>
            <button type="button" className={toolbarButton} onClick={() => orbitBy(30)} disabled={!loaded} aria-label="Rotate right">
              <RotateIcon />
            </button>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <button type="button" className={`${toolbarButton} text-lg font-semibold`} onClick={() => zoomBy(3)} disabled={!loaded} aria-label="Zoom in">
              +
            </button>
            <button type="button" className={`${toolbarButton} text-lg font-semibold`} onClick={() => zoomBy(-3)} disabled={!loaded} aria-label="Zoom out">
              −
            </button>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <button
              type="button"
              className={toolbarButton}
              onClick={() => setRotating((r) => !r)}
              disabled={!loaded || reducedMotion}
              aria-pressed={rotating}
              aria-label={rotating ? 'Stop auto-rotate' : 'Start auto-rotate'}
              title={reducedMotion ? 'Auto-rotate is off because your device prefers reduced motion' : undefined}
            >
              {rotating ? <PauseIcon width={18} height={18} /> : <PlayIcon width={18} height={18} />}
            </button>
            <button type="button" className={`${toolbarButton} w-auto px-3 text-sm font-medium`} onClick={resetView} disabled={!loaded}>
              Reset
            </button>
          </div>
          <p className="text-sm text-muted">
            Drag to rotate · scroll or pinch to zoom · <span className="whitespace-nowrap">{model.dimensions}</span>
          </p>
        </div>
      )}

      {children}

      {ar && <ARSupportNotice caps={caps} canActivateAR={canAR} />}
    </div>
  );
}

function ViewerError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-white/70 p-6 backdrop-blur-sm" role="alert">
      <div className="max-w-sm text-center">
        <AlertIcon className="mx-auto text-amber-600" width={28} height={28} />
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex h-10 items-center rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
