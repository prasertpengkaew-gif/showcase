import { lazy, Suspense } from 'react';
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
const Services = lazy(() => import('./pages/Services'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PageLoading() {
  const t = useT();
  return (
    <div className="grid min-h-[70vh] place-items-center bg-navy-900" role="status">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-electric-500" />
      <span className="sr-only">{t.nav.loadingPage}</span>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="projects" element={<Suspense fallback={<PageLoading />}><Projects /></Suspense>} />
          <Route path="projects/:slug" element={<Suspense fallback={<PageLoading />}><ProjectDetail /></Suspense>} />
          <Route path="ar-playground" element={<Suspense fallback={<PageLoading />}><ARPlayground /></Suspense>} />
          <Route path="vr-showroom" element={<Suspense fallback={<PageLoading />}><VRShowroom /></Suspense>} />
          <Route path="face-ar" element={<Suspense fallback={<PageLoading />}><FaceAR /></Suspense>} />
          <Route path="print-ar" element={<Suspense fallback={<PageLoading />}><PrintAR /></Suspense>} />
          <Route path="virtual-tour" element={<Suspense fallback={<PageLoading />}><VirtualTour /></Suspense>} />
          <Route path="hand-gestures" element={<Suspense fallback={<PageLoading />}><HandGestures /></Suspense>} />
          <Route path="demos" element={<Suspense fallback={<PageLoading />}><Demos /></Suspense>} />
          <Route path="try-on" element={<Suspense fallback={<PageLoading />}><TryOn /></Suspense>} />
          <Route path="services" element={<Suspense fallback={<PageLoading />}><Services /></Suspense>} />
          <Route path="about" element={<Suspense fallback={<PageLoading />}><About /></Suspense>} />
          <Route path="contact" element={<Suspense fallback={<PageLoading />}><Contact /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageLoading />}><NotFound /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LanguageProvider>
  );
}
