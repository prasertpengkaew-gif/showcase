import type { ComponentType, SVGProps } from 'react';
import { CompassIcon, CubeIcon, FaceIcon, HandIcon, HeadsetIcon, LayersIcon, PhoneIcon, ScanIcon, SearchIcon } from '../components/Icons';

export interface Service {
  id: string;
  title: string;
  summary: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  includes: string[];
  bestFor: string;
  /** Route of a live example on this site, shown as a link on the services page. */
  example?: string;
}

export const services: Service[] = [
  {
    id: 'webar-development',
    title: 'WebAR Development',
    summary:
      'Augmented reality that opens from a link or QR code in the phone’s browser — no app store, no install friction.',
    icon: ScanIcon,
    includes: [
      'Markerless floor and wall placement',
      'Image tracking for print, packaging and business cards',
      'Event AR: poster hunts around the venue with stamps and rewards',
      'Marker AR: printed cubes, cards and machine stickers that track steadily and work together',
      'iOS Quick Look, Android Scene Viewer and WebXR from one codebase',
      'Device detection with clear fallbacks',
      'Analytics hooks for your existing tools',
    ],
    bestFor: 'Product pages, campaigns, packaging, brochures and print-to-AR.',
    example: '/event-ar',
  },
  {
    id: 'vr-development',
    title: 'VR Development',
    summary:
      'Walk-around virtual spaces for headsets such as Meta Quest — launched straight from the browser, with a 3D view on every other screen.',
    icon: HeadsetIcon,
    includes: [
      'Virtual showrooms, show units and training spaces',
      '360° virtual tours from on-site photos or 3D renders',
      'WebXR immersive-vr with thumbstick locomotion and controllers',
      'Real-scale scenes and models optimized for headset frame rates',
      'Interactive 3D fallback for phones and desktop',
    ],
    bestFor: 'Virtual showrooms, property and hotel tours, training and exhibitions.',
  },
  {
    id: 'face-ar',
    title: 'Face AR & Face Tracking',
    summary:
      'Camera effects and virtual try-on that follow the face in real time, running privately on the visitor’s device.',
    icon: FaceIcon,
    includes: [
      'Face detection and 468-point face mesh tracking',
      'Virtual try-on for glasses, make-up, hats and jewellery',
      'Body-tracked try-on for caps, necklaces, watches and simple apparel',
      'Event AR photo booth rental: branded frames, AR props, smile-to-snap, QR photo download',
      'Expression input (smile, blink) for kiosks and games',
    ],
    bestFor: 'Eyewear and beauty retail, brand activations and interactive kiosks.',
  },
  {
    id: '3d-visualization',
    title: '3D Visualization',
    summary:
      'Real-time, physically based 3D models optimized to load fast on phones while still looking right up close.',
    icon: CubeIcon,
    includes: [
      'Modelling from CAD, photos or reference products',
      'glTF / GLB and USDZ delivery',
      'Material variants for colours and finishes',
      'Texture and geometry optimization for mobile',
    ],
    bestFor: 'E-commerce catalogues, configurators and product launches.',
  },
  {
    id: 'interactive-experiences',
    title: 'Interactive Experiences',
    summary:
      'Web experiences built around 3D: guided walkthroughs, animated explainers, configurators and event activations.',
    icon: HandIcon,
    includes: [
      'React and Three.js front-end development',
      'Animation and interaction design',
      'Hand-gesture and touch-free controls for kiosks',
      'Motion games for booths and big screens, with leaderboards',
      'Factory digital twins: 3D line layouts with live machine status',
      'Accessible controls and reduced-motion support',
      'Integration with your CMS or e-commerce platform',
    ],
    bestFor: 'Training, education, trade shows, factory monitoring and brand storytelling.',
  },
  {
    id: 'web-app-development',
    title: 'Web App Development',
    summary:
      'Custom browser-based apps for your team and customers: dashboards, kiosks, back-office tools and logistics systems, usable on desktop and mobile.',
    icon: LayersIcon,
    includes: [
      'Live dashboards and status boards',
      'Transport and warehouse systems: dispatch boards, cold-room stock locations and picking order',
      'Accounts, roles and a database with access rules',
      'Admin tools for staff, with audit history and exports',
      'Kiosk and event modes that keep working on poor Wi-Fi',
      'One responsive app for desktop, tablet and phone',
    ],
    bestFor: 'Logistics, warehouses, factories, events and any team still running on spreadsheets.',
    example: '/web-apps',
  },
  {
    id: 'enterprise-ai',
    title: 'Enterprise AI Assistants (LLM and RAG)',
    summary:
      'Assistants that answer staff and customer questions from your own documents, quote their sources and respect who may read what.',
    icon: SearchIcon,
    includes: [
      'Connect documents from drives, wikis, PDFs and databases',
      'Search that works in Thai and English',
      'Answers that show the source passage, and a clear “not found” when the documents do not say',
      'Access control that follows your existing accounts and groups',
      'A pilot on real questions before you commit to a full build',
    ],
    bestFor: 'HR and policy questions, internal knowledge bases, support teams and compliance.',
    example: '/enterprise-ai',
  },
  {
    id: 'app-ui-design',
    title: 'Mobile App UI/UX Design',
    summary:
      'Complete screen designs for iPhone and Android apps, with a clickable prototype and notes a developer can build from.',
    icon: PhoneIcon,
    includes: [
      'User flows and screen structure',
      'Every screen, including loading, empty, error and offline states',
      'Clickable prototype to test with real users',
      'Colour, type and spacing written as constants for developers',
      'Light and dark themes where they help',
    ],
    bestFor: 'Founders and teams planning an app before they hire developers.',
    example: '/app-design',
  },
  {
    id: 'ar-consulting',
    title: 'AR Consulting',
    summary:
      'Independent advice on where AR, VR and 3D will genuinely help your customers — and where they won’t.',
    icon: CompassIcon,
    includes: [
      'Use-case and audience assessment',
      'Device and platform compatibility review',
      '3D asset pipeline and tooling recommendations',
      'Prototype to validate before you commit',
    ],
    bestFor: 'Teams evaluating AR for the first time or scaling an existing pilot.',
  },
];
