import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Mail, Lock, ArrowLeft, Loader2, ShieldCheck, CheckCircle2, AlertCircle, X, Compass, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { ThemeToggle } from '@/shared/components/ThemeToggle';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const preSelectedRole = (location.state as { role?: UserRole })?.role || 'operations';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>(preSelectedRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Inline Validation
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isEmailValid = email.includes('@') && email.includes('.');
  const isPasswordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password, selectedRole);

      if (success) {
        toast({
          title: "Authentication Successful",
          description: `Access granted for ${selectedRole.toUpperCase()} command center. Redirecting...`,
        });

        setTimeout(() => {
          navigate(`/dashboard/operations`);
        }, 600);
      } else {
        setError('Invalid credentials. Demo password is "demo123"');
      }
    } catch {
      setError('Connection timeout. Please verify network and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.includes('@')) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 1200);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col justify-between">
      <AnimatedBackground />

      {/* Header bar with Back Link & Theme Toggle */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
        <Link to="/" className="inline-flex items-center text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Portal
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Split-Screen Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Left Side — Branding & Dynamic Visual */}
          <div className="lg:col-span-5 p-8 lg:p-12 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-blue-950/60 border-r border-slate-800/60 flex flex-col justify-between min-h-[480px]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-3 shadow-lg shadow-amber-500/20 text-slate-950">
                  <Ship className="w-8 h-8" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white font-mono">FREIGHT FIREWALL</h2>
                  <p className="text-xs text-amber-400 font-medium tracking-wider">MODE-SWAP PREDICTOR</p>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-100 mb-3 leading-snug">
                Enterprise Maritime Intelligence Platform
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Real-time AIS tracking, geopolitical disruption firewalling, and AI-driven intermodal route swapping for global supply chains.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-3.5">
                {[
                  { icon: Compass, title: 'Live AIS Satellite Telemetry', desc: 'Global vessel tracking & speed vector extrapolation' },
                  { icon: ShieldCheck, title: 'Autonomous Disruption Firewall', desc: 'Predictive alert zones for chokepoints & ports' },
                  { icon: Globe, title: 'Intermodal Mode-Swap Engine', desc: 'Instant Sea → Air & Sea → Rail route optimization' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                    <item.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Palantir & Flexport Standard</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> 99.98% Uptime
              </span>
            </div>
          </div>

          {/* Right Side — Login Form */}
          <div className="lg:col-span-7 p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                  Command Center Login
                </h1>
                <p className="text-sm text-slate-400">
                  Authenticate to access live telemetry & route firewalling
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                    Enterprise Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="logistics@maersk.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      required
                      className={`pl-10 h-11 bg-slate-950/80 border ${
                        emailTouched && !isEmailValid ? 'border-rose-500/80 focus:ring-rose-500/30' : 'border-slate-800 focus:border-amber-400 focus:ring-amber-400/20'
                      } text-white placeholder:text-slate-500 rounded-xl transition-all`}
                    />
                  </div>
                  {emailTouched && !isEmailValid && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> Please enter a valid email format.
                    </motion.p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                      Security Credentials
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setPasswordTouched(true)}
                      required
                      className={`pl-10 h-11 bg-slate-950/80 border ${
                        passwordTouched && !isPasswordValid ? 'border-rose-500/80 focus:ring-rose-500/30' : 'border-slate-800 focus:border-amber-400 focus:ring-amber-400/20'
                      } text-white placeholder:text-slate-500 rounded-xl transition-all`}
                    />
                  </div>
                </div>

                {/* Role Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-300">Operational Role Context</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'operations', label: 'Global Ops', emoji: '🚢' },
                      { value: 'port', label: 'Port Command', emoji: '⚓' },
                      { value: 'admin', label: 'Admin', emoji: '⚙️' },
                    ].map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value as UserRole)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                          selectedRole === role.value
                            ? 'bg-amber-400/15 border-amber-400/60 text-amber-300 shadow-md'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                        }`}
                      >
                        <span>{role.emoji}</span>
                        <span>{role.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400/30"
                  />
                  <label htmlFor="remember" className="text-xs text-slate-300 cursor-pointer">
                    Remember device session for 30 days
                  </label>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3.5 flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-rose-300 font-medium leading-tight">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3.5 text-sm rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Authenticating Credentials...
                    </>
                  ) : (
                    'Sign In to Firewall Platform'
                  )}
                </Button>

                {/* Demo Hint */}
                <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-center text-xs text-slate-300">
                  <span className="font-semibold text-amber-400">Demo Access:</span> Enter any email and password <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">demo123</code>
                </div>
              </form>

              {/* Registration Link */}
              <div className="mt-6 text-center text-xs text-slate-400">
                Need an enterprise account?{' '}
                <Link to="/register" state={{ role: selectedRole }} className="text-amber-400 hover:text-amber-300 font-bold hover:underline">
                  Request access & register
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 font-mono">
        GLOBAL FREIGHT DISRUPTION FIREWALL & MODE-SWAP PREDICTOR &copy; 2026
      </footer>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <button
                onClick={() => { setShowForgotModal(false); setForgotSent(false); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>

              {!forgotSent ? (
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Reset Operational Password</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Enter your registered enterprise email address to receive password reset authorization links.
                  </p>
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email" className="text-xs text-slate-300">Email Address</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@company.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="bg-slate-950 border-slate-800 text-white text-xs h-10 rounded-xl"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 h-10 text-xs rounded-xl"
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Authorization Email'}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Reset Link Dispatched</h3>
                  <p className="text-xs text-slate-300 mb-4">
                    Check <strong className="text-amber-400">{forgotEmail}</strong> for authorization instructions.
                  </p>
                  <Button
                    onClick={() => { setShowForgotModal(false); setForgotSent(false); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs h-9 px-6 rounded-xl"
                  >
                    Return to Login
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};