// frontend/src/pages/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ship, Mail, Lock, User, ArrowLeft, Loader2, Building2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const success = await register(
        formData.email,
        formData.password,
        formData.name,
        selectedRole
      );
      
      if (success) {
        toast({
          title: "Registration Successful!",
          description: "Redirecting to your dashboard...",
        });
        
        setTimeout(() => {
          navigate(`/dashboard/${selectedRole}`);
        }, 500);
      } else {
        setError('Registration failed. Email may already exist.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Back Button */}
          <Link to="/" className="inline-flex items-center text-maritime-gold hover:text-maritime-amber transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-gradient-to-br from-maritime-gold to-maritime-amber p-3 shadow-xl">
                <Ship className="h-10 w-10 text-maritime-deep" strokeWidth={2} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-center text-white mb-2">
              Create Account
            </h1>
            <p className="text-center text-gray-300 mb-8">
              Join the maritime logistics revolution
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold"
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-2">
                <Label htmlFor="organization" className="text-white">
                  Organization
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="organization"
                    type="text"
                    placeholder="Maersk Logistics"
                    value={formData.organization}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-white">Select Your Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'operations', label: 'Operations' },
                    { value: 'port', label: 'Port' },
                    { value: 'admin', label: 'Admin' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value as UserRole)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        selectedRole === role.value
                          ? 'bg-maritime-gold text-maritime-deep shadow-lg'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-maritime-gold hover:bg-maritime-amber text-maritime-deep font-semibold py-6 text-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-300 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-maritime-gold hover:text-maritime-amber font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};