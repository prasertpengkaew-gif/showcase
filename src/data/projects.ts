import type { Project, ProjectImage, ProjectVideo } from '../types/project';

/*
 * Portfolio entries. Every project below is a studio concept built with openly licensed
 * sample assets (kind: 'concept'); none of them describes a client engagement.
 * Replace them with your own case studies — see README "Adding projects".
 *
 * Images and videos are rendered from the bundled models by scripts/render-media.mjs.
 */

const IMAGE_WIDTH = 1440;
const IMAGE_HEIGHT = 960;

const image = (slug: string, file: string, alt: string): ProjectImage => ({
  src: `/images/projects/${slug}/${file}.webp`,
  alt,
  width: IMAGE_WIDTH,
  height: IMAGE_HEIGHT,
});

const video = (slug: string, description: string): ProjectVideo => ({
  sources: [
    { src: `/videos/${slug}.webm`, type: 'video/webm' },
    { src: `/videos/${slug}.mp4`, type: 'video/mp4' },
  ],
  poster: `/images/projects/${slug}/cover.webp`,
  description,
});

export const projects: Project[] = [
  {
    slug: 'robotic-workcell-preview',
    title: 'Robotic Workcell Preview',
    category: 'Industrial',
    summary:
      'A browser-based preview that lets plant teams place a life-size service robot on the shop floor before installation.',
    overview: [
      'Before new automation arrives, operations teams need to answer practical questions: does it fit the aisle, what is the reach envelope, and where do people walk around it? Drawings answer these questions slowly.',
      'This concept places a 1.2 m service robot at true scale on any floor through the phone camera. Supervisors can walk around it, trigger its motion clips, and share a link with colleagues who were not on site.',
    ],
    challenge:
      'Factory floors often have poor connectivity and staff will not install an app for a one-off review, so the experience has to load quickly from a link and work on both iOS and Android.',
    approach: [
      'Optimized a rigged GLB to under 0.5 MB so it opens on a slow connection.',
      'Used model-viewer with WebXR, Scene Viewer and Quick Look so one link works across devices.',
      'Exposed the embedded animation clips as clearly labelled controls instead of an autoplay loop.',
    ],
    deliverables: ['Optimized rigged 3D model', 'WebAR viewer page', 'Animation controls', 'Device support guide'],
    technologies: ['model-viewer', 'WebXR', 'glTF 2.0', 'Skinned animation', 'React'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'robot',
    cover: image('robotic-workcell-preview', 'cover', 'Service robot standing on a light grey studio floor'),
    gallery: [
      image('robotic-workcell-preview', '1', 'Robot seen from the front at eye level'),
      image('robotic-workcell-preview', '2', 'Robot seen from a high angle, showing its footprint'),
      image('robotic-workcell-preview', '3', 'Close view of the robot head and torso'),
    ],
    video: video('robotic-workcell-preview', 'A slow 360° orbit around the service robot in its idle pose.'),
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'lounge-chair-configurator',
    title: 'Lounge Chair Configurator',
    category: 'Product',
    summary:
      'A product page viewer where shoppers switch upholstery and see the chair in their own room before buying.',
    overview: [
      'Furniture is one of the categories where shoppers most want to see an item in place: scale and colour are hard to judge from photos.',
      'This concept pairs a physically based chair model with its two embedded fabric variants. Shoppers rotate it, switch fabrics instantly, and tap “View in your space” to place it at its real 83 cm width.',
    ],
    challenge:
      'Fabric needs to read as fabric. Flat-shaded models make velvet look like plastic and undermine trust in the product.',
    approach: [
      'Kept the sheen material extension so velvet catches light the way it does in person.',
      'Used KHR_materials_variants so both fabrics ship in one file and switch without a reload.',
      'Showed real dimensions next to the AR button so shoppers know what to expect.',
    ],
    deliverables: ['Material-variant configurator', 'AR product placement', 'Poster and fallback imagery'],
    technologies: ['model-viewer', 'KHR_materials_variants', 'KHR_materials_sheen', 'Scene Viewer', 'Quick Look'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'chair',
    cover: image('lounge-chair-configurator', 'cover', 'Lounge chair with mango velvet upholstery on a warm backdrop'),
    gallery: [
      image('lounge-chair-configurator', '1', 'Chair in peacock velvet seen from the side'),
      image('lounge-chair-configurator', '2', 'Chair seen from behind showing the frame'),
      image('lounge-chair-configurator', '3', 'Close view of the velvet seat cushion'),
    ],
    video: video('lounge-chair-configurator', 'The lounge chair turning slowly on a turntable.'),
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'wildlife-field-lesson',
    title: 'Wildlife Field Lesson',
    category: 'Education',
    summary:
      'A classroom activity that brings a life-size animated fox into the room to support a lesson on animal movement.',
    overview: [
      'Students remember what they can walk around. This concept gives teachers a single link that places a life-size red fox on the classroom floor.',
      'Three gait animations — survey, walk and run — let the class compare how the animal moves, while the teacher guides discussion from a laptop that shows the same model in 3D.',
    ],
    challenge:
      'School devices vary widely, and many are shared tablets without AR support. The lesson must still work when AR is unavailable.',
    approach: [
      'Built a 3D fallback that keeps every animation control usable on any device with a browser.',
      'Kept the model to 160 KB so a whole class can load it at once on school Wi-Fi.',
      'Wrote plain-language labels and descriptions for screen reader users.',
    ],
    deliverables: ['Animated AR model', 'Teacher-friendly controls', 'Non-AR fallback'],
    technologies: ['model-viewer', 'glTF animation', 'WebXR', 'Accessible UI'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Chromebook / desktop 3D'],
    modelId: 'fox',
    cover: image('wildlife-field-lesson', 'cover', 'Red fox standing alert on a soft green backdrop'),
    gallery: [
      image('wildlife-field-lesson', '1', 'Fox in profile, mid-stride'),
      image('wildlife-field-lesson', '2', 'Fox seen from the front at ground level'),
      image('wildlife-field-lesson', '3', 'Fox seen from above'),
    ],
    video: video('wildlife-field-lesson', 'A slow orbit around the fox in its survey pose.'),
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'sneaker-launch-experience',
    title: 'Sneaker Launch Experience',
    category: 'Marketing',
    summary:
      'A launch page that lets fans inspect three colourways up close and place the shoe next to their own pair.',
    overview: [
      'Product drops live and die on social. This concept turns a launch link into something people actually spend time with: a detailed 3D sneaker they can spin, zoom and try in three colourways.',
      'A single tap places the shoe at true size on a table or floor, giving fans a reason to share a screenshot.',
    ],
    challenge:
      'Launch traffic arrives in spikes from mobile social apps. The experience has to be light, start instantly, and not depend on an app install.',
    approach: [
      'Reduced texture resolution to 1024 px, taking the file from 7.8 MB to 1.5 MB.',
      'Kept all three colourways in one asset with KHR_materials_variants.',
      'Used a poster image so the page is useful before the model finishes loading.',
    ],
    deliverables: ['Optimized product model', 'Colourway switcher', 'Shareable WebAR link'],
    technologies: ['model-viewer', 'KHR_materials_variants', 'Texture optimization', 'WebXR'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'sneaker',
    cover: image('sneaker-launch-experience', 'cover', 'Sneaker in the midnight colourway on a deep blue backdrop'),
    gallery: [
      image('sneaker-launch-experience', '1', 'Sneaker in the beach colourway, seen from the heel'),
      image('sneaker-launch-experience', '2', 'Sneaker in the street colourway from above'),
      image('sneaker-launch-experience', '3', 'Close view of the knit upper and laces'),
    ],
    video: video('sneaker-launch-experience', 'The sneaker rotating a full turn to show every side.'),
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'furnished-unit-staging',
    title: 'Furnished Unit Staging',
    category: 'Real Estate',
    summary:
      'Virtual staging for unfurnished apartments: buyers place a full-size sofa in an empty living room during a viewing.',
    overview: [
      'Empty rooms are hard to read. Buyers struggle to judge whether a living room fits a three-seat sofa, and physical staging is expensive.',
      'This concept lets an agent or buyer place a 2.2 m sofa at true scale during a viewing, then switch between five upholstery colours to discuss how the space could feel.',
    ],
    challenge:
      'Accurate scale matters more than visual polish here: a sofa that is placed 10% too small gives a misleading impression of the room.',
    approach: [
      'Kept the model at true real-world size and displayed its dimensions before placement.',
      'Exposed all five embedded colour variants with clear labels.',
      'Enabled floor placement so the sofa sits on the ground rather than floating.',
    ],
    deliverables: ['True-scale AR furniture', 'Colour variant controls', 'Agent briefing notes'],
    technologies: ['model-viewer', 'KHR_materials_variants', 'Scene Viewer', 'Quick Look'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'sofa',
    cover: image('furnished-unit-staging', 'cover', 'Champagne velvet sofa against a pale neutral backdrop'),
    gallery: [
      image('furnished-unit-staging', '1', 'Sofa in navy velvet seen from the front'),
      image('furnished-unit-staging', '2', 'Sofa in grey seen from a high corner angle'),
      image('furnished-unit-staging', '3', 'Close view of the tufted backrest'),
    ],
    video: video('furnished-unit-staging', 'A slow orbit around the sofa in its champagne fabric.'),
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'scale-model-showroom',
    title: 'Scale Model Showroom',
    category: 'Automotive',
    summary:
      'A collectible showroom viewer with glossy clear-coat paint and glass that holds up to close inspection.',
    overview: [
      'Automotive buyers inspect paint, glass and trim closely. A viewer that renders these materials poorly does more harm than a good photo.',
      'This concept uses a scale model car with clear-coat paint, transmissive windows and sheen, displayed in a neutral studio lighting environment and placeable on any table in AR.',
    ],
    challenge:
      'Clear coat and glass are expensive to render on phones and can drop frames if the scene is not kept lean.',
    approach: [
      'Kept the scene to one model and one environment light, using physically based extensions only where they matter.',
      'Used a neutral environment so reflections stay believable on every device.',
      'Enlarged the 7 cm original to a 73 cm display scale that is easy to inspect in AR.',
    ],
    deliverables: ['Showroom viewer', 'AR tabletop placement', 'Material review renders'],
    technologies: ['model-viewer', 'KHR_materials_clearcoat', 'KHR_materials_transmission', 'WebXR'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'car',
    cover: image('scale-model-showroom', 'cover', 'Glossy green toy car on a red cloth display stand'),
    gallery: [
      image('scale-model-showroom', '1', 'Car seen in side profile'),
      image('scale-model-showroom', '2', 'Car seen from a high front angle'),
      image('scale-model-showroom', '3', 'Close view of the paint, chrome and clear windows'),
    ],
    tryIt: {
      title: 'Inspect the paint and glass yourself',
      steps: [
        'Zoom in on the bonnet to see the clear-coat reflections change as you rotate.',
        'Orbit below the roofline to look through the transmissive windows.',
        'On your phone, tap “View in your space” and place the car on a table at 73 cm display scale.',
      ],
    },
    kind: 'concept',
    featured: true,
  },
  {
    slug: 'interactive-brand-mascot',
    title: 'Interactive Brand Mascot',
    category: 'Marketing',
    summary:
      'An event activation where visitors bring a waving brand mascot into their own photos.',
    overview: [
      'Event booths compete for attention. A mascot that visitors can place next to themselves and photograph gives them something to share after they leave.',
      'This concept uses an expressive robot character with gestures — wave, thumbs up, dance — that visitors trigger before taking a photo.',
    ],
    challenge:
      'Event Wi-Fi is unreliable and queues form quickly, so the experience must open in seconds from a printed link.',
    approach: [
      'Chose a compact rigged model under 0.5 MB.',
      'Made gestures one-tap buttons so visitors understand them without instructions.',
      'Provided a desktop 3D view for screens at the booth.',
    ],
    deliverables: ['Rigged mascot model', 'Gesture controls', 'Booth screen view'],
    technologies: ['model-viewer', 'glTF animation', 'WebXR', 'React'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'robot',
    cover: image('interactive-brand-mascot', 'cover', 'Robot mascot waving on a bright blue backdrop'),
    gallery: [
      image('interactive-brand-mascot', '1', 'Robot mascot giving a thumbs up'),
      image('interactive-brand-mascot', '2', 'Robot mascot mid-dance'),
      image('interactive-brand-mascot', '3', 'Robot mascot seen from a low angle'),
    ],
    tryIt: {
      title: 'Make the mascot perform',
      steps: [
        'Choose Wave, Thumbs Up or Dance under Animation — each gesture plays on loop.',
        'Rotate to find the best angle for a photo.',
        'Scan the QR code, open it on your phone and place the mascot next to you in AR.',
      ],
    },
    kind: 'concept',
  },
  {
    slug: 'stem-robotics-lesson',
    title: 'STEM Robotics Lesson',
    category: 'Education',
    summary:
      'A robotics unit where students examine how a robot moves by triggering and comparing motion clips.',
    overview: [
      'Introductory robotics lessons often start with abstract diagrams. This concept gives students an animated robot they can study up close in 3D or place on their desk in AR.',
      'Students trigger walking, jumping and gesture clips and discuss which joints move in each one.',
    ],
    challenge: 'The lesson must work on shared Chromebooks with no AR support as well as on phones.',
    approach: [
      'Designed the 3D view as a complete experience, with AR as an optional extra.',
      'Grouped animation controls with readable names.',
      'Ensured all controls are keyboard and screen reader accessible.',
    ],
    deliverables: ['Animated 3D model', 'Lesson-ready controls', 'Accessibility review'],
    technologies: ['model-viewer', 'glTF animation', 'WCAG 2.2 practices'],
    platforms: ['Chromebook / desktop 3D', 'Android (ARCore)', 'iOS (Quick Look)'],
    modelId: 'robot',
    cover: image('stem-robotics-lesson', 'cover', 'Robot standing on a soft green classroom-style backdrop'),
    gallery: [
      image('stem-robotics-lesson', '1', 'Robot shown from the side, mid-walk'),
      image('stem-robotics-lesson', '2', 'Robot shown jumping'),
      image('stem-robotics-lesson', '3', 'Robot seen from above'),
    ],
    tryIt: {
      title: 'Try the lesson activity',
      steps: [
        'Switch between Walking and Jump and watch which joints move in each clip.',
        'Use the rotate buttons or arrow keys — the viewer is fully keyboard accessible.',
        'Place the robot on your desk in AR and walk around it at its real 1.2 m height.',
      ],
    },
    kind: 'concept',
  },
  {
    slug: 'velvet-sofa-product-page',
    title: 'Velvet Sofa Product Page',
    category: 'Product',
    summary:
      'A furniture product page that replaces five colour photo sets with one interactive 3D model.',
    overview: [
      'Photographing every colour of every product is costly and slow. One well-built 3D model can stand in for a full set of product photos.',
      'This concept shows a sofa in five upholstery colours, each selectable instantly, with the same model available for AR placement.',
    ],
    challenge: 'The viewer must load quickly on product pages without hurting page performance.',
    approach: [
      'Loaded the viewer only when it scrolls into view and showed a poster image first.',
      'Kept every colour inside a single 3 MB file.',
      'Added clear loading and error states so the page never shows an empty box.',
    ],
    deliverables: ['Product viewer component', 'Colour switcher', 'AR placement'],
    technologies: ['model-viewer', 'KHR_materials_variants', 'Lazy loading', 'React'],
    platforms: ['Android (ARCore)', 'iOS (Quick Look)', 'Desktop 3D'],
    modelId: 'sofa',
    cover: image('velvet-sofa-product-page', 'cover', 'Navy velvet sofa on a white studio backdrop'),
    gallery: [
      image('velvet-sofa-product-page', '1', 'Sofa in pale pink from the front'),
      image('velvet-sofa-product-page', '2', 'Sofa in black seen from one end'),
      image('velvet-sofa-product-page', '3', 'Low view of the sofa in grey, showing the legs'),
    ],
    tryIt: {
      title: 'Swap all five colours live',
      steps: [
        'Pick each Finish — Champagne, Navy, Gray, Black and Pale Pink — and see it change without a reload.',
        'Zoom into the tufted back to check how the velvet catches light.',
        'On your phone, place the 2.2 m sofa on the floor to judge it at real size.',
      ],
    },
    kind: 'concept',
  },
];
