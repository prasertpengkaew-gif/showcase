import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { createWall, MAX_NAME, MAX_TEXT, onWall, photoOk, post, setHidden } from '../lib/photoWall';
import { useT } from '../i18n';

type View = 'guest' | 'host';
const VIEWS: View[] = ['guest', 'host'];

export default function PhotoWall() {
  const d = useT().photoWall;
  useDocumentTitle(d.metaTitle);
  const [state, setState] = useState(createWall);
  const [view, setView] = useState<View>('guest');
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const urls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  // Photos stay in this browser tab as temporary links; release them when the page closes.
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!photoOk(file.type, file.size)) { setNotice(d.badPhoto); e.target.value = ''; return; }
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setPhoto(url);
    setNotice('');
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = post(state, { name, text, photo }, Date.now());
    setNotice(next === state ? d.rejected : d.posted);
    if (next !== state) { setState(next); setText(''); setPhoto(null); if (fileInput.current) fileInput.current.value = ''; }
  };
  const wall = onWall(state);
  const field = 'mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base';

  return <DemoShell d={d}>
    <div className="mt-8"><OptionChips legend={d.viewLegend} options={VIEWS} value={view} onChange={setView} format={(v) => d.views[v]} /></div>
    <p className="sr-only" aria-live="polite">{notice}</p>
    <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_3fr]">
      {view === 'guest' ? <form onSubmit={submit} className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{d.formTitle}</h2>
        <label className="mt-5 block text-sm font-semibold">{d.nameLabel}<input className={field} value={name} maxLength={MAX_NAME} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="mt-4 block text-sm font-semibold">{d.textLabel}<textarea className={field} rows={3} value={text} maxLength={MAX_TEXT} onChange={(e) => setText(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-semibold">{d.photoLabel}<input ref={fileInput} className="mt-1 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} /></label>
        {photo && <img src={photo} alt="" className="mt-3 h-24 w-24 rounded-xl object-cover" />}
        <Button className="mt-5" type="submit">{d.postButton}</Button>
        {notice && <p className="mt-3 text-sm text-muted">{notice}</p>}
      </form> : <div className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{d.hostTitle}</h2>
        <p className="mt-2 text-muted">{d.hostText}</p>
        {state.posts.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-4 text-slate-700">{d.noPosts}</p> : <ul className="mt-4 grid gap-3">
          {state.posts.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3">
            <span className="min-w-0 flex-1 break-words text-sm"><strong>{p.name}</strong>: {p.text || d.photoOnly}</span>
            <Button variant="ghost" onClick={() => setState(setHidden(state, p.id, !p.hidden))}>{p.hidden ? d.unhide : d.hide}</Button>
          </li>)}
        </ul>}
      </div>}
      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white sm:p-8" aria-label={d.screenLabel}>
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">{d.screenLabel}</p>
        {wall.length === 0 ? <p className="mt-6 font-display text-2xl font-bold">{d.screenIdle}</p> : <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {wall.map((p) => <li key={p.id} className="overflow-hidden rounded-2xl bg-white/10">
            {p.photo && <img src={p.photo} alt="" className="h-40 w-full object-cover" />}
            <div className="p-4"><p className="break-words font-semibold">{p.text}</p><p className="mt-1 text-sm text-slate-300">— {p.name}</p></div>
          </li>)}
        </ul>}
      </div>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
