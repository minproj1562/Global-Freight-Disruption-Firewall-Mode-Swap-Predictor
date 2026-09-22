// frontend/src/components/landing/MaritimeLogo.tsx
import React from 'react';

interface MaritimeLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const MaritimeLogo: React.FC<MaritimeLogoProps> = ({
  className = '',
  size = 40,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3.5 select-none ${className}`}>
      {/* Icon Badge */}
      <div
        className="relative flex items-center justify-center rounded-2xl p-2.5 transition-transform duration-300 hover:scale-105"
        style={{
          width: size + 8,
          height: size + 8,
          background: 'linear-gradient(135deg, rgba(8,47,73,0.85) 0%, rgba(15,23,42,0.9) 100%)',
          border: '1px solid rgba(56,189,248,0.3)',
          boxShadow: '0 0 24px -4px rgba(6,182,212,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoShieldGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
            <linearGradient id="logoAmberGrad" x1="32" y1="14" x2="32" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Shield Hexagon */}
          <polygon
            points="32,4 58,16 58,42 32,58 6,42 6,16"
            fill="rgba(6, 30, 54, 0.6)"
            stroke="url(#logoShieldGrad)"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Radar Circles */}
          <circle cx="32" cy="32" r="20" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
          <circle cx="32" cy="32" r="13" stroke="#22d3ee" strokeWidth="1.2" opacity="0.55" />

          {/* Crosshairs */}
          <line x1="32" y1="13" x2="32" y2="19" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="32" y1="45" x2="32" y2="51" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="13" y1="32" x2="19" y2="32" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="45" y1="32" x2="51" y2="32" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />

          {/* Stylized Vessel Bow */}
          <path
            d="M32 17 L44 38 L32 33 L20 38 Z"
            fill="url(#logoShieldGrad)"
            filter="url(#logoGlow)"
          />

          {/* Core Beacon Pulse */}
          <circle cx="32" cy="32" r="3.5" fill="url(#logoAmberGrad)" />
          <circle cx="32" cy="32" r="6.5" stroke="#fbbf24" strokeWidth="1" opacity="0.8" />
        </svg>

        {/* Ambient Corner Sparkle */}
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
        </span>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black font-mono tracking-wider text-white">
              NAVICORE
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              v2.4
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold tracking-[0.18em] text-slate-400 uppercase">
            Global Freight Disruption Firewall
          </span>
        </div>
      )}
    </div>
  );
};
