// src/components/port/CongestionHistoryChart.tsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { CongestionHistoryPoint } from '../../types/port';
import { TrendingUp, AlertTriangle, ShieldAlert } from 'lucide-react';

interface CongestionHistoryChartProps {
  history: CongestionHistoryPoint[];
}

export const CongestionHistoryChart: React.FC<CongestionHistoryChartProps> = ({ history }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CongestionHistoryPoint;
      return (
        <div className="bg-slate-950/95 border border-white/20 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-xs text-white max-w-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="font-bold text-amber-400">{label}</span>
            <span className="font-extrabold text-white">{data.congestionRate}% Congested</span>
          </div>

          <div className="space-y-1 text-slate-300">
            <p>
              Waiting Anchorage Vessels:{' '}
              <strong className="text-amber-300">{data.waitingVessels}</strong>
            </p>
            <p>
              Average Queue Delay:{' '}
              <strong className="text-white">{data.avgWaitHours} hrs</strong>
            </p>
          </div>

          {data.disruption && (
            <div className="mt-3 pt-2 border-t border-red-500/30 bg-red-500/10 p-2 rounded-xl border">
              <span className="text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {data.disruption.title}
              </span>
              <p className="text-[10px] text-red-200 mt-0.5">{data.disruption.description}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-2">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Historical Congestion & Disruption Event Overlay
          </h3>
          <p className="text-xs text-slate-400">
            14-day congestion velocity curve. Red markers highlight historical operational disruptions and severe weather occurrences.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-3 h-0.5 bg-amber-400" /> Congestion Level %
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Disruption Overlay
          </span>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="congestionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />

            <Area
              type="monotone"
              dataKey="congestionRate"
              stroke="#F59E0B"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#congestionGrad)"
            />

            {/* Reference Dots for Disruption Overlay */}
            {history.map(
              (pt, index) =>
                pt.disruption && (
                  <ReferenceDot
                    key={index}
                    x={pt.date}
                    y={pt.congestionRate}
                    r={7}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                )
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
