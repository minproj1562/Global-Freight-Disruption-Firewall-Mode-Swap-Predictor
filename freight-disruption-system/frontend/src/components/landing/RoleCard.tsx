// frontend/src/components/landing/RoleCard.tsx
import React from 'react';
import { LucideIcon, ArrowRight, CheckCircle2, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export interface RoleCardMetric {
  label: string;
  value: string;
}

export interface RoleCardProps {
  portalId?: string;
  nodeCode?: string;
  domain?: string;
  title: string;
  subtitle?: string;
  description: string;
  icon: LucideIcon;
  color: string;
  glowColor: string;
  metrics?: RoleCardMetric[];
  features?: string[];
  role?: string;
  onClick: () => void;
  delay: number;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  portalId = 'PORTAL 01',
  nodeCode = 'NODE // 01',
  domain = 'OPERATIONS',
  title,
  subtitle,
  description,
  icon: Icon,
  color,
  glowColor,
  metrics = [],
  features = [],
  onClick,
  delay,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      className="h-full flex"
    >
      <div
        onClick={onClick}
        className="group relative w-full flex flex-col justify-between cursor-pointer overflow-hidden rounded-[28px] border transition-all duration-500 shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(8, 28, 54, 0.72) 0%, rgba(5, 18, 36, 0.85) 50%, rgba(3, 11, 24, 0.96) 100%)',
          borderColor: 'rgba(56, 189, 248, 0.18)',
          boxShadow: `0 20px 50px -15px rgba(2, 6, 23, 0.8), 0 0 30px -10px ${color}20, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
        }}
      >
        {/* Ambient Oceanic Color Beam (Top Center) */}
        <div
          className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-25 blur-3xl transition-all duration-700 group-hover:opacity-45 group-hover:scale-110"
          style={{ backgroundColor: color }}
        />

        {/* Top Illuminated Laser Edge */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 group-hover:h-[3px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${color} 40%, ${glowColor} 60%, transparent 100%)`,
            boxShadow: `0 0 16px 2px ${color}`,
          }}
        />

        {/* Tactical Grid Background Overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] transition-opacity duration-500 group-hover:opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
            backgroundSize: '18px 18px',
          }}
        />

        {/* Card Body */}
        <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-between h-full">
          <div>
            {/* Header Telemetry Pill & Node Badge */}
            <div className="flex items-center justify-between gap-2 mb-6">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border"
                style={{
                  backgroundColor: `${color}14`,
                  color: color,
                  borderColor: `${color}35`,
                  boxShadow: `0 0 14px -2px ${color}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
                {nodeCode}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium tracking-wider text-slate-400 uppercase">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>{domain}</span>
              </div>
            </div>

            {/* Icon + Title Block */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className="relative flex items-center justify-center w-14 h-14 rounded-2xl border transition-all duration-500 group-hover:scale-105 shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${color}20 0%, rgba(15, 23, 42, 0.8) 100%)`,
                  borderColor: `${color}45`,
                  boxShadow: `0 0 24px -4px ${color}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                }}
              >
                <Icon className="w-7 h-7 transition-colors duration-300" style={{ color: glowColor }} strokeWidth={2.2} />
              </div>

              <div>
                <div className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-0.5">
                  {portalId}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold font-mono text-white tracking-tight leading-tight group-hover:text-cyan-100 transition-colors">
                  {title}
                </h3>
              </div>
            </div>

            {/* Subtitle / Role Focus */}
            {subtitle && (
              <div className="text-xs font-mono font-semibold tracking-wide text-cyan-300/80 mb-3 flex items-center gap-2">
                <span className="h-px w-4 bg-cyan-400/50" />
                <span>{subtitle}</span>
              </div>
            )}

            {/* Executive Description */}
            <p className="text-xs sm:text-[13px] leading-relaxed text-slate-300/85 mb-5 font-normal">
              {description}
            </p>

            {/* Metric Chips Ribbon */}
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
                {metrics.map((m, idx) => (
                  <div key={idx} className="text-center font-mono">
                    <div className="text-xs font-bold text-white tracking-tight">{m.value}</div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider">{m.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Feature Capabilities Checklist */}
            {features.length > 0 && (
              <div className="space-y-2 mb-6 pt-3 border-t border-slate-700/40">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Trigger */}
          <div className="pt-2">
            <div
              className="w-full flex items-center justify-between py-3 px-4 rounded-xl font-mono text-xs font-bold transition-all duration-300 border shadow-lg group-hover:shadow-cyan-500/15"
              style={{
                background: `linear-gradient(90deg, ${color}22 0%, ${color}15 100%)`,
                borderColor: `${color}50`,
                color: '#ffffff',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="tracking-wider">ENTER COMMAND PORTAL</span>
              </div>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1.5"
                style={{ backgroundColor: `${color}35`, color: '#ffffff' }}
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Bottom Right Flare */}
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-32 h-32 rounded-full opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  );
};