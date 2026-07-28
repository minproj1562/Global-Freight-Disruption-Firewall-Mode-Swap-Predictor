import React from 'react';

export const MapSkeletonLoader: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden flex flex-col justify-between p-6">
      {/* Map grid background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(#38b0f8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Shimmering Radar Circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-sky-500/20 skeleton-shimmer flex items-center justify-center">
        <div className="w-64 h-64 rounded-full border border-sky-500/10" />
      </div>

      {/* Shimmering Top Nav Placeholder */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="h-10 w-48 rounded-xl bg-slate-900/80 skeleton-shimmer border border-slate-800" />
        <div className="h-10 w-64 rounded-xl bg-slate-900/80 skeleton-shimmer border border-slate-800" />
      </div>

      {/* Shimmering KPI Strip */}
      <div className="relative z-10 w-full max-w-4xl mx-auto h-16 rounded-2xl bg-slate-900/80 skeleton-shimmer border border-slate-800" />

      {/* Floating Markers Placeholder */}
      <div className="absolute top-1/3 left-1/4 w-4 h-4 rounded-full bg-sky-500/40 animate-ping" />
      <div className="absolute top-2/3 right-1/3 w-4 h-4 rounded-full bg-amber-500/40 animate-ping" />
    </div>
  );
};

export const PanelSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      <div className="h-6 w-3/4 bg-slate-800/60 rounded-lg skeleton-shimmer" />
      <div className="h-4 w-1/2 bg-slate-800/40 rounded-lg skeleton-shimmer" />
      <div className="h-32 w-full bg-slate-900/80 rounded-xl border border-slate-800 skeleton-shimmer" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-slate-800/50 rounded skeleton-shimmer" />
        <div className="h-4 w-5/6 bg-slate-800/50 rounded skeleton-shimmer" />
        <div className="h-4 w-4/6 bg-slate-800/50 rounded skeleton-shimmer" />
      </div>
    </div>
  );
};
