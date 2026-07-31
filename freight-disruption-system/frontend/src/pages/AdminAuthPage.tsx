// frontend/src/pages/AdminAuthPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  Settings,
} from 'lucide-react';
import { loginAdmin } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/shared/components/ThemeToggle';
import { useToast } from '@/components/ui/use-toast';

export const AdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthSession } = useAuthStore();
  const { toast } = useToast();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await loginAdmin({
        username_or_email: usernameOrEmail,
        password: password,
      });

      // Update Zustand Auth Store
      setAuthSession(
        {
          id: response.user.id,
          name: response.user.full_name || response.user.username,
          username: response.user.username,
          email: response.user.email,
        },
        response.access_token,
        'admin'
      );

      toast({
        title: 'System Administrator Authenticated ✓',
        description: `Welcome back, ${response.user.full_name || response.user.username}. Accessing Admin Command Center.`,
      });

      navigate('/dashboard/admin');
    } catch (err: unknown) {
      console.error('Admin Auth Error:', err);
      const msg = err instanceof Error ? err.message : 'Invalid Admin Master Credentials';
      setError(msg);
      toast({
        title: 'Authentication Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setUsernameOrEmail('admin');
    setPassword('adminpassword123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Grid Pattern & Glow Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#3b0764_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-white tracking-wide block">FREIGHT FIREWALL</span>
            <span className="text-[10px] text-purple-400 font-mono">SYSTEM ADMINISTRATOR PORTAL</span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Login Form Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/50 backdrop-blur-xl space-y-6"
        >
          {/* Badge & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>ADMINISTRATOR AUTHENTICATION</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Admin Command Login</h2>
            <p className="text-xs text-slate-400">
              Enter your master administrator credentials to manage system health, live disruptions, and maritime fleets.
            </p>
          </div>

          {/* Quick Demo Credentials Hint Button */}
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-mono text-[11px] text-purple-300 font-bold flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-purple-400" /> Default Master Credentials
              </div>
              <div className="text-[10px] text-slate-400 font-mono">User: <span className="text-white">admin</span> | Pass: <span className="text-white">adminpassword123</span></div>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold font-mono border border-purple-500/40 transition-all"
            >
              Fill Demo
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 font-bold mb-1.5">
                ADMIN USERNAME OR EMAIL *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin or admin@freightfirewall.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-purple-500 rounded-xl text-white text-xs font-mono focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 font-bold mb-1.5">
                MASTER PASSWORD *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 focus:border-purple-500 rounded-xl text-white text-xs font-mono focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs font-mono shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING MASTER ACCOUNT...</span>
                </>
              ) : (
                <>
                  <span>AUTHENTICATE & ACCESS DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Links */}
          <div className="pt-2 text-center text-xs font-mono text-slate-500 flex justify-center gap-4">
            <Link to="/auth/port-manager" className="hover:text-amber-400 transition-colors">
              Port Manager Portal →
            </Link>
            <span>•</span>
            <Link to="/" className="hover:text-purple-400 transition-colors">
              Return Home
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] font-mono text-slate-600 border-t border-slate-900">
        FREIGHT DISRUPTION FIREWALL • SYSTEM ADMINISTRATOR CONTROL PORTAL
      </footer>
    </div>
  );
};
