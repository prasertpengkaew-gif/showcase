import { useEffect, useState } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
  /** Accessible description of where the code leads. */
  label: string;
  className?: string;
  /** Use light caption text on dark backgrounds. */
  onDark?: boolean;
}

const isLocalHost = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname === '0.0.0.0' || hostname.startsWith('127.') || hostname === '[::1]';
  } catch {
    return false;
  }
};

/** Renders a scannable QR code (SVG) for a URL. The encoder is loaded on demand. */
export function QRCode({ value, size = 152, label, className = '', onDark = false }: QRCodeProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((qr) => qr.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0B1220', light: '#FFFFFF' } }))
      .then((s) => !cancelled && setSvg(s))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <figure className={className}>
      {svg ? (
        <div
          role="img"
          aria-label={label}
          className="overflow-hidden rounded-xl bg-white p-2 ring-1 ring-line [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
          style={{ width: size, height: size }}
          // The SVG is generated locally by the qrcode library from the page URL.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div
          className="grid place-items-center rounded-xl bg-white p-2 text-xs text-muted ring-1 ring-line"
          style={{ width: size, height: size }}
        >
          {failed ? 'QR code unavailable' : 'Generating…'}
        </div>
      )}
      {isLocalHost(value) && (
        <figcaption className={`mt-2 max-w-[16rem] text-xs leading-relaxed ${onDark ? 'text-amber-300' : 'text-amber-800'}`}>
          This is a local development address, so a phone can't open it. Deploy the site or use an HTTPS tunnel
          (see README) to test on a phone.
        </figcaption>
      )}
    </figure>
  );
}
