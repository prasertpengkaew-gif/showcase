import type { ReactNode } from 'react';
import { CameraStage } from './CameraStage';
import { Button } from './Button';
import { AlertIcon, InfoIcon, ScanIcon } from './Icons';
import type { useMarkerCamera } from '../hooks/useMarkerCamera';
import { useT } from '../i18n';

type Cam = ReturnType<typeof useMarkerCamera>;

interface MarkerPanelProps {
  cam: Cam;
  label: string;
  idleTitle: string;
  idleText: string;
  /** Shown while the camera runs and no marker is in view. */
  hint: string;
  /** Extra buttons next to Start/Stop (e.g. download the printable sheet). */
  children?: ReactNode;
  photoName: string;
}

/** Camera viewport, Start/Stop/Save buttons and the shared camera-problem messages for the marker demos. */
export function MarkerPanel({ cam, label, idleTitle, idleText, hint, children, photoName }: MarkerPanelProps) {
  const t = useT();
  const m = t.markers;
  const { status, running, ids } = cam;
  const busy = status === 'starting-camera' || status === 'loading';
  const p = t.printAR;
  const problems: Record<string, { title: string; text: string } | undefined> = {
    denied: { title: p.deniedTitle, text: p.deniedText },
    'no-camera': { title: p.noCameraTitle, text: p.noCameraText },
    insecure: { title: p.insecureTitle, text: p.insecureText },
    error: { title: m.errorTitle, text: m.errorText },
  };
  const problem = problems[status];

  return (
    <div>
      <CameraStage
        label={label}
        available={running}
        captureLabel={m.savePhoto}
        onCapture={running ? () => cam.capture(photoName) : undefined}
      >
        {() => (
          <>
            <video ref={cam.videoRef} className="hidden" playsInline muted />
            <canvas ref={cam.canvasRef} className={`absolute inset-0 h-full w-full object-contain ${running ? '' : 'invisible'}`} aria-hidden />
            {!running && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                {busy ? (
                  <div>
                    <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                    <p className="mt-4 text-sm text-slate-300">{status === 'starting-camera' ? t.face.startingCamera : m.loading}</p>
                  </div>
                ) : (
                  <div className="max-w-sm">
                    <ScanIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                    <p className="mt-4 font-display text-lg font-bold">{idleTitle}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{idleText}</p>
                  </div>
                )}
              </div>
            )}
            {running && ids.length === 0 && (
              <p role="status" className="absolute inset-x-4 bottom-4 z-[1] rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white">
                {hint}
              </p>
            )}
          </>
        )}
      </CameraStage>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="secondary" onClick={cam.stop}>
            {m.stopCamera}
          </Button>
        ) : (
          <Button onClick={cam.start} disabled={busy || status === 'insecure'}>
            {m.startCamera}
          </Button>
        )}
        <Button variant="ghost" onClick={() => cam.capture(photoName)} disabled={!running}>
          {m.savePhoto}
        </Button>
        {children}
      </div>

      {problem && (
        <div role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertIcon className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{problem.title}</p>
            <p className="mt-1 leading-relaxed">{problem.text}</p>
          </div>
        </div>
      )}
      <p className="mt-4 flex items-start gap-2 text-sm text-muted">
        <InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {m.privacy}
      </p>
    </div>
  );
}
