// Offline-first types for queue / outbox

export type OfflineRecordStatus = "draft" | "pending" | "syncing" | "synced" | "error";

export interface OfflineRecord<T = unknown> {
  /** UUID generated for the outbox entry */
  localId: string;
  /** Stable client-generated id for the target record */
  recordId?: string;
  /** Module that owns this record */
  module: "tasks" | "harvests" | "applications" | "pest_reports";
  /** Timestamp when created locally */
  createdAt: number;
  /** Timestamp when metadata/status last changed */
  updatedAt: number;
  /** Current status */
  status: OfflineRecordStatus;
  /** Local user for traceability */
  userId?: string | null;
  /** Retry attempts */
  attempts: number;
  /** Timestamp of latest sync attempt */
  lastAttemptAt?: number;
  /** Timestamp when sync completed */
  syncedAt?: number;
  /** Optional error message from last sync attempt */
  lastError?: string;
  /** Payload to sync */
  payload: T;
  /** Optional remote id once synced */
  remoteId?: string;
}

export interface OfflineState {
  /** True if online */
  isOnline: boolean;
  /** True while any sync is in flight */
  isSyncing: boolean;
  /** Count of pending records in queue */
  pendingCount: number;
}
