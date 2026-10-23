export const HOURS = [9, 10, 11, 12, 13, 14, 15, 16] as const;
export const ACTIVITIES = ['booth', 'photo', 'game', 'talk', 'food'] as const;
export type Activity = (typeof ACTIVITIES)[number];
export type Day = 1 | 2;

/** Sample numbers for a two-day trade show: check-ins per hour and visits per activity. */
export const SAMPLE: Record<Day, { checkIns: number[]; visits: Record<Activity, number> }> = {
  1: { checkIns: [120, 340, 410, 280, 360, 450, 300, 90], visits: { booth: 820, photo: 560, game: 640, talk: 380, food: 450 } },
  2: { checkIns: [90, 260, 330, 240, 300, 380, 250, 70], visits: { booth: 640, photo: 470, game: 710, talk: 310, food: 390 } },
};

export const total = (day: Day) => SAMPLE[day].checkIns.reduce((a, b) => a + b, 0);

/** The busiest hour; the earlier hour wins a tie. */
export const peakHour = (day: Day) => {
  const { checkIns } = SAMPLE[day];
  return { hour: HOURS[checkIns.indexOf(Math.max(...checkIns))], count: Math.max(...checkIns) };
};

export const topActivity = (day: Day): { activity: Activity; share: number } => {
  const v = SAMPLE[day].visits;
  const sum = ACTIVITIES.reduce((a, k) => a + v[k], 0);
  const activity = ACTIVITIES.reduce((best, k) => (v[k] > v[best] ? k : best), ACTIVITIES[0]);
  return { activity, share: Math.round((v[activity] / sum) * 100) };
};

export const reportCsv = (day: Day, activityName: (a: Activity) => string): string =>
  ['hour,check_ins', ...HOURS.map((h, i) => `${h}:00,${SAMPLE[day].checkIns[i]}`), '', 'activity,visits', ...ACTIVITIES.map((a) => `"${activityName(a).replace(/"/g, '""')}",${SAMPLE[day].visits[a]}`)].join('\n');
