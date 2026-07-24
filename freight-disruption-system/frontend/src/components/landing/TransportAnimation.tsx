// frontend/src/components/landing/TransportAnimation.tsx
import React from 'react';
import { Plane } from 'lucide-react';

// Side-view cargo ship SVG — facing right (direction of travel)
const CargoShip: React.FC<{ id: string; variant?: 'large' | 'medium' | 'small' }> = ({ id, variant = 'large' }) => {
  if (variant === 'small') {
    return (
      <svg viewBox="0 0 120 50" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M10,35 L15,45 L105,45 L115,35 L100,35 L100,22 L25,22 L25,35 Z" fill={`url(#hull-${id})`} />
        {/* Cabin */}
        <rect x="70" y="14" width="25" height="10" rx="1" fill="currentColor" opacity="0.7" />
        <rect x="73" y="16" width="5" height="5" rx="0.5" fill="#0a1628" />
        <rect x="80" y="16" width="5" height="5" rx="0.5" fill="#0a1628" />
        {/* Mast */}
        <line x1="82" y1="14" x2="82" y2="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        {/* Containers */}
        <rect x="30" y="25" width="12" height="9" rx="0.5" fill="#e74c3c" opacity="0.6" />
        <rect x="44" y="25" width="12" height="9" rx="0.5" fill="#3498db" opacity="0.6" />
        <rect x="58" y="25" width="12" height="9" rx="0.5" fill="#2ecc71" opacity="0.5" />
        {/* Waterline */}
        <line x1="15" y1="40" x2="105" y2="40" stroke="white" strokeWidth="0.5" opacity="0.15" />
      </svg>
    );
  }

  if (variant === 'medium') {
    return (
      <svg viewBox="0 0 160 60" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Hull */}
        <path d="M8,42 L15,54 L145,54 L155,42 L140,42 L140,24 L22,24 L22,42 Z" fill={`url(#hull-${id})`} />
        {/* Bridge / Cabin */}
        <rect x="105" y="12" width="30" height="14" rx="2" fill="currentColor" opacity="0.75" />
        <rect x="108" y="15" width="6" height="6" rx="1" fill="#0a1628" />
        <rect x="116" y="15" width="6" height="6" rx="1" fill="#0a1628" />
        <rect x="124" y="15" width="6" height="6" rx="1" fill="#0a1628" />
        {/* Funnel */}
        <rect x="120" y="4" width="8" height="10" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="121" y="7" width="6" height="2" rx="0.5" fill="#e74c3c" opacity="0.5" />
        {/* Smoke */}
        <circle cx="124" cy="2" r="3" fill="white" opacity="0.06" />
        {/* Containers row 1 */}
        <rect x="26" y="28" width="14" height="12" rx="1" fill="#c0392b" opacity="0.55" />
        <rect x="42" y="28" width="14" height="12" rx="1" fill="#2980b9" opacity="0.55" />
        <rect x="58" y="28" width="14" height="12" rx="1" fill="#27ae60" opacity="0.5" />
        <rect x="74" y="28" width="14" height="12" rx="1" fill="#f39c12" opacity="0.5" />
        <rect x="90" y="28" width="14" height="12" rx="1" fill="#8e44ad" opacity="0.45" />
        {/* Containers row 2 (stacked) */}
        <rect x="30" y="18" width="14" height="10" rx="1" fill="#e67e22" opacity="0.4" />
        <rect x="46" y="18" width="14" height="10" rx="1" fill="#1abc9c" opacity="0.4" />
        <rect x="62" y="18" width="14" height="10" rx="1" fill="#3498db" opacity="0.35" />
        {/* Crane */}
        <line x1="50" y1="18" x2="50" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <line x1="50" y1="8" x2="60" y2="14" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        {/* Waterline */}
        <line x1="15" y1="48" x2="145" y2="48" stroke="white" strokeWidth="0.5" opacity="0.12" />
      </svg>
    );
  }

  // Large variant
  return (
    <svg viewBox="0 0 200 70" fill="none" className="w-full h-full">
      <defs>
        <linearGradient id={`hull-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Hull */}
      <path d="M5,50 L14,65 L186,65 L198,50 L180,50 L180,28 L20,28 L20,50 Z" fill={`url(#hull-${id})`} />
      {/* Bridge superstructure */}
      <rect x="140" y="12" width="35" height="18" rx="2" fill="currentColor" opacity="0.8" />
      {/* Bridge windows */}
      <rect x="144" y="16" width="6" height="7" rx="1" fill="#0a1628" />
      <rect x="152" y="16" width="6" height="7" rx="1" fill="#0a1628" />
      <rect x="160" y="16" width="6" height="7" rx="1" fill="#0a1628" />
      {/* Bridge top deck */}
      <rect x="148" y="8" width="20" height="6" rx="1" fill="currentColor" opacity="0.5" />
      {/* Radar/antenna */}
      <line x1="158" y1="8" x2="158" y2="2" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="158" cy="2" r="1.5" fill="currentColor" opacity="0.3" />
      {/* Funnel */}
      <rect x="155" y="2" width="10" height="8" rx="1.5" fill="currentColor" opacity="0.65" />
      <rect x="156" y="5" width="8" height="2" rx="0.5" fill="#e74c3c" opacity="0.5" />
      {/* Smoke wisps */}
      <ellipse cx="160" cy="-1" rx="5" ry="3" fill="white" opacity="0.05" />
      {/* Containers - 2 rows */}
      <rect x="24" y="32" width="16" height="14" rx="1" fill="#c0392b" opacity="0.6" />
      <rect x="42" y="32" width="16" height="14" rx="1" fill="#2980b9" opacity="0.6" />
      <rect x="60" y="32" width="16" height="14" rx="1" fill="#27ae60" opacity="0.55" />
      <rect x="78" y="32" width="16" height="14" rx="1" fill="#f39c12" opacity="0.55" />
      <rect x="96" y="32" width="16" height="14" rx="1" fill="#8e44ad" opacity="0.5" />
      <rect x="114" y="32" width="16" height="14" rx="1" fill="#1abc9c" opacity="0.5" />
      {/* Top row containers */}
      <rect x="28" y="20" width="16" height="12" rx="1" fill="#e67e22" opacity="0.4" />
      <rect x="46" y="20" width="16" height="12" rx="1" fill="#3498db" opacity="0.4" />
      <rect x="64" y="20" width="16" height="12" rx="1" fill="#e74c3c" opacity="0.35" />
      <rect x="82" y="20" width="16" height="12" rx="1" fill="#2ecc71" opacity="0.35" />
      <rect x="100" y="20" width="16" height="12" rx="1" fill="#f1c40f" opacity="0.3" />
      {/* Bow detail */}
      <path d="M5,50 L20,50 L20,42 Z" fill="currentColor" opacity="0.4" />
      {/* Waterline */}
      <line x1="14" y1="57" x2="186" y2="57" stroke="white" strokeWidth="0.6" opacity="0.12" />
    </svg>
  );
};

export const TransportAnimation: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* ========= PLANES IN THE SKY ========= */}
      {/* Plane 1 */}
      <div className="absolute left-0 top-[15%] w-16 h-16 text-white/30 animate-fly" style={{ animationDuration: '35s' }}>
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
        <div className="absolute top-1/2 right-full -translate-y-1/2 w-36 h-[1.5px] bg-gradient-to-l from-white/25 via-white/10 to-transparent" />
      </div>

      {/* Plane 2 */}
      <div
        className="absolute left-0 top-[24%] w-12 h-12 text-blue-200/25 animate-fly"
        style={{ animationDelay: '14s', animationDuration: '42s' }}
      >
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
        <div className="absolute top-1/2 right-full -translate-y-1/2 w-24 h-[1px] bg-gradient-to-l from-blue-200/20 to-transparent" />
      </div>

      {/* Plane 3 — small, far away */}
      <div
        className="absolute left-0 top-[32%] w-8 h-8 text-sky-200/15 animate-fly"
        style={{ animationDelay: '24s', animationDuration: '50s' }}
      >
        <Plane className="w-full h-full rotate-45" strokeWidth={1.5} />
      </div>

      {/* ========= CARGO SHIPS ON THE WATER ========= */}
      {/* Ships are positioned in the bottom 40% where the ocean is */}

      {/* Ship 1 — large cargo ship, prominent */}
      <div
        className="absolute left-0 text-gray-300/50 animate-sail"
        style={{
          bottom: '18%',
          width: '140px',
          height: '49px',
          animationDuration: '55s',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
        }}
      >
        <div style={{ animation: 'shipBob 6s ease-in-out infinite' }}>
          <CargoShip id="s1" variant="large" />
        </div>
        {/* Wake */}
        <div className="absolute bottom-0 right-full w-24 h-[2px] bg-gradient-to-l from-white/10 to-transparent" />
      </div>

      {/* Ship 2 — medium, different speed */}
      <div
        className="absolute left-0 text-amber-200/40 animate-sail"
        style={{
          bottom: '12%',
          width: '110px',
          height: '41px',
          animationDelay: '20s',
          animationDuration: '65s',
          filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.4))',
        }}
      >
        <div style={{ animation: 'shipBob 7s ease-in-out infinite 2s' }}>
          <CargoShip id="s2" variant="medium" />
        </div>
        <div className="absolute bottom-0 right-full w-16 h-[1.5px] bg-gradient-to-l from-white/8 to-transparent" />
      </div>

      {/* Ship 3 — small, far away, slower */}
      <div
        className="absolute left-0 text-blue-200/30 animate-sail"
        style={{
          bottom: '24%',
          width: '75px',
          height: '31px',
          animationDelay: '35s',
          animationDuration: '75s',
        }}
      >
        <div style={{ animation: 'shipBob 8s ease-in-out infinite 4s' }}>
          <CargoShip id="s3" variant="small" />
        </div>
      </div>

      {/* Inline keyframes for ships */}
      <style>{`
        @keyframes shipBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(1.5deg); }
          50% { transform: translateY(2px) rotate(-1deg); }
          75% { transform: translateY(-3px) rotate(0.5deg); }
        }
      `}</style>
    </div>
  );
};