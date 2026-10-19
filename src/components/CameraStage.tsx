import { useEffect, useRef, type ReactNode } from 'react';
import { useFullscreen } from '../hooks/useFullscreen';
import { CameraIcon, ExpandIcon, ShrinkIcon } from './Icons';
import { useT } from '../i18n';

interface CameraStageProps {
  label: string;
  /** Stage content (video canvas, status messages). Receives whether the stage is full screen. */
  children: (isFull: boolean) => ReactNode;
  /** Extra controls shown along the bottom only in full screen (effect chips etc.). */
  fullscreenControls?: ReactNode;
  /** Shutter button in full screen; omitted when nothing can be captured yet. */
  onCapture?: () => void;
  captureLabel: string;
  /** Full screen is offered only once there is something to show (camera running or a photo). */
  available: boolean;
}

/** The dark camera viewport used by the camera demos, with a full-screen mode for phones and kiosks. */
export function CameraStage({ label, children, fullscreenControls, onCapture, captureLabel, available }: CameraStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { mode, isFull, enter, exit } = useFullscreen(ref);
  const s = useT().stage;

  // Leave full screen if the camera stops or fails (nothing left to show there).
  useEffect(() => {
    if (!available && isFull) exit();
  }, [available, isFull, exit]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={
        isFull
          ? `${mode === 'overlay' ? 'fixed inset-0 z-[100] h-[100dvh]' : 'h-full'} w-full overflow-hidden bg-black`
          : 'relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-navy-900 sm:aspect-video'
      }
    >
      {children(isFull)}
      {(available || isFull) && (
        <button
          type="button"
          onClick={isFull ? exit : enter}
          className="absolute top-3 right-3 z-10 inline-flex h-11 items-center gap-2 rounded-full bg-navy-900/80 px-3.5 text-sm font-semibold text-white backdrop-blur hover:bg-navy-900"
        >
          {isFull ? <ShrinkIcon /> : <ExpandIcon />}
          <span className={isFull ? '' : 'sr-only sm:not-sr-only'}>{isFull ? s.exitFullscreen : s.fullscreen}</span>
        </button>
      )}
      {isFull && (fullscreenControls || onCapture) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {fullscreenControls && <div className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto">{fullscreenControls}</div>}
          {onCapture && (
            <button
              type="button"
              onClick={onCapture}
              className="pointer-events-auto grid h-16 w-16 place-items-center rounded-full border-4 border-white/90 bg-white/20 text-white hover:bg-white/30"
            >
              <CameraIcon width={26} height={26} />
              <span className="sr-only">{captureLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact chip used for the controls inside full screen (on a dark background). */
export function StageChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
        active ? 'bg-white text-navy-900' : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {children}
    </button>
  );
}
