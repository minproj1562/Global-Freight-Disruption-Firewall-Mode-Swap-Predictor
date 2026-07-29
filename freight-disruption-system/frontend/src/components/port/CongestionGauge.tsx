// src/components/port/CongestionGauge.tsx
import React from 'react';

interface CongestionGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const CongestionGauge: React.FC<CongestionGaugeProps> = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  showLabel = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on congestion
  let strokeColor = '#10B981'; // Green
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let statusText = 'Optimal';

  if (percentage >= 75) {
    strokeColor = '#EF4444'; // Red
    glowColor = 'rgba(239, 68, 68, 0.4)';
    statusText = 'Critical';
  } else if (percentage >= 50) {
    strokeColor = '#F59E0B'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.4)';
    statusText = 'Moderate';
  }

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90 transition-all duration-700 drop-shadow-md"
        style={{
          filter: `drop-shadow(0px 0px 8px ${glowColor})`,
        }}
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
          fill="transparent"
        />
        {/* Value Arc Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-white tracking-tight">
            {percentage}%
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5"
            style={{
              color: strokeColor,
              backgroundColor: `${strokeColor}20`,
            }}
          >
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
};
