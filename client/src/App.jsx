import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { AppDataProvider, useAppData } from './hooks/useAppData.jsx';
import { LoginPage, SignupPage } from './pages/AuthPages.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DisplayPage from './pages/DisplayPage.jsx';
import FolderDetailsPage from './pages/FolderDetailsPage.jsx';
import FolderEditorPage from './pages/FolderEditorPage.jsx';
import SlideshowPage from './pages/SlideshowPage.jsx';

function ProtectedLayout() {
  const { user, authLoading, foldersLoaded } = useAppData();
  if (authLoading || (user && !foldersLoaded)) return <div className="route-loading" role="status">Loading your library…</div>;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

function LoginRedirect() {
  const { user } = useAppData();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginRedirect />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/folders/new" element={<FolderEditorPage />} />
        <Route path="/folders/:id" element={<FolderDetailsPage />} />
        <Route path="/folders/:id/edit" element={<FolderEditorPage />} />
        <Route path="/folders/:id/slideshow" element={<SlideshowPage />} />
        <Route path="/display" element={<DisplayPage />} />
      </Route>
      <Route path="*" element={<LoginRedirect />} />
    </Routes>
  );
}

export default function App() {
  return <AppDataProvider><BrowserRouter><AppRoutes /></BrowserRouter></AppDataProvider>;
}
