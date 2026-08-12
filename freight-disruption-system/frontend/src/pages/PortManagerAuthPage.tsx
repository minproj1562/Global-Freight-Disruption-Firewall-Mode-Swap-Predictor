//frontend/src/pages/PortManagerAuthPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  BadgeCheck,
  IdCard,
  Anchor,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Globe,
  HelpCircle,
  KeyRound,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { EXTENDED_PORTS_DATA } from '@/shared/mock/portMockData';
import { fetchAllPorts } from '@/services/portManagerApi';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';

export const PortManagerAuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');

  // Registration Form State
  const [regData, setRegData] = useState({
    fullName: '',
    employeeId: 'PM-' + Math.floor(10000 + Math.random() * 90000),
    email: '',
    mobileNumber: '',
    portName: 'Port of Rotterdam',
    username: '',
    password: '',
    confirmPassword: '',
    department: 'Container Terminal Operations',
    securityPassId: 'SEC-GOV-' + Math.floor(1000 + Math.random() * 9000),
  });

  // Login Form State
  const [loginData, setLoginData] = useState({
    usernameOrId: '',
    password: '',
    assignedPort: 'Port of Rotterdam',
    rememberMe: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, login } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Dynamic ports list from backend API (with mock fallback)
  const [portsList, setPortsList] = useState<Array<{ id: string; name: string; code: string; country: string }>>(
    EXTENDED_PORTS_DATA.map(p => ({ id: p.id, name: p.name, code: p.code, country: p.country }))
  );

  useEffect(() => {
    fetchAllPorts()
      .then((data) => {
        if (data && data.length > 0) {
          setPortsList(data.map(p => ({ id: p.id, name: p.name, code: p.code, country: p.country })));
        }
      })
      .catch((err) => console.log('Using default ports dropdown:', err));
  }, []);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (pass.length === 0) return { score: 0, label: '', color: 'bg-slate-200' };
    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600 dark:text-rose-400' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' };
    if (score === 3) return { score: 75, label: 'Strong', color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' };
    return { score: 100, label: 'Port Security Compliant', color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' };
  };

  const passStrength = getPasswordStrength(regData.password);

  const handleRegChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setRegData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLoginData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (regData.password !== regData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (regData.password.length < 8) {
      setError('Password must be at least 8 characters long and include uppercase, number & special character');
      return;
    }

    setIsLoading(true);

    try {
      const success = await register({
        email: regData.email,
        password: regData.password,
        name: regData.fullName,
        role: 'port',
        employeeId: regData.employeeId,
        mobileNumber: regData.mobileNumber,
        portName: regData.portName,
        username: regData.username,
        department: regData.department,
      });

      if (success) {
        toast({
          title: "Port Manager Account Provisioned",
          description: `Welcome Port Manager ${regData.fullName}. Launching Port Operations Center for ${regData.portName}...`,
        });

        setTimeout(() => {
          const matchedPort = EXTENDED_PORTS_DATA.find((p) => p.name === regData.portName);
          const targetPortId = matchedPort ? matchedPort.id : 'port-rotterdam';
          navigate(`/dashboard/ports/${targetPortId}`);
        }, 600);
      } else {
        setError('Registration failed. Username or Employee ID may already exist.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during Port Manager account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginData.usernameOrId || !loginData.password) {
      setError('Please enter your Username/Employee ID and Password');
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(
        loginData.usernameOrId,
        loginData.password,
        'port',
        loginData.assignedPort
      );

      if (success) {
        toast({
          title: "Port Manager Authenticated",
          description: `Access granted to ${loginData.assignedPort} Operations Dashboard.`,
        });

        setTimeout(() => {
          const matchedPort = EXTENDED_PORTS_DATA.find((p) => p.name === loginData.assignedPort);
          const targetPortId = matchedPort ? matchedPort.id : 'port-rotterdam';
          navigate(`/dashboard/ports/${targetPortId}`);
        }, 600);
      } else {
        setError('Invalid Port Manager credentials. Please check your login details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-slate-100 flex flex-col justify-between">
      <AnimatedBackground />
      
      {/* Header bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium text-sm transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Global Landing
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/ports"
            className="text-xs font-mono px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Anchor className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Guest Port Overview
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 lg:p-8 my-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">

          {/* Left Pane — Port Operations Branding */}
          <div className="lg:col-span-5 p-8 lg:p-10 bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 text-white border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between min-h-[580px]">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-500 p-3 shadow-lg shadow-amber-500/25 text-slate-950">
                  <Anchor className="w-8 h-8" strokeWidth={2.4} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white font-mono">PORT COMMAND CENTER</h2>
                  <p className="text-xs text-amber-400 font-semibold tracking-wider uppercase">PORT MANAGER PORTAL</p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono mb-4">
                <BadgeCheck className="w-3.5 h-3.5" />
                PORT OPERATIONS EXCLUSIVE
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 leading-snug">
                Dedicated Terminal & Port Management System
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Real-time berth scheduling, 72-hour vessel queue management, AIS vessel arrivals, and port disruption alert controls.
              </p>

              <div className="space-y-3.5">
                {[
                  {
                    icon: ShieldCheck,
                    title: 'Port Health Telemetry',
                    desc: 'Live congestion gauges, average dwell time & anchorage queue metrics.',
                  },
                  {
                    icon: Anchor,
                    title: 'Berth Diagram & Quay Allocation',
                    desc: 'Interactive berth slot map, crane loading progress & draft clearance.',
                  },
                  {
                    icon: Globe,
                    title: 'Disruption Flagging Firewall',
                    desc: 'Issue instant labor, weather, or equipment disruption alerts for incoming fleets.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                    <item.icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{item.title}</h4>
                      <p className="text-[11px] text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>UN/LOCODE Compliant</span>
              <span>ISO 27001 Certified</span>
            </div>
          </div>

          {/* Right Pane — Registration & Login Form Tabbed */}
          <div className="lg:col-span-7 p-6 lg:p-10 flex flex-col justify-center">
            {/* Top Tab Selector */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'register'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <IdCard className="w-4 h-4" />
                Port Manager Registration
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError('');
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                Port Manager Login
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ========================================================================= */}
              {/* 1. PORT MANAGER REGISTRATION FORM */}
              {/* ========================================================================= */}
              {activeTab === 'register' ? (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                      Register Port Manager Account
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Exclusive onboarding for Port Authorities, Harbor Masters & Terminal Managers
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    {/* Full Name & Employee ID Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="fullName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Full Name <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Harbor Master Alex Rivera"
                            value={regData.fullName}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="employeeId" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Employee ID <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="employeeId"
                            type="text"
                            placeholder="PM-98241"
                            value={regData.employeeId}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-amber-700 dark:text-amber-300 font-mono font-semibold placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email & Mobile Number Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Work Email <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="a.rivera@portofrotterdam.com"
                            value={regData.email}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="mobileNumber" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Mobile Number <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="mobileNumber"
                            type="tel"
                            placeholder="+31 10 252 1000"
                            value={regData.mobileNumber}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Port Name & Username Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="portName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Port Name (Assigned Port) <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <Anchor className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                          <select
                            id="portName"
                            value={regData.portName}
                            onChange={handleRegChange}
                            required
                            className="w-full pl-10 pr-3 h-10 bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-xs appearance-none cursor-pointer"
                          >
                            {portsList.map((p) => (
                              <option key={p.id} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                {p.name} ({p.code}) — {p.country}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="username" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Username <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="username"
                            type="text"
                            placeholder="arivera_portmgr"
                            value={regData.username}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Department & Security Pass */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="department" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Department / Terminal
                        </Label>
                        <div className="relative">
                          <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="department"
                            type="text"
                            placeholder="Maasvlakte II Container Control"
                            value={regData.department}
                            onChange={handleRegChange}
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="securityPassId" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Port Security Pass No.
                        </Label>
                        <div className="relative">
                          <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="securityPassId"
                            type="text"
                            placeholder="SEC-GOV-8821"
                            value={regData.securityPassId}
                            onChange={handleRegChange}
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-mono placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Password <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={regData.password}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Confirm Password <span className="text-amber-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={regData.confirmPassword}
                            onChange={handleRegChange}
                            required
                            className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {regData.password && (
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Security Strength:</span>
                          <span className={`font-semibold ${passStrength.textColor}`}>{passStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passStrength.color} transition-all duration-300`}
                            style={{ width: `${passStrength.score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                      <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-600 dark:text-rose-300 font-medium">
                        {error}
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                          Registering Port Manager...
                        </>
                      ) : (
                        'Register & Launch Port Operations'
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                /* ========================================================================= */
                /* 2. PORT MANAGER LOGIN FORM */
                /* ========================================================================= */
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
                      Port Manager Sign In
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter your Port Manager credentials or Employee ID to access assigned terminal
                    </p>
                  </div>

                  {/* Quick Demo Manager Presets */}
                  <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 mb-2">
                      <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      1-CLICK QUICK DEMO MANAGER PRESETS:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { name: 'Rotterdam', id: 'port-rotterdam', code: 'NLRTM', manager: 'PM-Rotterdam' },
                        { name: 'Singapore', id: 'port-singapore', code: 'SGSIN', manager: 'PM-Singapore' },
                        { name: 'Los Angeles', id: 'port-la', code: 'USLAX', manager: 'PM-LA' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setLoginData({
                              usernameOrId: preset.manager,
                              password: 'Password123!',
                              assignedPort: `Port of ${preset.name}`,
                              rememberMe: true,
                            });
                            login(preset.manager, 'Password123!', 'port', `Port of ${preset.name}`);
                            toast({
                              title: `Quick Demo Active: ${preset.name}`,
                              description: `Launching Port Manager Console for Port of ${preset.name}...`,
                            });
                            setTimeout(() => {
                              navigate(`/dashboard/ports/${preset.id}`);
                            }, 400);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-[11px] font-medium text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex flex-col items-center justify-center text-center shadow-sm"
                        >
                          <span className="font-bold font-mono">{preset.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{preset.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {/* Username or Employee ID */}
                    <div className="space-y-1">
                      <Label htmlFor="usernameOrId" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Username / Employee ID / Email <span className="text-amber-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="usernameOrId"
                          type="text"
                          placeholder="arivera_portmgr or PM-98241"
                          value={loginData.usernameOrId}
                          onChange={handleLoginChange}
                          required
                          className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Assigned Port Selector */}
                    <div className="space-y-1">
                      <Label htmlFor="assignedPort" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Select Assigned Port Terminal
                      </Label>
                      <div className="relative">
                        <Anchor className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                        <select
                          id="assignedPort"
                          value={loginData.assignedPort}
                          onChange={handleLoginChange}
                          className="w-full pl-10 pr-3 h-10 bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl text-xs appearance-none cursor-pointer"
                        >
                          {portsList.map((p) => (
                            <option key={p.id} value={p.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {p.name} ({p.code}) — {p.country}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Password <span className="text-amber-500">*</span>
                        </Label>
                        <a
                          href="#forgot"
                          onClick={(e) => {
                            e.preventDefault();
                            toast({
                              title: "Password Reset Triggered",
                              description: "Reset instructions sent to your registered Port Authority email.",
                            });
                          }}
                          className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          Forgot Password?
                        </a>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={handleLoginChange}
                          required
                          className="pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {/* Remember me & Demo credentials fill */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={loginData.rememberMe}
                          onChange={(e) =>
                            setLoginData((prev) => ({ ...prev, rememberMe: e.target.checked }))
                          }
                          className="rounded bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-400"
                        />
                        Remember this terminal console
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginData({
                            usernameOrId: 'PM-88942',
                            password: 'Password123!',
                            assignedPort: 'Port of Rotterdam',
                            rememberMe: true,
                          });
                        }}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-mono font-semibold"
                      >
                        Auto-fill Demo Credentials
                      </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                      <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-600 dark:text-rose-300 font-medium">
                        {error}
                      </div>
                    )}

                    {/* Login Submit Button */}
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold py-3 text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center mt-4"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                          Authenticating Port Console...
                        </>
                      ) : (
                        'Sign In to Port Manager Dashboard'
                      )}
                    </Button>
                  </form>

                  {/* Help notice */}
                  <div className="mt-6 p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">Port Manager Notice:</span> For emergency security overrides or lost harbor credentials, contact the Harbor Master Operations desk.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 font-mono">
        PORT OPERATIONS & TERMINAL MANAGEMENT SYSTEM &copy; 2026
      </footer>
    </div>
  );
};
