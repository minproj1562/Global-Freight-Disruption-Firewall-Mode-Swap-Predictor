// frontend/src/components/ui/landing/LoginModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/store/authStore';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  role,
  onLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await onLogin(email, password);
      if (!success) {
        setError('Invalid credentials. Try password: demo123');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'operations':
        return 'Operations Dashboard';
      case 'port':
        return 'Port Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return 'Login';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-maritime-navy border border-maritime-gold/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {getRoleTitle()}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Enter your credentials to access the dashboard
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-maritime-gold hover:bg-maritime-amber text-maritime-deep"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-400 mt-4">
            Demo: Use any email and password "<strong>demo123</strong>"
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};