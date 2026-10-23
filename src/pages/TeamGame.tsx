import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { board, botTick, createGame, GAME_SECONDS, rankOf, tap } from '../lib/teamGame';
import { useT } from '../i18n';

type Phase = 'ready' | 'playing' | 'done';

export default function TeamGame() {
  const d = useT().teamGame;
  useDocumentTitle(d.metaTitle);
  const [players, setPlayers] = useState(() => createGame(d.you, d.bots));
  const [phase, setPhase] = useState<Phase>('ready');
  const [left, setLeft] = useState(GAME_SECONDS);
  const startedAt = useRef(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    const id = window.setInterval(() => {
      const remaining = GAME_SECONDS - Math.floor((performance.now() - startedAt.current) / 1000);
      setLeft(Math.max(0, remaining));
      setPlayers((p) => botTick(p, Math.random));
      if (remaining <= 0) setPhase('done');
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const start = () => { startedAt.current = performance.now(); setPlayers(createGame(d.you, d.bots)); setLeft(GAME_SECONDS); setPhase('playing'); };
  const ranking = board(players);
  const top = Math.max(1, ranking[0].score);

  return <DemoShell d={d}>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <div className="min-w-0 rounded-3xl border border-line bg-white p-6 text-center sm:p-8">
        <p className="font-display text-5xl font-extrabold tabular-nums" role="timer" aria-label={d.timeLabel}>{left}s</p>
        {phase === 'playing'
          ? <button type="button" onClick={() => setPlayers((p) => tap(p, 'you'))} className="mt-6 h-40 w-full rounded-3xl bg-electric-600 font-display text-3xl font-extrabold text-white active:scale-[0.98] active:bg-electric-700">{d.tapButton}</button>
          : <Button className="mt-6" size="lg" onClick={start}>{phase === 'done' ? d.again : d.start}</Button>}
        <p className="mt-4 text-lg font-semibold" role="status">{phase === 'done' ? d.result(rankOf(players, 'you'), players.find((p) => p.id === 'you')!.score) : phase === 'ready' ? d.hint : d.go}</p>
      </div>
      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white sm:p-8" aria-label={d.boardLabel}>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">{d.boardLabel}</p>
        <ol className="mt-5 grid gap-3">
          {ranking.map((p, i) => <li key={p.id}>
            <div className="flex justify-between font-semibold"><span>{i + 1}. {p.name}{p.id === 'you' && ` (${d.you})`}</span><span className="tabular-nums">{p.score}</span></div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/15"><div className={`h-full ${p.id === 'you' ? 'bg-electric-100' : 'bg-slate-400'}`} style={{ width: `${(p.score / top) * 100}%` }} /></div>
          </li>)}
        </ol>
      </div>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
