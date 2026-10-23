import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SyncModal } from './components/common/SyncModal';

// Pages are loaded on first visit so the first screen downloads less JavaScript.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard').then((m) => ({ default: m.EmployeeDashboard })));
const Attendance = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })));
const RawSwipes = lazy(() => import('./pages/RawSwipes').then((m) => ({ default: m.RawSwipes })));
const Employees = lazy(() => import('./pages/Employees').then((m) => ({ default: m.Employees })));
const Holidays = lazy(() => import('./pages/Holidays').then((m) => ({ default: m.Holidays })));
const MyPortal = lazy(() => import('./pages/MyPortal').then((m) => ({ default: m.MyPortal })));
const SyncHistory = lazy(() => import('./pages/SyncHistory').then((m) => ({ default: m.SyncHistory })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const UserManagement = lazy(() => import('./pages/UserManagement').then((m) => ({ default: m.UserManagement })));
const OTCalculator = lazy(() => import('./pages/OTCalculator').then((m) => ({ default: m.OTCalculator })));
const PfDeductions = lazy(() => import('./pages/PfDeductions').then((m) => ({ default: m.PfDeductions })));
const Approvals = lazy(() => import('./pages/Approvals').then((m) => ({ default: m.Approvals })));

import { api } from './services/api';
import { useDataVersion } from './services/dataSync';
import { AttendanceSource } from './types';
import type { UserRole } from './types/auth.types';
import { errorMessage } from './lib/apiError';

// Roles the backend lets run day-to-day HR operations (access.HR_OR_ABOVE). Settings, sync and user management stay narrower.
const HR_OR_ABOVE: UserRole[] = ['SUPER_ADMIN', 'FOUNDER', 'HR'];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-label="Loading page">
    <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

const MainLayout: React.FC = () => {
  const { isEmployee } = useAuth();
  const dataVersion = useDataVersion();
  // Sources come from the backend only (no invented defaults).
  const [sources, setSources] = useState<AttendanceSource[]>([]);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  const [activeSourceId, setActiveSourceId] = useState<string>('all');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncModalTarget, setSyncModalTarget] = useState<string>('office');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const loadSources = async () => {
    try {
      setSources(await api.getSources());
      setSourcesError(null);
    } catch (err) {
      setSourcesError(errorMessage(err, 'Could not load the biometric sources.'));
    }
  };

  useEffect(() => {
    loadSources();
  }, [dataVersion]);

  const handleOpenSync = (targetSourceId?: string) => {
    if (targetSourceId && targetSourceId !== 'all') {
      setSyncModalTarget(targetSourceId);
    } else if (activeSourceId !== 'all') {
      setSyncModalTarget(activeSourceId);
    } else {
      setSyncModalTarget('office');
    }
    setIsSyncModalOpen(true);
  };

  const handleSyncComplete = () => {
    loadSources();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/60 text-slate-800 font-sans">
      {/* Sidebar — fixed on desktop, drawer on mobile */}
      <Sidebar
        sources={sources}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          onOpenSync={() => handleOpenSync()}
          sources={sources}
          activeSourceId={activeSourceId}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 w-full max-w-[1920px] mx-auto transition-all">
          {sourcesError && (
            <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between gap-3">
              <span>{sourcesError} Location filters may be incomplete.</span>
              <button type="button" onClick={loadSources} className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-100">Retry</button>
            </div>
          )}
          <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Root route: Auto-switches based on Role */}
            <Route
              path="/"
              element={
                isEmployee ? (
                  <Navigate to="/my-dashboard" replace />
                ) : (
                  <Dashboard
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                )
              }
            />

            {/* Dedicated Employee Dashboard (Only for Employees) */}
            <Route
              path="/my-dashboard"
              element={
                isEmployee ? (
                  <EmployeeDashboard />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            
            {/* Employee ESS Portal */}
            <Route path="/portal" element={<MyPortal />} />
            <Route path="/my-portal" element={<MyPortal />} />

            {/* Corporate Holidays (Available to all) */}
            <Route path="/holidays" element={<Holidays />} />

            {/* Founder & Super Admin Management Routes */}
            <Route
              path="/approvals"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <Attendance
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/raw-swipes"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <RawSwipes
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <Employees
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ot-calculator"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <OTCalculator
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pf-deductions"
              element={
                <ProtectedRoute allowedRoles={HR_OR_ABOVE}>
                  <PfDeductions
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sync-history"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'FOUNDER']}>
                  <SyncHistory
                    sources={sources}
                    activeSourceId={activeSourceId}
                    onSelectSource={setActiveSourceId}
                    onOpenSync={handleOpenSync}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'FOUNDER']}>
                  <Settings sources={sources} />
                </ProtectedRoute>
              }
            />

            {/* Super Admin Exclusive User Management */}
            <Route
              path="/user-management"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Sync Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        sources={sources}
        activeSourceId={syncModalTarget}
        onSyncComplete={handleSyncComplete}
      />
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
