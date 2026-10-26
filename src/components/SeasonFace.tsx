import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { AlertIcon, CameraIcon, InfoIcon } from './Icons';
import { Button, buttonClasses } from './Button';
import { CameraStage, StageChip } from './CameraStage';
import { OptionChips } from './OptionChips';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { createFaceLandmarker } from '../lib/faceLandmarker';
import { drawSeasonFaces, drawSeasonFrame } from '../lib/seasonFace';
import type { SeasonTheme } from '../lib/season';
import { useT } from '../i18n';

type Status = 'idle' | 'loading' | 'starting' | 'running' | 'photo' | CameraProblem;

async function loadPhoto(file: File) {
  const source = await createImageBitmap(file);
  const maxEdge = 1280;
  const edge = Math.max(source.width, source.height);
  if (edge <= maxEdge) return source;
  const scale = maxEdge / edge;
  const image = await createImageBitmap(source, {
    resizeWidth: Math.round(source.width * scale),
    resizeHeight: Math.round(source.height * scale),
    resizeQuality: 'high',
  });
  source.close();
  return image;
}

/** Front-camera filter shared by every season. The theme picks the drawings; the page does not. */
export function SeasonFace({
  theme,
  looks,
  lookLabels,
  frameTitle,
  frameLine,
}: {
  theme: SeasonTheme;
  looks: readonly string[];
  lookLabels: Record<string, string>;
  frameTitle: string;
  frameLine: string;
}) {
  const s = useT().season;
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const photoRef = useRef<{ image: ImageBitmap; faces: NormalizedLandmark[][] } | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const [status, setStatus] = useState<Status>(() =>
    typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle',
  );
  const [look, setLook] = useState(looks[0] ?? '');
  const [shot, setShot] = useState<{ url: string; blob: Blob } | null>(null);
  const [faces, setFaces] = useState(0);
  const [notice, setNotice] = useState('');

  const live = useRef({ theme, look, frameTitle, frameLine });
  live.current = { theme, look, frameTitle, frameLine };

  useEffect(() => {
    setLook((current) => (looks.includes(current) ? current : looks[0] ?? ''));
  }, [looks]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(
    () => () => {
      stopCamera();
      photoRef.current?.image.close();
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    },
    [stopCamera],
  );

  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  const paint = useCallback((ctx: CanvasRenderingContext2D, faceList: NormalizedLandmark[][]) => {
    const view = live.current;
    drawSeasonFaces(ctx, faceList, view.theme, view.look);
    drawSeasonFrame(ctx, view.theme, view.frameTitle, view.frameLine, reducedRef.current ? 0 : performance.now());
  }, []);

  const renderPhoto = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo) return;
    canvas.width = photo.image.width;
    canvas.height = photo.image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(photo.image, 0, 0);
    paint(ctx, photo.faces);
  }, [paint]);

  useEffect(() => {
    if (status === 'photo') renderPhoto();
  }, [status, look, theme, frameTitle, frameLine, renderPhoto]);

  const ensureLandmarker = useCallback(async (mode: 'VIDEO' | 'IMAGE') => {
    if (!landmarkerRef.current) landmarkerRef.current = await createFaceLandmarker(mode, 2);
    else await landmarkerRef.current.setOptions({ runningMode: mode });
    return landmarkerRef.current;
  }, []);

  const loop = useCallback(
    (landmarker: FaceLandmarker) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let last = -1;
      let lastUi = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (video.readyState < 2 || video.currentTime === last) return;
        last = video.currentTime;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;
        const result = landmarker.detectForVideo(video, performance.now());
        const target = canvas.clientWidth && canvas.clientHeight ? canvas.clientWidth / canvas.clientHeight : vw / vh;
        const cw = Math.max(2, Math.round(target < vw / vh ? vh * target : vw));
        const ch = Math.max(2, Math.round(target < vw / vh ? vh : vw / target));
        const sx = (vw - cw) / 2;
        const sy = (vh - ch) / 2;
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        ctx.setTransform(-1, 0, 0, 1, cw, 0);
        ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
        const found = result.faceLandmarks.map((face) =>
          face.map((point) => ({ ...point, x: (point.x * vw - sx) / cw, y: (point.y * vh - sy) / ch })),
        );
        paint(ctx, found);
        const now = performance.now();
        if (now - lastUi > 250) {
          lastUi = now;
          setFaces(found.length);
        }
      };
      tick();
    },
    [paint],
  );

  const start = useCallback(async () => {
    setNotice('');
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    photoRef.current?.image.close();
    photoRef.current = null;
    if (!window.isSecureContext) {
      setStatus('insecure');
      return;
    }
    setStatus('loading');
    try {
      const landmarker = await ensureLandmarker('VIDEO');
      setStatus('starting');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      setFaces(0);
      loop(landmarker);
    } catch (err) {
      stopCamera();
      setStatus(cameraProblem(err));
    }
  }, [ensureLandmarker, loop, stopCamera]);

  const stop = useCallback(() => {
    stopCamera();
    setFaces(0);
    setStatus(window.isSecureContext ? 'idle' : 'insecure');
  }, [stopCamera]);

  const capture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setNotice(s.photoFailed);
          return;
        }
        setShot((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return { url: URL.createObjectURL(blob), blob };
        });
        setNotice('');
      },
      'image/jpeg',
      0.92,
    );
  }, [s.photoFailed]);

  const save = useCallback(() => {
    if (!shot) return;
    const link = document.createElement('a');
    link.href = shot.url;
    link.download = 'season-photo.jpg';
    link.click();
    setNotice(s.downloaded);
  }, [s.downloaded, shot]);

  const onPhoto = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setNotice('');
      stopCamera();
      setStatus('loading');
      try {
        const image = await loadPhoto(file);
        const landmarker = await ensureLandmarker('IMAGE');
        const result = landmarker.detect(image);
        photoRef.current?.image.close();
        photoRef.current = { image, faces: result.faceLandmarks };
        setFaces(result.faceLandmarks.length);
        setShot((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return null;
        });
        setStatus('photo');
      } catch (err) {
        console.error('Seasonal photo filter failed', err);
        setStatus('error');
      }
    },
    [ensureLandmarker, stopCamera],
  );

  const running = status === 'running';
  const showCanvas = running || status === 'photo';
  const problemText: Partial<Record<CameraProblem, string>> = {
    denied: s.denied,
    'no-camera': s.noCamera,
    insecure: s.insecure,
    error: s.error,
  };
  const problem = status in problemText ? problemText[status as CameraProblem] : undefined;

  return (
    <div>
      <CameraStage
        label={s.faceStage}
        available={showCanvas}
        captureLabel={s.faceShutter}
        onCapture={running && faces > 0 ? capture : undefined}
        fullscreenControls={looks.map((id) => (
          <StageChip key={id} active={look === id} onClick={() => setLook(id)}>{lookLabels[id] ?? id}</StageChip>
        ))}
      >
          {() => (
            <>
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full object-contain ${showCanvas ? '' : 'invisible'}`} aria-hidden />
              {!showCanvas && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-white" role="status">
                  {status === 'loading' || status === 'starting' ? (
                    <div>
                      <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
                      <p className="mt-4 text-sm text-slate-300">{s.faceStarting}</p>
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <CameraIcon className="mx-auto" width={56} height={56} strokeWidth={1.2} />
                      <p className="mt-4 font-display text-lg font-bold">{s.faceIdleTitle}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.faceIdleText}</p>
                    </div>
                  )}
                </div>
              )}
              {running && faces === 0 && (
                <p role="status" className="absolute inset-x-4 top-3 z-[1] rounded-xl bg-navy-900/85 px-4 py-3 text-center text-sm text-white">{s.faceNoFace}</p>
              )}
              {shot && (
                <div className="absolute inset-0 z-[4] flex flex-col bg-navy-900 p-3">
                  <img src={shot.url} alt={s.facePhotoAlt} className="min-h-0 flex-1 object-contain" />
                  <div className="flex flex-wrap justify-center gap-2 pt-3">
                    <Button variant="secondary" onClick={() => setShot((current) => { if (current) URL.revokeObjectURL(current.url); return null; })}>{s.faceRetake}</Button>
                    <Button onClick={save}>{s.faceSave}</Button>
                  </div>
                </div>
              )}
            </>
          )}
      </CameraStage>
      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <OptionChips legend={s.faceLegend} options={looks} value={look} onChange={setLook} format={(id) => lookLabels[id] ?? id} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {running ? (
          <Button variant="secondary" onClick={stop}>{s.faceStop}</Button>
        ) : (
          <Button onClick={start} disabled={status === 'loading' || status === 'starting' || status === 'insecure'}>{s.faceStart}</Button>
        )}
        <Button variant="ghost" onClick={capture} disabled={!running || faces === 0}><CameraIcon /> {s.faceShutter}</Button>
        <label className={`${buttonClasses('ghost')} cursor-pointer`}>
          {s.faceUpload}
          <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
        </label>
      </div>
      {problem && <p role="alert" className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertIcon className="mt-0.5 shrink-0" /> {problem}</p>}
      {notice && <p role="status" className="mt-4 text-sm font-semibold text-ink">{notice}</p>}
      <p className="mt-4 flex items-start gap-2 text-sm text-muted"><InfoIcon className="mt-0.5 shrink-0" width={18} height={18} /> {s.facePrivacy}</p>
    </div>
  );
}
