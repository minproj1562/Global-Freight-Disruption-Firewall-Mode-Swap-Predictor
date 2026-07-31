// frontend/src/components/landing/TransportAnimation.tsx
import React from 'react';
import { Plane } from 'lucide-react';

// Side-view cargo ship SVG — facing right (direction of travel)
const CargoShip: React.FC<{ id: string; variant?: 'large' | 'medium' | 'small' }> = ({ id, variant = 'large' }) => {
  if (variant === 'small') {
    return (
      <svg viewBox="0 0 120 50" fill="none" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
        <defs>
          <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M10,35 L15,45 L105,45 L115,35 L100,35 L100,22 L25,22 L25,35 Z" fill={`url(#hull-${id})`} stroke="#3b82f6" strokeWidth="0.8" />
        {/* Cabin */}
        <rect x="70" y="14" width="25" height="10" rx="1" fill="#334155" />
        <rect x="73" y="16" width="5" height="5" rx="0.5" fill="#f59e0b" />
        <rect x="80" y="16" width="5" height="5" rx="0.5" fill="#f59e0b" />
        {/* Mast */}
        <line x1="82" y1="14" x2="82" y2="6" stroke="#94a3b8" strokeWidth="1.5" />
        {/* Containers */}
        <rect x="30" y="25" width="12" height="9" rx="0.5" fill="#ef4444" />
        <rect x="44" y="25" width="12" height="9" rx="0.5" fill="#3b82f6" />
        <rect x="58" y="25" width="12" height="9" rx="0.5" fill="#10b981" />
        {/* Waterline Glow */}
        <line x1="10" y1="45" x2="110" y2="45" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
      </svg>
    );
  }

  if (variant === 'medium') {
    return (
      <svg viewBox="0 0 160 60" fill="none" className="w-full h-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)]">
        <defs>
          <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M8,42 L15,54 L145,54 L155,42 L140,42 L140,24 L22,24 L22,42 Z" fill={`url(#hull-${id})`} stroke="#10b981" strokeWidth="0.8" />
        {/* Bridge / Cabin */}
        <rect x="105" y="12" width="30" height="14" rx="2" fill="#475569" />
        <rect x="108" y="15" width="6" height="6" rx="1" fill="#fbbf24" />
        <rect x="116" y="15" width="6" height="6" rx="1" fill="#fbbf24" />
        <rect x="124" y="15" width="6" height="6" rx="1" fill="#fbbf24" />
        {/* Funnel */}
        <rect x="120" y="4" width="8" height="10" rx="1" fill="#dc2626" />
        <rect x="121" y="7" width="6" height="2" rx="0.5" fill="#ffffff" />
        {/* Containers row 1 */}
        <rect x="26" y="28" width="14" height="12" rx="1" fill="#ef4444" />
        <rect x="42" y="28" width="14" height="12" rx="1" fill="#2563eb" />
        <rect x="58" y="28" width="14" height="12" rx="1" fill="#059669" />
        <rect x="74" y="28" width="14" height="12" rx="1" fill="#d97706" />
        <rect x="90" y="28" width="14" height="12" rx="1" fill="#7c3aed" />
        {/* Containers row 2 (stacked) */}
        <rect x="30" y="18" width="14" height="10" rx="1" fill="#f97316" />
        <rect x="46" y="18" width="14" height="10" rx="1" fill="#06b6d4" />
        <rect x="62" y="18" width="14" height="10" rx="1" fill="#3b82f6" />
        {/* Waterline Glow */}
        <line x1="12" y1="54" x2="148" y2="54" stroke="#34d399" strokeWidth="1.2" opacity="0.7" />
      </svg>
    );
  }

  // Large variant
  return (
    <svg viewBox="0 0 200 70" fill="none" className="w-full h-full drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]">
      <defs>
        <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Hull */}
      <path d="M5,50 L14,65 L186,65 L198,50 L180,50 L180,28 L20,28 L20,50 Z" fill={`url(#hull-${id})`} stroke="#f59e0b" strokeWidth="1" />
      {/* Bridge superstructure */}
      <rect x="140" y="12" width="35" height="18" rx="2" fill="#64748b" />
      {/* Bridge windows */}
      <rect x="144" y="16" width="6" height="7" rx="1" fill="#fef08a" />
      <rect x="152" y="16" width="6" height="7" rx="1" fill="#fef08a" />
      <rect x="160" y="16" width="6" height="7" rx="1" fill="#fef08a" />
      {/* Funnel */}
      <rect x="155" y="2" width="10" height="8" rx="1.5" fill="#dc2626" />
      <rect x="156" y="5" width="8" height="2" rx="0.5" fill="#ffffff" />
      {/* Containers - Row 1 */}
      <rect x="24" y="32" width="16" height="14" rx="1" fill="#dc2626" />
      <rect x="42" y="32" width="16" height="14" rx="1" fill="#2563eb" />
      <rect x="60" y="32" width="16" height="14" rx="1" fill="#16a34a" />
      <rect x="78" y="32" width="16" height="14" rx="1" fill="#d97706" />
      <rect x="96" y="32" width="16" height="14" rx="1" fill="#9333ea" />
      <rect x="114" y="32" width="16" height="14" rx="1" fill="#0891b2" />
      {/* Row 2 */}
      <rect x="28" y="20" width="16" height="12" rx="1" fill="#ea580c" />
      <rect x="46" y="20" width="16" height="12" rx="1" fill="#0284c7" />
      <rect x="64" y="20" width="16" height="12" rx="1" fill="#e11d48" />
      <rect x="82" y="20" width="16" height="12" rx="1" fill="#15803d" />
      <rect x="100" y="20" width="16" height="12" rx="1" fill="#ca8a04" />
      {/* Waterline Glow Line */}
      <line x1="10" y1="65" x2="190" y2="65" stroke="#fbbf24" strokeWidth="1.5" opacity="0.8" />
    </svg>
  );
};

export const TransportAnimation: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {/* ========= PLANES IN THE SKY ========= */}
      {/* Plane 1 */}
      <div className="absolute left-0 top-[14%] w-16 h-16 text-white/40 animate-fly" style={{ animationDuration: '32s' }}>
        <Plane className="w-full h-full rotate-45 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
        <div className="absolute top-1/2 right-full -translate-y-1/2 w-40 h-[2px] bg-gradient-to-l from-white/40 via-white/15 to-transparent" />
      </div>

      {/* Plane 2 */}
      <div
        className="absolute left-0 top-[22%] w-12 h-12 text-cyan-200/35 animate-fly"
        style={{ animationDelay: '12s', animationDuration: '38s' }}
      >
        <Plane className="w-full h-full rotate-45 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]" strokeWidth={1.5} />
        <div className="absolute top-1/2 right-full -translate-y-1/2 w-28 h-[1.5px] bg-gradient-to-l from-cyan-200/30 to-transparent" />
      </div>

      {/* ========= CARGO SHIPS FLOATING ON THE WATER (BOTTOM 45%) ========= */}

      {/* Ship 1 — Large Container Ship Floating on Middle Wave Layer */}
      <div
        className="absolute text-slate-100 animate-sail z-20"
        style={{
          bottom: '22%',
          left: '0%',
          width: '180px',
          height: '62px',
          animationDuration: '48s',
        }}
      >
        <div style={{ animation: 'shipBobbing 4.5s ease-in-out infinite' }}>
          <CargoShip id="s1" variant="large" />
        </div>
        {/* Ocean Wake Ripples */}
        <div className="absolute bottom-1 right-full w-32 h-[3px] bg-gradient-to-l from-cyan-200/50 via-teal-300/20 to-transparent rounded-full" />
      </div>

      {/* Ship 2 — Medium Vessel Floating on Front Ocean Layer */}
      <div
        className="absolute text-amber-200 animate-sail z-30"
        style={{
          bottom: '10%',
          left: '0%',
          width: '140px',
          height: '52px',
          animationDelay: '18s',
          animationDuration: '56s',
        }}
      >
        <div style={{ animation: 'shipBobbing 5.2s ease-in-out infinite 1.5s' }}>
          <CargoShip id="s2" variant="medium" />
        </div>
        {/* Ocean Wake Ripples */}
        <div className="absolute bottom-1 right-full w-24 h-[2.5px] bg-gradient-to-l from-emerald-300/50 via-cyan-300/20 to-transparent rounded-full" />
      </div>

      {/* Ship 3 — Small Distance Ship Floating Near Horizon */}
      <div
        className="absolute text-sky-200 animate-sail z-10 opacity-90"
        style={{
          bottom: '34%',
          left: '0%',
          width: '100px',
          height: '42px',
          animationDelay: '30s',
          animationDuration: '65s',
        }}
      >
        <div style={{ animation: 'shipBobbing 6s ease-in-out infinite 3s' }}>
          <CargoShip id="s3" variant="small" />
        </div>
        <div className="absolute bottom-0 right-full w-16 h-[2px] bg-gradient-to-l from-white/30 to-transparent" />
      </div>

      {/* Inline Keyframes for Ship Bobbing and Sailing */}
      <style>{`
        @keyframes shipBobbing {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(1.5deg); }
          50% { transform: translateY(2px) rotate(-1deg); }
          75% { transform: translateY(-4px) rotate(0.8deg); }
        }
        @keyframes animate-sail {
          0% { transform: translateX(-200px); }
          100% { transform: translateX(calc(100vw + 200px)); }
        }
      `}</style>
    </div>
  );
};