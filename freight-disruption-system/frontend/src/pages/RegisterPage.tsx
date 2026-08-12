import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Mail, Lock, User, ArrowLeft, Loader2, Building2, CheckCircle2, XCircle, ShieldCheck, Compass, Globe, Anchor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    password: '',
    confirmPassword: '',
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>('operations');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (pass.length === 0) return { score: 0, label: '', color: 'bg-slate-800' };
    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-400' };
    if (score === 3) return { score: 75, label: 'Strong', color: 'bg-blue-500', textColor: 'text-blue-400' };
    return { score: 100, label: 'Enterprise Grade', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  };

  const passStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const success = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: selectedRole,
      });

      if (success) {
        toast({
          title: "Account Provisioned",
          description: "Welcome to Freight Disruption Firewall. Opening command center...",
        });

        setTimeout(() => {
          if (selectedRole === 'port') {
            navigate(`/dashboard/ports`);
          } else {
            navigate(`/dashboard/operations`);
          }
        }, 600);
      } else {
        setError('Registration failed. Email may already exist.');
      }
    } catch {
      setError('An error occurred during account creation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-slate-100 flex flex-col justify-between">
      <AnimatedBackground />

      {/* Header bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
        <Link to="/" className="inline-flex items-center text-amber-400 hover:text-amber-300 font-medium text-sm transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Global Landing
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/auth/port-manager"
            className="text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"
          >
            <Anchor className="w-3.5 h-3.5 text-emerald-400" />
            Port Manager Dedicated Reg & Login
          </Link>
        </div>
      </header>

      {/* Main Split Screen */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">

          {/* Left Pane — Branding */}
          <div className="lg:col-span-5 p-8 lg:p-12 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-blue-950/60 border-r border-slate-800/60 flex flex-col justify-between min-h-[560px]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-3 shadow-lg shadow-amber-500/20 text-slate-950">
                  <Ship className="w-8 h-8" strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white font-mono">FREIGHT FIREWALL</h2>
                  <p className="text-xs text-amber-400 font-medium tracking-wider">ENTERPRISE ONBOARDING</p>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-100 mb-3 leading-snug">
                Join the Global Supply Chain Resilience Network
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Deploy predictive disruption alerts, automatic mode-swaps, and AIS telemetry across your fleet & port terminals.
              </p>

              {/* Port Manager Callout */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 mb-1">
                  <Anchor className="w-4 h-4 text-emerald-400" />
                  Port Operations & Terminal Managers:
                </div>
                <p className="text-[11px] text-slate-300 mb-2">
                  Use the dedicated Port Manager registration form with Employee ID, Assigned Port & Security Pass.
                </p>
                <Link
                  to="/auth/port-manager"
                  className="inline-block px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                >
                  Port Manager Registration Form →
                </Link>
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: ShieldCheck, title: 'Geopolitical Risk Shield', desc: 'Predictive alerts for Suez, Panama, Bab-el-Mandeb' },
                  { icon: Compass, title: 'Multi-Modal Route Swapping', desc: 'Sea → Air & Sea → Rail instant cost/time trade-offs' },
                  { icon: Globe, title: 'Real-Time Congestion Indexing', desc: 'Port waiting times & berth utilization telemetry' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                    <item.icon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-800/80 text-xs text-slate-500 font-mono">
              Role-Based Access Control • SOC2 Type II Certified
            </div>
          </div>

          {/* Right Pane — Registration Form */}
          <div className="lg:col-span-7 p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                  Create Enterprise Account
                </h1>
                <p className="text-xs text-slate-400">
                  Fill in your credentials to provision your operational workspace
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-300">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Captain Sarah Jenkins"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="pl-10 h-10 bg-slate-950/80 border-slate-800 focus:border-amber-400 text-white placeholder:text-slate-500 rounded-xl text-xs"
                    />
                  </div>
                </div>

                {/* Email & Organization in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-medium text-slate-300">Work Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="s.jenkins@maersk.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="pl-10 h-10 bg-slate-950/80 border-slate-800 focus:border-amber-400 text-white placeholder:text-slate-500 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="organization" className="text-xs font-medium text-slate-300">Organization</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="organization"
                        type="text"
                        placeholder="Maersk Logistics Global"
                        value={formData.organization}
                        onChange={handleChange}
                        required
                        className="pl-10 h-10 bg-slate-950/80 border-slate-800 focus:border-amber-400 text-white placeholder:text-slate-500 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs font-medium text-slate-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="pl-10 h-10 bg-slate-950/80 border-slate-800 focus:border-amber-400 text-white placeholder:text-slate-500 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="pl-10 h-10 bg-slate-950/80 border-slate-800 focus:border-amber-400 text-white placeholder:text-slate-500 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Password Strength:</span>
                      <span className={`font-semibold ${passStrength.textColor}`}>{passStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passStrength.color} transition-all duration-300`}
                        style={{ width: `${passStrength.score}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        {formData.password.length >= 8 ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />} 8+ Characters
                      </span>
                      <span className="flex items-center gap-1">
                        {/[A-Z]/.test(formData.password) ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />} Uppercase Letter
                      </span>
                      <span className="flex items-center gap-1">
                        {/[0-9]/.test(formData.password) ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />} Number
                      </span>
                      <span className="flex items-center gap-1">
                        {/[^A-Za-z0-9]/.test(formData.password) ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-slate-600" />} Special Character
                      </span>
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-300">Select Operational Role</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'operations', label: 'Global Ops' },
                      { value: 'port', label: 'Port Command' },
                      { value: 'admin', label: 'Admin' },
                    ].map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => {
                          if (role.value === 'port') {
                            navigate('/auth/port-manager');
                          } else {
                            setSelectedRole(role.value as UserRole);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                          selectedRole === role.value
                            ? 'bg-amber-400/15 border-amber-400/60 text-amber-300'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-300 font-medium"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                      Provisioning Account...
                    </>
                  ) : (
                    'Complete Enterprise Registration'
                  )}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-5 text-center text-xs text-slate-400 space-y-1">
                <div>
                  Port Manager?{' '}
                  <Link to="/auth/port-manager" className="text-emerald-400 hover:text-emerald-300 font-bold hover:underline">
                    Dedicated Port Manager Registration & Login →
                  </Link>
                </div>
                <div>
                  Already registered?{' '}
                  <Link to="/login" className="text-amber-400 hover:text-amber-300 font-bold hover:underline">
                    Sign in to command center
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 font-mono">
        GLOBAL FREIGHT DISRUPTION FIREWALL & MODE-SWAP PREDICTOR &copy; 2026
      </footer>
    </div>
  );
};