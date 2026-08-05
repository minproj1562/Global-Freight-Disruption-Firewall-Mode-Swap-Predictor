// frontend/src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OperationsDashboard } from './pages/OperationsDashboard';
import { PortManagerAuthPage } from './pages/PortManagerAuthPage';
import { PortOverviewPage } from './pages/PortOverviewPage';
import { SinglePortDetailPage } from './pages/SinglePortDetailPage';
import { VesselLogsPage } from './pages/VesselLogsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminAuthPage } from './pages/AdminAuthPage';
import { DisruptionAlertCenterPage } from './pages/DisruptionAlertCenterPage';
import { RerouteRecommendationPage } from './pages/RerouteRecommendationPage';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* System Administrator Dedicated Auth */}
          <Route path="/auth/admin" element={<AdminAuthPage />} />
          <Route path="/admin-login" element={<AdminAuthPage />} />

          {/* Port Manager Dedicated Auth */}
          <Route path="/auth/port-manager" element={<PortManagerAuthPage />} />
          <Route path="/port-manager" element={<PortManagerAuthPage />} />
          <Route path="/port-login" element={<PortManagerAuthPage />} />
          <Route path="/port-register" element={<PortManagerAuthPage />} />

          {/* Page 1.2 — Disruption Alert Center */}
          <Route path="/dashboard/disruptions" element={<DisruptionAlertCenterPage />} />
          <Route path="/dashboard/alert-center" element={<DisruptionAlertCenterPage />} />

          {/* Page 1.3 — Reroute Recommendation Page */}
          <Route path="/dashboard/reroute-planner" element={<RerouteRecommendationPage />} />
          <Route path="/dashboard/reroute" element={<RerouteRecommendationPage />} />

          {/* Page 3.1 — Port Overview */}
          <Route path="/dashboard/ports" element={<PortOverviewPage />} />

          {/* Page 3.2 — Single Port Detail */}
          <Route path="/dashboard/ports/:portId" element={<SinglePortDetailPage />} />

          {/* Page 3.3 — Vessel Arrival/Departure Log */}
          <Route path="/dashboard/vessel-logs" element={<VesselLogsPage />} />
          <Route path="/dashboard/vessels/logs" element={<VesselLogsPage />} />

          {/* Operations Command */}
          <Route path="/dashboard/operations" element={<OperationsDashboard />} />
          <Route path="/dashboard/port" element={<OperationsDashboard />} />

          {/* DASHBOARD 3: ADMIN DASHBOARD (Page 4.1 System Health, Page 4.2 Disruptions, Page 4.3 Vessels) */}
          <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;