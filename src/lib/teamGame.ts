export interface Player {
  id: string;
  name: string;
  score: number;
  bot: boolean;
}

export const GAME_SECONDS = 15;

export const createGame = (you: string, bots: string[]): Player[] => [{ id: 'you', name: you, score: 0, bot: false }, ...bots.map((name, i) => ({ id: `bot${i}`, name, score: 0, bot: true }))];

export const tap = (players: Player[], id: string): Player[] => players.map((p) => (p.id === id ? { ...p, score: p.score + 1 } : p));

/** Each simulated player taps with its own chance each tick (rng returns [0, 1)). */
export const botTick = (players: Player[], rng: () => number, chance = 0.55): Player[] => players.map((p) => (p.bot && rng() < chance ? { ...p, score: p.score + 1 } : p));

/** Highest score first; ties keep alphabetical order so the board does not jump around. */
export const board = (players: Player[]): Player[] => [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

export const rankOf = (players: Player[], id: string) => board(players).findIndex((p) => p.id === id) + 1;
