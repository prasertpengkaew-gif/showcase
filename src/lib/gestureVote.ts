export type Choice = 'up' | 'down';

export const HOLD_MS = 1200;
export const COOLDOWN_MS = 3000;
export const LOST_GRACE_MS = 300;
export const MIN_SCORE = 0.6;

export interface VoteState {
  up: number;
  down: number;
  held: Choice | null;
  heldSince: number | null;
  lastSeen: number | null;
  cooldownUntil: number;
}

export function createVoteState(): VoteState {
  return { up: 0, down: 0, held: null, heldSince: null, lastSeen: null, cooldownUntil: 0 };
}

export function step(state: VoteState, observation: { gesture: string; score: number } | null, now: number): { state: VoteState; voted: Choice | null } {
  if (now < state.cooldownUntil) return { state: { ...state, held: null, heldSince: null, lastSeen: null }, voted: null };
  const gesture: Choice | null = observation && observation.score >= MIN_SCORE
    ? observation.gesture === 'Thumb_Up' ? 'up' : observation.gesture === 'Thumb_Down' ? 'down' : null
    : null;
  if (!gesture) {
    if (state.held && state.lastSeen !== null && now - state.lastSeen <= LOST_GRACE_MS) return { state: { ...state }, voted: null };
    return { state: { ...state, held: null, heldSince: null, lastSeen: null }, voted: null };
  }
  // A gap longer than the grace period (a paused tab, dropped frames) starts a fresh hold even for the same gesture.
  const continuing = gesture === state.held && state.lastSeen !== null && now - state.lastSeen <= LOST_GRACE_MS;
  const next = continuing
    ? { ...state, lastSeen: now }
    : { ...state, held: gesture, heldSince: now, lastSeen: now };
  if (now - (next.heldSince ?? now) < HOLD_MS) return { state: next, voted: null };
  return {
    state: { ...next, [gesture]: next[gesture] + 1, held: null, heldSince: null, lastSeen: null, cooldownUntil: now + COOLDOWN_MS },
    voted: gesture,
  };
}

export function holdProgress(state: VoteState, now: number): number {
  if (!state.held || state.heldSince === null || now < state.cooldownUntil) return 0;
  return Math.max(0, Math.min(1, (now - state.heldSince) / HOLD_MS));
}

export function castVote(state: VoteState, choice: Choice, now: number): VoteState {
  if (now < state.cooldownUntil) return state;
  return { ...state, [choice]: state[choice] + 1, held: null, heldSince: null, lastSeen: null, cooldownUntil: now + 500 };
}

export function shares(state: VoteState): { up: number; down: number; total: number } {
  const total = state.up + state.down;
  if (!total) return { up: 0, down: 0, total: 0 };
  const raw = [state.up * 100 / total, state.down * 100 / total];
  const floors = raw.map(Math.floor);
  const remaining = 100 - floors[0] - floors[1];
  const order = raw.map((n, i) => ({ i, fraction: n - floors[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < remaining; i++) floors[order[i].i]++;
  return { up: floors[0], down: floors[1], total };
}

export function resetVotes(state: VoteState): VoteState {
  return { ...state, up: 0, down: 0, held: null, heldSince: null, lastSeen: null, cooldownUntil: 0 };
}
