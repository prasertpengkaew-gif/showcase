import { useCallback, useEffect, useRef, useState } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { Button, ButtonLink } from '../components/Button';
import { CameraStage } from '../components/CameraStage';
import { OptionChips } from '../components/OptionChips';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import { castVote, createVoteState, holdProgress, resetVotes, shares, step, type Choice, type VoteState } from '../lib/gestureVote';
import { useT } from '../i18n';

type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | CameraProblem;
const QUESTIONS = ['event', 'again', 'queue'] as const;
type Question = (typeof QUESTIONS)[number];

export default function GestureVote() {
  const d = useT().vote;
  useDocumentTitle(d.metaTitle);
  const reduced = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const voteRef = useRef<VoteState>(createVoteState());
  const [votes, setVotes] = useState(voteRef.current);
  const [progress, setProgress] = useState(0);
  const [choice, setChoice] = useState<Question>('event');
  const [status, setStatus] = useState<Status>(() => typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle');
  const [notice, setNotice] = useState('');

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => () => { stopCamera(); recognizerRef.current?.close(); recognizerRef.current = null; }, [stopCamera]);

  const announce = (next: VoteState, who: Choice) => {
    const totals = shares(next);
    setNotice(d.counted(who, totals.up, totals.down));
  };
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus(window.isSecureContext ? 'no-camera' : 'insecure'); return; }
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setStatus('loading');
      if (!recognizerRef.current) {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks('/mediapipe');
        const create = (delegate: 'GPU' | 'CPU') => vision.GestureRecognizer.createFromOptions(fileset, { baseOptions: { modelAssetPath: '/models/hand/gesture_recognizer.task', delegate }, runningMode: 'VIDEO', numHands: 1 });
        recognizerRef.current = await create('GPU').catch(() => create('CPU'));
      } else await recognizerRef.current.setOptions({ runningMode: 'VIDEO' });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      let lastTime = -1;
      let lastUi = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (video.readyState < 2 || video.currentTime === lastTime) return;
        lastTime = video.currentTime;
        const now = performance.now();
        const found = recognizerRef.current!.recognizeForVideo(video, now).gestures[0]?.[0];
        const observation = found ? { gesture: found.categoryName, score: found.score } : null;
        const result = step(voteRef.current, observation, now);
        voteRef.current = result.state;
        if (result.voted) announce(result.state, result.voted);
        if (now - lastUi >= 120 || result.voted) {
          lastUi = now;
          setVotes(result.state);
          setProgress(holdProgress(result.state, now));
        }
        const canvas = canvasRef.current!;
        if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
        const ctx = canvas.getContext('2d')!;
        ctx.setTransform(-1, 0, 0, 1, canvas.width, 0);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      };
      tick();
    } catch (err) {
      stopCamera();
      const problem = cameraProblem(err);
      if (problem === 'error') console.error('Gesture vote camera failed to start', err);
      setStatus(problem);
    }
  };
  const stop = () => { stopCamera(); setStatus('idle'); setProgress(0); voteRef.current = { ...voteRef.current, held: null, heldSince: null, lastSeen: null }; setVotes(voteRef.current); };
  const vote = (who: Choice) => {
    const next = castVote(voteRef.current, who, performance.now());
    if (next === voteRef.current) return;
    voteRef.current = next;
    setVotes(next);
    announce(next, who);
  };
  const reset = () => { voteRef.current = resetVotes(voteRef.current); setVotes(voteRef.current); setProgress(0); setNotice(''); };
  const totals = shares(votes);
  const problemText: Partial<Record<Status, { title: string; text: string }>> = {
    denied: { title: useT().hands.deniedTitle, text: useT().hands.deniedText },
    'no-camera': { title: useT().hands.noCameraTitle, text: useT().hands.noCameraText },
    insecure: { title: useT().hands.insecureTitle, text: useT().hands.insecureText },
    error: { title: useT().hands.errorTitle, text: useT().hands.errorText },
  };
  const problem = problemText[status];
  const busy = status === 'loading' || status === 'starting-camera';
  const options = QUESTIONS;
  const choiceName = (id: Question) => d.questions[id];

  return <>
    <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />
    <section className="bg-surface py-12 sm:py-16">
      <div className="container-page">
        <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-slate-700"><strong>{d.sampleTitle}.</strong> {d.sampleText}</div>
        <div className="mt-8"><OptionChips legend={d.questionLegend} options={options} value={choice} onChange={(next) => { setChoice(next); reset(); }} format={choiceName} /></div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{choiceName(choice)}</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {(['up', 'down'] as const).map((who) => <div key={who} className="rounded-2xl border border-line p-5">
                <p className="text-3xl" aria-hidden>{who === 'up' ? '👍' : '👎'}</p>
                <h3 className="mt-2 font-display text-xl font-bold">{d.labels[who]}</h3>
                <p className="mt-2 text-3xl font-bold tabular-nums">{votes[who]} <span className="text-sm font-medium text-muted">· {totals[who]}%</span></p>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={d.shareLabel(d.labels[who])} aria-valuenow={totals[who]} aria-valuemin={0} aria-valuemax={100}><div className={`h-full ${who === 'up' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${totals[who]}%` }} /></div>
                <Button className="mt-5 w-full" size="lg" onClick={() => vote(who)}>{d.voteButton(who === 'up' ? '👍' : '👎')}</Button>
              </div>)}
            </div>
            <div className="mt-6 flex flex-wrap gap-3"><Button variant="ghost" onClick={reset}>{d.reset}</Button></div>
            <p className="sr-only" aria-live="polite">{notice}</p>
          </div>
          <div>
            <CameraStage label={d.cameraLabel} available={status === 'running'} captureLabel={d.startCamera}>
              {() => <>
                <video ref={videoRef} className="hidden" playsInline muted />
                <canvas ref={canvasRef} aria-hidden className={`absolute inset-0 h-full w-full object-contain ${status === 'running' ? '' : 'invisible'}`} />
                {status !== 'running' && <div className="absolute inset-0 grid place-items-center p-6 text-center text-white"><p>{busy ? d.loading : d.cameraPrompt}</p></div>}
                {status === 'running' && <div className="absolute inset-x-6 bottom-5"><div className="h-4 overflow-hidden rounded-full bg-white/30" role="progressbar" aria-label={d.holdProgress} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className={`h-full bg-emerald-400 ${reduced ? '' : 'transition-[width] duration-100'}`} style={{ width: `${Math.round(progress * 100)}%` }} /></div><p className="mt-2 text-center text-sm font-semibold text-white">{d.holdPrompt}</p></div>}
              </>}
            </CameraStage>
            <div className="mt-4 flex flex-wrap gap-3">{status === 'running' ? <Button variant="secondary" onClick={stop}>{d.stopCamera}</Button> : <Button onClick={start} disabled={busy || status === 'insecure'}>{busy ? d.loading : d.startCamera}</Button>}</div>
            {problem && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>{problem.title}</strong><p className="mt-1">{problem.text}</p></div>}
            <p className="mt-4 text-sm text-muted">{d.privacy}</p>
          </div>
        </div>
      </div>
    </section>
    <section className="py-16 sm:py-20"><div className="container-page"><SectionHeading eyebrow={d.howEyebrow} title={d.howTitle} description={d.howText} /><h2 className="mt-12 font-display text-2xl font-bold">{d.goodTitle}</h2><div className="mt-6 grid gap-8 md:grid-cols-3">{d.goodToKnow.map((item) => <div key={item.title} className="border-t-2 border-electric-600 pt-5"><h3 className="font-display text-lg font-bold">{item.title}</h3><p className="mt-2 leading-relaxed text-muted">{item.text}</p></div>)}</div></div></section>
    <section className="bg-navy-900 py-16 text-white"><div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"><div><h2 className="font-display text-3xl font-bold">{d.ctaTitle}</h2><p className="mt-3 text-slate-300">{d.ctaText}</p></div><ButtonLink to="/contact" size="lg">{d.ctaContact}</ButtonLink></div></section>
  </>;
}
