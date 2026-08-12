// frontend/src/types/adminUserTypes.ts

export type UserRole = 'Admin' | 'Port Manager' | 'Logistics Manager' | 'Analyst' | 'Viewer';

export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin: string;
  status: UserStatus;
  createdAt: string;
  avatarUrl?: string;
  assignedPort?: string;
  department?: string;
  phone?: string;
}

export type DatasetUploadType = 'AIS Telemetry' | 'Ports Database' | 'Vessel Directory' | 'Congestion CSV';

export interface TableStat {
  tableName: string;
  description: string;
  recordCount: number;
  sizeMb: number;
  lastUpdated: string;
  category: 'Telemetry' | 'Core Entities' | 'Analytics' | 'System';
}

export interface DatabaseStats {
  totalRecords: number;
  totalSizeGb: number;
  engine: string;
  status: 'Healthy' | 'Degraded' | 'Maintenance';
  activeConnections: number;
  maxConnections: number;
  lastBackup: string;
  tables: TableStat[];
}

export interface UploadHistoryItem {
  id: string;
  fileName: string;
  datasetType: DatasetUploadType;
  uploadedBy: string;
  uploadedAt: string;
  recordsIngested: number;
  fileSizeBytes: number;
  status: 'Success' | 'Failed' | 'Processing';
  errorMessage?: string;
}

export interface CleanupOperationLog {
  id: string;
  operationType: 'Delete Old AIS' | 'Delete Old Simulations' | 'Reset Disruptions';
  executedBy: string;
  executedAt: string;
  recordsAffected: number;
  sizeFreedMb: number;
  details: string;
}
