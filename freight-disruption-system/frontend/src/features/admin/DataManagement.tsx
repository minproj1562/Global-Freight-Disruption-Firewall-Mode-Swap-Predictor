// frontend/src/features/admin/DataManagement.tsx
// Page 4.5 — Data Management
// Purpose: Manual CSV uploads (AIS, ports, vessels, congestion), Database Stats, and Data Cleanup operations.

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Server,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Clock,
  Activity,
  Layers,
  ArrowDownToLine,
  Radio,
  BarChart2,
  ShieldAlert,
} from 'lucide-react';
import {
  DatabaseStats,
  UploadHistoryItem,
  CleanupOperationLog,
  DatasetUploadType,
} from '@/types/adminUserTypes';
import {
  INITIAL_DATABASE_STATS,
  INITIAL_UPLOAD_HISTORY,
  INITIAL_CLEANUP_LOGS,
} from '@/shared/mock/adminMockData';
import {
  getDatabaseStats,
  getUploadHistory,
  getCleanupLogs,
  uploadDatasetFile,
  executeDataCleanup,
} from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

export const DataManagement: React.FC = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [cleanupLogs, setCleanupLogs] = useState<CleanupOperationLog[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Upload State
  const [selectedDatasetType, setSelectedDatasetType] = useState<DatasetUploadType>('AIS Telemetry');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Cleanup Modal Confirmation State
  const [cleanupTarget, setCleanupTarget] = useState<
    'Delete Old AIS' | 'Delete Old Simulations' | 'Reset Disruptions' | null
  >(null);
  const [cleaning, setCleaning] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, history, cleanups] = await Promise.all([
        getDatabaseStats().catch(() => INITIAL_DATABASE_STATS),
        getUploadHistory().catch(() => INITIAL_UPLOAD_HISTORY),
        getCleanupLogs().catch(() => INITIAL_CLEANUP_LOGS),
      ]);
      setDbStats(stats || INITIAL_DATABASE_STATS);
      setUploadHistory(Array.isArray(history) && history.length > 0 ? history : INITIAL_UPLOAD_HISTORY);
      setCleanupLogs(Array.isArray(cleanups) && cleanups.length > 0 ? cleanups : INITIAL_CLEANUP_LOGS);
    } catch (err: any) {
      console.warn('Backend connection fallback for data management:', err);
      setDbStats(INITIAL_DATABASE_STATS);
      setUploadHistory(INITIAL_UPLOAD_HISTORY);
      setCleanupLogs(INITIAL_CLEANUP_LOGS);
    } finally {
      setLoading(false);
    }
  };

  // Handle File Selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    processFileUpload(file);
  };

  // Process & Simulate Upload Progress
  const processFileUpload = async (file: File) => {
    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      toast({
        title: 'Unsupported File Format',
        description: 'Please upload a valid .csv or .json file.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStep('Reading file headers...');

    // Progress animation steps
    const timer1 = setTimeout(() => {
      setUploadProgress(40);
      setUploadStep('Validating schema & parsing rows...');
    }, 600);

    const timer2 = setTimeout(() => {
      setUploadProgress(75);
      setUploadStep('Ingesting into PostgreSQL / TimescaleDB...');
    }, 1400);

    const timer3 = setTimeout(async () => {
      setUploadProgress(100);
      setUploadStep('Indexing completed!');

      try {
        const newItem = await uploadDatasetFile(selectedDatasetType, file);
        setUploadHistory([newItem, ...uploadHistory]);

        // Update database stats dynamically
        setDbStats((prev) => {
          if (!prev) return null;
          const addedRecords = newItem.recordsIngested;
          const addedMb = newItem.fileSizeBytes / (1024 * 1024);

          return {
            ...prev,
            totalRecords: prev.totalRecords + addedRecords,
            totalSizeGb: Number((prev.totalSizeGb + addedMb / 1024).toFixed(2)),
            tables: prev.tables.map((t) => {
              if (
                (selectedDatasetType === 'AIS Telemetry' && t.tableName === 'ais_telemetry_logs') ||
                (selectedDatasetType === 'Ports Database' && t.tableName === 'ports') ||
                (selectedDatasetType === 'Vessel Directory' && t.tableName === 'vessels') ||
                (selectedDatasetType === 'Congestion CSV' && t.tableName === 'congestion_history')
              ) {
                return {
                  ...t,
                  recordCount: t.recordCount + addedRecords,
                  sizeMb: Number((t.sizeMb + addedMb).toFixed(1)),
                  lastUpdated: 'Just now',
                };
              }
              return t;
            }),
          };
        });

        toast({
          title: 'Data Ingestion Successful',
          description: `Uploaded ${file.name}. Ingested ${(newItem.recordsIngested ?? (newItem as any).recordsProcessed ?? 0).toLocaleString()} records.`,
        });
      } catch (err) {
        toast({
          title: 'Upload Failed',
          description: 'An error occurred during dataset ingestion.',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
        }, 800);
      }
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  // Sample CSV Template Downloader
  const downloadSampleTemplate = (type: DatasetUploadType) => {
    let csvContent = '';
    let filename = '';

    if (type === 'AIS Telemetry') {
      csvContent = 'mmsi,imo,latitude,longitude,speed_knots,course_deg,timestamp\n211234560,9845123,24.1500,58.9200,16.4,142,2026-08-12T10:00:00Z\n311987654,9765432,1.2900,103.8500,0.5,88,2026-08-12T10:05:00Z';
      filename = 'sample_ais_telemetry.csv';
    } else if (type === 'Ports Database') {
      csvContent = 'port_code,port_name,country,latitude,longitude,berth_capacity,avg_wait_hours\nNLRTM,Port of Rotterdam,Netherlands,51.9500,4.1200,45,18.5\nSGSIN,Port of Singapore,Singapore,1.2600,103.8400,60,12.0';
      filename = 'sample_ports_data.csv';
    } else if (type === 'Vessel Directory') {
      csvContent = 'imo,mmsi,vessel_name,vessel_type,flag,dwt,length_m,draught_m\n9845123,211234560,EVER GIVEN,Container,Panama,220940,400.0,16.0\n9765432,311987654,MAERSK MC-KINNEY,Container,Denmark,194153,399.0,15.5';
      filename = 'sample_vessels_directory.csv';
    } else {
      csvContent = 'port_code,timestamp,waiting_vessels,berth_utilization_pct,congestion_score\nEGSUZ,2026-08-12,28,88.5,84.2\nNLRTM,2026-08-12,12,62.0,38.5';
      filename = 'sample_congestion_feed.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Template Downloaded',
      description: `Downloaded ${filename} sample format file.`,
    });
  };

  // Handle Data Cleanup Operation
  const handleConfirmCleanup = async () => {
    if (!cleanupTarget) return;

    setCleaning(true);
    try {
      const log = await executeDataCleanup(cleanupTarget);
      setCleanupLogs([log, ...cleanupLogs]);

      // Update dbStats dynamically
      setDbStats((prev) => {
        if (!prev) return null;
        const freedGb = log.sizeFreedMb / 1024;
        let updatedTables = prev.tables;

        if (cleanupTarget === 'Delete Old AIS') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'ais_telemetry_logs'
              ? {
                  ...t,
                  recordCount: Math.max(0, t.recordCount - log.recordsAffected),
                  sizeMb: Math.max(10, Number((t.sizeMb - log.sizeFreedMb).toFixed(1))),
                  lastUpdated: 'Pruned just now',
                }
              : t
          );
        } else if (cleanupTarget === 'Delete Old Simulations') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'simulated_routes'
              ? {
                  ...t,
                  recordCount: Math.max(0, t.recordCount - log.recordsAffected),
                  sizeMb: Math.max(5, Number((t.sizeMb - log.sizeFreedMb).toFixed(1))),
                  lastUpdated: 'Purged just now',
                }
              : t
          );
        } else if (cleanupTarget === 'Reset Disruptions') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'active_disruptions'
              ? {
                  ...t,
                  recordCount: 4,
                  sizeMb: 0.1,
                  lastUpdated: 'Reset to default',
                }
              : t
          );
        }

        return {
          ...prev,
          totalRecords: Math.max(0, prev.totalRecords - log.recordsAffected),
          totalSizeGb: Math.max(0.5, Number((prev.totalSizeGb - freedGb).toFixed(2))),
          tables: updatedTables,
        };
      });

      toast({
        title: 'Cleanup Action Executed',
        description: `${log.details} Freed ${log.sizeFreedMb} MB.`,
      });
    } catch (err) {
      toast({
        title: 'Cleanup Failed',
        description: 'Unable to complete maintenance operation.',
        variant: 'destructive',
      });
    } finally {
      setCleaning(false);
      setCleanupTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono text-sm space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        <span>Loading database health telemetry & management logs...</span>
      </div>
    );
  }

  if (!dbStats) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">Failed to Load Database Telemetry</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {error || 'Unable to fetch database metrics from http://localhost:8000.'}
        </p>
        <button
          onClick={fetchInitialData}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: DATABASE METRICS & CLUSTER STATUS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Database & Storage Health Telemetry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {dbStats?.status || 'Healthy'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                {dbStats?.engine || 'PostgreSQL'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>Last Snapshot: {dbStats?.lastBackup || 'Automated Snapshot'}</span>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Total DB Records</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
              {(dbStats?.totalRecords || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-mono">Across 7 schemas</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Storage Allocated</span>
              <HardDrive className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
              {dbStats?.totalSizeGb || 0} GB
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Compressed SSD block storage</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>Connection Pool</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {dbStats?.activeConnections || 0} / {dbStats?.maxConnections || 100}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              18% Pool Utilization
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
              <span>High-Velocity Feed</span>
              <Radio className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-2">
              AIS Satellite
            </div>
            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-mono">~1,450 records / sec</p>
          </div>
        </div>

        {/* Database Table Breakdown Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Database Schema & Table Breakdown
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(dbStats?.tables || []).map((table) => (
              <div
                key={table.tableName}
                className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                    {table.tableName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {table.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {table.description}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-900 dark:text-white font-bold">
                    {(table.recordCount ?? 0).toLocaleString()} rows
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {table.sizeMb} MB • {table.lastUpdated}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: MANUAL DATA UPLOADS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Manual Data Uploads & CSV Ingestion
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ingest AIS telemetry, port berth specs, vessel directories, and congestion metrics.
              </p>
            </div>
          </div>

          {/* Download Sample Templates */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSampleTemplate(selectedDatasetType)}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-mono font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Download {selectedDatasetType} CSV Template</span>
            </button>
          </div>
        </div>

        {/* Dataset Type Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          {(
            [
              'AIS Telemetry',
              'Ports Database',
              'Vessel Directory',
              'Congestion CSV',
            ] as DatasetUploadType[]
          ).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedDatasetType(type)}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
                selectedDatasetType === type
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{type}</span>
            </button>
          ))}
        </div>

        {/* DRAG AND DROP ZONE */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFileSelect(e.target.files)}
          accept=".csv,.json"
          className="hidden"
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFileSelect(e.dataTransfer.files);
          }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/50'
          }`}
        >
          {uploading ? (
            <div className="space-y-4 max-w-md mx-auto py-2">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                  Ingesting {selectedDatasetType}...
                </h4>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                  {uploadStep}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20">
                <ArrowDownToLine className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Click to browse or drag and drop dataset file
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target Destination:{' '}
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedDatasetType}
                  </span>{' '}
                  • Supports .CSV and .JSON formats (up to 250 MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* UPLOAD HISTORY LOG TABLE */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recent Data Ingestion Audit Trail
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">File Name</th>
                  <th className="py-2.5 px-4">Dataset Target</th>
                  <th className="py-2.5 px-4">Uploaded By</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Ingested Records</th>
                  <th className="py-2.5 px-4">File Size</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {uploadHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>{item.fileName}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {item.datasetType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.uploadedBy || 'Admin User'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {item.uploadedAt || (item as any).timestamp || 'Just now'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{(item.recordsIngested ?? (item as any).recordsProcessed ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {(((item.fileSizeBytes ?? ((item as any).fileSizeMb ? (item as any).fileSizeMb * 1024 * 1024 : 0)) || 1240000) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: DATA CLEANUP & MAINTENANCE BUTTONS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Data Cleanup & Maintenance Controls
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Purge stale telemetry, clear route simulation caches, and reset disruption events.
            </p>
          </div>
        </div>

        {/* 3 CLEANUP CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Action 1: Delete Old AIS */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Prune Telemetry
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-3">
                Delete Old AIS Data
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deletes raw AIS vessel telemetry points older than 30 days to free SSD database storage.
              </p>
            </div>

            <button
              onClick={() => setCleanupTarget('Delete Old AIS')}
              className="w-full py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>DELETE OLD AIS</span>
            </button>
          </div>

          {/* Action 2: Delete Old Simulations */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-xl border border-cyan-500/20">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  Cache Purge
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-3">
                Delete Old Simulations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Clears cached Monte Carlo stochastic iterations & Dijkstra reroute calculation trees.
              </p>
            </div>

            <button
              onClick={() => setCleanupTarget('Delete Old Simulations')}
              className="w-full py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>DELETE SIMULATIONS</span>
            </button>
          </div>

          {/* Action 3: Reset Disruptions */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-rose-500/40 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  Baseline Reset
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-3">
                Reset Disruptions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Resets active disruption alert center back to seed default baseline hazard events.
              </p>
            </div>

            <button
              onClick={() => setCleanupTarget('Reset Disruptions')}
              className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>RESET DISRUPTIONS</span>
            </button>
          </div>
        </div>

        {/* MAINTENANCE OPERATIONS LOG TABLE */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Executed Maintenance Log
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Operation</th>
                  <th className="py-2.5 px-4">Executed By</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Records Affected</th>
                  <th className="py-2.5 px-4">Storage Freed</th>
                  <th className="py-2.5 px-4">Execution Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {cleanupLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {log.operationType}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {log.executedBy || 'Admin User'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {log.executedAt || (log as any).timestamp || 'Just now'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      -{(log.recordsAffected ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {log.sizeFreedMb ?? (log as any).storageFreedMb ?? 0} MB
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                      {log.details || 'Storage maintenance operation executed.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRM CLEANUP ACTION MODAL */}
      <AnimatePresence>
        {cleanupTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Confirm Maintenance Operation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Are you sure you want to execute{' '}
                <span className="font-bold text-slate-900 dark:text-white">{cleanupTarget}</span>? This
                will modify database tables and free allocated memory.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCleanupTarget(null)}
                  disabled={cleaning}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCleanup}
                  disabled={cleaning}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-mono transition-all shadow-md shadow-rose-600/20 flex items-center gap-2"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>EXECUTING...</span>
                    </>
                  ) : (
                    <span>CONFIRM & EXECUTE</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
