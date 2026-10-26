import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import { LanguageProvider, useT } from './i18n';

// Home is part of the main bundle for a fast first paint; other pages load on demand.
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const ARPlayground = lazy(() => import('./pages/ARPlayground'));
const VRShowroom = lazy(() => import('./pages/VRShowroom'));
const FaceAR = lazy(() => import('./pages/FaceAR'));
const PrintAR = lazy(() => import('./pages/PrintAR'));
const VirtualTour = lazy(() => import('./pages/VirtualTour'));
const HandGestures = lazy(() => import('./pages/HandGestures'));
const Demos = lazy(() => import('./pages/Demos'));
const TryOn = lazy(() => import('./pages/TryOn'));
const EventBooth = lazy(() => import('./pages/EventBooth'));
const ARHunt = lazy(() => import('./pages/ARHunt'));
const MotionGame = lazy(() => import('./pages/MotionGame'));
const MarkerChem = lazy(() => import('./pages/MarkerChem'));
const ARCube = lazy(() => import('./pages/ARCube'));
const MachineTags = lazy(() => import('./pages/MachineTags'));
const DigitalTwin = lazy(() => import('./pages/DigitalTwin'));
const Services = lazy(() => import('./pages/Services'));
const WebApps = lazy(() => import('./pages/WebApps'));
const TMS = lazy(() => import('./pages/TMS'));
const EventAR = lazy(() => import('./pages/EventAR'));
const AppDesign = lazy(() => import('./pages/AppDesign'));
const ColdRoom = lazy(() => import('./pages/ColdRoom'));
const GestureVote = lazy(() => import('./pages/GestureVote'));
const StampRally = lazy(() => import('./pages/StampRally'));
const NewYearAR = lazy(() => import('./pages/NewYearAR'));
const HalloweenGate = lazy(() => import('./pages/HalloweenGate'));
const HalloweenFace = lazy(() => import('./pages/HalloweenFace'));
const LiveQA = lazy(() => import('./pages/LiveQA'));
const LuckyDraw = lazy(() => import('./pages/LuckyDraw'));
const PhotoWall = lazy(() => import('./pages/PhotoWall'));
const TeamGame = lazy(() => import('./pages/TeamGame'));
const EventAssistant = lazy(() => import('./pages/EventAssistant'));
const MotionWall = lazy(() => import('./pages/MotionWall'));
const EventDashboard = lazy(() => import('./pages/EventDashboard'));
const Season = lazy(() => import('./pages/Season'));
const EnterpriseAI = lazy(() => import('./pages/EnterpriseAI'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Map3D = lazy(() => import('./pages/Map3D'));
const BoothKiosk = lazy(() => import('./pages/booth/BoothKiosk'));
const GuestPhoto = lazy(() => import('./pages/booth/GuestPhoto'));

function PageLoading() {
  const t = useT();
  return (
    <div className="grid min-h-[70vh] place-items-center bg-navy-900" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
      <span className="sr-only">{t.nav.loadingPage}</span>
    </div>
  );
}

function page(node: ReactNode) {
  return <Suspense fallback={<PageLoading />}>{node}</Suspense>;
}

/** Public pages, relative to either `/` (Thai) or `/en` (English). */
function publicPages() {
  return (
    <>
      <Route index element={<Home />} />
      <Route path="projects" element={page(<Projects />)} />
      <Route path="projects/:slug" element={page(<ProjectDetail />)} />
      <Route path="ar-playground" element={page(<ARPlayground />)} />
      <Route path="vr-showroom" element={page(<VRShowroom />)} />
      <Route path="face-ar" element={page(<FaceAR />)} />
      <Route path="print-ar" element={page(<PrintAR />)} />
      <Route path="virtual-tour" element={page(<VirtualTour />)} />
      <Route path="hand-gestures" element={page(<HandGestures />)} />
      <Route path="demos" element={page(<Demos />)} />
      <Route path="try-on" element={page(<TryOn />)} />
      <Route path="event-booth" element={page(<EventBooth />)} />
      <Route path="ar-hunt" element={page(<ARHunt />)} />
      <Route path="marker-chem" element={page(<MarkerChem />)} />
      <Route path="ar-cube" element={page(<ARCube />)} />
      <Route path="machine-tags" element={page(<MachineTags />)} />
      <Route path="motion-game" element={page(<MotionGame />)} />
      <Route path="map-3d" element={page(<Map3D />)} />
      <Route path="digital-twin" element={page(<DigitalTwin />)} />
      <Route path="services" element={page(<Services />)} />
      <Route path="enterprise-ai" element={page(<EnterpriseAI />)} />
      <Route path="tms" element={page(<TMS />)} />
      <Route path="cold-room" element={page(<ColdRoom />)} />
      <Route path="gesture-vote" element={page(<GestureVote />)} />
      <Route path="halloween-gate" element={page(<HalloweenGate />)} />
      <Route path="halloween-face" element={page(<HalloweenFace />)} />
      <Route path="new-year-ar" element={page(<NewYearAR />)} />
      <Route path="stamp-rally" element={page(<StampRally />)} />
      <Route path="live-qa" element={page(<LiveQA />)} />
      <Route path="lucky-draw" element={page(<LuckyDraw />)} />
      <Route path="photo-wall" element={page(<PhotoWall />)} />
      <Route path="team-game" element={page(<TeamGame />)} />
      <Route path="event-assistant" element={page(<EventAssistant />)} />
      <Route path="motion-wall" element={page(<MotionWall />)} />
      <Route path="event-dashboard" element={page(<EventDashboard />)} />
      <Route path="app-design" element={page(<AppDesign />)} />
      <Route path="event-ar" element={page(<EventAR />)} />
      <Route path="season/:id?" element={page(<Season />)} />
      <Route path="web-apps" element={page(<WebApps />)} />
      <Route path="about" element={page(<About />)} />
      <Route path="contact" element={page(<Contact />)} />
      <Route path="*" element={page(<NotFound />)} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
      <Routes>
        {/* The booth and the guest's photo page are apps of their own: no site navigation around them. */}
        <Route path="booth/:slug" element={page(<BoothKiosk />)} />
        <Route path="p/:code" element={page(<GuestPhoto />)} />
        {/* English keeps its own URLs. Thai stays on the paths that already exist. */}
        <Route path="en" element={<Layout />}>
          {publicPages()}
        </Route>
        <Route element={<Layout />}>
          {publicPages()}
        </Route>
      </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}
