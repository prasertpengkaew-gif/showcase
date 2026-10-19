/**
 * Virtual tour of a CG show unit rendered by scripts/render-panoramas.mjs. Positions are in
 * metres in each room's coordinate system (the same layout the render script uses); the
 * camera stands at EYE. Replace the panoramas with your own 360° photos (2:1 equirectangular)
 * and update the hotspot positions to match.
 */
export type RoomId = 'living' | 'studio' | 'showroom';

export const EYE: [number, number, number] = [0, 1.55, 0.3];

export interface DoorHotspot {
  kind: 'door';
  to: RoomId;
  position: [number, number, number];
}

export interface InfoHotspot {
  kind: 'info';
  /** Key into the tour.items dictionary. */
  item: 'sofa' | 'chair' | 'robot' | 'fox' | 'sneaker' | 'car';
  position: [number, number, number];
  projectSlug: string;
}

export type Hotspot = DoorHotspot | InfoHotspot;

export interface TourRoom {
  id: RoomId;
  panorama: string;
  thumb: string;
  /** Direction the visitor faces on arrival. */
  lookAt: [number, number, number];
  hotspots: Hotspot[];
}

export const tourRooms: TourRoom[] = [
  {
    id: 'living',
    panorama: '/tour/living.jpg',
    thumb: '/tour/living-thumb.webp',
    lookAt: [0, 0.9, -2.4],
    hotspots: [
      { kind: 'door', to: 'studio', position: [3.45, 1.15, 1.2] },
      { kind: 'info', item: 'sofa', position: [0, 0.75, -2.35], projectSlug: 'furnished-unit-staging' },
      { kind: 'info', item: 'chair', position: [1.9, 0.75, -1.0], projectSlug: 'lounge-chair-configurator' },
    ],
  },
  {
    id: 'studio',
    panorama: '/tour/studio.jpg',
    thumb: '/tour/studio-thumb.webp',
    lookAt: [0, 0.9, -2.4],
    hotspots: [
      { kind: 'door', to: 'living', position: [-3.45, 1.15, -1.2] },
      { kind: 'door', to: 'showroom', position: [1.6, 1.15, 2.95] },
      { kind: 'info', item: 'robot', position: [1.3, 1.35, -2.0], projectSlug: 'robotic-workcell-preview' },
      { kind: 'info', item: 'fox', position: [-1.7, 0.6, -1.6], projectSlug: 'wildlife-field-lesson' },
      { kind: 'info', item: 'sneaker', position: [0, 1.25, -2.5], projectSlug: 'sneaker-launch-experience' },
    ],
  },
  {
    id: 'showroom',
    panorama: '/tour/showroom.jpg',
    thumb: '/tour/showroom-thumb.webp',
    lookAt: [0, 0.6, -2.0],
    hotspots: [
      { kind: 'door', to: 'studio', position: [1.6, 1.15, 3.45] },
      { kind: 'info', item: 'car', position: [0, 1.0, -2.0], projectSlug: 'scale-model-showroom' },
    ],
  },
];
