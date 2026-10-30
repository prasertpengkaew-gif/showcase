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
type Screen = 'home' | 'grade' | 'subject' | 'question';
const allQuestions = questions as Question[];
const SUBJECT_MOTIFS: Record<string, string[]> = {
  'วิชาวิทยาศาสตร์': ['🌱', '🪐', '⚡'],
  'วิชาคณิตศาสตร์': ['➕', '🔺', '🔢'],
  'วิชาภาษาไทย': ['ก', 'ข', '📚'],
  'วิชาสังคมศึกษา': ['🌏', '🧭', '🏛️'],
  'วิชาภาษาอังกฤษ': ['A', 'B', 'C'],
};
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

function SubjectAnimation({ subject, compact = false }: { subject: string; compact?: boolean }) {
  const art = SUBJECT_ART[subject];
  const motifs = SUBJECT_MOTIFS[subject] ?? ['🚀', '🪐', '⭐'];
  return (
    <div className={`relative grid place-items-center ${compact ? 'h-36 w-36' : 'h-64 w-full max-w-md'}`} aria-hidden>
      <div className="absolute h-[72%] aspect-square rounded-full bg-white/60 shadow-[0_20px_60px_rgba(81,150,175,.17)]" />
      <span className="quiz-orbit absolute left-[12%] top-[15%] text-3xl sm:text-4xl">{motifs[0]}</span>
      <span className="quiz-orbit-slow absolute right-[10%] top-[23%] text-2xl sm:text-3xl">{motifs[1]}</span>
      <span className="quiz-orbit absolute bottom-[14%] right-[18%] text-3xl sm:text-4xl">{motifs[2]}</span>
      <span className="quiz-subject-bob relative grid h-28 w-28 place-items-center rounded-[2rem] border-4 border-white bg-white text-6xl shadow-xl sm:h-36 sm:w-36 sm:text-7xl">{art?.icon ?? '🌌'}</span>
      {!compact && <span className="absolute bottom-0 rounded-full bg-white/80 px-4 py-1.5 text-sm font-bold text-[#56707c]">{art?.hint ?? 'ออกสำรวจจักรวาลความรู้กัน!'}</span>}
    </div>
  );
}

export default function QuizGame() {
  useDocumentTitle('เกมตอบคำถามด้วยมือ | TheNerdStudio');
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const musicContextRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const musicEnabledRef = useRef(true);
  const subjectRef = useRef('');
  const soundRef = useRef(true);
  const questionRef = useRef<Question | undefined>(undefined);
  const selectedRef = useRef<number | null>(null);
  const questionVersionRef = useRef(0);
  const [grade, setGrade] = useState(1);
  const [subject, setSubject] = useState('');
  const [screen, setScreen] = useState<Screen>('home');
  const [pointer, setPointer] = useState<HandPointer | null>(null);
  const [status, setStatus] = useState<Status>(() => typeof window !== 'undefined' && !window.isSecureContext ? 'insecure' : 'idle');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [sounds, setSounds] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [streak, setStreak] = useState(0);
  const [handVisible, setHandVisible] = useState(false);
  const backgroundSubject = Math.max(0, SUBJECTS.indexOf(subject));
  const subjectPalettes = [
    { outer: '#111735', panel: '#fffaf0', glow: '#6654ba', accent: '#ffd79a' },
    { outer: '#18344b', panel: '#f2fbff', glow: '#62c7d8', accent: '#ffd36e' },
    { outer: '#46304d', panel: '#fff8eb', glow: '#f3a85e', accent: '#e97e83' },
    { outer: '#183d4a', panel: '#f1fbf4', glow: '#55b9a2', accent: '#f6ce72' },
    { outer: '#26395f', panel: '#f4f7ff', glow: '#83a9ef', accent: '#e6a8d5' },
  ];
  const palette = subjectPalettes[backgroundSubject];
  const backgroundSymbols = [['✦', '🪐', '☄', '✧', '🌙'], ['＋', '÷', '△', '○', '123'], ['ก', 'ข', 'ค', '📖', '✎'], ['🌏', '🧭', '🏛', '◎'], ['A', 'B', 'C', 'ABC', '✎']][backgroundSubject];
  const panelMotifPositions = [[5, 20], [16, 14], [28, 23], [39, 12], [51, 19], [63, 12], [75, 22], [88, 14], [96, 30], [7, 43], [19, 51], [32, 39], [44, 55], [57, 41], [69, 52], [82, 39], [95, 58], [5, 70], [17, 86], [31, 71], [44, 89], [57, 73], [70, 88], [83, 70], [94, 86]];

  const list = useMemo(() => allQuestions.filter((item) => item.grade === grade && subject && item.subject.startsWith(subject)), [grade, subject]);
  const question = list[questionIndex % Math.max(1, list.length)];
  questionRef.current = question;
  selectedRef.current = selected;
  soundRef.current = sounds;
  musicEnabledRef.current = musicEnabled;
  subjectRef.current = subject;

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current !== null) window.clearTimeout(musicTimerRef.current);
    musicTimerRef.current = null;
    const context = musicContextRef.current;
    musicContextRef.current = null;
    if (context && context.state !== 'closed') void context.close();
  }, []);

  const startMusic = useCallback(() => {
    if (!musicEnabledRef.current || musicTimerRef.current !== null) return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = musicContextRef.current ?? new AudioContextClass();
    musicContextRef.current = context;
    void context.resume();
    const melodies = [
      [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46],
      [493.88, 587.33, 739.99, 587.33, 440, 554.37, 659.25, 554.37],
      [587.33, 698.46, 783.99, 698.46, 523.25, 659.25, 783.99, 659.25],
      [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46],
      [659.25, 783.99, 987.77, 783.99, 587.33, 698.46, 880, 698.46],
    ];
    const playNextNote = () => {
      if (!musicEnabledRef.current || context.state === 'closed') return;
      const subjectIndex = Math.max(0, SUBJECTS.indexOf(subjectRef.current));
      const melody = melodies[subjectIndex];
      const step = musicStepRef.current++;
      const frequency = melody[step % melody.length];
      const now = context.currentTime;
      const notes = step % 4 === 0 ? [frequency, frequency * 1.5] : [frequency];
      notes.forEach((note, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(index === 0 ? 0.018 : 0.006, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.66);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.68);
      });
      musicTimerRef.current = window.setTimeout(() => {
        musicTimerRef.current = null;
        playNextNote();
      }, 720);
    };
    playNextNote();
  }, []);

  const toggleMusic = () => {
    if (musicEnabledRef.current) {
      musicEnabledRef.current = false;
      setMusicEnabled(false);
      stopMusic();
      return;
    }
    musicEnabledRef.current = true;
    setMusicEnabled(true);
    if (screen !== 'home') startMusic();
  };

  const readQuestion = useCallback(() => {
    if (!question || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const spokenChoices = question.choices
      .map((choice, index) => `ตัวเลือก ${LETTERS[index]} ${formatMath(choice)}`)
      .join(' ... ');
    const utterance = new SpeechSynthesisUtterance(`โจทย์ ${formatMath(question.question)} ... ${spokenChoices}`);
    utterance.lang = 'th-TH';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }, [question]);

  useEffect(() => {
    if (screen !== 'question' || !question) return;
    const timer = window.setTimeout(readQuestion, 350);
    return () => window.clearTimeout(timer);
  }, [screen, question, readQuestion]);

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
  }, []);

  useEffect(() => () => {
    stopCamera();
    stopMusic();
    window.speechSynthesis?.cancel();
    recognizerRef.current?.close();
    recognizerRef.current = null;
  }, [stopCamera, stopMusic]);

  const startCamera = async (): Promise<boolean> => {
    if (status === 'running') return true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus(window.isSecureContext ? 'no-camera' : 'insecure');
      return false;
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
            if (usableTarget && progress >= 1 && !activationLocked) {
              activationLocked = true;
              usableTarget.click();
            }
          }
        }
      };
      tick();
      return true;
    } catch (error) {
      stopCamera();
      const problem = cameraProblem(error);
      if (problem === 'error') console.error('Quiz camera failed to start', error);
      setStatus(problem);
      return false;
    }
  };

  const beginGame = async () => {
    if (musicEnabledRef.current) startMusic();
    if (status !== 'running') await startCamera();
    setGrade(1);
    setSubject('');
    setQuestionIndex(0);
    setSelected(null);
    selectedRef.current = null;
    setScore(0);
    setStreak(0);
    setScreen('grade');
  };

  const nextQuestion = useCallback(() => {
    questionVersionRef.current += 1;
    setQuestionIndex((value) => value + 1);
    selectedRef.current = null;
    setSelected(null);
    setPointer(null);
    if (status === 'running') playSound('next');
  }, [status]);

  useEffect(() => {
    if (screen !== 'question' || selected === null) return;
    const timer = window.setTimeout(nextQuestion, 1400);
    return () => window.clearTimeout(timer);
  }, [screen, selected, questionIndex, nextQuestion]);
  const changeGrade = (value: number) => { questionVersionRef.current += 1; setGrade(value); setQuestionIndex(0); setSelected(null); selectedRef.current = null; setScore(0); setStreak(0); };
  const changeSubject = (value: string) => { questionVersionRef.current += 1; setSubject(value); setQuestionIndex(0); setSelected(null); selectedRef.current = null; setScore(0); setStreak(0); };
  const chooseAnotherSubject = () => { questionVersionRef.current += 1; setScreen('subject'); };
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
    <main className="fixed inset-0 z-[60] overflow-hidden text-[#16213c]" style={{ backgroundColor: palette.outer }}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="quiz-nebula">
            <stop offset="0%" stopColor={palette.glow} stopOpacity=".72" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="quiz-planet"><stop offset="0%" stopColor="#ffd79a" /><stop offset="100%" stopColor="#f58c75" /></radialGradient>
          <linearGradient id="quiz-planet-ring"><stop offset="0%" stopColor="#b5dfff" /><stop offset="50%" stopColor="#e5c1ff" /><stop offset="100%" stopColor="#83d6e4" /></linearGradient>
        </defs>
        <rect width="1600" height="900" fill={palette.outer} />
        {backgroundSubject === 0 ? <>
        <ellipse cx="370" cy="240" rx="540" ry="410" fill="url(#quiz-nebula)" />
        <ellipse cx="1420" cy="690" rx="470" ry="390" fill="url(#quiz-nebula)" opacity=".62" />
        <g fill="#fff8d9">
          <circle cx="102" cy="120" r="2.8" /><circle cx="262" cy="385" r="2" /><circle cx="481" cy="96" r="2.4" />
          <circle cx="720" cy="229" r="1.8" /><circle cx="875" cy="112" r="2.5" /><circle cx="1100" cy="316" r="2" />
          <circle cx="1284" cy="96" r="2.4" /><circle cx="1510" cy="214" r="2" /><circle cx="118" cy="695" r="2" />
          <circle cx="450" cy="782" r="2.4" /><circle cx="960" cy="755" r="1.8" /><circle cx="1465" cy="605" r="2.5" />
        </g>
        <g fill="none" stroke="#d8d8ff" strokeOpacity=".32" strokeWidth="2">
          <path d="M135 200l72 43 63-58 69 35" /><path d="M1160 193l55-45 65 35 61-57" />
        </g>
        <g className="quiz-planet-float">
          <ellipse cx="1335" cy="286" rx="122" ry="38" transform="rotate(-18 1335 286)" fill="none" stroke="url(#quiz-planet-ring)" strokeWidth="12" />
          <circle cx="1335" cy="286" r="63" fill="url(#quiz-planet)" />
          <path d="M1290 275c25 10 53 11 83 1M1306 307c20 7 39 7 57 0" fill="none" stroke="#dc766f" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g className="quiz-moon-float"><circle cx="245" cy="680" r="45" fill="#b7a8ff" /><circle cx="260" cy="664" r="43" fill="#20224b" /><circle cx="205" cy="670" r="5" fill="#fff8d9" /></g>
        <g fill="#fff8d9" opacity=".8">
          <path d="M690 360l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" /><path d="M1080 565l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        </g>
        </> : <g fontFamily="sans-serif" fontWeight="800" fill="#fff" opacity=".76">
          {backgroundSymbols.map((symbol, index) => {
            const positions = [[150, 190], [390, 700], [730, 155], [1090, 715], [1460, 245]];
            const [x, y] = positions[index];
            return <g key={symbol + index} className={`quiz-background-symbol quiz-background-symbol-${backgroundSubject}`} style={{ animationDelay: `${index * -0.8}s` }} transform={`rotate(${index % 2 ? -12 : 12} ${x} ${y})`}>
              <circle cx={x} cy={y} r="62" fill={palette.glow} opacity=".22" />
              <text x={x} y={y + 16} textAnchor="middle" fontSize={symbol.length > 2 ? 34 : 54}>{symbol}</text>
            </g>;
          })}
          <circle className={backgroundSubject === 3 ? 'quiz-world-orbit' : undefined} cx="1310" cy="410" r="190" fill="none" stroke={palette.accent} strokeWidth="3" opacity=".38" />
          <circle className={backgroundSubject === 3 ? 'quiz-world-orbit quiz-world-orbit-slow' : undefined} cx="1310" cy="410" r="232" fill="none" stroke={palette.glow} strokeWidth="2" opacity=".32" />
        </g>}
      </svg>

      <div className="absolute left-5 top-3 z-10 text-xs font-black tracking-[.24em] text-white/75 sm:left-10 sm:top-4 sm:text-sm">✦ LITTLE ORBIT · LEARNING GAME</div>
      <section className="absolute inset-x-3 bottom-3 top-12 overflow-hidden rounded-[30px] border border-white/80 shadow-[0_24px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:inset-x-7 sm:bottom-6 sm:top-14 md:inset-x-[5.2vw]" style={{ backgroundColor: palette.panel }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 100% 0%, ${palette.accent}35, transparent 38%), radial-gradient(ellipse at 0% 100%, ${palette.glow}35, transparent 45%)` }} />
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          {panelMotifPositions.map(([x, y], index) => {
            const symbol = backgroundSymbols[index % backgroundSymbols.length];
            const size = 42 + (index % 3) * 8;
            return <span key={`panel-motif-${index}`} className={`quiz-background-symbol quiz-background-symbol-${backgroundSubject} absolute grid select-none place-items-center rounded-full border font-black shadow-sm`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, animationDelay: `${index * -0.55}s`, fontSize: `${20 + (index % 3) * 5}px`, color: index % 2 ? palette.accent : palette.glow, backgroundColor: `${palette.glow}1a`, borderColor: `${palette.glow}35`, opacity: 0.76 }}>{symbol}</span>;
          })}
        </div>
        <div className="absolute left-[6%] top-[6%] z-10">
          <p className="text-xs font-black tracking-[.18em] text-[#4f6872] sm:text-sm">ห้องเรียนแสนสนุก</p>
          <h1 className="mt-1 text-3xl font-black leading-none sm:text-5xl">{screen === 'home' ? 'เกมตอบคำถาม' : screen === 'grade' ? 'เลือกชั้นเรียน' : screen === 'subject' ? 'เลือกวิชา' : 'พร้อมลุยโจทย์!'}</h1>
          {screen !== 'home' && <p className="mt-2 text-sm font-bold text-[#4f6872] sm:text-base">{screen === 'grade' ? 'เลือกชั้นที่กำลังเรียนอยู่' : screen === 'subject' ? 'เลือกวิชาที่อยากผจญภัย' : subject.replace('วิชา', '') + ' · ป.' + grade}</p>}
        </div>

        <div className="absolute right-[5%] top-[5%] z-20 flex max-w-[55%] flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setSounds(value => !value)} aria-pressed={sounds} className="rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm">{sounds ? '🔊 เสียงเปิด' : '🔇 ปิดเสียง'}</button>
          <button type="button" onClick={toggleMusic} aria-pressed={musicEnabled} className="rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm">{musicEnabled ? '🎵 เพลงเปิด' : '🎵 เพลงปิด'}</button>
          {status === 'running'
            ? <button type="button" onClick={() => { stopCamera(); setStatus('idle'); setHandVisible(false); }} className="rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm">{handVisible ? '🟢 มือพร้อม · ปิดกล้อง' : '🟡 กำลังหามือ · ปิดกล้อง'}</button>
            : (status === 'idle' || status === 'denied' || status === 'error' || status === 'no-camera')
              ? <button type="button" onClick={() => void startCamera()} className="rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm">📷 เปิดควบคุมด้วยมือ</button>
              : <span className="rounded-full bg-white/65 px-3 py-2 text-xs font-bold shadow-sm">{cameraStatus[status]}</span>}
        </div>

        {screen === 'home' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pb-[3%] pt-24 text-center">
          <SubjectAnimation subject="" />
          <p className="-mt-3 max-w-lg text-base font-bold text-[#415b67] sm:text-xl">เลือกวิชา ตอบคำถาม แล้วสะสมดาวให้ครบ!</p>
          <Button size="lg" onClick={() => void beginGame()} className="mt-5 border-2 border-white bg-gradient-to-r from-[#ffb879] to-[#ffd66e] text-xl font-black text-[#392949] shadow-[0_12px_30px_rgba(224,139,82,.3)] hover:brightness-105">
            เริ่มเกม
          </Button>
        </div>}

        {screen === 'grade' && <div className="absolute inset-x-[6%] bottom-[12%] top-[24%] z-10 flex flex-col items-center justify-center text-center">
          <p className="mb-8 text-lg font-bold text-[#49636e] sm:text-2xl">วันนี้อยากเล่นโจทย์ระดับไหนเอ่ย?</p>
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-7">
            {[1, 2, 3].map(item => <button key={item} type="button" onClick={() => { changeGrade(item); setScreen('subject'); }} className={'min-h-24 rounded-[2rem] border-2 border-white/90 px-5 py-5 text-2xl font-black shadow-[0_10px_25px_rgba(68,65,120,.14)] transition hover:-translate-y-1 hover:brightness-105 sm:min-h-32 sm:text-4xl ' + (item === 1 ? 'bg-[#dcecff]' : item === 2 ? 'bg-[#ffe5d7]' : 'bg-[#e6e0ff]')}>ป.{item}</button>)}
          </div>
          <button type="button" onClick={() => setScreen('home')} className="absolute bottom-0 left-0 rounded-full border-2 border-white bg-[#e8e5f5] px-7 py-3 text-lg font-black shadow-md transition hover:bg-white">ย้อนกลับ</button>
        </div>}

        {screen === 'subject' && <div className="absolute inset-x-[5%] bottom-[10%] top-[23%] z-10 grid items-center gap-2 overflow-y-auto sm:grid-cols-[1.2fr_.8fr] sm:gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
            {SUBJECTS.map((item, index) => {
              const art = SUBJECT_ART[item];
              const placement = index < 3 ? 'sm:col-span-2' : 'sm:col-span-3';
              return <button key={item} type="button" onClick={() => { changeSubject(item); setScreen('question'); }} className={'flex min-h-20 items-center justify-center gap-3 rounded-[2rem] border-2 border-white/90 px-3 py-4 text-center text-lg font-black shadow-[0_8px_20px_rgba(68,65,120,.12)] transition hover:-translate-y-1 hover:brightness-105 sm:min-h-24 sm:text-xl ' + art.color + ' ' + placement}>
                <span className="text-3xl" aria-hidden>{art.icon}</span><span>{item.replace('วิชา', '')}</span>
              </button>;
            })}
          </div>
          <div className="hidden justify-self-center sm:flex"><SubjectAnimation subject={subject || SUBJECTS[0]} /></div>
          <button type="button" onClick={() => setScreen('grade')} className="absolute bottom-0 left-0 rounded-full border-2 border-white bg-[#e8e5f5] px-7 py-3 text-lg font-black shadow-md transition hover:bg-white">ย้อนกลับ</button>
        </div>}

        {screen === 'question' && question && <div className="absolute inset-x-[5%] bottom-[8%] top-[22%] z-10 flex flex-col">
          <div className="flex min-h-0 flex-1 items-center gap-2 sm:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white bg-white/65 px-4 py-1.5 text-sm font-extrabold text-[#42606b]">{question.subject.replace(/ \(ป\.\d\)/, '')} · ข้อ {(questionIndex % list.length) + 1}/{list.length}</span>
                <span className="rounded-full border border-white bg-white/65 px-4 py-1.5 text-sm font-extrabold text-[#7c5e12]">⭐ {score} คะแนน</span>
                <button type="button" onClick={readQuestion} className="rounded-full border border-white bg-white/70 px-4 py-2 font-bold shadow-sm hover:bg-white">🔊 ฟังโจทย์และตัวเลือก</button>
              </div>
              <h2 className="max-w-4xl text-balance text-2xl font-black leading-snug sm:text-4xl lg:text-5xl">{formatMath(question.question)}</h2>
              {selected !== null && <p className={'mt-4 text-lg font-black sm:text-2xl ' + (selected === question.answer ? 'text-[#176c4b]' : 'text-[#a83d39]')}>{selected === question.answer ? 'เก่งมาก! ตอบถูกแล้ว 🎉' : 'ยังไม่ใช่นะ · คำตอบคือ ' + LETTERS[question.answer] + ' ' + formatMath(question.choices[question.answer])}</p>}
            </div>
            <div className="hidden shrink-0 sm:flex"><SubjectAnimation subject={subject} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-3 sm:gap-5">
            {question.choices.map((choice, index) => <button key={String(questionIndex) + '-' + String(index)} type="button" onClick={() => answer(index)} disabled={selected !== null} className={'min-h-16 rounded-[2rem] border-2 border-white/90 px-4 py-4 text-left text-lg font-black shadow-md transition hover:-translate-y-1 sm:min-h-20 sm:px-6 sm:text-2xl disabled:cursor-default ' + (selected === index ? (index === question.answer ? 'bg-[#c5f0d8] text-[#176c4b]' : 'bg-[#ffe0dc] text-[#a83d39]') : selected !== null && index === question.answer ? 'bg-[#c5f0d8]' : index === 0 ? 'bg-[#dcecff] hover:bg-white' : index === 1 ? 'bg-[#ffedc9] hover:bg-white' : 'bg-[#eee4ff] hover:bg-white')}>
              <span className="mr-3 inline-grid h-10 w-10 place-items-center rounded-full bg-white/80 text-base">{LETTERS[index]}</span>{formatMath(choice)}
            </button>)}
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
            <button type="button" onClick={chooseAnotherSubject} className="rounded-full border-2 border-white bg-[#e8e5f5] px-7 py-3 text-lg font-black shadow-md transition hover:bg-white">ย้อนกลับ</button>
            <button type="button" onClick={nextQuestion} className="rounded-full border-2 border-white bg-gradient-to-r from-[#ffc47c] to-[#ffe18b] px-8 py-3 text-lg font-black shadow-md transition hover:brightness-105">{questionIndex % list.length === list.length - 1 ? 'เล่นข้อแรกอีกครั้ง' : 'ไปต่อ →'}</button>
          </div>
        </div>}

        <div className="absolute bottom-[3%] left-[6%] z-10 flex items-center gap-2 text-xs font-extrabold text-[#49636e] sm:text-sm">
          <span className={'h-2.5 w-2.5 rounded-full ' + (status === 'running' && handVisible ? 'bg-emerald-500' : 'bg-white shadow')} />
          {status === 'running' ? handVisible ? 'ชี้นิ้วค้างบนปุ่มเพื่อเลือก' : 'กล้องซ่อนภาพไว้ · กำลังตรวจจับมือ' : 'ใช้เมาส์หรือแตะหน้าจอได้ด้วย'}
        </div>
      </section>

      {status === 'running' && pointer && <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
        <div className="grid h-12 w-12 place-items-center rounded-full p-[4px] shadow-xl" style={{ background: 'conic-gradient(#ffb938 ' + String(pointer.progress * 360) + 'deg, rgba(255,255,255,.88) 0deg)' }}>
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-[#263044] bg-[#fff9e9] text-xl">👆</div>
        </div>
        {pointer.target && <div className="absolute left-7 top-8 max-w-56 rounded-xl bg-[#263044]/95 px-3 py-2 text-xs font-bold text-white shadow-lg">ค้างเพื่อเลือก · {pointer.target}</div>}
      </div>}
      <style>{'.hand-hovered{outline:4px solid #f4a742!important;outline-offset:4px;box-shadow:0 0 0 8px rgba(244,167,66,.22)!important;} .quiz-subject-bob{animation:quiz-bob 2.6s ease-in-out infinite;} .quiz-orbit{animation:quiz-bob 3.4s ease-in-out infinite;} .quiz-orbit-slow{animation:quiz-bob 4.3s ease-in-out infinite;} .quiz-planet-float{animation:quiz-bob 7s ease-in-out infinite;transform-origin:1335px 286px;} .quiz-moon-float{animation:quiz-bob 8s ease-in-out infinite reverse;transform-origin:245px 680px;} .quiz-background-symbol{transform-box:fill-box;transform-origin:center;animation:quiz-background-drift 6s ease-in-out infinite;} .quiz-background-symbol-1{animation-name:quiz-math-drift;animation-duration:5.2s;} .quiz-background-symbol-2{animation-name:quiz-page-drift;animation-duration:4.8s;} .quiz-background-symbol-3{animation-name:quiz-world-drift;animation-duration:8s;} .quiz-background-symbol-4{animation-name:quiz-letter-drift;animation-duration:4.2s;} .quiz-world-orbit{transform-box:fill-box;transform-origin:center;animation:quiz-orbit-turn 32s linear infinite;} .quiz-world-orbit-slow{animation-duration:46s;animation-direction:reverse;} @keyframes quiz-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}} @keyframes quiz-background-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes quiz-math-drift{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-12px) rotate(8deg)}} @keyframes quiz-page-drift{0%,100%{transform:translateY(0) rotate(3deg)}50%{transform:translateY(-9px) rotate(-5deg)}} @keyframes quiz-world-drift{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.06)}} @keyframes quiz-letter-drift{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(6deg)}} @keyframes quiz-orbit-turn{to{transform:rotate(360deg)}} @media (prefers-reduced-motion:reduce){.quiz-subject-bob,.quiz-orbit,.quiz-orbit-slow,.quiz-planet-float,.quiz-moon-float,.quiz-background-symbol,.quiz-world-orbit{animation:none!important}}'}</style>
    </main>
  );
}
