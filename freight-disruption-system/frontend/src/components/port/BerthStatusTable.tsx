// src/components/port/BerthStatusTable.tsx
import React, { useState } from 'react';
import { Berth, Vessel } from '../../types/port';
import { Search, Filter, Ship, Clock, AlertTriangle, Eye, Container } from 'lucide-react';

interface BerthStatusTableProps {
  berths: Berth[];
  onSelectVessel: (vessel: Vessel) => void;
}

export const BerthStatusTable: React.FC<BerthStatusTableProps> = ({ berths, onSelectVessel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredBerths = berths.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.berthNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.currentVessel && b.currentVessel.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.currentVessel && b.currentVessel.imo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || b.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Container className="w-5 h-5 text-amber-400" />
            Berth Status & Master Schedule Table
          </h3>
          <p className="text-xs text-slate-400">
            Real-time status register for all active quay positions. Click on any vessel row to view full vessel operational manifest.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vessel or berth..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/15 text-xs">
            {['ALL', 'Occupied', 'Vacant', 'Maintenance'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === filter
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-bold text-[11px] border-b border-white/10">
            <tr>
              <th className="py-3.5 px-4">Berth ID</th>
              <th className="py-3.5 px-4">Terminal Name</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Assigned Vessel</th>
              <th className="py-3.5 px-4">Cargo / Activity</th>
              <th className="py-3.5 px-4">Progress %</th>
              <th className="py-3.5 px-4">Est. Vacancy</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-900/60">
            {filteredBerths.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No berths found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredBerths.map((berth) => {
                const vessel = berth.currentVessel;
                return (
                  <tr
                    key={berth.id}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                    onClick={() => vessel && onSelectVessel(vessel)}
                  >
                    {/* Berth ID */}
                    <td className="py-4 px-4 font-extrabold text-amber-400">
                      {berth.berthNumber}
                    </td>

                    {/* Terminal Name */}
                    <td className="py-4 px-4 font-semibold text-white">
                      {berth.name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Max Draft: {berth.maxDraftMeters}m | {berth.craneCount} Gantries
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          berth.status === 'Occupied'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : berth.status === 'Maintenance'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {berth.status}
                      </span>
                    </td>

                    {/* Assigned Vessel */}
                    <td className="py-4 px-4">
                      {vessel ? (
                        <div>
                          <span className="font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                            <Ship className="w-3.5 h-3.5 text-amber-400" />
                            {vessel.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {vessel.imo} • {vessel.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No vessel docked</span>
                      )}
                    </td>

                    {/* Cargo / Activity */}
                    <td className="py-4 px-4">
                      {vessel ? (
                        <div>
                          <span className="font-medium text-emerald-300">
                            {berth.cargoActivity || 'Unloading'}
                          </span>
                          <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                            {vessel.cargoType}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Progress % */}
                    <td className="py-4 px-4">
                      {vessel ? (
                        <div className="w-28 space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Progress</span>
                            <span className="font-bold text-emerald-400">
                              {berth.opsProgressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-1.5 rounded-full"
                              style={{ width: `${berth.opsProgressPercent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Est. Vacancy */}
                    <td className="py-4 px-4 text-white font-medium">
                      {berth.estimatedVacancy}
                    </td>

                    {/* Action Button */}
                    <td className="py-4 px-4 text-right">
                      {vessel ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVessel(vessel);
                          }}
                          className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-bold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Vacant</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
