// localStorage helpers for outbox queue

import { OfflineRecord, OfflineRecordStatus } from "./types";

const OUTBOX_KEY = "gulupa_offline_outbox";
const OUTBOX_EVENT = "offline-outbox-changed";

function emitOutboxChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OUTBOX_EVENT));
}

function inferRecordId(payload: unknown) {
  if (payload && typeof payload === "object" && "id" in payload) {
    const value = (payload as { id?: unknown }).id;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

function getAll(): OfflineRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: OfflineRecord[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(OUTBOX_KEY, JSON.stringify(records));
  emitOutboxChange();
}

export function addToOutbox<T>(
  module: OfflineRecord["module"],
  payload: T,
  meta?: { userId?: string | null; recordId?: string }
): OfflineRecord<T> {
  const now = Date.now();

  const record: OfflineRecord<T> = {
    localId: crypto.randomUUID(),
    recordId: meta?.recordId ?? inferRecordId(payload),
    module,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    userId: meta?.userId ?? null,
    attempts: 0,
    payload,
  };

  const all = getAll();
  all.push(record as OfflineRecord);
  saveAll(all);
  return record;
}

export function getPendingRecords(
  module?: OfflineRecord["module"]
): OfflineRecord[] {
  const all = getAll();
  return all.filter(
    (r) =>
      ["draft", "pending", "error"].includes(r.status) &&
      (!module || r.module === module)
  );
}

export function getAllRecords(): OfflineRecord[] {
  return getAll();
}

export function updateRecordStatus(
  localId: string,
  status: OfflineRecordStatus,
  extra?: Partial<OfflineRecord>
) {
  const all = getAll();
  const idx = all.findIndex((r) => r.localId === localId);
  if (idx < 0) return;

  const current = all[idx];
  const now = Date.now();
  const nextAttempts =
    status === "syncing"
      ? Math.max((current.attempts ?? 0) + 1, extra?.attempts ?? 0)
      : (extra?.attempts ?? current.attempts ?? 0);

  all[idx] = {
    ...current,
    ...extra,
    status,
    attempts: nextAttempts,
    updatedAt: now,
    lastAttemptAt:
      status === "syncing"
        ? extra?.lastAttemptAt ?? now
        : extra?.lastAttemptAt ?? current.lastAttemptAt,
    syncedAt:
      status === "synced"
        ? extra?.syncedAt ?? now
        : extra?.syncedAt ?? current.syncedAt,
  };

  saveAll(all);
}

export function removeRecord(localId: string) {
  const all = getAll();
  saveAll(all.filter((r) => r.localId !== localId));
}

export function clearSynced() {
  const all = getAll();
  saveAll(all.filter((r) => r.status !== "synced"));
}

export const OFFLINE_OUTBOX_EVENT = OUTBOX_EVENT;
