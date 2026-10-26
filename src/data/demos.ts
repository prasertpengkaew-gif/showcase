import type { ComponentType, SVGProps } from 'react';
import { CameraIcon, CompassIcon, FlagIcon, FlaskIcon, GamepadIcon, LayersIcon, MapIcon, MapPinIcon, SearchIcon, TagIcon, CubeIcon, FaceIcon, FactoryIcon, HandIcon, HeadsetIcon, ScanIcon, ShirtIcon } from '../components/Icons';

export type DemoId = 'ar' | 'print' | 'face' | 'halloweenFace' | 'tryon' | 'hands' | 'vr' | 'tour' | 'twin' | 'event' | 'hunt' | 'game' | 'chem' | 'cube' | 'tags' | 'map' | 'tms' | 'cold' | 'rag' | 'vote' | 'rally' | 'qa' | 'draw' | 'wall' | 'team' | 'assist' | 'motion' | 'stats' | 'newyear' | 'halloween';

export type DemoGroup = 'phone' | 'marker' | 'camera' | 'event' | 'space' | 'apps';
export const demoGroups: DemoGroup[] = ['phone', 'marker', 'camera', 'event', 'space', 'apps'];

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
  { id: 'face', group: 'camera', featured: true, to: '/face-ar', icon: FaceIcon, image: '/images/face-ar.webp' },
  { id: 'halloweenFace', group: 'camera', to: '/halloween-face', icon: FaceIcon },
  { id: 'tryon', group: 'camera', to: '/try-on', icon: ShirtIcon, image: '/images/try-on.webp' },
  { id: 'hands', group: 'camera', to: '/hand-gestures', icon: HandIcon, image: '/images/hand-gestures.webp' },
  { id: 'vote', group: 'event', to: '/gesture-vote', icon: HandIcon, image: '/images/gesture-vote.webp' },
  { id: 'rally', group: 'event', to: '/stamp-rally', icon: FlagIcon },
  { id: 'qa', group: 'event', to: '/live-qa', icon: SearchIcon },
  { id: 'draw', group: 'event', to: '/lucky-draw', icon: TagIcon },
  { id: 'wall', group: 'event', to: '/photo-wall', icon: CameraIcon },
  { id: 'team', group: 'event', to: '/team-game', icon: GamepadIcon },
  { id: 'assist', group: 'event', to: '/event-assistant', icon: HeadsetIcon },
  { id: 'motion', group: 'event', to: '/motion-wall', icon: HandIcon },
  { id: 'stats', group: 'event', to: '/event-dashboard', icon: LayersIcon },
  { id: 'halloween', group: 'phone', to: '/halloween-gate', icon: CubeIcon, image: '/images/posters/halloween-gate.webp' },
  { id: 'newyear', group: 'phone', featured: true, to: '/new-year-ar', icon: CubeIcon, image: '/images/posters/dragon.webp' },
  { id: 'event', group: 'event', to: '/event-booth', icon: CameraIcon, image: '/images/event-booth.webp' },
  { id: 'hunt', group: 'event', featured: true, to: '/ar-hunt', icon: FlagIcon, image: '/images/ar-hunt.webp' },
  { id: 'game', group: 'event', to: '/motion-game', icon: GamepadIcon, image: '/images/motion-game.webp' },
  { id: 'vr', group: 'space', featured: true, to: '/vr-showroom', icon: HeadsetIcon, image: '/images/vr-showroom.webp' },
  { id: 'map', group: 'space', featured: true, to: '/map-3d', icon: MapIcon, image: '/images/map-3d.webp' },
  { id: 'twin', group: 'space', featured: true, to: '/digital-twin', icon: FactoryIcon, image: '/images/digital-twin.webp' },
  { id: 'tms', group: 'apps', to: '/tms', icon: MapPinIcon, image: '/images/tms.webp' },
  { id: 'cold', group: 'apps', to: '/cold-room', icon: LayersIcon, image: '/images/cold-room.webp' },
  { id: 'rag', group: 'apps', to: '/enterprise-ai', icon: SearchIcon, image: '/images/enterprise-ai.webp' },
];

export const demoPaths = ['/demos', ...demos.map((d) => d.to)];
