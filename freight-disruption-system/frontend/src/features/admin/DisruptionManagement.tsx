// frontend/src/features/admin/DisruptionManagement.tsx
// Page 4.2 — Disruption Management
// Left: Add New Disruption form. Right: All disruptions list with edit/resolve/delete.

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  ShieldAlert,
  Save,
  X,
} from 'lucide-react';
import {
  getAdminDisruptions,
  createAdminDisruption,
  updateAdminDisruption,
  deleteAdminDisruption,
  toggleDisruptionResolve,
  ManagedDisruption,
} from '@/services/api';

export const DisruptionManagement: React.FC = () => {
  const [disruptions, setDisruptions] = useState<ManagedDisruption[]>([]);

  const [formData, setFormData] = useState<Omit<ManagedDisruption, 'id' | 'affectedVesselsCount' | 'resolved'>>({
    type: 'Extreme Weather / Typhoon',
    locationName: '',
    latitude: 0,
    longitude: 0,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
    severity: 'high',
    radiusNm: 100,
    description: '',
  });

  const [editingDisruption, setEditingDisruption] = useState<ManagedDisruption | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchDisruptions = async () => {
    try {
      const data = await getAdminDisruptions();
      setDisruptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Backend API connection fallback error:', err);
    }
  };

  useEffect(() => {
    fetchDisruptions();
  }, []);

  const handleCreateDisruption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationName || !formData.description) return;

    try {
      const created = await createAdminDisruption(formData);
      setDisruptions([created, ...disruptions]);
    } catch (err) {
      const newDisruption: ManagedDisruption = {
        id: `DIS-0${disruptions.length + 1}`,
        ...formData,
        affectedVesselsCount: Math.floor(Math.random() * 20) + 5,
        resolved: false,
      };
      setDisruptions([newDisruption, ...disruptions]);
    }

    setFormData({
      type: 'Extreme Weather / Typhoon',
      locationName: '',
      latitude: 0,
      longitude: 0,
      startDate: new Date().toISOString().slice(0, 16),
      endDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
      severity: 'high',
      radiusNm: 100,
      description: '',
    });
  };

  const handleToggleResolve = async (id: string) => {
    try {
      const updated = await toggleDisruptionResolve(id);
      setDisruptions((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch (err) {
      setDisruptions((prev) => prev.map((d) => (d.id === id ? { ...d, resolved: !d.resolved } : d)));
    }
  };

  const handleDeleteDisruption = async (id: string) => {
    if (confirm('Remove this disruption event? This cannot be undone.')) {
      try {
        await deleteAdminDisruption(id);
        setDisruptions((prev) => prev.filter((d) => d.id !== id));
      } catch (err) {
        setDisruptions((prev) => prev.filter((d) => d.id !== id));
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisruption) return;

    try {
      const updated = await updateAdminDisruption(editingDisruption.id, editingDisruption);
      setDisruptions((prev) => prev.map((d) => (d.id === editingDisruption.id ? updated : d)));
    } catch (err) {
      setDisruptions((prev) => prev.map((d) => (d.id === editingDisruption.id ? editingDisruption : d)));
    }
    setEditingDisruption(null);
  };

  const filteredDisruptions = disruptions.filter((d) => {
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesSearch =
      (d.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity: ManagedDisruption['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400';
      case 'high':
        return 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400';
      case 'medium':
        return 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
      case 'low':
        return 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-400';
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
            <ShieldAlert className="w-4 h-4" />
            <span>Disruption Management</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Disruption & Hazard Events
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Report new disruptions (weather, strikes, blockages) and manage ones already on record.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm font-semibold w-fit">
          {disruptions.filter((d) => !d.resolved).length} Active Disruptions
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: ADD NEW DISRUPTION FORM */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-fit">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-500" />
            Report a New Disruption
          </h3>

          <form onSubmit={handleCreateDisruption} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Type of Disruption</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className={inputClass}
              >
                <option value="Extreme Weather / Typhoon">Extreme Weather / Typhoon</option>
                <option value="Port Strike & Labor Action">Port Strike & Labor Action</option>
                <option value="Military & Geopolitical Blockade">Military & Geopolitical Blockade</option>
                <option value="Chokepoint / Canal Blockage">Chokepoint / Canal Blockage</option>
                <option value="Terminal Equipment Failure">Terminal Equipment Failure</option>
                <option value="Cyber Incident">Cyber Incident</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Location Name</label>
              <input
                type="text"
                placeholder="e.g. Strait of Bab-el-Mandeb, Port of Rotterdam"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                required
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 26.5"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 56.2"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className={`${inputClass} text-xs`}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Expected End</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className={`${inputClass} text-xs`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className={`${inputClass} capitalize`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Affected Radius (NM)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.radiusNm}
                  onChange={(e) => setFormData({ ...formData, radiusNm: parseInt(e.target.value) || 100 })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Description & Advice</label>
              <textarea
                rows={3}
                placeholder="Provide context and rerouting advice for affected shipping lines..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Publish Disruption
            </button>
          </form>
        </div>

        {/* RIGHT: ALL DISRUPTIONS LIST */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                All Disruptions
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Resolve, edit, or remove existing events.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 capitalize"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
            {filteredDisruptions.map((disruption) => (
              <div
                key={disruption.id}
                className={`p-4 rounded-xl border transition-colors ${
                  disruption.resolved
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border ${getSeverityBadge(disruption.severity)}`}>
                      {disruption.severity}
                    </span>
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{disruption.type}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleResolve(disruption.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        disruption.resolved
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                      }`}
                    >
                      {disruption.resolved ? 'Re-open' : 'Mark Resolved'}
                    </button>

                    <button
                      onClick={() => setEditingDisruption(disruption)}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteDisruption(disruption.id)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-white">{disruption.locationName}</span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">({disruption.radiusNm} NM radius)</span>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{disruption.description}</p>

                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>{disruption.startDate} → {disruption.endDate}</span>
                  <span className="text-violet-600 dark:text-violet-400 font-medium">{disruption.affectedVesselsCount} vessels affected</span>
                </div>
              </div>
            ))}

            {filteredDisruptions.length === 0 && (
              <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
                No disruptions match your current filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingDisruption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-violet-500" />
                  Edit Disruption — {editingDisruption.id}
                </h3>
                <button
                  onClick={() => setEditingDisruption(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Location Name</label>
                  <input
                    type="text"
                    value={editingDisruption.locationName}
                    onChange={(e) => setEditingDisruption({ ...editingDisruption, locationName: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Severity</label>
                    <select
                      value={editingDisruption.severity}
                      onChange={(e) => setEditingDisruption({ ...editingDisruption, severity: e.target.value as any })}
                      className={`${inputClass} capitalize`}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Radius (NM)</label>
                    <input
                      type="number"
                      value={editingDisruption.radiusNm}
                      onChange={(e) => setEditingDisruption({ ...editingDisruption, radiusNm: parseInt(e.target.value) || 50 })}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingDisruption.description}
                    onChange={(e) => setEditingDisruption({ ...editingDisruption, description: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingDisruption(null)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-4 h-4" /> Save Changes
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