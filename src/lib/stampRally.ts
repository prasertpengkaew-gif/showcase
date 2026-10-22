export const BOOTHS = ['a', 'b', 'c', 'd', 'e'] as const;
export type BoothId = (typeof BOOTHS)[number];

/** Stamps needed to win the prize. */
export const REWARD_AT = 4;

export interface Lead {
  booth: BoothId;
  name: string;
  email: string;
  at: number;
}

export interface RallyState {
  stamps: BoothId[];
  leads: Lead[];
}

export const createRally = (): RallyState => ({ stamps: [], leads: [] });

/** A booth counts once per visitor: scanning it again changes nothing. */
export const scan = (state: RallyState, booth: BoothId): RallyState =>
  state.stamps.includes(booth) ? state : { ...state, stamps: [...state.stamps, booth] };

export const hasReward = (state: RallyState) => state.stamps.length >= REWARD_AT;

/** A visitor shares contact details with one booth, and only after agreeing. */
export const addLead = (state: RallyState, booth: BoothId, name: string, email: string, consent: boolean, at: number): RallyState => {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const valid = consent && cleanName.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  if (!valid || state.leads.some((l) => l.booth === booth && l.email === cleanEmail)) return state;
  return { ...state, leads: [...state.leads, { booth, name: cleanName, email: cleanEmail, at }] };
};

export const leadsPerBooth = (state: RallyState): Record<BoothId, number> =>
  Object.fromEntries(BOOTHS.map((b) => [b, state.leads.filter((l) => l.booth === b).length])) as Record<BoothId, number>;

/** Spreadsheet-safe CSV: quotes doubled, and cells that start like a formula get a leading apostrophe. */
export const leadsCsv = (state: RallyState, boothName: (b: BoothId) => string): string => {
  const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  return ['﻿booth,name,email,time', ...state.leads.map((l) => [boothName(l.booth), l.name, l.email, new Date(l.at).toISOString()].map(cell).join(','))].join('\n');
};
