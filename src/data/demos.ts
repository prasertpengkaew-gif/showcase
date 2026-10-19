import type { ComponentType, SVGProps } from 'react';
import { CameraIcon, CompassIcon, CubeIcon, FaceIcon, FactoryIcon, HandIcon, HeadsetIcon, ScanIcon, ShirtIcon } from '../components/Icons';

export type DemoId = 'ar' | 'print' | 'face' | 'tryon' | 'hands' | 'vr' | 'tour' | 'twin' | 'event';

export interface Demo {
  id: DemoId;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Preview image; demos without one show their icon on a dark panel. */
  image?: string;
}

export const demos: Demo[] = [
  { id: 'ar', to: '/ar-playground', icon: CubeIcon, image: '/images/posters/chair.webp' },
  { id: 'print', to: '/print-ar', icon: ScanIcon, image: '/ar-card/card.png' },
  { id: 'face', to: '/face-ar', icon: FaceIcon },
  { id: 'event', to: '/event-booth', icon: CameraIcon },
  { id: 'tryon', to: '/try-on', icon: ShirtIcon },
  { id: 'hands', to: '/hand-gestures', icon: HandIcon },
  { id: 'vr', to: '/vr-showroom', icon: HeadsetIcon, image: '/images/vr-showroom.webp' },
  { id: 'tour', to: '/virtual-tour', icon: CompassIcon, image: '/tour/living-thumb.webp' },
  { id: 'twin', to: '/digital-twin', icon: FactoryIcon, image: '/images/digital-twin.webp' },
];

export const demoPaths = ['/demos', ...demos.map((d) => d.to)];
