import React from 'react';

export const ExecutiveSummarySkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* ROI Hero Skeleton */}
      <div className="w-full h-32 bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer flex items-center justify-around p-6">
        <div className="h-16 w-1/3 bg-stone-300 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-16 w-1/3 bg-stone-300 dark:bg-slate-700 rounded-lg"></div>
      </div>

      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-28 bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer p-4 flex flex-col justify-between">
            <div className="h-4 w-1/2 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-8 w-3/4 bg-stone-300 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer p-4 flex flex-col space-y-4">
             <div className="h-6 w-1/3 bg-stone-300 dark:bg-slate-700 rounded"></div>
             <div className="flex-1 bg-stone-300 dark:bg-slate-700 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Risk Matrix Skeleton */}
      <div className="w-full h-80 bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer p-6 flex flex-col space-y-4">
        <div className="h-6 w-1/4 bg-stone-300 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 bg-stone-300 dark:bg-slate-700 rounded-lg"></div>
      </div>

      {/* Map Skeleton */}
      <div className="w-full h-96 bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer p-6 flex flex-col space-y-4">
        <div className="h-6 w-1/4 bg-stone-300 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 bg-stone-300 dark:bg-slate-700 rounded-lg"></div>
      </div>

      {/* Table Skeleton */}
      <div className="w-full bg-stone-200 dark:bg-slate-800 rounded-2xl skeleton-shimmer overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-stone-300 dark:border-slate-700 flex items-center px-4 space-x-4">
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/3 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
        </div>
        {/* Rows */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-stone-300 dark:border-slate-700 flex items-center px-4 space-x-4">
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/3 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-1/6 bg-stone-300 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
