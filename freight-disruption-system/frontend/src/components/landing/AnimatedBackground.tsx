// frontend/src/components/landing/AnimatedBackground.tsx
import React, { useState } from 'react';

// Generate dots outside component to avoid re-generation
const generateDots = () => {
  return [...Array(30)].map(() => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 2,
    size: Math.random() * 3 + 1,
  }));
};

export const AnimatedBackground: React.FC = () => {
  const [dots] = useState(generateDots);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-maritime-deep via-maritime-navy to-[#0a1628]">
      {/* Dramatic Wave Layers - Much More Visible */}
      <div className="absolute bottom-0 left-0 right-0 h-96 opacity-60">
        {/* Wave 1 - Deepest */}
        <svg
          className="absolute bottom-0 w-[300%] animate-wave"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ animationDuration: '30s' }}
        >
          <path
            d="M0,160 C320,300,420,100,720,160 C1020,220,1140,100,1440,160 L1440,320 L0,320 Z"
            fill="#1A3A5C"
            opacity="0.8"
          />
        </svg>

        {/* Wave 2 - Middle */}
        <svg
          className="absolute bottom-0 w-[300%] animate-wave"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ animationDelay: '-10s', animationDuration: '25s' }}
        >
          <path
            d="M0,200 C360,260,480,140,720,200 C960,260,1080,140,1440,200 L1440,320 L0,320 Z"
            fill="#2A4A6C"
            opacity="0.6"
          />
        </svg>

        {/* Wave 3 - Front */}
        <svg
          className="absolute bottom-0 w-[300%] animate-wave"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          style={{ animationDelay: '-5s', animationDuration: '20s' }}
        >
          <path
            d="M0,240 C400,290,500,190,720,240 C940,290,1040,190,1440,240 L1440,320 L0,320 Z"
            fill="#3A5A7C"
            opacity="0.4"
          />
        </svg>

        {/* Foam/White Caps */}
        <svg
          className="absolute bottom-0 w-[300%] animate-wave"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          style={{ animationDelay: '-2s', animationDuration: '15s' }}
        >
          <path
            d="M0,50 C360,80,480,20,720,50 C960,80,1080,20,1440,50 L1440,100 L0,100 Z"
            fill="rgba(255,255,255,0.1)"
          />
        </svg>
      </div>

      {/* Gradient Overlays for Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent" />

      {/* Animated Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #C8A45C 1px, transparent 1px),
            linear-gradient(to bottom, #C8A45C 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating Particles (Stars/Lights) */}
      <div className="absolute inset-0">
        {dots.map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-maritime-gold"
            style={{
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              opacity: 0.3,
              animation: `float ${dot.duration}s ease-in-out infinite`,
              animationDelay: `${dot.delay}s`,
              boxShadow: `0 0 ${dot.size * 2}px rgba(200, 164, 92, 0.3)`,
            }}
          />
        ))}
      </div>

      {/* Spotlight Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-maritime-gold/5 rounded-full blur-[120px]" />
    </div>
  );
};