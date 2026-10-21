import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  ...props,
});

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const CubeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 2.8 20 7.3v9.4l-8 4.5-8-4.5V7.3z" /><path d="m4 7.3 8 4.6 8-4.6M12 11.9v9.3" /></svg>
);
export const ScanIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="m12 7 4 2.3v4.6L12 16l-4-2.1V9.3z" /></svg>
);
export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></svg>
);
export const HandIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V13" /><path d="M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.3-2.4L3.4 15.8a1.6 1.6 0 0 1 2.3-2.2L8 15.5" /></svg>
);
export const CompassIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
);
export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" /></svg>
);
export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M8 5v14M16 5v14" strokeWidth={2.5} /></svg>
);
export const RotateIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5" /></svg>
);
export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5M12 17.2v.1" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.1" /></svg>
);
export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>
);
export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
);
export const MapPinIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 21s-7-6.3-7-11.5a7 7 0 0 1 14 0C19 14.7 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" /></svg>
);
export const ExternalIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></svg>
);
export const HeadsetIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3.5 9.5A2.5 2.5 0 0 1 6 7h12a2.5 2.5 0 0 1 2.5 2.5v5A2.5 2.5 0 0 1 18 17h-3l-1.6-2.1a1.8 1.8 0 0 0-2.8 0L9 17H6a2.5 2.5 0 0 1-2.5-2.5z" /><circle cx="8" cy="12" r="1.3" /><circle cx="16" cy="12" r="1.3" /></svg>
);
export const LineIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4c4.97 0 9 3.13 9 7 0 3.6-3.56 6.2-8.6 8.6-.6.28-1-.2-.85-.75l.35-1.35C6.94 17.2 3 14.4 3 11c0-3.87 4.03-7 9-7z" /><path d="M7.5 9.5v3h2M11 9.5v3M13 12.5v-3l2.5 3v-3M18 9.5h-1.8v3H18M16.2 11h1.6" strokeWidth={1.4} /></svg>
);
export const FaceIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><circle cx="9.5" cy="10.5" r=".6" fill="currentColor" /><circle cx="14.5" cy="10.5" r=".6" fill="currentColor" /><path d="M9.5 14.5a3.5 3.5 0 0 0 5 0" /></svg>
);
export const ShirtIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 4 4 6.5 2.5 11l3 1.2V20h13v-7.8l3-1.2L20 6.5 15 4a3 3 0 0 1-6 0z" /></svg>
);
export const FactoryIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 20V10l5 3V10l5 3V10l5 3V4h3v16z" /><path d="M7 17h2M12 17h2M17 17h2" /></svg>
);
export const ExpandIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const ShrinkIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
);
export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);
export const FlagIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);
export const GamepadIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2.5" y="7" width="19" height="11" rx="5.5" /><path d="M7.5 10.5v4M5.5 12.5h4" /><circle cx="15.5" cy="11.5" r="1" /><circle cx="18" cy="14" r="1" /></svg>
);
export const FlaskIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 3h6M10 3v6l-5.2 9a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3" /><path d="M7.5 14h9" /></svg>
);
export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></svg>
);
export const MapIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" /></svg>
);
export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" /></svg>
);
export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" /></svg>
);
export const CategoryIcon = ({ category, ...p }: IconProps & { category: 'transit' | 'food' | 'shopping' | 'culture' | 'health' | 'park' | 'education' | 'stay' }) => {
  const paths: Record<string, string> = {
    transit: 'M6 4h12v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3zM6 11h12M9 21l1.5-3M15 21l-1.5-3',
    food: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11',
    shopping: 'M6 8h12l1 12H5zM9 8a3 3 0 0 1 6 0',
    culture: 'M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M3 10l9-6 9 6',
    health: 'M12 5v14M5 12h14',
    education: 'M2 9l10-5 10 5-10 5zM6 11.5V16c3 2.5 9 2.5 12 0v-4.5',
    stay: 'M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3',
    park: 'M12 21v-6M9 15h6a4 4 0 0 0 1-7.5A5 5 0 0 0 8 7.5 4 4 0 0 0 9 15z',
  };
  return (
    <svg {...base({ strokeWidth: 2.2, ...p })}>
      <path d={paths[category]} />
    </svg>
  );
};
