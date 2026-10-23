import { useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ask, createQa, MAX_QUESTION, ranked, showOnScreen, vote, wordCounts } from '../lib/liveQa';
import { useT } from '../i18n';

type View = 'audience' | 'host';
const VIEWS: View[] = ['audience', 'host'];

export default function LiveQA() {
  const d = useT().liveQa;
  useDocumentTitle(d.metaTitle);
  const [state, setState] = useState(() => {
    let s = createQa();
    d.samples.forEach((text, i) => { s = ask(s, text, i); });
    // Pretend a few other people already voted, so the order and the word cloud have something to show.
    [[1, 4], [2, 2], [3, 1]].forEach(([id, n]) => { for (let k = 0; k < n; k++) s = vote(s, id, `guest${k}`); });
    return s;
  });
  const [view, setView] = useState<View>('audience');
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const list = ranked(state);
  const words = wordCounts(state, 18);
  const maxCount = words[0]?.count ?? 1;
  const live = state.questions.find((q) => q.id === state.onScreen);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = ask(state, text, Date.now());
    setNotice(next === state ? d.rejected : d.sent);
    if (next !== state) { setState(next); setText(''); }
  };

  return <DemoShell d={d}>
    <div className="mt-8"><OptionChips legend={d.viewLegend} options={VIEWS} value={view} onChange={setView} format={(v) => d.views[v]} /></div>
    <p className="sr-only" aria-live="polite">{notice}</p>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        {view === 'audience' && <form onSubmit={submit} className="mb-6">
          <label className="block text-sm font-semibold">{d.askLabel}
            <input className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base" value={text} maxLength={MAX_QUESTION} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="mt-3 flex items-center gap-3"><Button type="submit">{d.askButton}</Button>{notice && <span className="text-sm text-muted">{notice}</span>}</div>
        </form>}
        <h2 className="font-display text-xl font-bold">{d.listTitle}</h2>
        <ul className="mt-4 grid gap-3">
          {list.map((q) => <li key={q.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${q.id === state.onScreen ? 'border-electric-600 bg-electric-600/5' : 'border-line'}`}>
            <span className="min-w-0 flex-1 break-words font-semibold">{q.text}</span>
            {view === 'audience'
              ? <Button variant="ghost" onClick={() => setState(vote(state, q.id, 'me'))} disabled={q.voters.includes('me')}>👍 {q.voters.length}</Button>
              : <Button variant={q.id === state.onScreen ? 'secondary' : 'primary'} onClick={() => setState(showOnScreen(state, q.id === state.onScreen ? null : q.id))}>{q.id === state.onScreen ? d.hide : d.show} · {q.voters.length}</Button>}
          </li>)}
        </ul>
      </div>
      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white sm:p-8" aria-label={d.screenLabel}>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">{d.screenLabel}</p>
        <p className="mt-4 min-h-24 font-display text-2xl leading-snug font-bold sm:text-3xl">{live ? live.text : d.screenIdle}</p>
        <h2 className="mt-8 text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">{d.cloudTitle}</h2>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {words.map((w) => <span key={w.word} className="font-display font-bold text-electric-100" style={{ fontSize: `${1 + (w.count / maxCount) * 1.6}rem` }}>{w.word}</span>)}
        </p>
      </div>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
