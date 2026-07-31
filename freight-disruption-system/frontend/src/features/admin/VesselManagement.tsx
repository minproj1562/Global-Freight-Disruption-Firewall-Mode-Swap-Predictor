// frontend/src/features/admin/VesselManagement.tsx
// Page 4.3 — Vessel Management
// Table of 50 pre-seeded vessels (MMSI, name, type, flag, DWT, current port, status, last AIS update).
// Add/Edit/Delete, refresh AIS, mark active/inactive.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Radio,
} from 'lucide-react';
import { INITIAL_50_VESSELS, AdminVessel } from '@/shared/mock/adminMockData';

export const VesselManagement: React.FC = () => {
  const [vessels, setVessels] = useState<AdminVessel[]>(INITIAL_50_VESSELS);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Refreshing AIS animation state
  const [isRefreshingAis, setIsRefreshingAis] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<AdminVessel | null>(null);

  // Form State for Add New Vessel
  const [newVesselData, setNewVesselData] = useState<Omit<AdminVessel, 'id' | 'lastAisUpdate' | 'isActive'>>({
    mmsi: 211000000,
    imo: 9800000,
    name: '',
    type: 'Container',
    flag: 'Panama 🇵🇦',
    dwt: 150000,
    currentPort: 'Port of Rotterdam',
    status: 'Underway',
  });

  // Handle Refresh AIS Trigger
  const handleRefreshAis = () => {
    setIsRefreshingAis(true);
    setTimeout(() => {
      setVessels((prev) =>
        prev.map((v) => ({ ...v, lastAisUpdate: 'Just now (0s ago)' }))
      );
      setIsRefreshingAis(false);
    }, 1200);
  };

  // Toggle Active / Inactive State per vessel
  const handleToggleActive = (id: string) => {
    setVessels((prev) =>
      prev.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v))
    );
  };

  // Delete Vessel Action
  const handleDeleteVessel = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete vessel "${name}" (ID: ${id}) from the fleet registry?`)) {
      setVessels((prev) => prev.filter((v) => v.id !== id));
    }
  };

  // Submit Add Vessel
  const handleAddVesselSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselData.name) return;

    const newV: AdminVessel = {
      id: `V-${vessels.length + 1}`,
      ...newVesselData,
      lastAisUpdate: 'Just now',
      isActive: true,
    };

    setVessels([newV, ...vessels]);
    setIsAddModalOpen(false);
    setNewVesselData({
      mmsi: 211000000,
      imo: 9800000,
      name: '',
      type: 'Container',
      flag: 'Panama 🇵🇦',
      dwt: 150000,
      currentPort: 'Port of Rotterdam',
      status: 'Underway',
    });
  };

  // Submit Save Edit Vessel
  const handleEditVesselSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVessel) return;

    setVessels((prev) =>
      prev.map((v) => (v.id === editingVessel.id ? editingVessel : v))
    );
    setEditingVessel(null);
  };

  // Filtered dataset
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.mmsi.toString().includes(searchTerm) ||
        v.imo.toString().includes(searchTerm) ||
        v.currentPort.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.flag.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (typeFilter !== 'all' && v.type !== typeFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;

      return true;
    });
  }, [vessels, searchTerm, typeFilter, statusFilter]);

  // Paginated dataset
  const totalPages = Math.ceil(filteredVessels.length / itemsPerPage) || 1;
  const paginatedVessels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVessels.slice(start, start + itemsPerPage);
  }, [filteredVessels, currentPage]);

  const getStatusBadge = (status: AdminVessel['status']) => {
    switch (status) {
      case 'Underway':
        return 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300';
      case 'Moored':
        return 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
      case 'At Anchor':
        return 'bg-amber-500/15 border-amber-500/40 text-amber-300';
      case 'Maintenance':
        return 'bg-purple-500/15 border-purple-500/40 text-purple-300';
      case 'Inactive':
        return 'bg-slate-700/40 border-slate-600 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100 transition-colors">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 dark:text-cyan-400 mb-1">
            <Ship className="w-4 h-4" />
            <span>PAGE 4.3 • FLEET MANAGEMENT & AIS CONTROLS</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            50 Pre-Seeded Vessel Fleet Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full registry of 50 pre-seeded maritime vessels. Refresh live AIS positions, toggle vessel active states, or perform CRUD operations.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAis}
            disabled={isRefreshingAis}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingAis ? 'animate-spin text-cyan-400' : ''}`} />
            {isRefreshingAis ? 'Broadcasting AIS Ping...' : 'Refresh AIS (50 Vessels)'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add New Vessel
          </button>
        </div>
      </div>

      {/* FILTER & TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Name, MMSI, IMO, Port..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Vessel Types</option>
            <option value="Container">Container Ship</option>
            <option value="Tanker">Crude Tanker</option>
            <option value="Bulk Carrier">Bulk Carrier</option>
            <option value="LNG Carrier">LNG Carrier</option>
            <option value="Ro-Ro">Ro-Ro Vehicle Carrier</option>
            <option value="Chemical Tanker">Chemical Tanker</option>
            <option value="Tug / Support">Tug / Support Vessel</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Underway">Underway</option>
            <option value="Moored">Moored</option>
            <option value="At Anchor">At Anchor</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* 50 PRE-SEEDED VESSELS TABLE */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Vessel Name & MMSI</th>
                <th className="py-3.5 px-4 font-semibold">Type & Flag</th>
                <th className="py-3.5 px-4 font-semibold">DWT Capacity</th>
                <th className="py-3.5 px-4 font-semibold">Current Location / Port</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Last AIS Ingest</th>
                <th className="py-3.5 px-4 font-semibold">Active State</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedVessels.map((vessel) => (
                <tr key={vessel.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Name & MMSI */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <Ship className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{vessel.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      MMSI: {vessel.mmsi} | IMO: {vessel.imo}
                    </div>
                  </td>

                  {/* Type & Flag */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{vessel.type}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{vessel.flag}</div>
                  </td>

                  {/* DWT */}
                  <td className="py-3.5 px-4 font-mono font-medium text-amber-300">
                    {vessel.dwt.toLocaleString()} DWT
                  </td>

                  {/* Current Port */}
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    {vessel.currentPort}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getStatusBadge(vessel.status)}`}>
                      {vessel.status}
                    </span>
                  </td>

                  {/* Last AIS Update */}
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Radio className="w-3 h-3 text-cyan-400" />
                      {vessel.lastAisUpdate}
                    </span>
                  </td>

                  {/* Active / Inactive Toggle Switch */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(vessel.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all ${
                        vessel.isActive
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {vessel.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                      {vessel.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  {/* Actions (Edit / Delete) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingVessel(vessel)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit Vessel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteVessel(vessel.id, vessel.name)}
                        className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                        title="Delete Vessel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div>
            Showing <strong className="text-white">{paginatedVessels.length}</strong> of <strong className="text-white">{filteredVessels.length}</strong> vessels (Total Fleet: 50)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span>Page {currentPage} of {totalPages}</span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD VESSEL MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Add New Vessel to Fleet
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddVesselSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Vessel Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EVER DIAMOND"
                    value={newVesselData.name}
                    onChange={(e) => setNewVesselData({ ...newVesselData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">MMSI Number</label>
                    <input
                      type="number"
                      required
                      value={newVesselData.mmsi}
                      onChange={(e) => setNewVesselData({ ...newVesselData, mmsi: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">IMO Number</label>
                    <input
                      type="number"
                      required
                      value={newVesselData.imo}
                      onChange={(e) => setNewVesselData({ ...newVesselData, imo: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Vessel Type</label>
                    <select
                      value={newVesselData.type}
                      onChange={(e) => setNewVesselData({ ...newVesselData, type: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="Container">Container</option>
                      <option value="Tanker">Tanker</option>
                      <option value="Bulk Carrier">Bulk Carrier</option>
                      <option value="LNG Carrier">LNG Carrier</option>
                      <option value="Ro-Ro">Ro-Ro</option>
                      <option value="Chemical Tanker">Chemical Tanker</option>
                      <option value="Tug / Support">Tug / Support</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">DWT Capacity</label>
                    <input
                      type="number"
                      value={newVesselData.dwt}
                      onChange={(e) => setNewVesselData({ ...newVesselData, dwt: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Flag Registry</label>
                    <input
                      type="text"
                      value={newVesselData.flag}
                      onChange={(e) => setNewVesselData({ ...newVesselData, flag: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Current Port</label>
                    <input
                      type="text"
                      value={newVesselData.currentPort}
                      onChange={(e) => setNewVesselData({ ...newVesselData, currentPort: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
                  >
                    Register Vessel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT VESSEL MODAL */}
      <AnimatePresence>
        {editingVessel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-cyan-400" />
                  Edit Vessel #{editingVessel.id}
                </h3>
                <button onClick={() => setEditingVessel(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditVesselSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Vessel Name</label>
                  <input
                    type="text"
                    value={editingVessel.name}
                    onChange={(e) => setEditingVessel({ ...editingVessel, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Status</label>
                    <select
                      value={editingVessel.status}
                      onChange={(e) => setEditingVessel({ ...editingVessel, status: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="Underway">Underway</option>
                      <option value="Moored">Moored</option>
                      <option value="At Anchor">At Anchor</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Current Port</label>
                    <input
                      type="text"
                      value={editingVessel.currentPort}
                      onChange={(e) => setEditingVessel({ ...editingVessel, currentPort: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingVessel(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Vessel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
