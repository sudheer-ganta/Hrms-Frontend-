import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SyncModal } from './components/common/SyncModal';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { Attendance } from './pages/Attendance';
import { RawSwipes } from './pages/RawSwipes';
import { Employees } from './pages/Employees';
import { Holidays } from './pages/Holidays';
import { MyPortal } from './pages/MyPortal';
import { SyncHistory } from './pages/SyncHistory';
import { Settings } from './pages/Settings';
import { UserManagement } from './pages/UserManagement';

import { api } from './services/api';
import { AttendanceSource } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const MainLayout: React.FC = () => {
  const { user, isEmployee } = useAuth();
  const [sources, setSources] = useState<AttendanceSource[]>([
    { id: 'office', name: 'ColorMyles', status: 'connected' },
    { id: 'budigere', name: 'Budigere', status: 'connected' },
    { id: 'bidarahalli', name: 'Bidarahalli', status: 'connected' },
  ]);

  const [activeSourceId, setActiveSourceId] = useState<string>('all');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncModalTarget, setSyncModalTarget] = useState<string>('office');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const loadSources = async () => {
    try {
      const data = await api.getSources();
      if (data && data.length > 0) {
        setSources(data);
      }
    } catch (err) {
      console.warn('Using default configured sources:', err);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

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

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'FOUNDER']}>
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
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'FOUNDER']}>
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
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'FOUNDER']}>
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
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
