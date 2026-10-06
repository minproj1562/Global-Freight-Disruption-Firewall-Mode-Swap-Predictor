// frontend/src/pages/LogisticsManagerAuthPage.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Globe,
  Shield,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Upload,
  Info,
  HelpCircle,
  KeyRound,
  Zap,
  ArrowLeft,
  BadgeCheck,
  Ship,
  Sparkles,
} from 'lucide-react';
import { AnimatedBackground } from '@/components/landing/AnimatedBackground';
import { useToast } from '@/components/ui/use-toast';
import { registerLogisticsManager, loginLogisticsManager, LogisticsManagerRegisterData } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegFormData {
  // Step 1 — Personal
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  // Step 2 — Organisation
  companyName: string;
  gstin: string;
  orgType: string;
  tradeLanes: string[];
  roleInOrg: string;
  // Step 3 — Financial
  netWorth: string;
  monthlyBudget: string;
  budgetCeiling: string;
  preferredCurrency: 'INR' | 'USD';
  // Step 4 — Compliance
  kycFile: File | null;
  incoterms: string[];
  auditConsent: boolean;
  securityQuestion: string;
  securityAnswer: string;
  enable2FA: boolean;
}

const INITIAL_FORM: RegFormData = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  companyName: '',
  gstin: '',
  orgType: '',
  tradeLanes: [],
  roleInOrg: '',
  netWorth: '',
  monthlyBudget: '',
  budgetCeiling: '',
  preferredCurrency: 'INR',
  kycFile: null,
  incoterms: [],
  auditConsent: false,
  securityQuestion: '',
  securityAnswer: '',
  enable2FA: false,
};

const TRADE_LANE_OPTIONS = [
  'Asia–Europe',
  'Trans-Pacific',
  'Intra-Asia',
  'Middle East',
  'Americas',
];

const INCOTERM_OPTIONS = ['FOB', 'CIF', 'DDP', 'EXW'];

const SECURITY_QUESTIONS = [
  'What is the name of your first pet?',
  'What was the name of your primary school?',
  'What is your mother\'s maiden name?',
  'What was the make of your first car?',
  'What city were you born in?',
];

const STEPS = [
  { id: 1, label: 'Personal',     icon: User      },
  { id: 2, label: 'Organisation', icon: Building2 },
  { id: 3, label: 'Financial',    icon: Shield    },
  { id: 4, label: 'Compliance',   icon: BadgeCheck },
];

// ─── Password Strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string) {
  const checks = {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    digit:   /[0-9]/.test(pw),
    symbol:  /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];
  return { checks, score, label: labels[score], color: colors[score] };
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const EncryptedTooltip: React.FC = () => (
  <div className="group relative inline-flex ml-1">
    <Info className="w-3.5 h-3.5 text-cyan-400 cursor-help" />
    <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 w-64 rounded-lg border border-cyan-500/30 bg-slate-900/95 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
      <span className="text-cyan-400 font-semibold">🔒 AES-256 Encrypted</span>
      <br />This information is encrypted and visible only to your organisation.
    </div>
  </div>
);

// ─── Multi-select chip ────────────────────────────────────────────────────────

const MultiSelectChips: React.FC<{
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  color?: string;
}> = ({ options, selected, onChange, color = 'cyan' }) => {
  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
              active
                ? `border-${color}-500 bg-${color}-500/20 text-${color}-300`
                : 'border-slate-600 bg-slate-800/60 text-slate-400 hover:border-slate-500'
            }`}
          >
            {active && <Check className="inline w-3 h-3 mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
};

// ─── Shared UI Helpers ────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-slate-800/60 border border-slate-700/60 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all';

const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

const FieldRow: React.FC<{ children: React.ReactNode; cols?: 1 | 2 }> = ({ children, cols = 1 }) => (
  <div className={cols === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>{children}</div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LogisticsManagerAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegFormData>(INITIAL_FORM);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [kycFileName, setKycFileName] = useState<string>('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const pwStrength = getPasswordStrength(form.password);

  const setField = useCallback(<K extends keyof RegFormData>(key: K, val: RegFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  // ── Validation per step ──
  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.fullName.trim() || form.fullName.trim().length < 2) return 'Full name must be at least 2 characters.';
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
      if (pwStrength.score < 4) return 'Password must be 8+ chars with uppercase, digit, and symbol.';
      if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    }
    if (step === 2) {
      if (!form.companyName.trim()) return 'Company name is required.';
      if (!form.orgType) return 'Select an organisation type.';
      if (!form.roleInOrg) return 'Select your role in the organisation.';
      if (form.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstin))
        return 'GSTIN format invalid (e.g. 27AAAAA0000A1Z5).';
    }
    if (step === 3) {
      if (!form.netWorth || parseFloat(form.netWorth) <= 0) return 'Organisation net worth must be > 0.';
      if (!form.monthlyBudget || parseFloat(form.monthlyBudget) <= 0) return 'Monthly logistics budget must be > 0.';
      if (!form.budgetCeiling) return 'Budget ceiling per shipment is required.';
    }
    if (step === 4) {
      if (!form.auditConsent) return 'You must consent to audit logging to proceed.';
      if (!form.securityQuestion) return 'Select a security question.';
      if (!form.securityAnswer.trim()) return 'Enter your security answer.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) {
      toast({ title: 'Validation Error', description: err, variant: 'destructive' });
      return;
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  // ── KYC file handler ──
  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Only PDF files are accepted.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5 MB.', variant: 'destructive' });
      return;
    }
    setField('kycFile', file);
    setKycFileName(file.name);
  };

  // ── Register submit ──
  const handleRegister = async () => {
    const err = validateStep();
    if (err) {
      toast({ title: 'Validation Error', description: err, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const payload: LogisticsManagerRegisterData = {
        email: form.email,
        password: form.password,
        full_name: form.fullName,
        username: form.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_'),
        company_name: form.companyName,
        employee_id: `LM-${Math.floor(10000 + Math.random() * 90000)}`,
        department: form.roleInOrg || undefined,
        region: form.tradeLanes.join(', ') || undefined,
        // Extended fields sent as extra body (backend can store or ignore gracefully)
        ...(form.orgType && { org_type: form.orgType }),
        ...(form.gstin && { gstin: form.gstin }),
        ...(form.phone && { phone: form.phone }),
        ...(form.securityQuestion && { security_question: form.securityQuestion }),
        ...(form.securityAnswer && { security_answer: form.securityAnswer }),
      } as LogisticsManagerRegisterData;

      const response = await registerLogisticsManager(payload);

      // Persist JWT
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      toast({
        title: '✅ Account Created!',
        description: `Welcome, ${response.user?.full_name || form.fullName}. Redirecting to Operations Dashboard…`,
      });

      setTimeout(() => navigate('/dashboard/operations'), 1500);
    } catch (err: any) {
      toast({
        title: 'Registration Failed',
        description: err?.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Login submit ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPw) {
      toast({ title: 'Missing credentials', description: 'Enter your email and password.', variant: 'destructive' });
      return;
    }
    setLoginLoading(true);
    try {
      const response = await loginLogisticsManager({ username_or_email: loginEmail, password: loginPw });
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      toast({ title: '✅ Logged in!', description: 'Redirecting to Operations Dashboard…' });
      setTimeout(() => navigate('/dashboard/operations'), 1000);
    } catch (err: any) {
      toast({
        title: 'Login Failed',
        description: err?.message || 'Invalid credentials.',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Demo credentials handlers ──
  const handleDemoFill = () => {
    setLoginEmail('logistics@freightfirewall.com');
    setLoginPw('Demo@1234');
    toast({
      title: '✨ Demo Credentials Loaded',
      description: 'Pre-filled demo account: logistics@freightfirewall.com',
    });
  };

  const handleQuickDemoLogin = async () => {
    setLoginEmail('logistics@freightfirewall.com');
    setLoginPw('Demo@1234');
    setLoginLoading(true);
    try {
      const response = await loginLogisticsManager({
        username_or_email: 'logistics@freightfirewall.com',
        password: 'Demo@1234',
      });
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      toast({
        title: '✅ Demo Login Successful!',
        description: 'Welcome back! Redirecting to Operations Dashboard…',
      });
      setTimeout(() => navigate('/dashboard/operations'), 800);
    } catch (err: any) {
      toast({
        title: 'Demo Login Failed',
        description: err?.message || 'Invalid credentials or backend unavailable.',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAutofillRegister = () => {
    setForm({
      fullName: 'Asmita Sharma',
      email: `logistics_${Math.floor(1000 + Math.random() * 9000)}@freightfirewall.com`,
      password: 'Password@1234',
      confirmPassword: 'Password@1234',
      phone: '+91 98765 43210',
      companyName: 'Freight Firewall Operations Global Ltd',
      gstin: '27AAAAA0000A1Z5',
      orgType: 'Freight Forwarder',
      tradeLanes: ['Asia–Europe', 'Middle East', 'Trans-Pacific'],
      roleInOrg: 'Manager',
      netWorth: '500000000',
      monthlyBudget: '15000000',
      budgetCeiling: '1000000',
      preferredCurrency: 'USD',
      kycFile: null,
      incoterms: ['FOB', 'CIF', 'DDP'],
      auditConsent: true,
      securityQuestion: 'What is the name of your first port or vessel?',
      securityAnswer: 'Rotterdam Port',
      enable2FA: false,
    });
    toast({
      title: '✨ Demo Form Auto-filled',
      description: 'Registration form populated with sample logistics manager data.',
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ────────────────────────────────────────────────────────────────────────────

  // ── Step 1: Personal ──
  const renderStep1 = () => (
    <div className="space-y-4">
      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>Full Name *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9'}
              placeholder="Asmita Sharma"
              value={form.fullName}
              onChange={e => setField('fullName', e.target.value)}
              maxLength={50}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">2–50 characters</p>
        </div>
        <div>
          <label className={labelCls}>Email Address *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9'}
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
            />
          </div>
        </div>
      </FieldRow>

      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9 pr-10'}
              type={showPw ? 'text' : 'password'}
              placeholder="Min 8 chars"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          {form.password && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= pwStrength.score ? pwStrength.color : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold ${
                  pwStrength.score < 3 ? 'text-rose-400' : pwStrength.score === 3 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>{pwStrength.label}</span>
                <div className="flex gap-2 text-[9px]">
                  {Object.entries(pwStrength.checks).map(([k, ok]) => (
                    <span key={k} className={ok ? 'text-emerald-400' : 'text-slate-600'}>
                      {ok ? '✓' : '✗'} {k === 'length' ? '8+' : k === 'upper' ? 'A-Z' : k === 'digit' ? '0-9' : '#@!'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Confirm Password *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9 pr-10'}
              type={showConfirmPw ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={e => setField('confirmPassword', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.confirmPassword && (
            <p className={`text-[10px] mt-1 ${form.password === form.confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
              {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </div>
      </FieldRow>

      <div>
        <label className={labelCls}>Phone <span className="text-slate-600 font-normal">(optional)</span></label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className={inputCls + ' pl-9'}
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Used for disruption SMS alerts (+91 format for India)</p>
      </div>
    </div>
  );

  // ── Step 2: Organisation ──
  const renderStep2 = () => (
    <div className="space-y-4">
      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>Company Name *</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9'}
              placeholder="Freight Firewall Corp"
              value={form.companyName}
              onChange={e => setField('companyName', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>GSTIN <span className="text-slate-600 font-normal">(optional)</span></label>
          <input
            className={inputCls}
            placeholder="27AAAAA0000A1Z5"
            maxLength={15}
            value={form.gstin}
            onChange={e => setField('gstin', e.target.value.toUpperCase())}
          />
          <p className="text-[10px] text-slate-500 mt-1">15-character Indian tax ID</p>
        </div>
      </FieldRow>

      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>Organisation Type *</label>
          <select
            className={inputCls + ' cursor-pointer'}
            value={form.orgType}
            onChange={e => setField('orgType', e.target.value)}
          >
            <option value="">Select type…</option>
            <option>Shipping Line</option>
            <option>Freight Forwarder</option>
            <option>3PL</option>
            <option>Manufacturer</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Your Role in Org *</label>
          <select
            className={inputCls + ' cursor-pointer'}
            value={form.roleInOrg}
            onChange={e => setField('roleInOrg', e.target.value)}
          >
            <option value="">Select role…</option>
            <option>Manager</option>
            <option>Director</option>
            <option>VP</option>
          </select>
        </div>
      </FieldRow>

      <div>
        <label className={labelCls}>Trade Lanes <span className="text-slate-600 font-normal">(select all that apply)</span></label>
        <MultiSelectChips
          options={TRADE_LANE_OPTIONS}
          selected={form.tradeLanes}
          onChange={v => setField('tradeLanes', v)}
          color="cyan"
        />
        <p className="text-[10px] text-slate-500 mt-2">Selected lanes feed disruption alert templates.</p>
      </div>
    </div>
  );

  // ── Step 3: Financial ──
  const currencySymbol = form.preferredCurrency === 'INR' ? '₹' : '$';

  const renderStep3 = () => (
    <div className="space-y-4">
      {/* Currency toggle */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <Globe className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-300 flex-1">Preferred Currency</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          {(['INR', 'USD'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setField('preferredCurrency', c)}
              className={`px-4 py-1.5 text-xs font-semibold transition-all ${
                form.preferredCurrency === c
                  ? 'bg-cyan-500 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {c === 'INR' ? '₹ INR' : '$ USD'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-2">
        <Shield className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/80">
          <span className="font-semibold text-amber-400">AES-256 Encrypted</span> — Financial fields are encrypted
          with a per-organisation key. Only your organisation can view these values.
        </p>
      </div>

      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>
            Organisation Net Worth * <EncryptedTooltip />
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{currencySymbol}</span>
            <input
              className={inputCls + ' pl-7'}
              type="number"
              min="1"
              placeholder="500000000"
              value={form.netWorth}
              onChange={e => setField('netWorth', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>
            Monthly Logistics Budget * <EncryptedTooltip />
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{currencySymbol}</span>
            <input
              className={inputCls + ' pl-7'}
              type="number"
              min="1"
              placeholder="2000000"
              value={form.monthlyBudget}
              onChange={e => setField('monthlyBudget', e.target.value)}
            />
          </div>
        </div>
      </FieldRow>

      <div>
        <label className={labelCls}>
          Budget Ceiling per Shipment * <EncryptedTooltip />
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{currencySymbol}</span>
          <input
            className={inputCls + ' pl-7'}
            type="number"
            min="1"
            placeholder="150000"
            value={form.budgetCeiling}
            onChange={e => setField('budgetCeiling', e.target.value)}
          />
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Maximum spend authorised per individual shipment</p>
      </div>
    </div>
  );

  // ── Step 4: Compliance ──
  const renderStep4 = () => (
    <div className="space-y-4">
      {/* KYC Upload */}
      <div>
        <label className={labelCls}>KYC Document <span className="text-slate-600 font-normal">(optional)</span></label>
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer bg-slate-800/30 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all">
          <input type="file" accept=".pdf" className="hidden" onChange={handleKycUpload} />
          {kycFileName ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{kycFileName}</span>
            </div>
          ) : (
            <>
              <Upload className="w-6 h-6 text-slate-500 mb-1" />
              <span className="text-xs text-slate-500">Drop PDF here or <span className="text-cyan-400">browse</span></span>
              <span className="text-[10px] text-slate-600 mt-0.5">PDF only · Max 5 MB</span>
            </>
          )}
        </label>
      </div>

      {/* Incoterms */}
      <div>
        <label className={labelCls}>Incoterms Preference <span className="text-slate-600 font-normal">(optional)</span></label>
        <MultiSelectChips
          options={INCOTERM_OPTIONS}
          selected={form.incoterms}
          onChange={v => setField('incoterms', v)}
          color="emerald"
        />
      </div>

      {/* Security Question */}
      <FieldRow cols={2}>
        <div>
          <label className={labelCls}>Security Question *</label>
          <div className="relative">
            <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              className={inputCls + ' pl-9 cursor-pointer'}
              value={form.securityQuestion}
              onChange={e => setField('securityQuestion', e.target.value)}
            >
              <option value="">Select a question…</option>
              {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Security Answer *</label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className={inputCls + ' pl-9'}
              placeholder="Your answer"
              value={form.securityAnswer}
              onChange={e => setField('securityAnswer', e.target.value)}
            />
          </div>
        </div>
      </FieldRow>

      {/* 2FA Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-cyan-400" />
          <div>
            <p className="text-sm text-slate-200 font-medium">Enable 2FA (TOTP)</p>
            <p className="text-[10px] text-slate-500">Recommended for enhanced security</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-400 font-medium border border-amber-500/40 px-2 py-0.5 rounded-full">
            FUTURE WORK
          </span>
          <button
            type="button"
            onClick={() => setField('enable2FA', !form.enable2FA)}
            className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
              form.enable2FA ? 'bg-cyan-500' : 'bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                form.enable2FA ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Audit Log Consent */}
      <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all">
        <div
          onClick={() => setField('auditConsent', !form.auditConsent)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            form.auditConsent ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500 group-hover:border-cyan-500/50'
          }`}
        >
          {form.auditConsent && <Check className="w-3 h-3 text-white" />}
        </div>
        <div>
          <p className="text-sm text-slate-200">
            I consent to audit logging of my account activities. <span className="text-rose-400">*</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            All actions are logged to <code className="text-cyan-400">audit_log</code> table per governance requirements
            (Chen et al. [7]).
          </p>
        </div>
      </label>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen text-slate-100 font-sans overflow-x-hidden">
      <AnimatedBackground />

      <div className="relative z-20 flex min-h-screen items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/" className="text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Ship className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100 leading-none">Operations Command Center</h1>
                <p className="text-xs text-cyan-400 font-mono">LOGISTICS MANAGER · PORTAL 01</p>
              </div>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-800/60 border border-slate-700/50 mb-6">
            {(['register', 'login'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setStep(1); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-slate-900 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'register' ? 'Create Account' : 'Sign In'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── REGISTER ── */}
            {activeTab === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden"
              >
                {/* Progress steps */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    {STEPS.map((s, idx) => {
                      const Icon = s.icon;
                      const isActive = step === s.id;
                      const isDone = step > s.id;
                      return (
                        <React.Fragment key={s.id}>
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isDone
                                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                                  : isActive
                                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                                  : 'border-slate-700 bg-slate-800/50 text-slate-600'
                              }`}
                            >
                              {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                            </div>
                            <span className={`text-[9px] font-semibold uppercase tracking-wider hidden sm:block ${
                              isActive ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-slate-600'
                            }`}>{s.label}</span>
                          </div>
                          {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-500 ${
                              step > s.id ? 'bg-emerald-500' : 'bg-slate-700'
                            }`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3">
                    Step {step} of 4 —{' '}
                    <span className="text-slate-300 font-medium">{STEPS[step - 1].label}</span>
                  </p>
                </div>

                {/* Demo Quick Autofill Pill */}
                <div className="px-6 pt-4 flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <span className="text-[11px] font-mono text-slate-400">Testing registration?</span>
                  <button
                    type="button"
                    onClick={handleAutofillRegister}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all shadow-sm active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Auto-fill Demo Form
                  </button>
                </div>

                {/* Form body */}
                <div className="px-6 py-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`step-${step}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {step === 1 && renderStep1()}
                      {step === 2 && renderStep2()}
                      {step === 3 && renderStep3()}
                      {step === 4 && renderStep4()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={step === 1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-slate-700 hover:border-slate-500"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>

                  <div className="flex items-center gap-2">
                    {step < 4 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition-all shadow-lg shadow-cyan-500/20"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRegister}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-900 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</>
                        ) : (
                          <><BadgeCheck className="w-4 h-4" /> Create Account & Continue to Dashboard</>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer hint */}
                <div className="px-6 pb-4 text-center border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-500">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── LOGIN ── */}
            {activeTab === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
              >
                <form onSubmit={handleLogin} className="px-6 py-8 space-y-5">
                  <div className="text-center mb-2">
                    <h2 className="text-xl font-bold text-slate-100">Welcome back</h2>
                    <p className="text-sm text-slate-500 mt-1">Sign in to Operations Command Center</p>
                  </div>

                  {/* Demo credentials banner with interactive Auto-fill */}
                  <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[11px] text-cyan-300 font-bold flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Demo Manager Account
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        OFFICIAL DEMO
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div>
                        <span className="text-slate-500">Email:</span>{' '}
                        <span className="text-cyan-300 font-bold">logistics@freightfirewall.com</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Pass:</span>{' '}
                        <span className="text-cyan-300 font-bold">Demo@1234</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleDemoFill}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Auto-fill Fields
                      </button>

                      <button
                        type="button"
                        onClick={handleQuickDemoLogin}
                        disabled={loginLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                        1-Click Demo Login
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Email or Username</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        className={inputCls + ' pl-9'}
                        type="text"
                        placeholder="you@company.com"
                        value={loginEmail}
                        onChange={e => setLoginEmail(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        className={inputCls + ' pl-9 pr-10'}
                        type={showLoginPw ? 'text' : 'password'}
                        placeholder="Your password"
                        value={loginPw}
                        onChange={e => setLoginPw(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-900 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    ) : (
                      <><Shield className="w-4 h-4" /> Sign In to Dashboard</>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-500">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      Register here
                    </button>
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
