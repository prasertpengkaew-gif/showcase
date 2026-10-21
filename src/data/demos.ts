import type { ComponentType, SVGProps } from 'react';
import { CameraIcon, CompassIcon, FlagIcon, FlaskIcon, GamepadIcon, MapIcon, TagIcon, CubeIcon, FaceIcon, FactoryIcon, HandIcon, HeadsetIcon, ScanIcon, ShirtIcon } from '../components/Icons';

export type DemoId = 'ar' | 'print' | 'face' | 'tryon' | 'hands' | 'vr' | 'tour' | 'twin' | 'event' | 'hunt' | 'game' | 'chem' | 'cube' | 'tags' | 'map';

export type DemoGroup = 'phone' | 'marker' | 'camera' | 'event' | 'space';
export const demoGroups: DemoGroup[] = ['phone', 'marker', 'camera', 'event', 'space'];

export interface Demo {
  id: DemoId;
  group: DemoGroup;
  /** Shown in the short list on the home page. */
  featured?: boolean;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Preview image; demos without one show their icon on a dark panel. */
  image?: string;
}

export const demos: Demo[] = [
  { id: 'ar', group: 'phone', featured: true, to: '/ar-playground', icon: CubeIcon, image: '/images/posters/chair.webp' },
  { id: 'print', group: 'phone', featured: true, to: '/print-ar', icon: ScanIcon, image: '/ar-card/card.png' },
  { id: 'tour', group: 'phone', to: '/virtual-tour', icon: CompassIcon, image: '/tour/living-thumb.webp' },
  { id: 'chem', group: 'marker', to: '/marker-chem', icon: FlaskIcon, image: '/images/marker-chem.webp' },
  { id: 'cube', group: 'marker', to: '/ar-cube', icon: CubeIcon, image: '/images/ar-cube.webp' },
  { id: 'tags', group: 'marker', to: '/machine-tags', icon: TagIcon, image: '/images/machine-tags.webp' },
  { id: 'face', group: 'camera', featured: true, to: '/face-ar', icon: FaceIcon },
  { id: 'tryon', group: 'camera', to: '/try-on', icon: ShirtIcon },
  { id: 'hands', group: 'camera', to: '/hand-gestures', icon: HandIcon },
  { id: 'event', group: 'event', to: '/event-booth', icon: CameraIcon },
  { id: 'hunt', group: 'event', featured: true, to: '/ar-hunt', icon: FlagIcon, image: '/images/ar-hunt.webp' },
  { id: 'game', group: 'event', to: '/motion-game', icon: GamepadIcon, image: '/images/motion-game.webp' },
  { id: 'vr', group: 'space', featured: true, to: '/vr-showroom', icon: HeadsetIcon, image: '/images/vr-showroom.webp' },
  { id: 'map', group: 'space', featured: true, to: '/map-3d', icon: MapIcon, image: '/images/map-3d.webp' },
  { id: 'twin', group: 'space', featured: true, to: '/digital-twin', icon: FactoryIcon, image: '/images/digital-twin.webp' },
];

export const demoPaths = ['/demos', ...demos.map((d) => d.to)];
