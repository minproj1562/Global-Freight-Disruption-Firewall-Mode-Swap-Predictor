// frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Ship, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const preSelectedRole = (location.state as { role?: UserRole })?.role || 'operations';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(preSelectedRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (preSelectedRole) {
      setSelectedRole(preSelectedRole);
    }
  }, [preSelectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password, selectedRole);
      
      if (success) {
        toast({
          title: "Welcome Back!",
          description: `Accessing ${selectedRole} dashboard...`,
        });
        
        setTimeout(() => {
          navigate(`/dashboard/${selectedRole}`);
        }, 500);
      } else {
        setError('Invalid credentials. Try password: demo123');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          <Link to="/" className="inline-flex items-center text-maritime-gold hover:text-maritime-amber transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>

          {/* Card */}
          <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-maritime-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />

            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-maritime-gold/30 blur-xl" />
                <div className="relative rounded-full bg-gradient-to-br from-maritime-gold to-maritime-amber p-4 shadow-xl">
                  <Ship className="h-12 w-12 text-maritime-deep" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-center text-white mb-3">
              Welcome Back
            </h1>
            <p className="text-center text-gray-300 mb-10">
              Sign in to access your <span className="text-maritime-gold font-semibold">{selectedRole}</span> dashboard
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold focus:ring-2 focus:ring-maritime-gold/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-12 h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-maritime-gold focus:ring-2 focus:ring-maritime-gold/20 rounded-xl"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-white text-sm font-medium">Dashboard</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'operations', label: 'Operations', emoji: '🚢' },
                    { value: 'port', label: 'Port', emoji: '⚓' },
                    { value: 'admin', label: 'Admin', emoji: '⚙️' },
                  ].map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value as UserRole)}
                      className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                        selectedRole === role.value
                          ? 'bg-maritime-gold text-maritime-deep shadow-lg scale-105'
                          : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                      }`}
                    >
                      <div className="text-lg mb-1">{role.emoji}</div>
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-red-500/10 border border-red-500/30 p-4"
                >
                  <p className="text-sm text-red-300">{error}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-maritime-gold to-maritime-amber hover:from-maritime-amber hover:to-yellow-600 text-maritime-deep font-bold py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Demo Info */}
              <div className="text-center text-xs text-gray-400 bg-white/5 rounded-xl p-4 border border-white/10">
                <strong className="text-white">Demo:</strong> Any email + password "<strong className="text-maritime-gold">demo123</strong>"
              </div>
            </form>

            {/* Register Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-300 text-sm">
                Don't have an account?{' '}
                <Link to="/register" state={{ role: selectedRole }} className="text-maritime-gold hover:text-maritime-amber font-bold hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};