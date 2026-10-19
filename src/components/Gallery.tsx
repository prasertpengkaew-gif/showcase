import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ProjectImage } from '../types/project';
import { LazyImage } from './LazyImage';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from './Icons';
import { useT } from '../i18n';

/** Image grid with an accessible lightbox (native <dialog>, keyboard arrows, Escape to close). */
export function Gallery({ images }: { images: ProjectImage[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const t = useT();

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      setIndex((i) => {
        if (i !== null) triggerRefs.current[i]?.focus();
        return null;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('keydown', onKey);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('keydown', onKey);
    };
  }, [step]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              ref={(el) => {
                triggerRefs.current[i] = el;
              }}
              type="button"
              onClick={() => open(i)}
              className="group block w-full overflow-hidden rounded-xl"
              aria-label={t.gallery.enlarge(i + 1, images.length, img.alt)}
            >
              <LazyImage
                {...img}
                className="motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t.gallery.dialog}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-navy-950/90"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {current && (
          <figure className="relative w-[min(92vw,1200px)]">
            <img
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-300">
              <span>{current.alt}</span>
              <span className="shrink-0 tabular-nums">
                {index! + 1} / {images.length}
              </span>
            </figcaption>
            <div className="absolute top-3 right-3 flex gap-2">
              <LightboxButton label={t.gallery.prev} onClick={() => step(-1)}>
                <ArrowLeftIcon />
              </LightboxButton>
              <LightboxButton label={t.gallery.next} onClick={() => step(1)}>
                <ArrowRightIcon />
              </LightboxButton>
              <LightboxButton label={t.gallery.close} onClick={close} autoFocus>
                <CloseIcon />
              </LightboxButton>
            </div>
          </figure>
        )}
      </dialog>
    </>
  );
}

function LightboxButton({
  label,
  onClick,
  children,
  autoFocus,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      autoFocus={autoFocus}
      className="grid h-10 w-10 place-items-center rounded-full bg-navy-900/80 text-white backdrop-blur hover:bg-navy-900"
    >
      {children}
    </button>
  );
}
