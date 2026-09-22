// frontend/src/components/landing/AnimatedBackground.tsx
import React, { useState } from 'react';

export const AnimatedBackground: React.FC = () => {
  const [waterSparkles] = useState(() =>
    [...Array(55)].map(() => ({
      left: Math.random() * 100,
      top: 52 + Math.random() * 44,
      duration: 1.2 + Math.random() * 2.5,
      delay: Math.random() * 3,
      size: Math.random() * 3 + 1,
    }))
  );

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* ====== MIDNIGHT NIGHT SKY GRADIENT (DARKER) ====== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020712] via-[#041024] to-[#071936]" />

      {/* ====== AURORA BOREALIS — BAND 1: Emerald Green Sweep ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-8%',
          left: '-25%',
          width: '150%',
          height: '60%',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(16,185,129,0.55) 0%, rgba(52,211,153,0.45) 18%, rgba(45,212,191,0.35) 38%, rgba(56,189,248,0.2) 58%, transparent 80%)',
          filter: 'blur(30px)',
          animation: 'auroraDance1 20s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA — BAND 2: Violet & Electric Cyan ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-2%',
          left: '-15%',
          width: '135%',
          height: '52%',
          background: 'linear-gradient(155deg, transparent 3%, rgba(139,92,246,0.45) 16%, rgba(168,85,247,0.5) 30%, rgba(6,182,212,0.4) 50%, rgba(16,185,129,0.3) 70%, transparent 90%)',
          filter: 'blur(32px)',
          animation: 'auroraDance2 25s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA — BAND 3: Pink / Magenta Glow ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '1%',
          left: '8%',
          width: '84%',
          height: '40%',
          background: 'radial-gradient(ellipse at 60% 30%, rgba(236,72,153,0.35) 0%, rgba(168,85,247,0.3) 28%, rgba(56,189,248,0.2) 52%, transparent 78%)',
          filter: 'blur(40px)',
          animation: 'auroraDance3 28s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== AURORA — BAND 4: Golden-Green Shimmer ====== */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '5%',
          left: '20%',
          width: '60%',
          height: '32%',
          background: 'radial-gradient(ellipse at 40% 40%, rgba(250,204,21,0.25) 0%, rgba(52,211,153,0.25) 30%, rgba(14,165,233,0.15) 55%, transparent 78%)',
          filter: 'blur(45px)',
          animation: 'auroraDance4 32s ease-in-out infinite alternate',
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
            transparent 3%,
            rgba(52,211,153,0.25) 3.5%,
            transparent 4%,
            transparent 7.5%,
            rgba(45,212,191,0.22) 8%,
            transparent 8.5%,
            transparent 12.5%,
            rgba(168,85,247,0.2) 13%,
            transparent 13.5%,
            transparent 18%,
            rgba(236,72,153,0.15) 18.5%,
            transparent 19%,
            transparent 24%,
            rgba(250,204,21,0.12) 24.5%,
            transparent 25%
          )`,
          filter: 'blur(6px)',
          animation: 'auroraCurtain 14s ease-in-out infinite alternate',
          mixBlendMode: 'screen',
        }}
      />




      {/* ====== OCEAN — BOTTOM 48% (DARK MIDNIGHT OCEAN WITH STATIC WAVE GRADIENTS) ====== */}
      <div className="absolute bottom-0 left-0 right-0 h-[48%] z-10">
        {/* Horizon Line & Atmospheric Glow */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-teal-400/40 via-cyan-300/80 to-emerald-400/40 shadow-[0_0_15px_4px_rgba(45,212,191,0.5)]" />

        {/* Midnight Ocean Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#051428] via-[#07203d] to-[#041224]" />


        {/* Water Surface Glitter */}
        {waterSparkles.map((sp, i) => (
          <div
            key={`sp-${i}`}
            className="absolute rounded-full bg-cyan-200"
            style={{
              left: `${sp.left}%`,
              top: `${sp.top - 52}%`,
              width: `${sp.size}px`,
              height: `${sp.size}px`,
              animation: `waterGlint ${sp.duration}s ease-in-out infinite`,
              animationDelay: `${sp.delay}s`,
              boxShadow: '0 0 6px 2px rgba(186,230,253,0.8)',
            }}
          />
        ))}

        {/* ====== WAVE 1: Deep Indigo-Navy (STATIC) ====== */}
        <svg
          className="absolute bottom-0 w-full"
          style={{ height: '100%' }}
          viewBox="0 0 1440 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a1d38" />
              <stop offset="35%" stopColor="#0e284c" />
              <stop offset="65%" stopColor="#0b2242" />
              <stop offset="100%" stopColor="#12315a" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad1)" opacity="0.95" d="M0,120 C250,180 500,60 720,130 C950,190 1200,60 1440,120 L1440,400 L0,400 Z" />
        </svg>

        {/* ====== WAVE 2: Royal Blue-to-Cyan (STATIC) ====== */}
        <svg
          className="absolute bottom-0 w-full"
          style={{ height: '78%' }}
          viewBox="0 0 1440 350"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0.7">
              <stop offset="0%" stopColor="#093156" />
              <stop offset="30%" stopColor="#0b4170" />
              <stop offset="60%" stopColor="#094d7d" />
              <stop offset="100%" stopColor="#07668c" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad2)" opacity="0.88" d="M0,140 C280,70 520,210 720,140 C980,60 1220,210 1440,140 L1440,350 L0,350 Z" />
        </svg>

        {/* ====== WAVE 3: Teal-to-Emerald with white foam (STATIC) ====== */}
        <svg
          className="absolute bottom-0 w-full"
          style={{ height: '54%' }}
          viewBox="0 0 1440 280"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad3" x1="0" y1="0" x2="1" y2="0.4">
              <stop offset="0%" stopColor="#085257" />
              <stop offset="35%" stopColor="#0c6e6d" />
              <stop offset="65%" stopColor="#0a6654" />
              <stop offset="100%" stopColor="#085863" />
            </linearGradient>
          </defs>
          {/* White foam crest line */}
          <path fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.7" d="M0,100 C220,165 480,45 720,108 C960,165 1200,45 1440,100" />
          <path fill="url(#waveGrad3)" opacity="0.85" d="M0,103 C220,168 480,48 720,111 C960,168 1200,48 1440,103 L1440,280 L0,280 Z" />
        </svg>

        {/* ====== WAVE 4: Sapphire Shimmer (STATIC) ====== */}
        <svg
          className="absolute bottom-0 w-full"
          style={{ height: '40%' }}
          viewBox="0 0 1440 220"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad4" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1a4675" stopOpacity="0.5" />
              <stop offset="30%" stopColor="#06647a" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#095c85" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#373180" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad4)" d="M0,85 C180,125 420,45 720,95 C1020,135 1260,45 1440,85 L1440,220 L0,220 Z" />
        </svg>

        {/* ====== WAVE 5: Front Seafoam Shimmer (STATIC) ====== */}
        <svg
          className="absolute bottom-0 w-full"
          style={{ height: '26%' }}
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="waveGrad5" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(186,230,253,0.18)" />
              <stop offset="50%" stopColor="rgba(125,211,252,0.22)" />
              <stop offset="100%" stopColor="rgba(186,230,253,0.18)" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGrad5)" d="M0,70 C240,105 480,30 720,70 C960,105 1200,30 1440,70 L1440,180 L0,180 Z" />
        </svg>
      </div>

      {/* ====== KEYFRAME ANIMATIONS (AURORA & WATER GLINT - NO WAVE MOVEMENTS) ====== */}
      <style>{`
        @keyframes waterGlint {
          0%, 100% { opacity: 0.08; transform: scale(0.4); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes auroraDance1 {
          0% { transform: translateX(-6%) rotate(0deg) scaleY(1); opacity: 0.85; }
          100% { transform: translateX(9%) rotate(2.5deg) scaleY(1.3); opacity: 1; }
        }
        @keyframes auroraDance2 {
          0% { transform: translateX(6%) rotate(0deg) scaleY(1); opacity: 0.75; }
          100% { transform: translateX(-9%) rotate(-2.5deg) scaleY(1.25); opacity: 1; }
        }
        @keyframes auroraDance3 {
          0% { transform: translateX(-4%) rotate(1deg) scaleY(1); opacity: 0.6; }
          100% { transform: translateX(7%) rotate(-1.5deg) scaleY(1.2); opacity: 0.9; }
        }
        @keyframes auroraDance4 {
          0% { transform: translateX(3%) rotate(-0.5deg) scaleY(1); opacity: 0.4; }
          100% { transform: translateX(-5%) rotate(1deg) scaleY(1.15); opacity: 0.75; }
        }
        @keyframes auroraCurtain {
          0% { opacity: 0.4; transform: scaleX(1); }
          100% { opacity: 0.85; transform: scaleX(1.18); }
        }
      `}</style>
    </div>
  );
};