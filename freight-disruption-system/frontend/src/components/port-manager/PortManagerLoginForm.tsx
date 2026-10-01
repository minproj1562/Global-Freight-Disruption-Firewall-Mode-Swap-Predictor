// frontend/src/components/port-manager/PortManagerLoginForm.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  Anchor,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Zap,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { lookupPortManagerPort, type AssignedPort } from '@/services/api';

interface PortOption {
  id: string;
  name: string;
  code: string;
  country: string;
}

interface PortManagerLoginFormProps {
  /** Used only as a manual fallback when the backend is unreachable (demo mode) */
  portsList: PortOption[];
}

type LookupState = 'idle' | 'loading' | 'found' | 'no_port' | 'not_found' | 'offline';

const DEMO_PRESETS = [
  { name: 'Rotterdam', id: 'port-rotterdam', code: 'NLRTM', manager: 'PM-Rotterdam' },
  { name: 'Singapore', id: 'port-singapore', code: 'SGSIN', manager: 'PM-Singapore' },
  { name: 'Los Angeles', id: 'port-la', code: 'USLAX', manager: 'PM-LA' },
];

const inputClass =
  'pl-10 h-10 bg-slate-50 dark:bg-slate-950/90 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-xl text-xs';

export const PortManagerLoginForm: React.FC<PortManagerLoginFormProps> = ({ portsList }) => {
  const { login } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [detectedPort, setDetectedPort] = useState<AssignedPort | null>(null);
  const [manualPort, setManualPort] = useState('Port of Rotterdam');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Guards against out-of-order lookup responses
  const lookupSeq = useRef(0);

  const runLookup = useCallback(async (value: string) => {
    const trimmed = value.trim();
    const seq = ++lookupSeq.current;

    if (trimmed.length < 3) {
      setLookupState('idle');
      setDetectedPort(null);
      return;
    }

    setLookupState('loading');
    try {
      const result = await lookupPortManagerPort(trimmed);
      if (seq !== lookupSeq.current) return; // stale response

      if (!result.found) {
        setDetectedPort(null);
        setLookupState('not_found');
      } else if (!result.port) {
        setDetectedPort(null);
        setLookupState('no_port');
      } else {
        setDetectedPort(result.port);
        setLookupState('found');
      }
    } catch {
      if (seq !== lookupSeq.current) return;
      setDetectedPort(null);
      setLookupState('offline');
    }
  }, []);

  // Debounced lookup while typing
  useEffect(() => {
    const t = setTimeout(() => runLookup(identifier), 500);
    return () => clearTimeout(t);
  }, [identifier, runLookup]);

  const navigateToPort = (fallbackPortName?: string, fallbackPortId?: string) => {
    const storedPortId = useAuthStore.getState().user?.portId;
    const portId =
      storedPortId ??
      detectedPort?.id ??
      portsList.find((p) => p.name === fallbackPortName)?.id ??
      fallbackPortId;

    navigate(portId ? `/dashboard/ports/${portId}` : '/dashboard/ports');
  };

  const performLogin = async (id: string, pw: string, portNameHint: string, fallbackPortId?: string) => {
    setError('');
    setIsLoading(true);
    try {
      const success = await login(id, pw, 'port', portNameHint);
      if (success) {
        const portName = useAuthStore.getState().user?.portName ?? portNameHint;
        toast({
          title: 'Port Manager Authenticated',
          description: `Access granted to ${portName} Operations Dashboard.`,
        });
        setTimeout(() => navigateToPort(portNameHint, fallbackPortId), 400);
      } else {
        setError('Invalid Port Manager credentials. Please check your login details.');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify connection and retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setError('Please enter your Email / Username / Employee ID and Password');
      return;
    }

    await performLogin(identifier.trim(), password, detectedPort?.name ?? manualPort);
  };

  const renderAssignedPort = () => {
    switch (lookupState) {
      case 'loading':
        return (
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            Detecting your assigned port...
          </div>
        );

      case 'found':
        return detectedPort ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {detectedPort.name}{' '}
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  ({detectedPort.code})
                </span>
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                {detectedPort.country} · Assigned during registration
              </p>
            </div>
          </div>
        ) : null;

      case 'no_port':
        return (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Account found, but no port is assigned. Contact your system administrator.
          </div>
        );

      case 'not_found':
        return (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-300">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            No Port Manager account matches this identifier.
          </div>
        );

      case 'offline':
        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              Server unreachable. Select your port manually (demo mode).
            </div>
            <div className="relative">
              <Anchor className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <select
                id="assignedPort"
                value={manualPort}
                onChange={(e) => setManualPort(e.target.value)}
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
        );

      default:
        return (
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400">
            <Anchor className="w-4 h-4" />
            Enter your email to detect your assigned port
          </div>
        );
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">
          Port Manager Sign In
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter your work email, username or Employee ID. Your assigned port is detected automatically.
        </p>
      </div>

      {/* Quick Demo Manager Presets */}
      <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30">
        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 mb-2">
          <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          1-CLICK QUICK DEMO MANAGER PRESETS:
        </div>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={isLoading}
              onClick={() => {
                setIdentifier(preset.manager);
                setPassword('Password123!');
                performLogin(preset.manager, 'Password123!', `Port of ${preset.name}`, preset.id);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-[11px] font-medium text-slate-800 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 transition-all flex flex-col items-center justify-center text-center shadow-sm disabled:opacity-60"
            >
              <span className="font-bold font-mono">{preset.name}</span>
              <span className="text-[9px] text-slate-400 font-mono">{preset.code}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email / Username / Employee ID */}
        <div className="space-y-1">
          <Label htmlFor="usernameOrId" className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Email / Username / Employee ID <span className="text-amber-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="usernameOrId"
              type="text"
              autoComplete="username"
              placeholder="a.rivera@portofrotterdam.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onBlur={() => runLookup(identifier)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Auto-detected assigned port */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Assigned Port Terminal
          </Label>
          {renderAssignedPort()}
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
                  title: 'Password Reset Triggered',
                  description: 'Reset instructions sent to your registered Port Authority email.',
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
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Remember me & demo credentials */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-amber-500 focus:ring-amber-400"
            />
            Remember this terminal console
          </label>

          <button
            type="button"
            onClick={() => {
              setIdentifier('PM-88942');
              setPassword('Password123!');
              setManualPort('Port of Rotterdam');
            }}
            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-mono font-semibold"
          >
            Auto-fill Demo Credentials
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/40 p-3 text-xs text-rose-600 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}

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

      <div className="mt-6 p-3 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-200">Port Manager Notice:</span> For emergency security overrides or lost harbor credentials, contact the Harbor Master Operations desk.
        </div>
      </div>
    </>
  );
};