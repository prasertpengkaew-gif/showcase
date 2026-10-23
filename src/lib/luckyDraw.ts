export interface DrawState {
  entrants: string[];
  winners: string[];
}

export const createDraw = (): DrawState => ({ entrants: [], winners: [] });

const key = (s: string) => s.trim().toLowerCase();

/** Checking in enters the draw once; the same name again changes nothing. */
export const checkIn = (state: DrawState, name: string): DrawState => {
  const n = name.trim().slice(0, 40);
  return n && !state.entrants.some((e) => key(e) === key(n)) ? { ...state, entrants: [...state.entrants, n] } : state;
};

/** Everyone who has not won yet. */
export const eligible = (state: DrawState): string[] => state.entrants.filter((e) => !state.winners.includes(e));

/** Picks one winner at random (rng returns [0, 1)); nobody wins twice. Returns null when nobody is left. */
export const draw = (state: DrawState, rng: () => number): { state: DrawState; winner: string | null } => {
  const pool = eligible(state);
  if (!pool.length) return { state, winner: null };
  const winner = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  return { state: { ...state, winners: [...state.winners, winner] }, winner };
};
