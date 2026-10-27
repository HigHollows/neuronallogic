import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { LessonPage } from './pages/LessonPage';
import { ModulePage } from './pages/ModulePage';
import { Path } from './pages/Path';
import { GlossaryPage, TermPage } from './pages/Glossary';
import { ResourcesPage } from './pages/Resources';
import { QuizListPage, QuizPage } from './pages/Quizzes';
import { SearchPage } from './pages/SearchPage';
import { NotFound } from './pages/NotFound';

const ExercisesPage = lazy(() => import('./pages/Exercises').then((m) => ({ default: m.ExercisesPage })));
const ProjectPage = lazy(() => import('./pages/Project').then((m) => ({ default: m.ProjectPage })));
const RevisionPage = lazy(() => import('./pages/Revision').then((m) => ({ default: m.RevisionPage })));
const ProgressPage = lazy(() => import('./pages/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const AboutPage = lazy(() => import('./pages/About').then((m) => ({ default: m.AboutPage })));
const AtelierPage = lazy(() => import('./pages/Atelier').then((m) => ({ default: m.AtelierPage })));
const DefisPage = lazy(() => import('./pages/Defis').then((m) => ({ default: m.DefisPage })));
const BonusListPage = lazy(() => import('./pages/Bonus').then((m) => ({ default: m.BonusListPage })));
const BonusPage = lazy(() => import('./pages/Bonus').then((m) => ({ default: m.BonusPage })));
const StudioPage = lazy(() => import('./pages/Studio').then((m) => ({ default: m.StudioPage })));
const StudioGuideIndex = lazy(() => import('./pages/StudioGuide').then((m) => ({ default: m.StudioGuideIndex })));
const StudioGuidePage = lazy(() => import('./pages/StudioGuide').then((m) => ({ default: m.StudioGuidePage })));
const CorrectionsPage = lazy(() => import('./pages/Corrections').then((m) => ({ default: m.CorrectionsPage })));

export function AppRoutes() {
  return (
    <Suspense fallback={<p role="status" className="muted">Chargement…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="parcours" element={<Path />} />
          <Route path="module/:id" element={<ModulePage />} />
          <Route path="lecon/:id" element={<LessonPage />} />
          <Route path="notions" element={<GlossaryPage />} />
          <Route path="notions/:id" element={<TermPage />} />
          <Route path="ressources" element={<ResourcesPage />} />
          <Route path="quiz" element={<QuizListPage />} />
          <Route path="quiz/:id" element={<QuizPage />} />
          <Route path="exercices" element={<ExercisesPage />} />
          <Route path="projet-final" element={<ProjectPage />} />
          <Route path="revision" element={<RevisionPage />} />
          <Route path="progression" element={<ProgressPage />} />
          <Route path="recherche" element={<SearchPage />} />
          <Route path="defis" element={<DefisPage />} />
          <Route path="atelier" element={<AtelierPage />} />
          <Route path="bonus" element={<BonusListPage />} />
          <Route path="bonus/:id" element={<BonusPage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route path="studio" element={<StudioPage />} />
          <Route path="studio/guide" element={<StudioGuideIndex />} />
          <Route path="studio/guide/*" element={<StudioGuidePage />} />
          <Route path="corrections" element={<CorrectionsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
