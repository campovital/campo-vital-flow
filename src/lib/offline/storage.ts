// localStorage helpers for outbox queue

import { OfflineRecord, OfflineRecordStatus } from "./types";

const OUTBOX_KEY = "gulupa_offline_outbox";

function getAll(): OfflineRecord[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineRecord[];
  } catch {
    return [];
  }
}

function saveAll(records: OfflineRecord[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(records));
}

export function addToOutbox<T>(
  module: OfflineRecord["module"],
  payload: T
): OfflineRecord<T> {
  const record: OfflineRecord<T> = {
    localId: crypto.randomUUID(),
    module,
    createdAt: Date.now(),
    status: "pending",
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
      (r.status === "pending" || r.status === "error") &&
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
  if (idx >= 0) {
    all[idx] = { ...all[idx], status, ...extra };
    saveAll(all);
  }
}

export function removeRecord(localId: string) {
  const all = getAll();
  saveAll(all.filter((r) => r.localId !== localId));
}

export function clearSynced() {
  const all = getAll();
  saveAll(all.filter((r) => r.status !== "synced"));
}
