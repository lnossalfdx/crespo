import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Lazy load all pages
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Funil = lazy(() => import('./pages/Funil').then((m) => ({ default: m.Funil })));
const Kanban = lazy(() => import('./pages/Kanban').then((m) => ({ default: m.Kanban })));
const Clientes = lazy(() => import('./pages/Clientes').then((m) => ({ default: m.Clientes })));
const ClienteDetail = lazy(() => import('./pages/ClienteDetail').then((m) => ({ default: m.ClienteDetail })));
const Projetos = lazy(() => import('./pages/Projetos').then((m) => ({ default: m.Projetos })));
const ProjetoDetail = lazy(() => import('./pages/ProjetoDetail').then((m) => ({ default: m.ProjetoDetail })));
const Financeiro = lazy(() => import('./pages/Financeiro').then((m) => ({ default: m.Financeiro })));
const Agenda = lazy(() => import('./pages/Agenda').then((m) => ({ default: m.Agenda })));
const Configuracoes = lazy(() => import('./pages/Configuracoes').then((m) => ({ default: m.Configuracoes })));

const PageLoader: React.FC = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gray-700 border-t-white rounded-full animate-spin" />
  </div>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-screen bg-gray-950 overflow-hidden">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <Header />
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </Suspense>
    </div>
    <MobileNav />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthLoading } = useAppStore();
  if (isAuthLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

export const AppRouter: React.FC = () => {
  const { isAuthenticated, isAuthLoading } = useAppStore();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthLoading ? (
              <PageLoader />
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthLoading ? (
              <PageLoader />
            ) : (
              <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/funil"
          element={
            <ProtectedRoute>
              <Funil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kanban"
          element={
            <ProtectedRoute>
              <Kanban />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <ProtectedRoute>
              <ClienteDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projetos"
          element={
            <ProtectedRoute>
              <Projetos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projetos/:id"
          element={
            <ProtectedRoute>
              <ProjetoDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute>
              <Financeiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <ProtectedRoute>
              <Agenda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <Configuracoes />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
