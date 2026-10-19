/**
 * English interface text. `th.ts` must provide the same keys (enforced by the
 * `Dictionary` type). Project, service and model copy lives in `content.*.ts`.
 */
export const en = {
  langName: 'English',
  switchTo: 'ภาษาไทย',
  switchLabel: 'เปลี่ยนเป็นภาษาไทย',
  tagline: 'WebAR, VR & 3D experience studio',
  siteDescription:
    'We design and build augmented reality, virtual reality and real-time 3D experiences that run in the browser — no app download required.',

  nav: {
    home: 'Home',
    projects: 'Projects',
    playground: 'AR Playground',
    vr: 'VR Showroom',
    services: 'Services',
    about: 'About',
    contact: 'Contact',
    cta: 'Start a project',
    main: 'Main',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    skip: 'Skip to content',
    homeSuffix: '— home',
    loadingPage: 'Loading page',
  },

  footer: {
    explore: 'Explore',
    touch: 'Get in touch',
    form: 'Contact form',
    newTab: '(opens in a new tab)',
    rights: 'All rights reserved.',
    credits: '3D sample assets are openly licensed —',
    seeCredits: 'see credits',
  },

  hero: {
    badge: 'WebAR · VR · 3D visualization',
    line1: 'Real Experiences.',
    line2: 'Real Impact.',
    lead: 'We build augmented reality, virtual reality and real-time 3D that people open from a link, place in their own space, and actually use — for products, training, property and brands.',
    viewWork: 'View Our Work',
    tryAR: 'Try AR Now',
    highlights: [
      { title: 'No app download', text: 'Experiences open from a link or QR code.' },
      { title: 'Phones, headsets & desktop', text: 'Quick Look, Scene Viewer, WebXR and 3D fallback.' },
      { title: 'Open standards', text: 'glTF 2.0 assets you own and can reuse.' },
    ],
    loading: 'Loading 3D scene',
    sceneDescription:
      'Illustration: a smartphone shows an AR placement screen while a life-size service robot stands on the floor beside it.',
    screenStatus: 'Surface detected',
    screenLabel: 'Service Robot  ·  120 cm',
    screenButton: 'Place in your space',
  },

  home: {
    workEyebrow: 'Selected work',
    workTitle: 'Experiences people place, explore and remember',
    workText:
      'Studio concepts across six industries, each built with production techniques you can inspect and try in AR yourself.',
    allProjects: 'All projects',
    demoEyebrow: 'Try it here',
    demoTitle: 'Real 3D, right in the page',
    demoText:
      'This is the same viewer we build for production. Drag to rotate, pinch to zoom — and on a phone, place the chair at its real 83 cm width in your room.',
    demoPoints: [
      'Opens in Apple Quick Look on iPhone and iPad, Scene Viewer or WebXR on Android.',
      'Falls back to an interactive 3D view everywhere else.',
      "Loads only when it scrolls into view, so it doesn't slow the page.",
    ],
    openPlayground: 'Open the AR Playground',
    vrEyebrow: 'Virtual reality',
    vrTitle: 'Step inside a showroom in VR',
    vrText:
      'The same 3D assets can become a walk-around virtual space. Open our VR Showroom on a Meta Quest headset, or explore it in 3D on any screen.',
    openVR: 'Enter the VR Showroom',
    servicesEyebrow: 'What we do',
    servicesTitle: 'From a single 3D model to a complete AR & VR programme',
    processEyebrow: 'How we work',
    processTitle: 'A clear process, with something real on a device early',
    steps: [
      { step: 'Discover', text: 'We agree on who the experience is for, which devices they use, and what a successful outcome looks like.' },
      { step: 'Prototype', text: 'A working link on real phones or headsets within the first sprint, so decisions are made on something you can hold.' },
      { step: 'Produce', text: '3D assets, interaction and front-end built to performance budgets, tested across iOS, Android, headsets and desktop.' },
      { step: 'Launch & hand over', text: 'Deployment, documentation and source files. You own the code and the glTF assets.' },
    ],
    ctaTitle: 'Have a product, space or story that should be seen in 3D?',
    ctaText: "Tell us what you're working on. We'll tell you honestly whether AR or VR is the right fit.",
    ctaPrimary: 'Start a conversation',
    ctaSecondary: 'Explore services',
  },

  projectsPage: {
    metaTitle: 'Projects',
    eyebrow: 'Portfolio',
    title: 'Work you can open, rotate and place',
    description:
      'Every project here has a live 3D viewer and AR mode. These are studio concepts built with openly licensed assets to demonstrate our approach in each industry.',
    galleryTitle: 'Project gallery',
    filterLabel: 'Filter projects by category',
    all: 'All work',
    showing: (n: number, category?: string) =>
      `Showing ${n} ${n === 1 ? 'project' : 'projects'}${category ? ` in ${category}` : ''}.`,
    empty: 'No projects match this filter yet.',
  },

  card: {
    concept: 'Studio concept',
    view: 'View project',
  },

  detail: {
    breadcrumb: 'Breadcrumb',
    projects: 'Projects',
    conceptNote: 'Studio concept built with an openly licensed sample model — not a client engagement.',
    viewerTitle: 'Interactive 3D model',
    overview: 'Overview',
    challenge: 'The challenge',
    approach: 'Our approach',
    facts: 'Project facts',
    category: 'Category',
    technologies: 'Technologies',
    platforms: 'Platforms',
    deliverables: 'Deliverables',
    asset: '3D asset',
    gallery: 'Gallery',
    galleryText: 'Real-time renders of the model used in this project. Select an image to enlarge it.',
    videoEyebrow: 'Demo video',
    videoTitle: 'See it in motion',
    videoMeta: '5 seconds · no audio',
    videoFallback: "Your browser can't play this video.",
    videoDownload: 'Download the MP4',
    related: 'Related projects',
    allProjects: 'All projects',
    notFoundTitle: 'Project not found',
    notFoundText: "We couldn't find that project. It may have been renamed or removed.",
  },

  tryIt: {
    eyebrow: 'Test it yourself',
    intro: 'No video here — this one is better experienced first-hand. Everything below works in the live viewer above.',
    goToViewer: 'Go to the 3D viewer',
    phoneTitle: 'Try AR on your phone',
    phoneText:
      "Scan with your phone's camera to open this page, then tap “View in your space”. Works on iPhone and iPad with Safari, and on Android devices that support Google Play Services for AR.",
    qrLabel: 'QR code that opens this project page on your phone',
  },

  gallery: {
    enlarge: (i: number, n: number, alt: string) => `Enlarge image ${i} of ${n}: ${alt}`,
    dialog: 'Image viewer',
    prev: 'Previous image',
    next: 'Next image',
    close: 'Close image viewer',
  },

  viewer: {
    region: (name: string) => `3D viewer: ${name}`,
    arButton: 'View in your space',
    loading: (name: string) => `Loading ${name}…`,
    loadError: (name: string) => `We couldn't load the ${name} model. The file may be missing or your connection dropped.`,
    moduleError: 'The 3D viewer could not be loaded. Check your connection and reload the page.',
    noWebgl: 'Your browser has WebGL turned off or unsupported, so this is a still image of the model.',
    retry: 'Try again',
    arStarted: 'AR started — move your phone slowly to find a surface.',
    arPlaced: 'Placed. Pinch to resize, drag to move, two fingers to rotate.',
    arFailed: 'AR could not start on this device. You can keep exploring in 3D.',
    toolbar: 'Viewer controls',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    startRotate: 'Start auto-rotate',
    stopRotate: 'Stop auto-rotate',
    rotateDisabled: 'Auto-rotate is off because your device prefers reduced motion',
    reset: 'Reset',
    hint: 'Drag to rotate · scroll or pinch to zoom ·',
    finish: 'Finish',
    animation: 'Animation',
  },

  arNotice: {
    insecureTitle: 'AR needs a secure (HTTPS) connection',
    insecureText:
      'Browsers block camera and AR features on insecure pages. The 3D view still works here — open the HTTPS version of this site to use AR.',
    readyTitle: 'AR is available on this device',
    readyIOS: 'Tap “View in your space” to open the model in Apple Quick Look, then point your camera at the floor.',
    readyOther: 'Tap “View in your space”, then slowly move your phone so it can detect the floor.',
    desktopTitle: 'Open this page on a phone or tablet to use AR',
    desktopText:
      'Scan the QR code or copy the link. On desktop you can rotate and zoom the model in 3D; AR needs an iPhone or iPad with Safari, or an Android device that supports Google Play Services for AR.',
    checkingTitle: 'Checking AR support…',
    checkingText: 'AR availability is confirmed once the model finishes loading.',
    iosTitle: 'AR Quick Look is not available in this browser',
    iosText: 'Open this page in Safari on iOS 12 or later. Some in-app browsers (social apps) block Quick Look.',
    androidTitle: 'AR is not supported on this device or browser',
    androidText:
      'AR on Android needs Chrome and a device certified for Google Play Services for AR (ARCore). You can still explore the model in 3D.',
    otherTitle: 'AR is not supported on this device',
    otherText: 'You can still rotate and zoom the model in 3D.',
    copy: 'Copy link',
    copied: 'Link copied',
    copyFailed: 'Copy failed — select the link',
    copiedSr: 'Link copied to clipboard',
    qrLabel: 'QR code that opens this page on your phone',
  },

  qr: {
    generating: 'Generating…',
    unavailable: 'QR code unavailable',
    local:
      "This is a local development address, so a phone can't open it. Deploy the site or use an HTTPS tunnel (see README) to test on a phone.",
  },

  playground: {
    metaTitle: 'AR Playground',
    eyebrow: 'AR Playground',
    title: 'Put a 3D model in your room',
    description:
      "Choose a model, explore it in 3D, then place it at real-world scale with your phone's camera. Nothing to install.",
    choose: 'Choose a model',
    model: 'Model',
    credit: (title: string, author: string, license: string) => `Model: “${title}” by ${author}, ${license}.`,
    source: 'Source',
    howTitle: 'How it works',
    steps: [
      { title: 'Choose a model', text: 'Pick the chair, robot or car. Each loads as a real glTF file.' },
      { title: 'Explore in 3D', text: 'Drag to orbit, pinch or scroll to zoom, or use the buttons below the viewer.' },
      { title: 'View in your space', text: 'On a supported phone, tap the AR button and aim at the floor to place it.' },
    ],
    compatTitle: 'Device compatibility',
    compatCaption: 'Which AR mode each device uses',
    deviceCol: 'Device',
    modeCol: 'Mode & requirements',
    compat: [
      { platform: 'iPhone & iPad', mode: 'Apple AR Quick Look', needs: 'Safari (or Chrome) on iOS 12+. Some in-app browsers block it.' },
      { platform: 'Android', mode: 'WebXR or Google Scene Viewer', needs: 'Chrome on a device certified for Google Play Services for AR (ARCore).' },
      { platform: 'Desktop & other devices', mode: 'Interactive 3D', needs: 'Any modern browser with WebGL. AR is not available on desktop.' },
    ],
    compatNote:
      "AR requires a secure HTTPS connection and camera permission. Android's Scene Viewer downloads the model from this site's public URL, so it won't work from a local development server.",
  },

  vr: {
    metaTitle: 'VR Showroom',
    eyebrow: 'VR Showroom',
    title: 'Walk through a virtual showroom',
    description:
      'A small gallery of real-scale 3D products you can explore on any screen — and step into with a VR headset, straight from the browser.',
    viewerTitle: 'Interactive showroom',
    viewerLabel: 'Virtual showroom with a sofa, chair, robot, car and fox',
    loading: 'Loading showroom',
    renderError: 'The 3D showroom could not be displayed on this device.',
    noWebgl: 'Your browser has WebGL turned off or unsupported, so the showroom cannot be shown.',
    hint: 'Drag to look around · scroll or pinch to move closer',
    enter: 'Enter VR',
    inSession: 'VR session running',
    enterFailed: 'The headset did not start a VR session. Check that the browser has permission for VR and try again.',
    statusChecking: 'Checking for a VR headset…',
    statusSupported: 'VR is available — put on your headset and press Enter VR.',
    statusUnsupported:
      'No VR headset detected on this device. You can explore in 3D here, or open this page in a headset browser.',
    statusInsecure: 'VR needs a secure (HTTPS) connection. The 3D view still works here.',
    controls: [
      'Desktop and phone: drag to look around, scroll or pinch to move closer.',
      'In VR: look around naturally; use the left thumbstick to move and the right thumbstick to turn.',
      'Every object is shown at real-world size — the sofa is 2.2 m wide.',
    ],
    qrLabel: 'QR code that opens the VR Showroom',
    headsetTitle: 'Open on a headset',
    headsetText:
      'In Meta Quest Browser, type or paste this address, then press Enter VR. On a phone, scan the code to explore in 3D.',
    devicesTitle: 'Where it works',
    devicesCaption: 'How each device shows the VR Showroom',
    deviceCol: 'Device',
    experienceCol: 'Experience',
    devices: [
      { device: 'Meta Quest 2, 3, 3S, Pro', mode: 'Immersive VR (WebXR)', note: 'Meta Quest Browser. Thumbstick movement and controller tracking.' },
      { device: 'Other WebXR headsets', mode: 'Immersive VR (WebXR)', note: 'Any headset browser that supports WebXR immersive-vr sessions, such as Pico Browser.' },
      { device: 'Phones, tablets, desktop', mode: 'Interactive 3D', note: 'Drag or touch to look around. No headset needed.' },
    ],
    usesTitle: 'What VR is good for',
    uses: [
      { title: 'Virtual showrooms', text: 'Let buyers walk around products at real size before they visit a store or place an order.' },
      { title: 'Property and spaces', text: 'Show unbuilt or unfurnished spaces at true scale, room by room.' },
      { title: 'Training and education', text: 'Practise procedures or explore subjects safely, repeatedly, and without special equipment beyond a headset.' },
    ],
  },

  servicesPage: {
    metaTitle: 'Services',
    eyebrow: 'Services',
    title: 'Five ways we help teams ship 3D, AR and VR',
    description: 'Engage us for a single model, a full experience, or advice before you commit budget.',
    listTitle: 'Services',
    bestFor: 'Best for:',
    principlesEyebrow: 'Principles',
    principlesTitle: 'How every engagement is run',
    principles: [
      { title: 'Browser first', text: 'If it needs an app install, most people won’t try it. We build for the link people already tapped.' },
      { title: 'Performance budgets', text: 'We agree file-size and load-time targets up front and test on mid-range devices, not just flagships.' },
      { title: 'Graceful fallbacks', text: 'Every AR and VR experience has a complete 3D or image fallback so no visitor hits a dead end.' },
      { title: 'You own the assets', text: 'Source files and glTF/USDZ models are handed over in open formats you can reuse anywhere.' },
    ],
    ctaTitle: 'Not sure which service fits?',
    ctaText: "Describe what you want to achieve and we'll suggest a starting point.",
    ctaContact: 'Contact us',
    ctaPlayground: 'Try the AR Playground',
  },

  about: {
    metaTitle: 'About',
    eyebrow: 'About',
    title: (name: string) => `${name} builds 3D, AR and VR for the open web`,
    description:
      "We're a design and engineering studio focused on one thing: real-time 3D, augmented reality and virtual reality that people can open from a link and genuinely use.",
    whoEyebrow: 'Who we are',
    whoTitle: 'Designers and engineers who ship to real devices',
    who: [
      'We work at the point where 3D content, web engineering and product design meet. That means we can take a project from a CAD file or product photo to a fast, tested AR or VR experience without handing it between agencies.',
      'We favour the browser over native apps because it removes the biggest barrier to AR and VR: asking people to install something. Everything we build runs from a URL on phones, headsets and desktop.',
      'The projects on this site are studio concepts built with openly licensed sample assets, so you can see — and try — exactly how we work.',
    ],
    capEyebrow: 'Capabilities',
    capTitle: 'What we bring to a project',
    capabilities: [
      { area: '3D asset pipeline', items: ['glTF 2.0 / GLB and USDZ', 'PBR materials and material variants', 'Texture and mesh optimization', 'Validation with the Khronos glTF Validator'] },
      { area: 'AR & VR delivery', items: ['WebXR immersive-ar and immersive-vr', 'Apple AR Quick Look', 'Google Scene Viewer', 'Device detection and fallbacks'] },
      { area: 'Front-end engineering', items: ['React and TypeScript', 'Three.js and React Three Fiber', "Google's model-viewer", 'Performance profiling on real devices'] },
      { area: 'Experience design', items: ['Interaction and motion design', 'Accessible controls (keyboard, screen reader)', 'Reduced-motion support', 'Clear onboarding for first-time AR and VR users'] },
    ],
    valuesEyebrow: 'What we believe',
    valuesTitle: 'Three principles behind every build',
    values: [
      { title: 'Useful before impressive', text: 'AR and VR should answer a real question — does it fit, how does it work, what does it look like — not just look clever in a demo.' },
      { title: 'Honest about limits', text: 'Not every device supports AR or VR, and not every project needs it. We say so early and design the fallback as carefully as the headline feature.' },
      { title: 'Open by default', text: 'We build on open standards so your assets and code outlive any single vendor or platform.' },
    ],
    workWithUs: 'Work with us',
    seeWork: 'See the work',
    creditsTitle: '3D asset credits',
    creditsText: 'The demonstration models on this site are openly licensed. We thank their creators.',
    license: 'License:',
    viewSource: 'View source',
    sourceFor: (title: string) => `for ${title} (opens in a new tab)`,
  },

  contact: {
    metaTitle: 'Contact',
    eyebrow: 'Contact',
    title: 'Tell us about your project',
    description:
      "Share a few details and we'll reply with questions, ideas, and an honest view on whether AR or VR is the right fit.",
    formTitle: 'Send an enquiry',
    detailsTitle: 'Contact details',
    otherWays: 'Other ways to reach us',
    region: 'Contact form and details',
    email: 'Email',
    phone: 'Phone',
    line: 'LINE',
    facebook: 'Facebook',
    address: 'Address',
    hours: 'Hours',
    chatLine: 'Chat on LINE',
    tipsTitle: 'Helpful to include',
    tips: [
      'What you want people to see or do',
      'Who will use it, and on which devices',
      'Any existing 3D, CAD files or product photos',
      'Your target launch date',
    ],
  },

  form: {
    required: 'Fields marked * are required.',
    requiredStart: 'Fields marked',
    requiredEnd: 'are required.',
    name: 'Name',
    email: 'Work email',
    company: 'Company',
    optional: 'Optional',
    projectType: 'Project type',
    selectOne: 'Select one…',
    notSure: 'Not sure yet',
    vrType: 'VR experience',
    details: 'Project details',
    placeholder: 'What would you like to build, who is it for, and when do you need it?',
    privacy: 'We only use your details to reply to this enquiry.',
    send: 'Send message',
    sending: 'Sending…',
    openEmail: 'Open in my email app',
    errName: 'Please enter your name.',
    errNameShort: 'Name must be at least 2 characters.',
    errNameLong: 'Name must be 100 characters or fewer.',
    errEmail: 'Please enter your email address.',
    errEmailFormat: 'Enter an email address like name@company.com.',
    errType: 'Choose the option closest to your project.',
    errMessage: 'Tell us a little about your project.',
    errMessageShort: (n: number) => `Please write at least ${n} characters.`,
    errMessageLong: (n: number) => `Please keep it under ${n} characters.`,
    fixOne: 'Please fix this field:',
    fixMany: (n: number) => `Please fix these ${n} fields:`,
    noneTitle: "This form isn't connected yet",
    noneText: "Messages can't be delivered until the site owner configures a form endpoint or contact email.",
    mailtoTitle: 'How this form works',
    mailtoText: (email: string) =>
      `Submitting opens your email app with your message ready to send to ${email}. Nothing is sent until you press send there.`,
    sentTitle: 'Message sent',
    sentText: "Thanks for getting in touch. We've received your message and will reply by email.",
    openedTitle: 'Check your email app',
    openedText: (email: string) =>
      `We've opened a draft addressed to ${email}. Press send in your email app to deliver it. If nothing opened, email us directly at`,
    failedTitle: 'Something went wrong',
    failedWithEmail: (email: string) => `Your message wasn't sent. Please try again, or email us directly at ${email}.`,
    failed: "Your message wasn't sent. Please check your connection and try again.",
    subject: (type: string, name: string) => `Project enquiry: ${type} — ${name}`,
    honeypot: 'Website',
  },

  notFound: {
    title: 'Page not found',
    text: "The page you're looking for doesn't exist or has moved.",
    home: 'Back to home',
    projects: 'Browse projects',
  },

  image: {
    unavailable: 'Image unavailable',
  },
};

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type Dictionary = Widen<typeof en>;
