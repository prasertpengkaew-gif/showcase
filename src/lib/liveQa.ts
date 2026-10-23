export interface Question {
  id: number;
  text: string;
  voters: string[];
  at: number;
}

export interface QaState {
  questions: Question[];
  onScreen: number | null;
  nextId: number;
}

export const MAX_QUESTION = 140;

export const createQa = (): QaState => ({ questions: [], onScreen: null, nextId: 1 });

const normal = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Empty, too long, or the same question again: nothing changes. */
export const ask = (state: QaState, text: string, at: number): QaState => {
  const t = normal(text);
  if (!t || t.length > MAX_QUESTION || state.questions.some((q) => normal(q.text).toLowerCase() === t.toLowerCase())) return state;
  return { ...state, questions: [...state.questions, { id: state.nextId, text: t, voters: [], at }], nextId: state.nextId + 1 };
};

/** One vote per person per question. */
export const vote = (state: QaState, id: number, voter: string): QaState => {
  const q = state.questions.find((x) => x.id === id);
  if (!q || q.voters.includes(voter)) return state;
  return { ...state, questions: state.questions.map((x) => (x === q ? { ...x, voters: [...x.voters, voter] } : x)) };
};

export const showOnScreen = (state: QaState, id: number | null): QaState =>
  id === null || state.questions.some((q) => q.id === id) ? { ...state, onScreen: id } : state;

/** Most votes first, older first on a tie. */
export const ranked = (state: QaState): Question[] => [...state.questions].sort((a, b) => b.voters.length - a.voters.length || a.at - b.at);

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'to', 'of', 'and', 'in', 'on', 'for', 'we', 'you', 'it', 'how', 'what', 'when', 'will', 'can', 'do', 'does', 'this', 'that', 'with', 'be', 'อะไร', 'ยังไง', 'หรือไม่', 'ไหม', 'ครับ', 'คะ', 'ค่ะ', 'และ', 'ที่', 'ของ', 'ใน', 'เป็น', 'มี', 'จะ', 'ได้']);

/** The most used words across all questions, for a word cloud; each vote adds weight to the words of its question. Works for Thai and English text. */
export const wordCounts = (state: QaState, top = 20): { word: string; count: number }[] => {
  const seg = new Intl.Segmenter(['th', 'en'], { granularity: 'word' });
  const counts = new Map<string, number>();
  for (const q of state.questions) {
    for (const s of seg.segment(q.text)) {
      const w = s.segment.toLowerCase();
      if (s.isWordLike && w.length >= 2 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1 + q.voters.length);
    }
  }
  return [...counts].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, top);
};
