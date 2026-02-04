// Offline-first types for queue / outbox

export type OfflineRecordStatus = "pending" | "syncing" | "synced" | "error";

export interface OfflineRecord<T = unknown> {
  /** UUID generated locally */
  localId: string;
  /** Module that owns this record */
  module: "tasks" | "harvests" | "applications" | "pest_reports";
  /** Timestamp when created locally */
  createdAt: number;
  /** Current status */
  status: OfflineRecordStatus;
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
