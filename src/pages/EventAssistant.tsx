import { useState } from 'react';
import { Button } from '../components/Button';
import { DemoShell } from '../components/DemoShell';
import { OptionChips } from '../components/OptionChips';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { answerFor, ASSIST_LANGS, type AssistLang, type Faq } from '../lib/eventAssistant';
import { useT } from '../i18n';

export default function EventAssistant() {
  const d = useT().assistant;
  useDocumentTitle(d.metaTitle);
  const [lang, setLang] = useState<AssistLang>('en');
  const [text, setText] = useState('');
  const [asked, setAsked] = useState<{ question: string; faq: Faq | null } | null>(null);

  const ask = (question: string) => { setText(question); setAsked({ question, faq: answerFor(question) }); };

  return <DemoShell d={d}>
    <div className="mt-8"><OptionChips legend={d.langLegend} options={ASSIST_LANGS} value={lang} onChange={setLang} format={(l) => d.langs[l]} /></div>
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) ask(text.trim()); }} className="min-w-0 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <label className="block text-sm font-semibold">{d.askLabel}<input className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} /></label>
        <Button className="mt-4" type="submit">{d.askButton}</Button>
        <p className="mt-6 text-sm font-semibold">{d.tryTitle}</p>
        <div className="mt-2 flex flex-wrap gap-2">{d.examples[lang].map((q) => <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border border-line bg-white px-4 py-2 text-sm hover:border-slate-300 hover:bg-surface">{q}</button>)}</div>
      </form>
      <div className="min-w-0 rounded-3xl bg-navy-900 p-6 text-white sm:p-8" role="status" aria-live="polite">
        {!asked ? <p className="text-slate-300">{d.idle}</p> : <>
          <p className="text-sm text-slate-400">{asked.question}</p>
          <p className="mt-4 font-display text-2xl leading-snug font-bold">{asked.faq ? asked.faq.answer[lang] : d.noAnswer[lang]}</p>
          {asked.faq && <p className="mt-4 text-xs text-slate-400">{d.source(d.topics[asked.faq.id])}</p>}
        </>}
      </div>
    </div>
    <p className="mt-6 text-sm text-muted">{d.privacy}</p>
  </DemoShell>;
}
