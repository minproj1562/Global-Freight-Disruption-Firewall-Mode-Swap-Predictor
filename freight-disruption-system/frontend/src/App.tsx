// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OperationsDashboard } from './pages/OperationsDashboard';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './store/authStore';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific role requested and doesn't match, still allow command center access in demo mode
  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 font-sans">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/dashboard/operations"
            element={
              <ProtectedRoute allowedRole="operations">
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard/port"
            element={
              <ProtectedRoute allowedRole="port">
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;