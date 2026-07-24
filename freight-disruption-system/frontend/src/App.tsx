// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from './store/authStore';

// Placeholder dashboard components (you'll create these later)
const OperationsDashboard = () => <div className="p-8 text-white">Operations Dashboard</div>;
const PortDashboard = () => <div className="p-8 text-white">Port Dashboard</div>;
const AdminDashboard = () => <div className="p-8 text-white">Admin Dashboard</div>;

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated || role !== allowedRole) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-maritime-deep">
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
                <PortDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
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