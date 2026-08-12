// frontend/src/components/landing/AnimatedBackground.tsx
import React, { useState } from 'react';

interface StarData {
  left: number;
  top: number;
  duration: number;
  delay: number;
  size: number;
  baseOpacity: number;
  color: string;
}

const STAR_COLORS = ['#ffffff', '#e0f2fe', '#fff8e1', '#bae6fd', '#fef08a', '#e0e7ff'];

const generateStars = (): StarData[] => {
  return [...Array(220)].map(() => {
    const brightness = Math.random();
    let size: number;
    let baseOpacity: number;

    if (brightness > 0.94) {
      size = Math.random() * 2.8 + 2.5;
      baseOpacity = 0.95;
    } else if (brightness > 0.75) {
      size = Math.random() * 1.8 + 1.4;
      baseOpacity = 0.75;
    } else {
      size = Math.random() * 1.2 + 0.8;
      baseOpacity = Math.random() * 0.4 + 0.3;
    }

    return {
      left: Math.random() * 100,
      top: Math.random() * 55,
      duration: 2 + Math.random() * 3.5,
      delay: Math.random() * 5,
      size,
      baseOpacity,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
  });
};

export const AnimatedBackground: React.FC = () => {
  const [stars] = useState(generateStars);
  const [waterSparkles] = useState(() =>
    [...Array(45)].map(() => ({
      left: Math.random() * 100,
      top: 55 + Math.random() * 40,
      duration: 1.5 + Math.random() * 2.5,
      delay: Math.random() * 3,
      size: Math.random() * 2.5 + 1,
    }))
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden select-none">
      {/* ====== DEEP NIGHT SKY GRADIENT ====== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010511] via-[#030f26] to-[#071d3a]" />

      {/* ====== AURORA BOREALIS — BAND 1: Wide Emerald Sweep ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-8%',
          left: '-25%',
          width: '150%',
          height: '60%',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(16,185,129,0.6) 0%, rgba(52,211,153,0.5) 20%, rgba(45,212,191,0.4) 40%, rgba(56,189,248,0.25) 60%, transparent 82%)',
          filter: 'blur(28px)',
          animation: 'auroraDance1 14s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA BOREALIS — BAND 2: Violet & Electric Cyan ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-2%',
          left: '-15%',
          width: '135%',
          height: '52%',
          background: 'linear-gradient(155deg, transparent 3%, rgba(139,92,246,0.5) 18%, rgba(168,85,247,0.55) 32%, rgba(6,182,212,0.5) 52%, rgba(16,185,129,0.35) 72%, transparent 92%)',
          filter: 'blur(32px)',
          animation: 'auroraDance2 18s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA BOREALIS — BAND 3: Pink / Magenta Glow ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '2%',
          left: '10%',
          width: '80%',
          height: '38%',
          background: 'radial-gradient(ellipse at 60% 30%, rgba(236,72,153,0.35) 0%, rgba(168,85,247,0.3) 30%, rgba(56,189,248,0.2) 55%, transparent 80%)',
          filter: 'blur(40px)',
          animation: 'auroraDance3 22s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA CURTAIN RAYS ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '0%',
          left: '0%',
          width: '100%',
          height: '50%',
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3.5%,
            rgba(52,211,153,0.3) 4%,
            transparent 4.5%,
            transparent 8%,
            rgba(45,212,191,0.28) 8.5%,
            transparent 9%,
            transparent 13%,
            rgba(168,85,247,0.24) 13.5%,
            transparent 14%,
            transparent 19%,
            rgba(236,72,153,0.18) 19.5%,
            transparent 20%
          )`,
          filter: 'blur(6px)',
          animation: 'auroraCurtain 10s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== GLOWING CRATERED MOON ====== */}
      <div className="absolute top-[5%] right-[8%] z-0">
        <div className="absolute -inset-16 rounded-full bg-amber-100/20 blur-3xl" />
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#fffeee] via-[#f7f0d0] to-[#e4d3a0] shadow-[0_0_40px_15px_rgba(255,255,210,0.4),0_0_80px_30px_rgba(255,255,180,0.2)]">
          <div className="absolute top-5 left-6 w-7 h-7 rounded-full bg-amber-200/30" />
          <div className="absolute bottom-6 right-7 w-5 h-5 rounded-full bg-amber-100/25" />
          <div className="absolute top-10 right-5 w-4 h-4 rounded-full bg-amber-200/20" />
        </div>
      </div>

      {/* ====== TWINKLING NIGHT STARS (220) ====== */}
      <div className="absolute inset-0 z-0">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.color,
              opacity: star.baseOpacity,
              animation: `twinkleStar ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
              boxShadow:
                star.size > 2.2
                  ? `0 0 ${star.size * 3.5}px ${star.size}px ${star.color}90, 0 0 ${star.size * 7}px ${star.size * 1.8}px ${star.color}40`
                  : `0 0 ${star.size * 2}px ${star.color}70`,
            }}
          />
        ))}
      </div>

      {/* ====== OCEAN — BOTTOM 48% WITH GRADIENT WAVES ====== */}
      <div className="absolute bottom-0 left-0 right-0 h-[48%] z-10">
        {/* Horizon Dividing Line & Atmosphere Glow */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-400/40 via-cyan-300/80 to-emerald-400/40 shadow-[0_0_15px_4px_rgba(45,212,191,0.6)]" />

        {/* Deep Sea Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#061b36] via-[#05284c] to-[#041a33]" />

        {/* Moonlight Shimmer Beam on Water Surface */}
        <div
          className="absolute top-0 h-full pointer-events-none opacity-80"
          style={{
            right: '6%',
            width: '18%',
            background: 'linear-gradient(180deg, rgba(255,255,220,0.25) 0%, rgba(45,212,191,0.15) 40%, rgba(14,116,144,0.05) 100%)',
            filter: 'blur(10px)',
            animation: 'moonBeam 5s ease-in-out infinite alternate',
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
          }}
        />

        {/* Water Surface Glitter / Sparkles */}
        {waterSparkles.map((sp, i) => (
          <div
            key={`sp-${i}`}
            className="absolute rounded-full bg-cyan-200"
            style={{
              left: `${sp.left}%`,
              top: `${sp.top - 55}%`,
              width: `${sp.size}px`,
              height: `${sp.size}px`,
              animation: `waterGlint ${sp.duration}s ease-in-out infinite`,
              animationDelay: `${sp.delay}s`,
              boxShadow: '0 0 6px 2px rgba(186,230,253,0.8)',
            }}
          />
        ))}

        {/* ====== WAVE LAYER 1: Deep Navy with Indigo-Violet Gradient ====== */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '100%', animation: 'oceanWave1 22s ease-in-out infinite' }}
          viewBox="0 0 2400 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="35%" stopColor="#0b3866" />
              <stop offset="65%" stopColor="#082b52" />
              <stop offset="100%" stopColor="#312e81" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad1)" opacity="0.95" d="M0,120 C350,210 650,60 1200,130 C1750,200 2050,60 2400,120 L2400,400 L0,400 Z" />
        </svg>

        {/* ====== WAVE LAYER 2: Teal-to-Cyan Gradient ====== */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '78%', animation: 'oceanWave2 16s ease-in-out infinite reverse', animationDelay: '-3s' }}
          viewBox="0 0 2400 350"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0.8">
              <stop offset="0%" stopColor="#0e7490" />
              <stop offset="30%" stopColor="#0891b2" />
              <stop offset="60%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad2)" opacity="0.88" d="M0,150 C400,70 700,230 1200,150 C1700,70 2000,230 2400,150 L2400,350 L0,350 Z" />
        </svg>

        {/* ====== WAVE LAYER 3: Emerald-to-Teal with white foam crest ====== */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '54%', animation: 'oceanWave3 12s ease-in-out infinite', animationDelay: '-1.5s' }}
          viewBox="0 0 2400 280"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad3" x1="0" y1="0" x2="1" y2="0.5">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          {/* Foam Crest Highlight Line */}
          <path fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" d="M0,105 C350,185 650,45 1200,115 C1750,185 2050,45 2400,105" />
          <path fill="url(#waveGrad3)" opacity="0.85" d="M0,108 C350,188 650,48 1200,118 C1750,188 2050,48 2400,108 L2400,280 L0,280 Z" />
        </svg>

        {/* ====== WAVE LAYER 4: Violet-Rose-to-Emerald Gradient Shimmer ====== */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '40%', animation: 'oceanWave4 14s ease-in-out infinite', animationDelay: '-2s' }}
          viewBox="0 0 2400 220"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad4" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad4)" d="M0,90 C300,140 600,50 1200,100 C1800,150 2100,50 2400,90 L2400,220 L0,220 Z" />
        </svg>

        {/* ====== WAVE LAYER 5: Front Seafoam Shimmer ====== */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '28%', animation: 'oceanWave1 9s ease-in-out infinite', animationDelay: '-0.5s' }}
          viewBox="0 0 2400 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad5" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="50%" stopColor="rgba(186,230,253,0.28)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad5)" d="M0,75 C400,115 600,35 1200,75 C1800,115 2100,35 2400,75 L2400,180 L0,180 Z" />
        </svg>
      </div>

      {/* ====== KEYFRAME ANIMATIONS ====== */}
      <style>{`
        @keyframes twinkleStar {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes waterGlint {
          0%, 100% { opacity: 0.1; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes oceanWave1 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25%) translateY(-6px); }
        }
        @keyframes oceanWave2 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(20%) translateY(4px); }
        }
        @keyframes oceanWave3 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-15%) translateY(-4px); }
        }
        @keyframes oceanWave4 {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(12%) translateY(-3px); }
        }
        @keyframes moonBeam {
          0%, 100% { opacity: 0.6; transform: scaleX(1); }
          50% { opacity: 0.9; transform: scaleX(1.1); }
        }
        @keyframes auroraDance1 {
          0% { transform: translateX(-5%) rotate(0deg) scaleY(1); opacity: 0.8; }
          100% { transform: translateX(8%) rotate(2deg) scaleY(1.25); opacity: 1; }
        }
        @keyframes auroraDance2 {
          0% { transform: translateX(5%) rotate(0deg) scaleY(1); opacity: 0.7; }
          100% { transform: translateX(-8%) rotate(-2deg) scaleY(1.2); opacity: 0.95; }
        }
        @keyframes auroraDance3 {
          0% { transform: translateX(-3%) rotate(1deg) scaleY(1); opacity: 0.5; }
          100% { transform: translateX(6%) rotate(-1deg) scaleY(1.15); opacity: 0.85; }
        }
        @keyframes auroraCurtain {
          0% { opacity: 0.45; transform: scaleX(1); }
          100% { opacity: 0.8; transform: scaleX(1.15); }
        }
      `}</style>
    </div>
  );
};