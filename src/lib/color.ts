const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

/** Black (navy) or white text, whichever has the higher contrast on the given #rrggbb background. */
export function readableOn(hex: string): '#0B1220' | '#ffffff' {
  const l = luminance(hex);
  const white = 1.05 / (l + 0.05);
  const dark = (l + 0.05) / (luminance('#0B1220') + 0.05);
  return dark > white ? '#0B1220' : '#ffffff';
}
