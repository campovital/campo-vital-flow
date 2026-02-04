// Sync engine that flushes pending outbox records when online

import { supabase } from "@/integrations/supabase/client";
import { OfflineRecord } from "./types";
import {
  getPendingRecords,
  updateRecordStatus,
  removeRecord,
} from "./storage";

type SyncResult = { success: boolean; remoteId?: string; error?: string };

async function syncRecord(record: OfflineRecord): Promise<SyncResult> {
  try {
    switch (record.module) {
      case "tasks": {
        const payload = record.payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("tasks")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        return { success: true, remoteId: data?.id };
      }
      case "harvests": {
        const payload = record.payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("harvests")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        return { success: true, remoteId: data?.id };
      }
      case "applications": {
        const payload = record.payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("applications")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        return { success: true, remoteId: data?.id };
      }
      case "pest_reports": {
        const payload = record.payload as Record<string, unknown>;
        const { data, error } = await supabase
          .from("pest_reports")
          .insert(payload as any)
          .select("id")
          .single();
        if (error) throw error;
        return { success: true, remoteId: data?.id };
      }
      default:
        return { success: false, error: "Unknown module" };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function flushPendingRecords(
  onProgress?: (current: number, total: number) => void
): Promise<{ synced: number; failed: number; modules: string[] }> {
  const pending = getPendingRecords();
  let synced = 0;
  let failed = 0;
  const syncedModules = new Set<string>();

  for (let i = 0; i < pending.length; i++) {
    const rec = pending[i];
    updateRecordStatus(rec.localId, "syncing");
    const result = await syncRecord(rec);
    if (result.success) {
      removeRecord(rec.localId);
      synced++;
      syncedModules.add(rec.module);
    } else {
      updateRecordStatus(rec.localId, "error", { lastError: result.error });
      failed++;
    }
    onProgress?.(i + 1, pending.length);
  }

  return { synced, failed, modules: Array.from(syncedModules) };
}
