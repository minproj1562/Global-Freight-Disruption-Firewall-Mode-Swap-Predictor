// src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ship,
  Mail,
  Lock,
  User,
  BadgeCheck,
  Phone,
  Anchor,
  UserCheck,
  Building2,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    mobileNumber: '',
    portName: 'Port of Rotterdam (NLRTM)',
    username: '',
    password: '',
    confirmPassword: '',
    department: 'Harbor Control & Terminal Ops',
    accessLevel: 'Senior Port Authority Manager',
    acceptTerms: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { registerPortManager } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Please agree to the Maritime Port Security Compliance terms.');
      return;
    }

    setIsLoading(true);

    try {
      const success = await registerPortManager({
        fullName: formData.fullName,
        employeeId: formData.employeeId,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        portName: formData.portName,
        username: formData.username,
        password: formData.password,
        department: formData.department,
        accessLevel: formData.accessLevel,
      });

      if (success) {
        toast({
          title: '⚓ Port Manager Registered Successfully!',
          description: `Welcome ${formData.fullName}. Accessing Port Dashboard...`,
        });

        setTimeout(() => {
          navigate('/dashboard/port');
        }, 600);
      } else {
        setError('Registration failed. Employee ID or Username may already be registered.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <AnimatedBackground />

      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {/* Back Navigation */}
        <Link
          to="/"
          className="inline-flex items-center text-amber-400 hover:text-amber-300 transition-colors mb-6 text-sm font-semibold group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Main Overview
        </Link>

        {/* Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/90 border border-white/15 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-2xl"
        >
          {/* Top Badge & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-xl mb-4">
              <Anchor className="w-8 h-8" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Port Manager Registration
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              Authorized Maritime Authority Portal • Telemetry & Gatekeeper Access
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Grid 1: Full Name & Employee ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-slate-200">
                  Full Name <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Capt. Alexander Vance"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-xs font-semibold text-slate-200">
                  Employee ID <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <BadgeCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="employeeId"
                    type="text"
                    required
                    placeholder="PM-9082-NL"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Grid 2: Email & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-200">
                  Email Address <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="a.vance@portauthority.org"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="space-y-1.5">
                <Label htmlFor="mobileNumber" className="text-xs font-semibold text-slate-200">
                  Mobile Phone Number <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="mobileNumber"
                    type="tel"
                    required
                    placeholder="+31 6 1234 5678"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Grid 3: Assigned Port Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Port Name */}
              <div className="space-y-1.5">
                <Label htmlFor="portName" className="text-xs font-semibold text-slate-200">
                  Assigned Port Facility <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Anchor className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                  <select
                    id="portName"
                    value={formData.portName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 h-11 bg-slate-950/80 border border-white/15 text-white focus:border-amber-400 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Port of Rotterdam (NLRTM)">Port of Rotterdam (Netherlands)</option>
                    <option value="Port of Singapore (SGSIN)">Port of Singapore (Singapore)</option>
                    <option value="Port of Shanghai (CNSHA)">Port of Shanghai (China)</option>
                    <option value="Port of Los Angeles (USLAX)">Port of Los Angeles (USA)</option>
                    <option value="Port of Hamburg (DEHAM)">Port of Hamburg (Germany)</option>
                    <option value="Port of Jebel Ali (AEJEA)">Port of Jebel Ali (Dubai, UAE)</option>
                  </select>
                </div>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-slate-200">
                  Username <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    required
                    placeholder="vance_nlrtm"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Grid 4: Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-200">
                  Password <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-200">
                  Confirm Password <span className="text-amber-400">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="pl-10 h-11 bg-slate-950/80 border-white/15 text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Extra Recommended Fields: Department & Access Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-3 rounded-2xl border border-white/10">
              <div>
                <Label htmlFor="department" className="text-[11px] font-semibold text-amber-300">
                  Operational Department
                </Label>
                <input
                  id="department"
                  type="text"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 bg-slate-950/90 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <Label htmlFor="accessLevel" className="text-[11px] font-semibold text-amber-300">
                  Security Access Clearance
                </Label>
                <input
                  id="accessLevel"
                  type="text"
                  value={formData.accessLevel}
                  onChange={handleInputChange}
                  className="w-full mt-1 p-2 bg-slate-950/90 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
              />
              <label htmlFor="acceptTerms" className="text-xs text-slate-300 cursor-pointer">
                I accept the Port Security Operations Policy & Telemetry Access Protocol.
              </label>
            </div>

            {/* Error banner */}
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-extrabold py-6 rounded-xl text-base shadow-xl transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Port Manager Credentials...
                </>
              ) : (
                'Complete Registration & Access Port Overview'
              )}
            </Button>
          </form>

          {/* Login Link Footer */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered as Port Manager?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-bold underline">
              Sign In Here
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};