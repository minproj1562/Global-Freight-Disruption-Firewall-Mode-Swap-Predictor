// frontend/src/components/ui/landing/RoleCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface RoleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
  delay: number;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  delay,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.05, y: -12 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        onClick={onClick}
        className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-white/10 bg-slate-900/60 backdrop-blur-xl transition-all duration-500 hover:border-white/30 hover:bg-slate-900/80"
        style={{
          boxShadow: `0 10px 40px ${color}15, 0 0 80px ${color}10`,
        }}
      >
        {/* Animated Gradient Background */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-30"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${color}40 0%, transparent 70%)`,
          }}
        />

        {/* Glowing Top Border */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-500 group-hover:h-2"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            boxShadow: `0 0 20px ${color}`,
          }}
        />

        <div className="relative p-10 text-center">
          {/* Icon Container */}
          <div className="mb-8 flex justify-center">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              {/* Glow Effect */}
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ backgroundColor: `${color}40` }}
              />
              
              {/* Icon */}
              <div
                className="relative rounded-2xl p-5 transition-all duration-500 group-hover:scale-110"
                style={{
                  backgroundColor: `${color}20`,
                  boxShadow: `0 0 30px ${color}30`,
                }}
              >
                <Icon
                  className="h-14 w-14 transition-all duration-500"
                  style={{ color }}
                  strokeWidth={2}
                />
              </div>
            </motion.div>
          </div>

          {/* Title */}
          <h3 className="mb-4 text-3xl font-bold text-white transition-all duration-300 group-hover:scale-105">
            {title}
          </h3>

          {/* Description */}
          <p className="mb-6 text-sm leading-relaxed text-gray-300 transition-colors duration-300 group-hover:text-white">
            {description}
          </p>

          {/* CTA Button */}
          <div className="flex justify-center">
            <div
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all duration-300 group-hover:gap-4"
              style={{
                backgroundColor: `${color}20`,
                color: color,
                border: `2px solid ${color}40`,
              }}
            >
              <span>Access Dashboard</span>
              <svg
                className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Corner Accent */}
        <div
          className="absolute bottom-0 right-0 h-32 w-32 opacity-0 transition-opacity duration-500 group-hover:opacity-20"
          style={{
            background: `radial-gradient(circle at 100% 100%, ${color} 0%, transparent 70%)`,
          }}
        />
      </div>
    </motion.div>
  );
};