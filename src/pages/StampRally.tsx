import { useState } from 'react';
import { Button, ButtonLink } from '../components/Button';
import { OptionChips } from '../components/OptionChips';
import { PageHeader } from '../components/PageHeader';
import { SectionHeading } from '../components/SectionHeading';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { addLead, BOOTHS, createRally, hasReward, leadsCsv, leadsPerBooth, REWARD_AT, scan, type BoothId } from '../lib/stampRally';
import { useT } from '../i18n';

type View = 'visitor' | 'organizer';
const VIEWS: View[] = ['visitor', 'organizer'];

export default function StampRally() {
  const d = useT().rally;
  useDocumentTitle(d.metaTitle);
  const [state, setState] = useState(createRally);
  const [view, setView] = useState<View>('visitor');
  const [booth, setBooth] = useState<BoothId>('a');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState('');
  const counts = leadsPerBooth(state);

  const stamp = (id: BoothId) => {
    const next = scan(state, id);
    setState(next);
    setNotice(next === state ? d.alreadyStamped(d.booths[id]) : d.stamped(d.booths[id], next.stamps.length, REWARD_AT));
  };
  const share = (e: React.FormEvent) => {
    e.preventDefault();
    const next = addLead(state, booth, name, email, consent, Date.now());
    setNotice(next === state ? d.leadRejected : d.leadSaved(d.booths[booth]));
    if (next !== state) { setState(next); setName(''); setEmail(''); setConsent(false); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([leadsCsv(state, (b) => d.booths[b])], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'leads.csv' });
    a.click();
    URL.revokeObjectURL(url);
  };
  const field = 'mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base';

  return <>
    <PageHeader eyebrow={d.eyebrow} title={d.title} description={d.description} />
    <section className="bg-surface py-12 sm:py-16">
      <div className="container-page">
        <div className="rounded-2xl border border-line bg-white p-4 text-sm leading-relaxed text-slate-700"><strong>{d.sampleTitle}.</strong> {d.sampleText}</div>
        <div className="mt-8"><OptionChips legend={d.viewLegend} options={VIEWS} value={view} onChange={setView} format={(v) => d.views[v]} /></div>
        <p className="sr-only" aria-live="polite">{notice}</p>
        {notice && <p className="mt-4 rounded-xl bg-electric-600/10 px-4 py-3 text-sm font-semibold text-slate-800">{notice}</p>}

        {view === 'visitor' ? <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">{d.cardTitle}</h2>
            <p className="mt-2 text-muted">{d.cardText(REWARD_AT, BOOTHS.length)}</p>
            <ul className="mt-6 grid gap-3">
              {BOOTHS.map((id) => {
                const done = state.stamps.includes(id);
                return <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4">
                  <span className="flex items-center gap-3"><span aria-hidden className="text-2xl">{done ? '✅' : '⬜'}</span><span className="font-semibold">{d.booths[id]}</span></span>
                  <Button variant={done ? 'ghost' : 'primary'} onClick={() => stamp(id)}>{done ? d.stampedLabel : d.scanButton}</Button>
                </li>;
              })}
            </ul>
            <div role="status" className={`mt-6 rounded-2xl p-4 font-semibold ${hasReward(state) ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-700'}`}>
              {hasReward(state) ? d.rewardReady : d.rewardProgress(state.stamps.length, REWARD_AT)}
            </div>
          </div>
          <form onSubmit={share} className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">{d.leadTitle}</h2>
            <p className="mt-2 text-muted">{d.leadText}</p>
            <label className="mt-5 block text-sm font-semibold">{d.boothLabel}
              <select className={field} value={booth} onChange={(e) => setBooth(e.target.value as BoothId)}>{BOOTHS.map((id) => <option key={id} value={id}>{d.booths[id]}</option>)}</select>
            </label>
            <label className="mt-4 block text-sm font-semibold">{d.nameLabel}<input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
            <label className="mt-4 block text-sm font-semibold">{d.emailLabel}<input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
            <label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{d.consent}</span></label>
            <Button className="mt-6 w-full" size="lg" type="submit">{d.shareButton}</Button>
          </form>
        </div> : <div className="mt-8 rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold">{d.organizerTitle}</h2>
          <p className="mt-2 text-muted">{d.organizerText}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-5">
            {BOOTHS.map((id) => <div key={id} className="rounded-2xl border border-line p-4"><p className="text-sm font-semibold text-muted">{d.booths[id]}</p><p className="mt-1 text-3xl font-bold tabular-nums">{counts[id]}</p><p className="text-xs text-muted">{d.leadsUnit}</p></div>)}
          </div>
          {state.leads.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-4 text-slate-700">{d.noLeads}</p> : <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[32rem] text-left text-sm">
            <thead><tr className="border-b border-line text-muted"><th className="py-2 pr-4">{d.boothLabel}</th><th className="py-2 pr-4">{d.nameLabel}</th><th className="py-2">{d.emailLabel}</th></tr></thead>
            <tbody>{state.leads.map((l) => <tr key={`${l.booth}-${l.email}`} className="border-b border-line/60"><td className="py-2 pr-4">{d.booths[l.booth]}</td><td className="py-2 pr-4">{l.name}</td><td className="py-2">{l.email}</td></tr>)}</tbody>
          </table></div>}
          <div className="mt-6"><Button onClick={download} disabled={state.leads.length === 0}>{d.download}</Button></div>
        </div>}
        <p className="mt-6 text-sm text-muted">{d.privacy}</p>
      </div>
    </section>
    <section className="py-16 sm:py-20"><div className="container-page"><SectionHeading eyebrow={d.howEyebrow} title={d.howTitle} description={d.howText} /><h2 className="mt-12 font-display text-2xl font-bold">{d.goodTitle}</h2><div className="mt-6 grid gap-8 md:grid-cols-3">{d.goodToKnow.map((item) => <div key={item.title} className="border-t-2 border-electric-600 pt-5"><h3 className="font-display text-lg font-bold">{item.title}</h3><p className="mt-2 leading-relaxed text-muted">{item.text}</p></div>)}</div></div></section>
    <section className="bg-navy-900 py-16 text-white"><div className="container-page flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"><div><h2 className="font-display text-3xl font-bold">{d.ctaTitle}</h2><p className="mt-3 text-slate-300">{d.ctaText}</p></div><ButtonLink to="/contact" size="lg">{d.ctaContact}</ButtonLink></div></section>
  </>;
}
