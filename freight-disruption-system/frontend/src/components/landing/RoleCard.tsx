// frontend/src/components/ui/landing/RoleCard.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05, y: -10 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        onClick={onClick}
        className="group relative cursor-pointer overflow-hidden border-2 border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-2xl"
        style={{
          boxShadow: `0 0 40px ${color}20`,
        }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-20"
          style={{
            background: `linear-gradient(135deg, ${color}40 0%, transparent 100%)`,
          }}
        />

        {/* Top Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 transition-all duration-300"
          style={{ backgroundColor: color }}
        />

        <CardContent className="relative p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div
              className="rounded-2xl p-4 transition-all duration-300 group-hover:scale-110"
              style={{
                backgroundColor: `${color}20`,
              }}
            >
              <Icon
                className="h-12 w-12 transition-all duration-300"
                style={{ color }}
                strokeWidth={1.5}
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-3 text-2xl font-bold text-white">
            {title}
          </h3>

          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-300">
            {description}
          </p>

          {/* Arrow Icon */}
          <div className="mt-6 flex justify-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-1"
              style={{
                backgroundColor: `${color}20`,
              }}
            >
              <svg
                className="h-5 w-5"
                style={{ color }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};