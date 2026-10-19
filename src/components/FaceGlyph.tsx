/** Simple line drawing of a face with tracking points, shown while the camera is off. */
export function FaceGlyph({ size = 96, className = 'mx-auto' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden focusable="false">
      <path d="M8 30V14a6 6 0 0 1 6-6h16M90 8h16a6 6 0 0 1 6 6v16M112 90v16a6 6 0 0 1-6 6H90M30 112H14a6 6 0 0 1-6-6V90" fill="none" stroke="#5b8ef5" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="60" cy="60" rx="30" ry="38" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
      {[
        [48, 52], [72, 52], [60, 64], [50, 78], [60, 81], [70, 78], [36, 60], [84, 60], [60, 26], [44, 34], [76, 34], [60, 96],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill="#ffffff" />
      ))}
    </svg>
  );
}
