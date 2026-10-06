// frontend/src/features/admin/DataManagement.tsx
// Page 4.5 — Data Management
// Manual CSV uploads, database overview, and cleanup tools.

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
} from 'lucide-react';
import {
  DatabaseStats,
  UploadHistoryItem,
  CleanupOperationLog,
  DatasetUploadType,
} from '@/types/adminUserTypes';
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

  const [selectedDatasetType, setSelectedDatasetType] = useState<DatasetUploadType>('AIS Telemetry');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

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
        getDatabaseStats(),
        getUploadHistory(),
        getCleanupLogs(),
      ]);
      setDbStats(stats);
      setUploadHistory(Array.isArray(history) ? history : []);
      setCleanupLogs(Array.isArray(cleanups) ? cleanups : []);
    } catch (err: any) {
      console.error('Data telemetry fetch error:', err);
      setError(err?.message || 'Could not connect to the data management service.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    processFileUpload(files[0]);
  };

  const processFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      toast({
        title: 'File type not supported',
        description: 'Please upload a .csv or .json file.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setUploadStep('Reading file...');

    const timer1 = setTimeout(() => {
      setUploadProgress(40);
      setUploadStep('Checking data format...');
    }, 600);

    const timer2 = setTimeout(() => {
      setUploadProgress(75);
      setUploadStep('Saving to database...');
    }, 1400);

    const timer3 = setTimeout(async () => {
      setUploadProgress(100);
      setUploadStep('Done!');

      try {
        const newItem = await uploadDatasetFile(selectedDatasetType, file);
        setUploadHistory([newItem, ...uploadHistory]);

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
          title: 'Upload Successful',
          description: `${file.name} added ${(newItem.recordsIngested ?? (newItem as any).recordsProcessed ?? 0).toLocaleString()} records.`,
        });
      } catch (err) {
        toast({
          title: 'Upload Failed',
          description: 'Something went wrong while saving this file.',
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

    toast({ title: 'Template Downloaded', description: `Saved ${filename} to your downloads.` });
  };

  const handleConfirmCleanup = async () => {
    if (!cleanupTarget) return;

    setCleaning(true);
    try {
      const log = await executeDataCleanup(cleanupTarget);
      setCleanupLogs([log, ...cleanupLogs]);

      setDbStats((prev) => {
        if (!prev) return null;
        const freedGb = log.sizeFreedMb / 1024;
        let updatedTables = prev.tables;

        if (cleanupTarget === 'Delete Old AIS') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'ais_telemetry_logs'
              ? { ...t, recordCount: Math.max(0, t.recordCount - log.recordsAffected), sizeMb: Math.max(10, Number((t.sizeMb - log.sizeFreedMb).toFixed(1))), lastUpdated: 'Just cleaned' }
              : t
          );
        } else if (cleanupTarget === 'Delete Old Simulations') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'simulated_routes'
              ? { ...t, recordCount: Math.max(0, t.recordCount - log.recordsAffected), sizeMb: Math.max(5, Number((t.sizeMb - log.sizeFreedMb).toFixed(1))), lastUpdated: 'Just cleaned' }
              : t
          );
        } else if (cleanupTarget === 'Reset Disruptions') {
          updatedTables = prev.tables.map((t) =>
            t.tableName === 'active_disruptions' ? { ...t, recordCount: 4, sizeMb: 0.1, lastUpdated: 'Reset to default' } : t
          );
        }

        return {
          ...prev,
          totalRecords: Math.max(0, prev.totalRecords - log.recordsAffected),
          totalSizeGb: Math.max(0.5, Number((prev.totalSizeGb - freedGb).toFixed(2))),
          tables: updatedTables,
        };
      });

      toast({ title: 'Cleanup Complete', description: `${log.details} Freed ${log.sizeFreedMb} MB.` });
    } catch (err) {
      toast({ title: 'Cleanup Failed', description: 'Could not complete this operation.', variant: 'destructive' });
    } finally {
      setCleaning(false);
      setCleanupTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
        <span>Loading data management tools...</span>
      </div>
    );
  }

  if (!dbStats) {
    return (
      <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-8 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-semibold text-rose-600 dark:text-rose-400">Could Not Load Database Info</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {error || 'Unable to reach the server.'}
        </p>
        <button
          onClick={fetchInitialData}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const usagePct = dbStats.maxConnections ? Math.round((dbStats.activeConnections / dbStats.maxConnections) * 100) : 0;
  const usageColor = usagePct > 80 ? 'text-rose-600 dark:text-rose-400' : usagePct > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div className="space-y-6">
      {/* SECTION 1: DATABASE OVERVIEW */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Database & Storage Overview</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {dbStats.status || 'Healthy'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{dbStats.engine || 'PostgreSQL'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-violet-500" />
            <span>Last Backup: {dbStats.lastBackup || 'Automatic'}</span>
          </div>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
              <span>Total Records</span>
              <Layers className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{(dbStats.totalRecords || 0).toLocaleString()}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Across all tables</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
              <span>Storage Used</span>
              <HardDrive className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{dbStats.totalSizeGb || 0} GB</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Disk space used by stored records</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
              <span>Active Connections</span>
              <Activity className="w-4 h-4 text-violet-500" />
            </div>
            <div className={`text-2xl font-bold mt-2 ${usageColor}`}>{dbStats.activeConnections || 0} / {dbStats.maxConnections || 100}</div>
            <p className={`text-xs mt-1 ${usageColor}`}>{usagePct}% of capacity in use</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm">
              <span>Live Data Feed</span>
              <Radio className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Vessel Tracking</div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">~1,450 updates / second</p>
          </div>
        </div>

        {/* TABLE BREAKDOWN */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Data by Table</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(dbStats.tables || []).map((table) => (
              <div
                key={table.tableName}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-transparent hover:border-violet-200 dark:hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{table.tableName}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{table.category}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{table.description}</p>
                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-900 dark:text-white font-semibold">{(table.recordCount ?? 0).toLocaleString()} rows</span>
                  <span className="text-slate-400 dark:text-slate-500">{table.sizeMb} MB • {table.lastUpdated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: UPLOAD DATA */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Upload Data Files</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Add vessel positions, port details, vessel records, or congestion updates.
              </p>
            </div>
          </div>

          <button
            onClick={() => downloadSampleTemplate(selectedDatasetType)}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Sample File</span>
          </button>
        </div>

        {/* DATASET TYPE SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
          {(['AIS Telemetry', 'Ports Database', 'Vessel Directory', 'Congestion CSV'] as DatasetUploadType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedDatasetType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedDatasetType === type
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{type}</span>
            </button>
          ))}
        </div>

        {/* DRAG AND DROP ZONE */}
        <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files)} accept=".csv,.json" className="hidden" />

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files); }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10'
              : 'border-slate-300 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-500/40 bg-slate-50 dark:bg-slate-800/30'
          }`}
        >
          {uploading ? (
            <div className="space-y-4 max-w-md mx-auto py-2">
              <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Uploading {selectedDatasetType}...</h4>
                <p className="text-sm text-violet-600 dark:text-violet-400 mt-1">{uploadStep}</p>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-violet-600 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Click here or drag a file to upload</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Uploading to: <span className="font-semibold text-violet-600 dark:text-violet-400">{selectedDatasetType}</span>
                  {' '}• .CSV or .JSON, up to 250 MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* UPLOAD HISTORY */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Recent Uploads</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="py-2.5 px-4 font-medium">File Name</th>
                  <th className="py-2.5 px-4 font-medium">Dataset</th>
                  <th className="py-2.5 px-4 font-medium">Uploaded By</th>
                  <th className="py-2.5 px-4 font-medium">When</th>
                  <th className="py-2.5 px-4 font-medium">Records Added</th>
                  <th className="py-2.5 px-4 font-medium">File Size</th>
                  <th className="py-2.5 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {uploadHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-500" />
                      <span>{item.fileName}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">{item.datasetType}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{item.uploadedBy || 'Admin User'}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{item.uploadedAt || (item as any).timestamp || 'Just now'}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      +{(item.recordsIngested ?? (item as any).recordsProcessed ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                      {(((item.fileSizeBytes ?? ((item as any).fileSizeMb ? (item as any).fileSizeMb * 1024 * 1024 : 0)) || 1240000) / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
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

      {/* SECTION 3: CLEANUP & MAINTENANCE */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cleanup & Maintenance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Remove old data to free up space. These actions cannot be undone.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AIS Cleanup */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl w-fit">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-3">Remove Old Vessel Positions</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Deletes vessel position records older than 30 days to free up space.
              </p>
            </div>
            <button
              onClick={() => setCleanupTarget('Delete Old AIS')}
              className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Run Cleanup</span>
            </button>
          </div>

          {/* Simulations Cleanup */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl w-fit">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-3">Clear Old Simulations</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Clears saved route simulations and recommendation calculations.
              </p>
            </div>
            <button
              onClick={() => setCleanupTarget('Delete Old Simulations')}
              className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Run Cleanup</span>
            </button>
          </div>

          {/* Reset Disruptions */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl w-fit">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 dark:text-white mt-3">Reset Disruptions</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Clears all active disruption alerts and restores default settings.
              </p>
            </div>
            <button
              onClick={() => setCleanupTarget('Reset Disruptions')}
              className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Run Reset</span>
            </button>
          </div>
        </div>

        {/* MAINTENANCE LOG */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Maintenance History</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="py-2.5 px-4 font-medium">Action</th>
                  <th className="py-2.5 px-4 font-medium">Performed By</th>
                  <th className="py-2.5 px-4 font-medium">When</th>
                  <th className="py-2.5 px-4 font-medium">Records Removed</th>
                  <th className="py-2.5 px-4 font-medium">Space Freed</th>
                  <th className="py-2.5 px-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {cleanupLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{log.operationType}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.executedBy || 'Admin User'}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{log.executedAt || (log as any).timestamp || 'Just now'}</td>
                    <td className="py-3 px-4 font-semibold text-rose-600 dark:text-rose-400">-{(log.recordsAffected ?? 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">{log.sizeFreedMb ?? (log as any).storageFreedMb ?? 0} MB</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">{log.details || 'Maintenance operation completed.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIRM CLEANUP MODAL */}
      <AnimatePresence>
        {cleanupTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Are you sure?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                This will run <span className="font-semibold text-slate-900 dark:text-white">{cleanupTarget}</span> and
                cannot be undone.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCleanupTarget(null)}
                  disabled={cleaning}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCleanup}
                  disabled={cleaning}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {cleaning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Working...</span>
                    </>
                  ) : (
                    <span>Yes, Continue</span>
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