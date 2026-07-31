// frontend/src/features/admin/DisruptionManagement.tsx
// Page 4.2 — Disruption Management
// Left: Add New Disruption form (type, location, start/end, severity, description, radius).
// Right: All disruptions table with CRUD, filtering, resolve toggle.

import React, { useState } from 'react';
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
import { INITIAL_DISRUPTIONS, ManagedDisruption } from '@/shared/mock/adminMockData';

export const DisruptionManagement: React.FC = () => {
  const [disruptions, setDisruptions] = useState<ManagedDisruption[]>(INITIAL_DISRUPTIONS);

  // Form State for Adding Disruption
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

  // Edit Modal State
  const [editingDisruption, setEditingDisruption] = useState<ManagedDisruption | null>(null);

  // Filters State
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle Form Submit (Add Disruption)
  const handleCreateDisruption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationName || !formData.description) return;

    const newDisruption: ManagedDisruption = {
      id: `DIS-0${disruptions.length + 1}`,
      ...formData,
      affectedVesselsCount: Math.floor(Math.random() * 20) + 5,
      resolved: false,
    };

    setDisruptions([newDisruption, ...disruptions]);

    // Reset Form
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

  // Toggle Resolve State
  const handleToggleResolve = (id: string) => {
    setDisruptions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, resolved: !d.resolved } : d))
    );
  };

  // Delete Disruption
  const handleDeleteDisruption = (id: string) => {
    if (confirm('Are you sure you want to remove this disruption event?')) {
      setDisruptions((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDisruption) return;

    setDisruptions((prev) =>
      prev.map((d) => (d.id === editingDisruption.id ? editingDisruption : d))
    );
    setEditingDisruption(null);
  };

  // Filtered Disruptions
  const filteredDisruptions = disruptions.filter((d) => {
    const matchesSeverity = severityFilter === 'all' || d.severity === severityFilter;
    const matchesSearch =
      d.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity: ManagedDisruption['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 border-red-500/40 text-red-300';
      case 'high':
        return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200';
      case 'low':
        return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    }
  };

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100 transition-colors">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-600 dark:text-amber-400 mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>PAGE 4.2 • MARITIME DISRUPTION MANAGEMENT</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Disruption Control & Zone Alerts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Declare new weather, military, or port strike disruptions, update geo-radius zones, and manage live rerouting triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold">
            {disruptions.filter((d) => !d.resolved).length} ACTIVE DISRUPTIONS
          </div>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT (FORM LEFT, TABLE RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ======== LEFT: ADD NEW DISRUPTION FORM (4 cols) ======== */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-2xl h-fit">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Add New Disruption Event
          </h3>

          <form onSubmit={handleCreateDisruption} className="space-y-4 text-xs">
            {/* Disruption Type */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Disruption Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50"
              >
                <option value="Extreme Weather / Typhoon">Extreme Weather / Typhoon</option>
                <option value="Port Strike & Labor Action">Port Strike & Labor Action</option>
                <option value="Military & Geopolitical Blockade">Military & Geopolitical Blockade</option>
                <option value="Chokepoint / Canal Blockage">Chokepoint / Canal Blockage</option>
                <option value="Terminal Equipment Failure">Terminal Equipment Failure</option>
                <option value="Cyber Incident">Cyber Incident</option>
              </select>
            </div>

            {/* Location Name */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Location / Chokepoint Name</label>
              <input
                type="text"
                placeholder="e.g. Strait of Bab-el-Mandeb, Port of Rotterdam"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Coordinates (Lat / Lon) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Latitude (°N/S)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 26.5"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Longitude (°E/W)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 56.2"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>
            </div>

            {/* Dates (Start / End) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Estimated End</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Severity & Radius */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Severity Level</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Radius (Nautical Miles)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={formData.radiusNm}
                  onChange={(e) => setFormData({ ...formData, radiusNm: parseInt(e.target.value) || 100 })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50 font-mono"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Description & Impact Advice</label>
              <textarea
                rows={3}
                placeholder="Provide detailed context, rerouting advice, and affected shipping lines..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Publish Disruption Event
            </button>
          </form>
        </div>

        {/* ======== RIGHT: ALL DISRUPTIONS TABLE (7 cols) ======== */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Active & Archived Disruptions
                </h3>
                <p className="text-xs text-slate-400">Manage disruption severity, toggle active/resolved state, or delete events.</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none capitalize"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <input
                  type="text"
                  placeholder="Search disruptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredDisruptions.map((disruption) => (
                <div
                  key={disruption.id}
                  className={`p-4 rounded-xl border transition-all ${
                    disruption.resolved
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(disruption.severity)}`}>
                        {disruption.severity}
                      </span>
                      <h4 className="font-bold text-white text-sm">{disruption.type}</h4>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(disruption.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                          disruption.resolved
                            ? 'bg-slate-800 text-slate-400 hover:text-white'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                      >
                        {disruption.resolved ? 'Re-open' : '✓ Mark Resolved'}
                      </button>

                      <button
                        onClick={() => setEditingDisruption(disruption)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit Disruption"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteDisruption(disruption.id)}
                        className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                        title="Delete Disruption"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-semibold text-white">{disruption.locationName}</span>
                    <span className="text-slate-500 font-mono text-[11px]">({disruption.radiusNm} NM Radius)</span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{disruption.description}</p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-800/60 pt-2">
                    <span>Active: {disruption.startDate} → {disruption.endDate}</span>
                    <span className="text-cyan-400 font-semibold">{disruption.affectedVesselsCount} Vessels Affected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingDisruption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-amber-400" />
                  Edit Disruption #{editingDisruption.id}
                </h3>
                <button
                  onClick={() => setEditingDisruption(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Location Name</label>
                  <input
                    type="text"
                    value={editingDisruption.locationName}
                    onChange={(e) => setEditingDisruption({ ...editingDisruption, locationName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Severity</label>
                    <select
                      value={editingDisruption.severity}
                      onChange={(e) => setEditingDisruption({ ...editingDisruption, severity: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white capitalize"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Radius (NM)</label>
                    <input
                      type="number"
                      value={editingDisruption.radiusNm}
                      onChange={(e) => setEditingDisruption({ ...editingDisruption, radiusNm: parseInt(e.target.value) || 50 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editingDisruption.description}
                    onChange={(e) => setEditingDisruption({ ...editingDisruption, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingDisruption(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 flex items-center gap-1.5"
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
