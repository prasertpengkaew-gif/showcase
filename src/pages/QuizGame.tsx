import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import questions from '../data/quizQuestions.json';
import { Button } from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';

const MODEL_URL = '/models/hand/gesture_recognizer.task';
const WASM_BASE = '/mediapipe';
const LETTERS = ['ก', 'ข', 'ค'];
const SUBJECTS = ['วิชาวิทยาศาสตร์', 'วิชาคณิตศาสตร์', 'วิชาภาษาไทย', 'วิชาสังคมศึกษา', 'วิชาภาษาอังกฤษ'];
const SUBJECT_ART: Record<string, { icon: string; color: string; hint: string }> = {
  'วิชาวิทยาศาสตร์': { icon: '🔬', color: 'border-emerald-200 bg-emerald-50', hint: 'สำรวจธรรมชาติและสิ่งรอบตัว' },
  'วิชาคณิตศาสตร์': { icon: '🔢', color: 'border-sky-200 bg-sky-50', hint: 'ฝึกคิดเลขและแก้โจทย์' },
  'วิชาภาษาไทย': { icon: '📖', color: 'border-rose-200 bg-rose-50', hint: 'สนุกกับคำและภาษาไทย' },
  'วิชาสังคมศึกษา': { icon: '🌏', color: 'border-amber-200 bg-amber-50', hint: 'เรียนรู้สังคมและวัฒนธรรม' },
  'วิชาภาษาอังกฤษ': { icon: '🇬🇧', color: 'border-violet-200 bg-violet-50', hint: 'ฝึกคำศัพท์ภาษาอังกฤษ' },
};
type Question = { grade: number; subject: string; question: string; choices: string[]; answer: number };
type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | CameraProblem;
type HandPointer = { x: number; y: number; progress: number; target: string };
const allQuestions = questions as Question[];
const formatMath = (text: string) => text
  .replaceAll('$', '')
  .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
  .replaceAll('\\times', '×')
  .replaceAll('\\div', '÷')
  .replace(/\\([<>=])/g, '$1');

function playSound(kind: 'correct' | 'wrong' | 'next' | 'win') {
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const notes = kind === 'correct' ? [660, 880] : kind === 'wrong' ? [210] : kind === 'win' ? [523, 659, 784, 1046] : [440];
  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = kind === 'wrong' ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + index * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.12 + 0.19);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime + index * 0.12);
    oscillator.stop(ctx.currentTime + index * 0.12 + 0.2);
  });
  window.setTimeout(() => void ctx.close(), 900);
}

export default function QuizGame() {
  useDocumentTitle('เกมตอบคำถามด้วยมือ | TheNerdStudio');
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const soundRef = useRef(true);
  const questionRef = useRef<Question | undefined>(undefined);
  const selectedRef = useRef<number | null>(null);
  const questionVersionRef = useRef(0);
  const [grade, setGrade] = useState(1);
  const [subject, setSubject] = useState('');
  const [started, setStarted] = useState(false);
  const [pointer, setPointer] = useState<HandPointer | null>(null);
  const [status, setStatus] = useState<Status>(() => typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [sounds, setSounds] = useState(true);
  const [streak, setStreak] = useState(0);
  const [hold, setHold] = useState(0);
  const [handVisible, setHandVisible] = useState(false);

  const list = useMemo(() => allQuestions.filter((item) => item.grade === grade && subject && item.subject.startsWith(subject)), [grade, subject]);
  const question = list[questionIndex % Math.max(1, list.length)];
  questionRef.current = question;
  selectedRef.current = selected;
  soundRef.current = sounds;

  const answer = useCallback((index: number) => {
    const currentQuestion = questionRef.current;
    if (selectedRef.current !== null || !currentQuestion) return;
    selectedRef.current = index;
    setSelected(index);
    const correct = index === currentQuestion.answer;
    if (correct) {
      setScore((value) => value + 1);
      setStreak((value) => value + 1);
    } else setStreak(0);
    if (soundRef.current) playSound(correct ? (streak > 0 && (streak + 1) % 5 === 0 ? 'win' : 'correct') : 'wrong');
  }, [streak]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    document.querySelector('.hand-hovered')?.classList.remove('hand-hovered');
    setPointer(null);
    setHold(0);
  }, []);

  useEffect(() => () => {
    stopCamera();
    recognizerRef.current?.close();
    recognizerRef.current = null;
  }, [stopCamera]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return;
    }
    try {
      setStatus('starting-camera');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }, audio: false });
      streamRef.current = stream;
      setStatus('loading');
      if (!recognizerRef.current) {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const create = (delegate: 'GPU' | 'CPU') => vision.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: 'VIDEO', numHands: 1,
        });
        recognizerRef.current = await create('GPU').catch(() => create('CPU'));
      } else await recognizerRef.current.setOptions({ runningMode: 'VIDEO' });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setStatus('running');
      let lastVideoTime = -1;
      let candidateTarget: HTMLElement | null = null;
      let candidateSince = 0;
      let activationLocked = false;
      let highlighted: HTMLElement | null = null;
      let lastQuestionVersion = questionVersionRef.current;
      let lastUi = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        const now = performance.now();
        if (lastQuestionVersion !== questionVersionRef.current) {
          lastQuestionVersion = questionVersionRef.current;
          candidateTarget = null;
          candidateSince = 0;
          activationLocked = false;
        }
        const result = recognizerRef.current!.recognizeForVideo(video, now);
        const tip = result.landmarks[0]?.[8];
        if (!tip) {
          setHandVisible(false);
          candidateTarget = null;
          candidateSince = 0;
          activationLocked = false;
          highlighted?.classList.remove('hand-hovered');
          highlighted = null;
        }
        if (now - lastUi > 80) {
          lastUi = now;
          if (!tip) {
            setPointer(null);
            setHold(0);
          } else {
            setHandVisible(true);
            const x = Math.max(0, Math.min(window.innerWidth - 1, (1 - tip.x) * window.innerWidth));
            const y = Math.max(0, Math.min(window.innerHeight - 1, tip.y * window.innerHeight));
            const hit = document.elementFromPoint(x, y);
            const target = hit?.closest<HTMLElement>('button, a, [role="button"], [data-hand-control]') ?? null;
            const usableTarget = target && !target.matches(':disabled, [aria-disabled="true"]') ? target : null;
            if (usableTarget !== candidateTarget) {
              candidateTarget = usableTarget;
              candidateSince = now;
            }
            if (highlighted !== usableTarget) {
              highlighted?.classList.remove('hand-hovered');
              highlighted = usableTarget;
              highlighted?.classList.add('hand-hovered');
            }
            if (!usableTarget) activationLocked = false;
            const elapsed = usableTarget ? now - candidateSince : 0;
            const progress = usableTarget ? Math.min(1, elapsed / 900) : 0;
            const label = usableTarget?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 42) ?? '';
            setPointer({ x, y, progress, target: label });
            setHold(progress);
            if (usableTarget && progress >= 1 && !activationLocked) {
              activationLocked = true;
              usableTarget.click();
            }
          }
        }
      };
      tick();
    } catch (error) {
      stopCamera();
      const problem = cameraProblem(error);
      if (problem === 'error') console.error('Quiz camera failed to start', error);
      setStatus(problem);
    }
  };

  const nextQuestion = () => {
    questionVersionRef.current += 1;
    setQuestionIndex((value) => value + 1);
    selectedRef.current = null;
    setSelected(null);
    setPointer(null);
    setHold(0);
    if (status === 'running') playSound('next');
  };
  const changeGrade = (value: number) => { questionVersionRef.current += 1; setGrade(value); setQuestionIndex(0); setSelected(null); selectedRef.current = null; setScore(0); setStreak(0); };
  const changeSubject = (value: string) => { questionVersionRef.current += 1; setSubject(value); setQuestionIndex(0); setSelected(null); selectedRef.current = null; setScore(0); setStreak(0); };
  const chooseAnotherSubject = () => { questionVersionRef.current += 1; setStarted(false); changeSubject(''); };
  const cameraStatus: Partial<Record<Status, string>> = {
    idle: 'กดเปิดการควบคุมด้วยมือ แล้วชี้นิ้วไปที่ปุ่มบนหน้าจอ',
    loading: 'กำลังเตรียมระบบตรวจจับมือ…',
    'starting-camera': 'กำลังเปิดกล้อง…',
    denied: 'ยังไม่ได้รับอนุญาตใช้กล้อง · อนุญาตกล้องจากการตั้งค่าเบราว์เซอร์แล้วลองอีกครั้ง',
    'no-camera': 'หาอุปกรณ์กล้องไม่พบ หรือกล้องกำลังถูกใช้งาน',
    insecure: 'ต้องเปิดหน้านี้ผ่าน HTTPS เพื่อใช้กล้อง',
    error: 'เปิดกล้องไม่สำเร็จ · ลองรีเฟรชหน้าแล้วเริ่มใหม่',
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8e9] pb-16 text-[#263044]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[#ffca75]/40 blur-3xl" />
        <div className="absolute -right-24 top-72 h-80 w-80 rounded-full bg-[#9fe6d0]/50 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#c4b5fd]/30 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,#c7eac4_0%,#c7eac4_20%,transparent_20%)]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-28 sm:px-6 sm:pt-32">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#f08b35]">ห้องเรียนแสนสนุก</p>
            <h1 className="mt-1 font-display text-3xl font-black sm:text-5xl">เกมตอบคำถาม <span aria-hidden>🌈</span></h1>
            <p className="mt-2 text-sm text-[#596579] sm:text-base">ยกมือหน้ากล้อง ชี้คำตอบ แล้วค้างไว้เพื่อเลือก</p>
          </div>
          <button type="button" onClick={() => setSounds((value) => !value)} className="rounded-full border-2 border-[#e8d9b9] bg-white/80 px-4 py-2 font-bold shadow-sm" aria-pressed={sounds}>{sounds ? '🔊 เสียงเปิด' : '🔇 ปิดเสียง'}</button>
        </header>

        <section className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-white bg-white/85 px-4 py-3 shadow-sm" aria-label="สถานะการตรวจจับมือ">
          <video ref={videoRef} muted playsInline aria-hidden tabIndex={-1} className="pointer-events-none fixed -left-2 top-0 h-px w-px opacity-0" />
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-full text-xl ${status === 'running' && handVisible ? 'bg-emerald-100' : 'bg-[#fff0c9]'}`} aria-hidden>🖐️</span>
            <div>
              <p className="font-extrabold">{status === 'running' ? (handVisible ? 'ตรวจจับมือแล้ว · ภาพกล้องซ่อนไว้' : 'เปิดกล้องแล้ว · กำลังหามือ…') : status === 'idle' ? 'ควบคุมเมนูและเกมด้วยมือได้' : cameraStatus[status]}</p>
              <p className="text-sm text-[#667085]">{status === 'running' ? 'ชี้นิ้วไปยังปุ่ม แล้วค้างไว้เพื่อเลือก' : 'เปิดกล้องครั้งแรกด้วยปุ่มนี้ แล้วใช้ปลายนิ้วชี้ควบคุมหน้าจอ'}</p>
            </div>
          </div>
          {status === 'running' ? <button type="button" onClick={() => { stopCamera(); setStatus('idle'); setHandVisible(false); }} className="rounded-full bg-[#f4eee2] px-4 py-2 text-sm font-bold">ปิดกล้อง</button> : (status === 'idle' || status === 'denied' || status === 'error' || status === 'no-camera') && <button type="button" onClick={startCamera} className="rounded-full bg-[#f4a742] px-5 py-2.5 font-black text-[#382a18] shadow-sm">{status === 'idle' ? 'เปิดการควบคุมด้วยมือ' : 'ลองเปิดกล้องอีกครั้ง'}</button>}
        </section>

        {!started ? (
        <section className="mx-auto max-w-4xl rounded-[2rem] border-4 border-white bg-white/90 p-5 shadow-[0_14px_40px_rgba(76,67,48,.1)] sm:p-8" aria-label="เลือกวิชาและชั้นเรียน">
          <div className="text-center">
            <p className="text-sm font-extrabold uppercase tracking-[.16em] text-[#f08b35]">เตรียมตัวให้พร้อม</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">เลือกชั้นเรียนและวิชาที่อยากเล่น</h2>
            <p className="mt-2 text-sm text-[#667085]">แต่ละวิชามีคำถาม 10 ข้อ พร้อมแล้วค่อยเริ่มเกม</p>
          </div>
          <div className="mt-7">
            <h3 className="mb-3 text-center text-base font-extrabold">เลือกชั้นเรียน</h3>
            <div className="mx-auto grid max-w-lg grid-cols-3 gap-3">
              {[1, 2, 3].map((item) => <button key={item} type="button" onClick={() => changeGrade(item)} aria-pressed={grade === item} className={`rounded-2xl border-2 px-4 py-3 text-lg font-black transition hover:-translate-y-0.5 ${grade === item ? 'border-[#f1aa3b] bg-[#fff0c9] text-[#60451c] shadow-md' : 'border-[#eee4d1] bg-white text-[#667085]'}`}>ป.{item}</button>)}
            </div>
          </div>
          <div className="mt-7">
            <h3 className="mb-3 text-center text-base font-extrabold">เลือกวิชา</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SUBJECTS.map((item) => {
                const art = SUBJECT_ART[item];
                const active = subject === item;
                return <button key={item} type="button" onClick={() => changeSubject(item)} aria-pressed={active} className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 ${art.color} ${active ? 'border-[#e7a42c] ring-2 ring-[#f6d58c]' : ''}`}>
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm" aria-hidden>{art.icon}</span>
                  <span><span className="block font-black">{item.replace('วิชา', '')}</span><span className="mt-1 block text-sm text-[#667085]">{art.hint}</span></span>
                  {active && <span className="ml-auto text-xl" aria-label="เลือกแล้ว">✓</span>}
                </button>;
              })}
            </div>
          </div>
          <div className="mt-7 text-center">
            <Button size="lg" disabled={!subject} onClick={() => { questionVersionRef.current += 1; setQuestionIndex(0); setSelected(null); selectedRef.current = null; setScore(0); setStreak(0); setStarted(true); }}>
              เริ่มทำแบบฝึกหัด {subject ? `· ${subject.replace('วิชา', '')}` : ''} →
            </Button>
          </div>
        </section>
        ) : (
        <>
        <section className="mb-5 flex flex-wrap gap-3 rounded-3xl border border-white/90 bg-white/80 p-4 shadow-[0_8px_30px_rgba(76,67,48,.08)] backdrop-blur sm:p-5" aria-label="ตั้งค่าเกม">
          <div className="flex items-center gap-2 text-sm font-bold"><span>ชั้นเรียน</span>{[1, 2, 3].map((item) => <button key={item} type="button" onClick={() => changeGrade(item)} aria-pressed={grade === item} className={`rounded-xl border-2 px-3 py-2 ${grade === item ? 'border-[#f1aa3b] bg-[#fff0c9]' : 'border-[#e8d9b9] bg-white'}`}>ป.{item}</button>)}</div>
          <div className="flex items-center gap-2 rounded-xl bg-[#e8f7ee] px-3 py-2 font-bold text-[#23845e]">{SUBJECT_ART[subject]?.icon} {subject.replace('วิชา', '')}</div>
          <button type="button" onClick={chooseAnotherSubject} className="rounded-xl border-2 border-[#e8d9b9] bg-white px-3 py-2 text-sm font-bold">เปลี่ยนวิชา</button>
          <div className="ml-auto flex items-center gap-4 rounded-xl bg-[#fff2d9] px-4 py-2 font-bold"><span>ข้อ {(questionIndex % list.length) + 1}/{list.length}</span><span>⭐ {score} คะแนน</span></div>
        </section>

        {question && <section className="mb-5 rounded-[2rem] border-4 border-white bg-white/90 p-5 shadow-[0_14px_40px_rgba(76,67,48,.1)] sm:p-8" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-full bg-[#e8f7ee] px-3 py-1 text-sm font-bold text-[#23845e]">{question.subject.replace(/ \(ป\.\d\)/, '')}</span><span className="text-sm font-bold text-[#8892a2]">🔥 ต่อเนื่อง {streak} ข้อ</span></div>
          <h2 className="text-balance text-xl font-black leading-relaxed sm:text-3xl">{formatMath(question.question)}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {question.choices.map((choice, index) => <button key={`${index}-${choice}`} type="button" onClick={() => answer(index)} disabled={selected !== null} className={`min-h-16 rounded-2xl border-2 px-4 py-3 text-left text-lg font-bold transition duration-200 disabled:cursor-default ${selected === index ? (index === question.answer ? 'border-[#4bb88b] bg-[#d9f7e8] text-[#176c4b]' : 'border-[#f28b82] bg-[#ffebe8] text-[#a83d39]') : selected !== null && index === question.answer ? 'border-[#4bb88b] bg-[#d9f7e8]' : 'border-[#eee4d1] bg-[#fffdf8] hover:-translate-y-0.5 hover:border-[#efb14c]'}`}>
              <span className="mr-3 inline-grid h-9 w-9 place-items-center rounded-full bg-[#fff0c9] text-base">{LETTERS[index]}</span>{formatMath(choice)}
            </button>)}
          </div>
          {selected !== null && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className={`font-extrabold ${selected === question.answer ? 'text-[#23845e]' : 'text-[#af584f]'}`}>{selected === question.answer ? 'เก่งมาก! ตอบถูกแล้ว 🎉' : `ยังไม่ใช่นะ คำตอบคือ ${LETTERS[question.answer]} · ${question.choices[question.answer]}`}</p><Button onClick={nextQuestion}>ข้อต่อไป →</Button></div>}
        </section>}

        <section className="grid items-start gap-5">
          <aside className="rounded-[2rem] border-2 border-white bg-[#fffdf7]/90 p-5 shadow-[0_10px_30px_rgba(76,67,48,.08)] sm:p-6">
            <h2 className="text-xl font-black">วิธีเล่น <span aria-hidden>✨</span></h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed text-[#596579] sm:text-base">
              <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffe6ad] font-black text-[#79521a]">1</span><span>อนุญาตใช้กล้อง แล้วนั่งห่างกล้องพอให้เห็นมือ</span></li>
              <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d9f7e8] font-black text-[#176c4b]">2</span><span>เลื่อนนิ้วชี้ซ้าย–ขวาในภาพ เพื่อชี้คำตอบ ก · ข · ค</span></li>
              <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e9e3ff] font-black text-[#624ab0]">3</span><span>ค้างที่คำตอบประมาณ 1 วินาที เพื่อยืนยัน</span></li>
              <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ffdfdc] font-black text-[#a83d39]">4</span><span>ตอบครบแล้วกด “ข้อต่อไป” หรือแตะตัวเลือกบนจอได้</span></li>
            </ol>
            {status === 'running' && <div className="mt-6 rounded-2xl bg-[#f3efe5] p-4"><div className="mb-2 flex justify-between text-sm font-bold"><span>{pointer?.target ? `กำลังชี้: ${pointer.target}` : 'ชี้ไปยังปุ่มเพื่อเลือก'}</span><span>{pointer?.target ? `${Math.round(hold * 100)}%` : '—'}</span></div><div className="h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-gradient-to-r from-[#58c891] to-[#f3bf4c] transition-[width] duration-100" style={{ width: `${hold * 100}%` }} /></div></div>}
            <p className="mt-5 border-t border-[#eee4d1] pt-4 text-xs leading-relaxed text-[#8991a0]">ใช้กล้องเพื่อประมวลผลท่ามือบนอุปกรณ์ของคุณ ภาพจากกล้องไม่ได้ถูกบันทึก</p>
          </aside>
        </section>
        </>
        )}
      </div>
      {status === 'running' && pointer && <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
        <div className="grid h-12 w-12 place-items-center rounded-full p-[4px] shadow-xl" style={{ background: `conic-gradient(#ffb938 ${pointer.progress * 360}deg, rgba(255,255,255,.88) 0deg)` }}>
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-[#263044] bg-[#fff9e9] text-xl">👆</div>
        </div>
        <div className="absolute left-7 top-8 max-w-56 rounded-xl bg-[#263044]/95 px-3 py-2 text-xs font-bold text-white shadow-lg">{pointer.target ? `ค้างเพื่อเลือก · ${pointer.target}` : 'ชี้ไปยังปุ่มที่ต้องการ'}</div>
      </div>}
      <style>{`.hand-hovered{outline:4px solid #f4a742!important;outline-offset:4px;box-shadow:0 0 0 8px rgba(244,167,66,.22)!important;}`}</style>
    </main>
  );
}
