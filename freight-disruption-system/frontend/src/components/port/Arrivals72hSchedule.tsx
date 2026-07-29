// src/components/port/Arrivals72hSchedule.tsx
import React, { useState } from 'react';
import { ArrivalScheduleItem, Vessel } from '../../types/port';
import { Calendar, Clock, Anchor, AlertTriangle, ShieldCheck, Ship, ArrowRight } from 'lucide-react';

interface Arrivals72hScheduleProps {
  arrivals: ArrivalScheduleItem[];
  onSelectVessel: (vessel: Vessel) => void;
}

export const Arrivals72hSchedule: React.FC<Arrivals72hScheduleProps> = ({
  arrivals,
  onSelectVessel,
}) => {
  const [activeWindow, setActiveWindow] = useState<'ALL' | '0-24h' | '24-48h' | '48-72h'>('ALL');

  const filteredArrivals = arrivals.filter(
    (item) => activeWindow === 'ALL' || item.timeWindow === activeWindow
  );

  return (
    <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            72-Hour Incoming Arrivals Schedule
          </h3>
          <p className="text-xs text-slate-400">
            Forward ETA schedule for inbound container vessels, oil tankers, and bulk carriers.
          </p>
        </div>

        {/* Time Window Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/15 text-xs">
          {[
            { id: 'ALL', label: 'All 72 Hours' },
            { id: '0-24h', label: 'Next 24h' },
            { id: '24-48h', label: '24-48h' },
            { id: '48-72h', label: '48-72h' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveWindow(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWindow === tab.id
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {filteredArrivals.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-white/5 text-slate-400">
            No scheduled arrivals in this 24h window.
          </div>
        ) : (
          filteredArrivals.map((item) => {
            const formattedTime = new Date(item.scheduledArrival).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelectVessel(item.vessel)}
                className="bg-slate-950/80 hover:bg-slate-950 border border-white/10 hover:border-amber-400/50 rounded-2xl p-4 transition-all cursor-pointer group flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg"
              >
                {/* Left: Time & Vessel Info */}
                <div className="flex items-start gap-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl text-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <span className="text-[10px] font-extrabold text-amber-400 block uppercase">
                      {item.timeWindow}
                    </span>
                    <span className="text-[11px] font-bold text-white whitespace-nowrap">
                      {formattedTime}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                        {item.vessel.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-slate-300">
                        {item.vessel.type}
                      </span>
                      {item.vessel.priority === 'Urgent' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                          Urgent Priority
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Origin: <strong className="text-slate-200">{item.vessel.originPort}</strong> •{' '}
                      {item.vessel.lengthMeters}m LOA • {item.vessel.draftMeters}m Draft
                    </p>
                  </div>
                </div>

                {/* Right: Operational Readiness & Assigned Berth */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between border-t md:border-t-0 border-white/10 pt-3 md:pt-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Assigned Berth</span>
                    <span className="text-xs font-extrabold text-amber-300">
                      {item.assignedBerth}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Delay Risk</span>
                    <span
                      className={`text-xs font-bold ${
                        item.delayRisk === 'High'
                          ? 'text-red-400'
                          : item.delayRisk === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.delayRisk} Risk
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVessel(item.vessel);
                    }}
                    className="p-2.5 bg-amber-400/10 group-hover:bg-amber-400 text-amber-400 group-hover:text-slate-950 rounded-xl transition-all shadow"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
