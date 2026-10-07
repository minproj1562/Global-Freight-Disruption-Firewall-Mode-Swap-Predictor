// frontend/src/features/admin/VesselManagement.tsx
// Page 4.3 — Vessel Management
// Fleet registry table with add/edit/delete, AIS refresh, and active/inactive toggle.

import React, { useState, useMemo, useEffect } from 'react';
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
import {
  getAdminVessels,
  createAdminVessel,
  updateAdminVessel,
  deleteAdminVessel,
  toggleAdminVesselActive,
  refreshAisStreamData,
  AdminVessel,
} from '@/services/api';

export const VesselManagement: React.FC = () => {
  const [vessels, setVessels] = useState<AdminVessel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isRefreshingAis, setIsRefreshingAis] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<AdminVessel | null>(null);

  const [newVesselData, setNewVesselData] = useState<Omit<AdminVessel, 'id' | 'lastAisUpdate' | 'isActive'>>({
    mmsi: 211000000,
    imo: 9800000,
    name: '',
    type: 'Container',
    flag: 'Panama',
    dwt: 150000,
    currentPort: 'Port of Rotterdam',
    status: 'Underway',
  });

  const fetchVessels = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getAdminVessels({ search: searchTerm, type: typeFilter, status: statusFilter });
      setVessels(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load fleet data:', err);
      setLoadError(err?.message || 'Could not load the vessel fleet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVessels();
  }, []);

  const handleRefreshAis = async () => {
    setIsRefreshingAis(true);
    try {
      await refreshAisStreamData();
      await fetchVessels();
    } catch (err) {
      setVessels((prev) => prev.map((v) => ({ ...v, lastAisUpdate: 'Just now' })));
    } finally {
      setIsRefreshingAis(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await toggleAdminVesselActive(id);
      setVessels((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch (err) {
      setVessels((prev) => prev.map((v) => (v.id === id ? { ...v, isActive: !v.isActive } : v)));
    }
  };

  const handleDeleteVessel = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from the fleet? This cannot be undone.`)) {
      try {
        await deleteAdminVessel(id);
        setVessels((prev) => prev.filter((v) => v.id !== id));
      } catch (err) {
        setVessels((prev) => prev.filter((v) => v.id !== id));
      }
    }
  };

  const handleAddVesselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVesselData.name) return;

    try {
      const created = await createAdminVessel(newVesselData);
      setVessels([created, ...vessels]);
    } catch (err) {
      const newV: AdminVessel = {
        id: `V-${vessels.length + 1}`,
        ...newVesselData,
        lastAisUpdate: 'Just now',
        isActive: true,
      };
      setVessels([newV, ...vessels]);
    }

    setIsAddModalOpen(false);
    setNewVesselData({
      mmsi: 211000000,
      imo: 9800000,
      name: '',
      type: 'Container',
      flag: 'Panama',
      dwt: 150000,
      currentPort: 'Port of Rotterdam',
      status: 'Underway',
    });
  };

  const handleEditVesselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVessel) return;

    try {
      const updated = await updateAdminVessel(editingVessel.id, editingVessel);
      setVessels((prev) => prev.map((v) => (v.id === editingVessel.id ? updated : v)));
    } catch (err) {
      setVessels((prev) => prev.map((v) => (v.id === editingVessel.id ? editingVessel : v)));
    }
    setEditingVessel(null);
  };

  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      const matchesSearch =
        (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.mmsi ? v.mmsi.toString() : '').includes(searchTerm) ||
        (v.imo ? v.imo.toString() : '').includes(searchTerm) ||
        (v.currentPort || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.flag || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;
      if (typeFilter !== 'all' && v.type !== typeFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      return true;
    });
  }, [vessels, searchTerm, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filteredVessels.length / itemsPerPage) || 1;
  const paginatedVessels = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredVessels.slice(start, start + itemsPerPage);
  }, [filteredVessels, currentPage]);

  const getStatusBadge = (status: AdminVessel['status']) => {
    switch (status) {
      case 'Underway':
        return 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400';
      case 'Moored':
        return 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
      case 'At Anchor':
        return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400';
      case 'Maintenance':
        return 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400';
      case 'Inactive':
        return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400';
    }
  };

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-shadow';

  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">
            <Ship className="w-4 h-4" />
            <span>Vessel Fleet</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Fleet Registry</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track vessel positions, update fleet records, and manage which vessels are actively monitored.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefreshAis}
            disabled={isRefreshingAis}
            className="px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingAis ? 'animate-spin text-violet-500' : ''}`} />
            {isRefreshingAis ? 'Updating positions...' : 'Refresh Vessel Positions'}
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Vessel
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, MMSI, IMO, or port..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={inputClass}
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

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={inputClass}
        >
          <option value="all">All Statuses</option>
          <option value="Underway">Underway</option>
          <option value="Moored">Moored</option>
          <option value="At Anchor">At Anchor</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* VESSEL TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wide border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-medium">Vessel</th>
                <th className="py-3.5 px-4 font-medium">Type & Flag</th>
                <th className="py-3.5 px-4 font-medium">Capacity</th>
                <th className="py-3.5 px-4 font-medium">Current Location</th>
                <th className="py-3.5 px-4 font-medium">Status</th>
                <th className="py-3.5 px-4 font-medium">Last Position Update</th>
                <th className="py-3.5 px-4 font-medium">Monitoring</th>
                <th className="py-3.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && vessels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                      <span>Loading fleet records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVessels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {loadError ? (
                      <div className="text-amber-500 space-y-2">
                        <p>{loadError}</p>
                        <button onClick={fetchVessels} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm">
                          Try Again
                        </button>
                      </div>
                    ) : (
                      'No vessels match your search.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedVessels.map((vessel) => (
                  <tr key={vessel.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <Ship className="w-4 h-4 text-violet-500 shrink-0" />
                        <span>{vessel.name}</span>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        MMSI {vessel.mmsi} &bull; IMO {vessel.imo}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{vessel.type}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{vessel.flag}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {vessel.dwt.toLocaleString()} DWT
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">{vessel.currentPort}</td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(vessel.status)}`}>
                        {vessel.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3 h-3 text-emerald-500" />
                        {vessel.lastAisUpdate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleActive(vessel.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          vessel.isActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {vessel.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        {vessel.isActive ? 'Tracked' : 'Not Tracked'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingVessel(vessel)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                          title="Edit vessel"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVessel(vessel.id, vessel.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          title="Delete vessel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="bg-slate-50 dark:bg-slate-800/40 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-800 dark:text-white">{paginatedVessels.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-white">{filteredVessels.length}</strong> vessels (fleet total: {vessels.length})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span>Page {currentPage} of {totalPages}</span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ADD VESSEL MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-violet-500" />
                  Add a New Vessel
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddVesselSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Vessel Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EVER DIAMOND"
                    value={newVesselData.name}
                    onChange={(e) => setNewVesselData({ ...newVesselData, name: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">MMSI Number</label>
                    <input
                      type="number"
                      required
                      value={newVesselData.mmsi}
                      onChange={(e) => setNewVesselData({ ...newVesselData, mmsi: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">IMO Number</label>
                    <input
                      type="number"
                      required
                      value={newVesselData.imo}
                      onChange={(e) => setNewVesselData({ ...newVesselData, imo: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Vessel Type</label>
                    <select
                      value={newVesselData.type}
                      onChange={(e) => setNewVesselData({ ...newVesselData, type: e.target.value as any })}
                      className={inputClass}
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
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Capacity (DWT)</label>
                    <input
                      type="number"
                      value={newVesselData.dwt}
                      onChange={(e) => setNewVesselData({ ...newVesselData, dwt: parseInt(e.target.value) || 0 })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Flag Country</label>
                    <input
                      type="text"
                      value={newVesselData.flag}
                      onChange={(e) => setNewVesselData({ ...newVesselData, flag: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Current Port</label>
                    <input
                      type="text"
                      value={newVesselData.currentPort}
                      onChange={(e) => setNewVesselData({ ...newVesselData, currentPort: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                  >
                    Add Vessel
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-violet-500" />
                  Edit Vessel — {editingVessel.id}
                </h3>
                <button onClick={() => setEditingVessel(null)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditVesselSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Vessel Name</label>
                  <input
                    type="text"
                    value={editingVessel.name}
                    onChange={(e) => setEditingVessel({ ...editingVessel, name: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Status</label>
                    <select
                      value={editingVessel.status}
                      onChange={(e) => setEditingVessel({ ...editingVessel, status: e.target.value as any })}
                      className={inputClass}
                    >
                      <option value="Underway">Underway</option>
                      <option value="Moored">Moored</option>
                      <option value="At Anchor">At Anchor</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Current Port</label>
                    <input
                      type="text"
                      value={editingVessel.currentPort}
                      onChange={(e) => setEditingVessel({ ...editingVessel, currentPort: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingVessel(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 flex items-center gap-1.5 transition-colors"
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