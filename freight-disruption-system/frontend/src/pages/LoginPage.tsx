// frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Anchor, Mail, Lock, UserCheck, ArrowLeft, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const preSelectedRole = (location.state as { role?: UserRole })?.role || 'port';

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(preSelectedRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login({
        usernameOrEmail,
        password,
        employeeId,
        role: selectedRole,
      });

      if (success) {
        toast({
          title: '⚓ Access Granted',
          description: `Logged in as Port Manager. Redirecting to Port Telemetry...`,
        });

        setTimeout(() => {
          navigate(selectedRole === 'port' ? '/dashboard/port' : `/dashboard/${selectedRole}`);
        }, 500);
      } else {
        setError('Invalid credentials. Password min length 6 chars (or demo123).');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white flex flex-col justify-center px-4 py-12">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Back Button */}
          <Link
            to="/"
            className="inline-flex items-center text-amber-400 hover:text-amber-300 transition-colors mb-6 text-sm font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="relative bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl" />
                <div className="relative rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-4 shadow-xl text-slate-950">
                  <Anchor className="h-10 w-10" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-extrabold text-center text-white mb-1">
              Port Manager Sign In
            </h1>
            <p className="text-center text-slate-300 text-xs mb-6">
              Access your port command center & congestion telemetry dashboard
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username or Email */}
              <div className="space-y-1">
                <Label htmlFor="usernameOrEmail" className="text-xs font-semibold text-slate-200">
                  Username or Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="usernameOrEmail"
                    type="text"
                    placeholder="vance_nlrtm or user@port.org"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-1">
                <Label htmlFor="employeeId" className="text-xs font-semibold text-slate-200">
                  Port Employee ID (Optional)
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="PM-9082-NL"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-200">Select Access Portal</Label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { value: 'port', label: 'Port Manager', emoji: '⚓' },
                    { value: 'operations', label: 'Operations', emoji: '🚢' },
                    { value: 'admin', label: 'Admin', emoji: '⚙️' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value as UserRole)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center ${
                        selectedRole === role.value
                          ? 'bg-amber-400 text-slate-950 shadow-lg scale-105'
                          : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span>{role.emoji}</span>
                      <span className="text-[10px] mt-0.5">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-extrabold py-5 text-sm rounded-xl shadow-lg transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in to Port Gateway...
                  </>
                ) : (
                  'Sign In & Access Telemetry'
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="mt-6 text-center text-xs text-slate-300">
              New Port Manager?{' '}
              <Link to="/register" className="text-amber-400 hover:text-amber-300 font-bold hover:underline">
                Register New Credentials
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};