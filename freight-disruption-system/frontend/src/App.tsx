// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PortOverviewPage } from './pages/PortOverviewPage';
import { SinglePortDetailPage } from './pages/SinglePortDetailPage';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './store/authStore';

// Protected Route Component (Optional strict check or soft fallback)
const ProtectedRoute = ({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: string;
}) => {
  const { isAuthenticated, role } = useAuthStore();

  // If not authenticated or wrong role, redirect to login
  if (!isAuthenticated && role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 font-sans text-white">
        <Routes>
          {/* Public Authentication & Landing Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Page 3.1 — Port Overview */}
          <Route path="/dashboard/port" element={<PortOverviewPage />} />

          {/* Page 3.2 — Single Port Detail */}
          <Route path="/dashboard/port/:portId" element={<SinglePortDetailPage />} />

          {/* Fallbacks */}
          <Route path="/dashboard/operations" element={<Navigate to="/dashboard/port" replace />} />
          <Route path="/dashboard/admin" element={<Navigate to="/dashboard/port" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;