import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import questions from '../data/quizQuestions.json';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cameraProblem, type CameraProblem } from '../lib/camera';
import './QuizGame.css';

const MODEL_URL = '/models/hand/gesture_recognizer.task';
const WASM_BASE = '/mediapipe';
const LETTERS = ['ก', 'ข', 'ค'];
const SUBJECTS = ['วิชาวิทยาศาสตร์', 'วิชาคณิตศาสตร์', 'วิชาภาษาไทย', 'วิชาสังคมศึกษา', 'วิชาภาษาอังกฤษ'];
const SUBJECT_ART: Record<string, { icon: string; color: string; hint: string }> = {
  'วิชาวิทยาศาสตร์': { icon: '🧪', color: 'border-emerald-200 bg-emerald-50', hint: 'สำรวจธรรมชาติและสิ่งรอบตัว' },
  'วิชาคณิตศาสตร์': { icon: '🔢', color: 'border-sky-200 bg-sky-50', hint: 'ฝึกคิดเลขและแก้โจทย์' },
  'วิชาภาษาไทย': { icon: '📚', color: 'border-rose-200 bg-rose-50', hint: 'สนุกกับคำและภาษาไทย' },
  'วิชาสังคมศึกษา': { icon: '👨‍👩‍👧‍👦', color: 'border-amber-200 bg-amber-50', hint: 'เรียนรู้สังคมและวัฒนธรรม' },
  'วิชาภาษาอังกฤษ': { icon: '🚌', color: 'border-violet-200 bg-violet-50', hint: 'ฝึกคำศัพท์ภาษาอังกฤษ' },
};
type Question = { grade: number; subject: string; question: string; choices: string[]; answer: number };
type Status = 'idle' | 'loading' | 'starting-camera' | 'running' | CameraProblem;
type HandPointer = { x: number; y: number; progress: number; target: string };
type Screen = 'home' | 'grade' | 'question';
const allQuestions = questions as Question[];
const SUBJECT_MOTIFS: Record<string, string[]> = {
  'วิชาวิทยาศาสตร์': ['🌱', '🪐', '⚡'],
  'วิชาคณิตศาสตร์': ['➕', '🔺', '🔢'],
  'วิชาภาษาไทย': ['ก', 'ข', '📚'],
  'วิชาสังคมศึกษา': ['🌏', '🧭', '🏛️'],
  'วิชาภาษาอังกฤษ': ['A', 'B', 'C'],
};
const CHOICE_ICONS: [string[], string][] = [
  [['กระต่าย'], '🐰'], [['ไก่', 'เป็ด', 'นก', 'ไก่'], '🐦'], [['ปลา'], '🐟'], [['สุนัข', 'หมา'], '🐶'], [['แมว'], '🐱'],
  [['วัว'], '🐮'], [['เสือ'], '🐯'], [['จระเข้'], '🐊'], [['กบ'], '🐸'], [['ช้าง'], '🐘'],
  [['ดวงอาทิตย์', 'พระอาทิตย์', 'กลางวัน'], '☀️'], [['ดวงจันทร์', 'พระจันทร์', 'กลางคืน'], '🌙'], [['ดาว'], '⭐'],
  [['ต้นไม้', 'ต้น', 'พืช'], '🌱'], [['ราก'], '🌿'], [['ใบไม้', 'ใบ'], '🍃'], [['ดอก'], '🌼'], [['ก้อนหิน', 'หิน'], '🪨'], [['น้ำ'], '💧'],
  [['ตา'], '👁️'], [['หู'], '👂'], [['จมูก'], '👃'], [['ปอด'], '🫁'], [['หัวใจ'], '❤️'], [['กระเพาะ'], '🫃'],
  [['กล้วย'], '🍌'], [['มะนาว', 'เปรี้ยว'], '🍋'], [['หวาน'], '🍬'], [['เค็ม'], '🧂'], [['แครอท'], '🥕'], [['ผัก'], '🥬'], [['ผลไม้'], '🍎'],
  [['บวก', '+'], '➕'], [['ลบ', '−', '-'], '➖'], [['คูณ', '×', 'x'], '✖️'], [['หาร', '÷', '/'], '➗'],
  [['สามเหลี่ยม'], '🔺'], [['วงกลม'], '⭕'], [['สี่เหลี่ยม'], '🟦'], [['หนังสือ', 'คำ', 'พยัญชนะ'], '📚'],
  [['โรงเรียน', 'ครู', 'นักเรียน'], '🏫'], [['โลก', 'แผนที่', 'ประเทศ'], '🌏'], [['รถ', 'ยานพาหนะ'], '🚌'],
];
function choiceIcon(choice: string, subject: string) {
  const normalized = choice.trim().toLowerCase();
  const match = CHOICE_ICONS.find(([terms]) => terms.some((term) => normalized.includes(term)));
  if (match) return match[1];
  if (/^[0-9๐-๙]+(?:[.,][0-9๐-๙]+)?$/.test(normalized)) return '🔢';
  return SUBJECT_ART[subject]?.icon ?? '✨';
}
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
    { outer: '#38225f', panel: '#fffaf0', glow: '#7c4cba', accent: '#ffd86b' },
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
  const chooseAnotherSubject = () => { questionVersionRef.current += 1; setScreen('home'); };
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
      <main className="quiz-game-shell fixed inset-0 z-[60] overflow-hidden text-[#16213c]" style={{ backgroundColor: palette.outer }}>
      <video ref={videoRef} className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0" playsInline muted aria-hidden="true" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <radialGradient id="quiz-nebula">
            <stop offset="0%" stopColor={palette.glow} stopOpacity=".72" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="quiz-planet"><stop offset="0%" stopColor="#ffd79a" /><stop offset="100%" stopColor="#f58c75" /></radialGradient>
          <linearGradient id="quiz-planet-ring"><stop offset="0%" stopColor="#b5dfff" /><stop offset="50%" stopColor="#e5c1ff" /><stop offset="100%" stopColor="#83d6e4" /></linearGradient>
          <linearGradient id="quiz-space-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#603875" /><stop offset="42%" stopColor="#18245a" /><stop offset="100%" stopColor="#15506c" /></linearGradient>
        </defs>
        <rect width="1600" height="900" fill="url(#quiz-space-sky)" />
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

      <div className="quiz-game-brand absolute left-5 top-3 z-10 text-xs font-black tracking-[.24em] text-white/75 sm:left-10 sm:top-4 sm:text-sm">✦ LITTLE ORBIT · LEARNING GAME</div>
      <section className="quiz-game-panel absolute inset-x-3 bottom-3 top-12 overflow-hidden rounded-[30px] border border-white/80 shadow-[0_24px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:inset-x-7 sm:bottom-6 sm:top-14 md:inset-x-[5.2vw]" data-screen={screen} style={{ backgroundColor: 'rgba(7, 22, 66, .94)' }}>
        <div aria-hidden className="quiz-panel-atmosphere pointer-events-none absolute inset-0 animate-pulse" data-screen={screen} style={{ animationDuration: '9s', backgroundImage: `radial-gradient(ellipse at 100% 0%, ${palette.accent}66, transparent 44%), radial-gradient(ellipse at 0% 100%, ${palette.glow}55, transparent 50%), linear-gradient(135deg, ${palette.glow}12, transparent 48%, ${palette.accent}18)` }} />
        <div className="quiz-panel-motifs pointer-events-none absolute inset-0 z-0 overflow-hidden" data-screen={screen} aria-hidden>
          {panelMotifPositions.map(([x, y], index) => {
            const symbol = backgroundSymbols[index % backgroundSymbols.length];
            const size = 64 + (index % 3) * 12;
            return <span key={`panel-motif-${index}`} className={`quiz-background-symbol quiz-background-symbol-${backgroundSubject} absolute grid select-none place-items-center rounded-full border-2 font-black`} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, animationDelay: `${index * -0.55}s`, animationDuration: `${4.2 + (index % 6) * 0.45}s`, fontSize: `${22 + (index % 3) * 5}px`, color: index % 2 ? palette.accent : palette.glow, backgroundColor: `${palette.glow}30`, borderColor: `${palette.glow}70`, opacity: 0.92, boxShadow: `0 8px 26px ${palette.glow}30, inset 0 0 16px ${palette.glow}20` }}>{symbol}</span>;
          })}
        </div>
        <div className="quiz-game-heading absolute left-[6%] top-[6%] z-10">
          <p className="quiz-game-eyebrow text-xs font-black tracking-[.18em] sm:text-sm">{screen === 'home' ? 'ห้องเรียนแสนสนุก' : 'LITTLE ORBIT · ห้องเรียนแสนสนุก'}</p>
          <h1 className="mt-1 text-3xl font-black leading-none sm:text-5xl">{screen === 'home' ? 'เลือกวิชา' : screen === 'grade' ? 'เลือกชั้นเรียน' : 'พร้อมลุยโจทย์!'}</h1>
          <p className="quiz-game-subtitle mt-2 text-sm font-bold sm:text-base">{screen === 'home' ? 'เลือกวิชาที่อยากผจญภัย' : screen === 'grade' ? 'เลือกชั้นที่กำลังเรียนอยู่' : subject.replace('วิชา', '') + ' · ป.' + grade}</p>
          {screen === 'home' && <button type="button" onClick={() => setScreen('grade')} className="quiz-grade-chip mt-3"><span className="quiz-chip-icon" aria-hidden="true">🎓</span><span>ระดับชั้น</span><strong>ป.{grade}</strong><span aria-hidden="true">⌄</span></button>}
        </div>

        <div className="quiz-game-toggles absolute right-[5%] top-[5%] z-20 flex max-w-[55%] flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={() => setSounds(value => !value)} aria-pressed={sounds} className="quiz-game-toggle rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm"><span className="quiz-toggle-icon" aria-hidden="true">{sounds ? '🔊' : '🔇'}</span><span>{sounds ? 'เสียงเปิด' : 'ปิดเสียง'}</span></button>
          <button type="button" onClick={toggleMusic} aria-pressed={musicEnabled} className="quiz-game-toggle rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm"><span className="quiz-toggle-icon" aria-hidden="true">{musicEnabled ? '🎵' : '🔕'}</span><span>{musicEnabled ? 'เพลงเปิด' : 'เพลงปิด'}</span></button>
          {status === 'running'
            ? <button type="button" onClick={() => { stopCamera(); setStatus('idle'); setHandVisible(false); }} className="quiz-game-toggle rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm"><span className={'quiz-toggle-icon ' + (handVisible ? 'is-ready' : 'is-searching')} aria-hidden="true">✋</span><span>{handVisible ? 'มือพร้อม · ปิดกล้อง' : 'กำลังหามือ · ปิดกล้อง'}</span></button>
            : (status === 'idle' || status === 'denied' || status === 'error' || status === 'no-camera')
              ? <button type="button" onClick={() => void startCamera()} className="quiz-game-toggle rounded-full border border-white/80 bg-white/65 px-3 py-2 text-xs font-extrabold shadow-sm backdrop-blur sm:text-sm"><span className="quiz-toggle-icon" aria-hidden="true">✋</span><span>เปิดควบคุมด้วยมือ</span></button>
              : <span className="rounded-full bg-white/65 px-3 py-2 text-xs font-bold shadow-sm">{cameraStatus[status]}</span>}
        </div>

        {screen === 'home' && <div className="quiz-subject-menu absolute inset-x-[5%] bottom-[9%] top-[25%] z-10 grid items-center gap-5">
          <div className="quiz-subject-grid grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
            {SUBJECTS.map((item, index) => {
              const art = SUBJECT_ART[item];
              const subjectClass = ['science', 'math', 'thai', 'social', 'english'][index];
              const placement = index < 3 ? 'sm:col-span-2' : 'sm:col-span-3';
              return <button key={item} type="button" onClick={() => { subjectRef.current = item; changeSubject(item); if (musicEnabledRef.current) startMusic(); setScreen('question'); }} className={`quiz-subject-card quiz-subject-card-${subjectClass} ${placement}`}>
                <span className="quiz-subject-icon" aria-hidden="true">{art.icon}</span>
                <span className="quiz-subject-name">{index === 4 ? <><small>GB</small> ภาษาอังกฤษ</> : item.replace('วิชา', '')}</span>
                <span className="quiz-subject-star" aria-hidden="true">✦</span>
              </button>;
            })}
          </div>
          <aside className="quiz-astro-console" aria-label="ยานสำรวจอวกาศ Little Orbit">
            <img src="/images/quiz/astronaut-console-v1.png" alt="นักบินอวกาศตัวน้อยกำลังสำรวจดาวจากแผงควบคุมยาน" />
            <p className="quiz-astro-caption">สำรวจจักรวาล<br />แห่งความรู้กัน!</p>
          </aside>
          <p className="quiz-menu-hint">เลือกวิชาเพื่อเริ่มภารกิจ · ตอบคำถามแล้วสะสมดาวให้ครบ</p>
          <button type="button" onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')} className="quiz-subject-back"><span className="quiz-navigation-icon" aria-hidden="true">←</span>ย้อนกลับ</button>
        </div>}

        {screen === 'grade' && <div className="quiz-grade-screen absolute inset-x-[6%] bottom-[12%] top-[24%] z-10 flex flex-col items-center justify-center text-center">
          <p className="quiz-grade-intro mb-8 text-lg font-bold sm:text-2xl">วันนี้อยากเล่นโจทย์ระดับไหนเอ่ย?</p>
          <div className="grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-7">
            {[1, 2, 3].map((item, index) => <button key={item} type="button" onClick={() => { changeGrade(item); setScreen('home'); }} className={`quiz-grade-card quiz-grade-card-${item} min-h-24 rounded-[2rem] border-2 border-white/90 px-5 py-5 text-2xl font-black transition hover:-translate-y-1 hover:brightness-105 sm:min-h-32 sm:text-4xl`}><span className="quiz-grade-icon" aria-hidden="true">{['🌱', '🚀', '⭐'][index]}</span><span>ป.{item}</span></button>)}
          </div>
          <button type="button" onClick={() => setScreen('home')} className="quiz-game-back absolute bottom-0 left-0 rounded-full px-7 py-3 text-lg font-black transition"><span className="quiz-navigation-icon" aria-hidden="true">←</span>ย้อนกลับ</button>
        </div>}

        {screen === 'question' && question && <div className="absolute inset-x-[5%] bottom-[8%] top-[22%] z-10 flex flex-col">
          <div className="flex min-h-0 flex-1 items-center gap-2 sm:gap-8">
            <div className="min-w-0 flex-1">
              <div className="quiz-question-meta mb-4 flex flex-wrap items-center gap-3">
                <span className="quiz-meta-chip">{question.subject.replace(/ \(ป\.\d\)/, '')} · ข้อ {(questionIndex % list.length) + 1}/{list.length}</span>
                <span className="quiz-meta-chip quiz-score-chip">⭐ {score} คะแนน</span>
                <button type="button" onClick={readQuestion} className="quiz-listen-button"><span className="quiz-action-icon" aria-hidden="true">🔊</span>ฟังโจทย์และตัวเลือก</button>
              </div>
              <h2 className="quiz-question-title max-w-4xl text-balance text-2xl font-black leading-snug sm:text-4xl lg:text-5xl">{formatMath(question.question)}</h2>
              {selected !== null && <p className={'quiz-answer-feedback mt-4 text-lg font-black sm:text-2xl ' + (selected === question.answer ? 'is-correct' : 'is-wrong')}>{selected === question.answer ? 'เก่งมาก! ตอบถูกแล้ว 🎉' : 'ยังไม่ใช่นะ · คำตอบคือ ' + LETTERS[question.answer] + ' ' + formatMath(question.choices[question.answer])}</p>}
            </div>
            <div className="hidden shrink-0 sm:flex"><SubjectAnimation subject={subject} /></div>
          </div>
          <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-3 sm:gap-5">
            {question.choices.map((choice, index) => <button key={String(questionIndex) + '-' + String(index)} type="button" onClick={() => answer(index)} disabled={selected !== null} className={`quiz-answer-card quiz-answer-card-${index}${selected === index ? (index === question.answer ? ' is-correct' : ' is-wrong') : selected !== null && index === question.answer ? ' is-reveal' : ''} min-h-16 rounded-[2rem] border-2 px-4 py-4 text-left text-lg font-black transition hover:-translate-y-1 sm:min-h-20 sm:px-6 sm:text-2xl disabled:cursor-default`}>
              <span className="quiz-choice-marker mr-3" aria-hidden="true"><span className="quiz-choice-letter">{LETTERS[index]}</span><span className="quiz-choice-icon">{choiceIcon(choice, subject)}</span></span>{formatMath(choice)}
            </button>)}
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between">
            <button type="button" onClick={chooseAnotherSubject} className="quiz-game-back rounded-full px-7 py-3 text-lg font-black transition"><span className="quiz-navigation-icon" aria-hidden="true">←</span>ย้อนกลับ</button>
            <button type="button" onClick={nextQuestion} className="quiz-game-next rounded-full px-8 py-3 text-lg font-black transition"><span>{questionIndex % list.length === list.length - 1 ? 'เล่นข้อแรกอีกครั้ง' : 'ไปต่อ'}</span><span className="quiz-navigation-icon" aria-hidden="true">{questionIndex % list.length === list.length - 1 ? '↻' : '→'}</span></button>
          </div>
        </div>}

        <div className="quiz-hand-status absolute bottom-[3%] left-[6%] z-10 flex items-center gap-2 text-xs font-extrabold sm:text-sm">
          <span className={'h-2.5 w-2.5 rounded-full ' + (status === 'running' && handVisible ? 'bg-emerald-500' : 'bg-white shadow')} />
          {status === 'running' ? handVisible ? 'ชี้นิ้วค้างบนปุ่มเพื่อเลือก' : 'กล้องซ่อนภาพไว้ · กำลังตรวจจับมือ' : 'ใช้เมาส์หรือแตะหน้าจอได้ด้วย'}
        </div>
      </section>

      <div className="quiz-edge-orbits" aria-hidden="true">
        <span className="quiz-edge-star quiz-edge-star-one">★</span>
        <span className="quiz-edge-planet quiz-edge-planet-one">🪐</span>
        <span className="quiz-edge-star quiz-edge-star-two">★</span>
        <span className="quiz-edge-planet quiz-edge-planet-two">🛸</span>
        <span className="quiz-edge-star quiz-edge-star-three">✦</span>
      </div>

      {status === 'running' && pointer && <div className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-1/2" style={{ left: pointer.x, top: pointer.y }} aria-hidden>
        <div className="grid h-12 w-12 place-items-center rounded-full p-[4px] shadow-xl" style={{ background: 'conic-gradient(#ffb938 ' + String(pointer.progress * 360) + 'deg, rgba(255,255,255,.88) 0deg)' }}>
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-[#263044] bg-[#fff9e9] text-xl">👆</div>
        </div>
        {pointer.target && <div className="absolute left-7 top-8 max-w-56 rounded-xl bg-[#263044]/95 px-3 py-2 text-xs font-bold text-white shadow-lg">ค้างเพื่อเลือก · {pointer.target}</div>}
      </div>}
      <style>{'.hand-hovered{outline:4px solid #f4a742!important;outline-offset:4px;box-shadow:0 0 0 8px rgba(244,167,66,.22)!important;} .quiz-subject-bob{animation:quiz-bob 2.6s ease-in-out infinite;} .quiz-orbit{animation:quiz-bob 3.4s ease-in-out infinite;} .quiz-orbit-slow{animation:quiz-bob 4.3s ease-in-out infinite;} .quiz-planet-float{animation:quiz-bob 7s ease-in-out infinite;transform-origin:1335px 286px;} .quiz-moon-float{animation:quiz-bob 8s ease-in-out infinite reverse;transform-origin:245px 680px;} .quiz-background-symbol{transform-box:fill-box;transform-origin:center;animation:quiz-background-drift 6s ease-in-out infinite;} .quiz-background-symbol-1{animation-name:quiz-math-drift;animation-duration:5.2s;} .quiz-background-symbol-2{animation-name:quiz-page-drift;animation-duration:4.8s;} .quiz-background-symbol-3{animation-name:quiz-world-drift;animation-duration:8s;} .quiz-background-symbol-4{animation-name:quiz-letter-drift;animation-duration:4.2s;} .quiz-world-orbit{transform-box:fill-box;transform-origin:center;animation:quiz-orbit-turn 32s linear infinite;} .quiz-world-orbit-slow{animation-duration:46s;animation-direction:reverse;} @keyframes quiz-bob{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-12px) rotate(3deg)}} @keyframes quiz-background-drift{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}} @keyframes quiz-math-drift{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-12px) rotate(8deg)}} @keyframes quiz-page-drift{0%,100%{transform:translateY(0) rotate(3deg)}50%{transform:translateY(-9px) rotate(-5deg)}} @keyframes quiz-world-drift{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-8px) scale(1.06)}} @keyframes quiz-letter-drift{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-14px) rotate(6deg)}} @keyframes quiz-orbit-turn{to{transform:rotate(360deg)}} @media (prefers-reduced-motion:reduce){.quiz-subject-bob,.quiz-orbit,.quiz-orbit-slow,.quiz-planet-float,.quiz-moon-float,.quiz-background-symbol,.quiz-world-orbit{animation:none!important}}'}</style>
      <style>{' .quiz-background-symbol{filter:drop-shadow(0 0 14px currentColor);} @keyframes quiz-science-drift{0%,100%{transform:translate(0,0) rotate(-16deg) scale(.78)}50%{transform:translate(32px,-48px) rotate(18deg) scale(1.24)}} @keyframes quiz-math-drift{0%,100%{transform:translate(0,0) rotate(-18deg) scale(.82)}50%{transform:translate(10px,-44px) rotate(24deg) scale(1.28)}} @keyframes quiz-page-drift{0%,100%{transform:translate(0,0) rotate(12deg) scale(.9)}50%{transform:translate(28px,-38px) rotate(-16deg) scale(1.16)}} @keyframes quiz-world-drift{0%,100%{transform:translate(0,0) rotate(-8deg) scale(.8)}50%{transform:translate(-20px,-30px) rotate(8deg) scale(1.25)}} @keyframes quiz-letter-drift{0%,100%{transform:translate(0,0) rotate(-12deg) scale(.88)}50%{transform:translate(8px,-42px) rotate(18deg) scale(1.2)}} @media (prefers-reduced-motion:reduce){.quiz-background-symbol{filter:none!important}}'}</style>
    </main>
  );
}
