import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useT } from '../i18n';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm)$/i;

export default function RoomCapture() {
  const t = useT().roomCapture;
  useDocumentTitle(t.metaTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : '', [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const onSelect = (selected?: File) => {
    setError('');
    if (!selected) return;
    if (!(selected.type.startsWith('video/') || VIDEO_EXTENSIONS.test(selected.name))) {
      setError(t.unsupported);
      return;
    }
    if (selected.size > MAX_VIDEO_BYTES) {
      setError(t.tooLarge);
      return;
    }
    setFile(selected);
  };

  const size = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '';

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8" aria-label={t.title}>
            {file ? (
              <>
                <video className="max-h-[65vh] w-full rounded-2xl bg-navy-950" src={previewUrl} controls playsInline />
                <p className="mt-4 break-all text-sm text-slate-600">{t.fileInfo(file.name, size)}</p>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                <p>{t.empty}</p>
              </div>
            )}
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              capture="environment"
              onChange={(event) => {
                onSelect(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
              aria-label={t.select}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => inputRef.current?.click()}>{file ? t.chooseAgain : t.select}</Button>
              {file && <Button variant="ghost" onClick={() => { setFile(null); setError(''); }}>{t.clear}</Button>}
            </div>
            {error && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{error}</p>}
            <div className="mt-6 rounded-2xl bg-blue-50 p-5">
              <h2 className="font-semibold text-navy-900">{t.privacyTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{t.privacyText}</p>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-line bg-white p-6">
              <h2 className="text-lg font-semibold text-navy-900">{t.tipsTitle}</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
                {t.tips.map((tip) => <li key={tip}>{tip}</li>)}
              </ol>
            </section>
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-semibold text-amber-950">{t.disconnectedTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">{t.disconnectedText}</p>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
