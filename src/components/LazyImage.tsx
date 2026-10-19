import { useState, type ImgHTMLAttributes } from 'react';
import { useT } from '../i18n';

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'onLoad' | 'onError'> {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Load immediately (use for above-the-fold images). */
  priority?: boolean;
  wrapperClassName?: string;
}

/**
 * Native lazy-loaded image with reserved space (no layout shift), a soft placeholder
 * while loading, and a readable fallback if the file is missing.
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  wrapperClassName = '',
  ...rest
}: LazyImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const t = useT();

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 ${wrapperClassName}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {status === 'error' ? (
        <div className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-muted">
          {t.image.unavailable}
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          {...rest}
        />
      )}
      {status === 'loading' && <div className="absolute inset-0 animate-pulse bg-slate-200/60" aria-hidden />}
    </div>
  );
}
