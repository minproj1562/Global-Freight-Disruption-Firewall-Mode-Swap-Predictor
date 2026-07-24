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

const STAR_COLORS = ['#ffffff', '#d6eaff', '#fff8e1', '#e8f4ff', '#fffde8'];

const generateStars = (): StarData[] => {
  return [...Array(200)].map(() => {
    const brightness = Math.random();
    let size: number;
    let baseOpacity: number;

    if (brightness > 0.96) {
      size = Math.random() * 2.5 + 2.5;
      baseOpacity = 0.85;
    } else if (brightness > 0.8) {
      size = Math.random() * 1.5 + 1.5;
      baseOpacity = 0.6;
    } else {
      size = Math.random() * 1.2 + 0.6;
      baseOpacity = Math.random() * 0.3 + 0.2;
    }

    return {
      left: Math.random() * 100,
      top: Math.random() * 50,
      duration: 2.5 + Math.random() * 4,
      delay: Math.random() * 6,
      size,
      baseOpacity,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    };
  });
};

export const AnimatedBackground: React.FC = () => {
  const [stars] = useState(generateStars);
  const [particles] = useState(() =>
    [...Array(10)].map(() => ({
      left: 15 + Math.random() * 70,
      top: 25 + Math.random() * 50,
      duration: 5 + Math.random() * 4,
      delay: Math.random() * 4,
    }))
  );

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* ====== NIGHT SKY BASE ====== */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020810] via-[#071428] to-[#0a1d38]" />

      {/* ====== AURORA BOREALIS ====== */}
      {/* Aurora band 1 — green dominant */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '2%',
          left: '-20%',
          width: '140%',
          height: '35%',
          background: 'linear-gradient(135deg, transparent 10%, rgba(34,197,94,0.12) 25%, rgba(16,185,129,0.18) 35%, rgba(45,212,191,0.14) 45%, rgba(56,189,248,0.1) 55%, rgba(139,92,246,0.08) 65%, transparent 80%)',
          filter: 'blur(40px)',
          animation: 'auroraWave1 20s ease-in-out infinite',
        }}
      />
      {/* Aurora band 2 — purple/blue shift */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '5%',
          left: '-10%',
          width: '120%',
          height: '28%',
          background: 'linear-gradient(160deg, transparent 15%, rgba(99,102,241,0.1) 30%, rgba(168,85,247,0.12) 40%, rgba(45,212,191,0.15) 55%, rgba(34,197,94,0.1) 65%, transparent 80%)',
          filter: 'blur(50px)',
          animation: 'auroraWave2 25s ease-in-out infinite',
        }}
      />
      {/* Aurora band 3 — vertical curtain streaks */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '0%',
          left: '10%',
          width: '80%',
          height: '40%',
          background: `repeating-linear-gradient(
            90deg,
            transparent,
            transparent 3%,
            rgba(34,197,94,0.06) 3.5%,
            transparent 4%,
            transparent 7%,
            rgba(45,212,191,0.05) 7.5%,
            transparent 8%,
            transparent 12%,
            rgba(139,92,246,0.04) 12.5%,
            transparent 13%
          )`,
          filter: 'blur(8px)',
          animation: 'auroraWave3 15s ease-in-out infinite',
          mixBlendMode: 'screen',
        }}
      />

      {/* ====== MOON ====== */}
      <div className="absolute top-[8%] right-[12%]">
        <div className="absolute -inset-10 rounded-full bg-yellow-50/8 blur-2xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#fefce8] via-[#f5f0d0] to-[#e8ddb8] shadow-[0_0_25px_8px_rgba(255,255,220,0.2),0_0_50px_15px_rgba(255,255,200,0.08)]">
          <div className="absolute top-3 left-4 w-5 h-5 rounded-full bg-yellow-200/20" />
          <div className="absolute bottom-4 right-5 w-3.5 h-3.5 rounded-full bg-yellow-100/15" />
          <div className="absolute top-7 right-3 w-2 h-2 rounded-full bg-yellow-200/10" />
        </div>
      </div>

      {/* ====== TWINKLING STARS (200) ====== */}
      <div className="absolute inset-0">
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
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
              boxShadow: star.size > 2.5
                ? `0 0 ${star.size * 3}px ${star.size}px ${star.color}50, 0 0 ${star.size * 6}px ${star.size * 1.5}px ${star.color}18`
                : `0 0 ${star.size * 2}px ${star.color}40`,
            }}
          />
        ))}
      </div>

      {/* ====== OCEAN — bottom 42% ====== */}
      <div className="absolute bottom-0 left-0 right-0 h-[42%]">
        {/* Deep water base */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#061a2e]/80 to-[#082035]" />

        {/* Wave 1 — deepest — dark navy → deep teal */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '100%', animation: 'waveMove 26s ease-in-out infinite' }}
          viewBox="0 0 2400 400" preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="w1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b2545" />
              <stop offset="60%" stopColor="#0d3d5c" />
              <stop offset="100%" stopColor="#0f4c75" />
            </linearGradient>
          </defs>
          <path fill="url(#w1)" d="M0,140 C300,230 600,80 1200,150 C1800,220 2100,80 2400,140 L2400,400 L0,400 Z" />
        </svg>

        {/* Wave 2 — mid — teal → ocean cyan */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '78%', animation: 'waveMove 20s ease-in-out infinite reverse', animationDelay: '-5s' }}
          viewBox="0 0 2400 350" preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="w2" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#0e5c6e" />
              <stop offset="50%" stopColor="#148896" />
              <stop offset="100%" stopColor="#11a0ad" />
            </linearGradient>
          </defs>
          <path fill="url(#w2)" opacity="0.85" d="M0,170 C400,90 700,250 1200,170 C1700,90 2000,250 2400,170 L2400,350 L0,350 Z" />
        </svg>

        {/* Wave 3 — front — bright cyan → aquamarine */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '55%', animation: 'waveMove 15s ease-in-out infinite', animationDelay: '-2s' }}
          viewBox="0 0 2400 280" preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="w3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#159ba8" />
              <stop offset="50%" stopColor="#1ab5b5" />
              <stop offset="100%" stopColor="#22c4a0" />
            </linearGradient>
          </defs>
          <path fill="url(#w3)" opacity="0.65" d="M0,120 C350,200 650,60 1200,130 C1750,200 2050,60 2400,120 L2400,280 L0,280 Z" />
        </svg>

        {/* Wave 4 — surface foam shimmer */}
        <svg
          className="absolute bottom-0 w-[200%]"
          style={{ height: '30%', animation: 'waveMove 11s ease-in-out infinite', animationDelay: '-1s' }}
          viewBox="0 0 2400 180" preserveAspectRatio="none"
        >
          <path fill="rgba(255,255,255,0.07)" d="M0,90 C400,130 600,50 1200,90 C1800,130 2100,50 2400,90 L2400,180 L0,180 Z" />
        </svg>

        {/* Moonlight reflection on water */}
        <div
          className="absolute bottom-0 h-full pointer-events-none"
          style={{
            right: '10%',
            width: '10%',
            background: 'linear-gradient(180deg, rgba(255,255,230,0.06) 0%, rgba(255,255,200,0.03) 50%, rgba(200,220,255,0.015) 100%)',
            filter: 'blur(10px)',
            animation: 'shimmer 5s ease-in-out infinite',
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
          }}
        />
      </div>

      {/* Subtle golden particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-maritime-gold/30"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              animation: `particleFloat ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              boxShadow: '0 0 6px rgba(200,164,92,0.25)',
            }}
          />
        ))}
      </div>


      {/* ====== KEYFRAMES ====== */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes waveMove {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25%) translateY(-5px); }
        }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.7; transform: scaleX(1); }
          50% { opacity: 1; transform: scaleX(1.06); }
        }
        @keyframes auroraWave1 {
          0%, 100% {
            transform: translateX(-5%) skewX(-2deg) scaleY(1);
            opacity: 0.8;
          }
          30% {
            transform: translateX(8%) skewX(3deg) scaleY(1.15);
            opacity: 1;
          }
          60% {
            transform: translateX(-3%) skewX(-1deg) scaleY(0.95);
            opacity: 0.7;
          }
        }
        @keyframes auroraWave2 {
          0%, 100% {
            transform: translateX(5%) skewX(2deg) scaleY(1);
            opacity: 0.7;
          }
          40% {
            transform: translateX(-8%) skewX(-3deg) scaleY(1.2);
            opacity: 1;
          }
          70% {
            transform: translateX(3%) skewX(1deg) scaleY(0.9);
            opacity: 0.6;
          }
        }
        @keyframes auroraWave3 {
          0%, 100% {
            transform: translateX(0%) scaleX(1);
            opacity: 0.6;
          }
          50% {
            transform: translateX(5%) scaleX(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};