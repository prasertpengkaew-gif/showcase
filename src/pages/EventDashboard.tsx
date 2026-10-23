import { useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ACTIVITIES, HOURS, peakHour, reportCsv, SAMPLE, topActivity, total, type Day } from '../lib/eventStats';
import { useT } from '../i18n';

const DAYS = ['1', '2'] as const;

export default function EventDashboard() {
  const d = useT().stats;
  useDocumentTitle(d.metaTitle);
  const [dayKey, setDayKey] = useState<(typeof DAYS)[number]>('1');
  const day = Number(dayKey) as Day;
  const { checkIns, visits } = SAMPLE[day];
  const peak = peakHour(day);
  const top = topActivity(day);
  const maxHour = Math.max(...checkIns);
  const maxVisit = Math.max(...ACTIVITIES.map((a) => visits[a]));

  const download = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + reportCsv(day, (a) => d.activities[a])], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: `event-report-day${day}.csv` }).click();
    URL.revokeObjectURL(url);
  };
  const tile = 'rounded-2xl border border-line bg-white p-5';

  return <DemoShell d={d}>
    <div className="mt-8"><OptionChips legend={d.dayLegend} options={DAYS} value={dayKey} onChange={setDayKey} format={(v) => d.day(Number(v))} /></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className={tile}><p className="text-sm font-semibold text-muted">{d.totalLabel}</p><p className="mt-1 text-4xl font-bold tabular-nums">{total(day).toLocaleString()}</p></div>
      <div className={tile}><p className="text-sm font-semibold text-muted">{d.peakLabel}</p><p className="mt-1 text-4xl font-bold tabular-nums">{peak.hour}:00</p><p className="text-sm text-muted">{d.peakCount(peak.count)}</p></div>
      <div className={tile}><p className="text-sm font-semibold text-muted">{d.topLabel}</p><p className="mt-1 text-2xl font-bold">{d.activities[top.activity]}</p><p className="text-sm text-muted">{d.topShare(top.share)}</p></div>
    </div>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold">{d.hourlyTitle}</h2>
        <ul className="mt-5 grid gap-2">{HOURS.map((h, i) => <li key={h} className="flex items-center gap-3 text-sm"><span className="w-12 tabular-nums text-muted">{h}:00</span><span className="h-5 flex-1 overflow-hidden rounded bg-slate-100"><span className={`block h-full ${h === peak.hour ? 'bg-electric-600' : 'bg-electric-100'}`} style={{ width: `${(checkIns[i] / maxHour) * 100}%` }} /></span><span className="w-10 text-right font-semibold tabular-nums">{checkIns[i]}</span></li>)}</ul>
      </div>
      <div className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold">{d.activityTitle}</h2>
        <ul className="mt-5 grid gap-2">{ACTIVITIES.map((a) => <li key={a} className="flex items-center gap-3 text-sm"><span className="w-28 shrink-0 text-muted">{d.activities[a]}</span><span className="h-5 flex-1 overflow-hidden rounded bg-slate-100"><span className={`block h-full ${a === top.activity ? 'bg-electric-600' : 'bg-electric-100'}`} style={{ width: `${(visits[a] / maxVisit) * 100}%` }} /></span><span className="w-10 text-right font-semibold tabular-nums">{visits[a]}</span></li>)}</ul>
        <Button className="mt-6" onClick={download}>{d.download}</Button>
      </div>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
