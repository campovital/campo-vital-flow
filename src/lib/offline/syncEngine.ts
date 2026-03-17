// Sync engine that flushes pending outbox records when online

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { OfflineRecord } from "./types";
import { getPendingRecords, updateRecordStatus } from "./storage";
import { withTimeout } from "./network";

type TaskSyncPayload = TablesInsert<"tasks"> & { id?: string };
type HarvestSyncPayload = TablesInsert<"harvests"> & { id?: string };
type ApplicationProductSyncPayload = TablesInsert<"application_products"> & {
  id?: string;
};
type ApplicationSyncPayload = TablesInsert<"applications"> & {
  id?: string;
  application_products?: ApplicationProductSyncPayload[];
};
type PestReportPhotoSyncPayload = TablesInsert<"pest_report_photos"> & {
  id?: string;
};
type PestReportSyncPayload = TablesInsert<"pest_reports"> & {
  id?: string;
  pest_report_photos?: PestReportPhotoSyncPayload[];
};

type SyncResult = { success: boolean; remoteId?: string; error?: string };

function isDuplicateError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return normalized.includes("duplicate") || normalized.includes("unique");
}

async function insertOrConfirmExisting(
  table:
    | "tasks"
    | "harvests"
    | "applications"
    | "pest_reports"
    | "application_products"
    | "pest_report_photos",
  payload: Record<string, unknown>,
  id: string
) {
  const insertResult = await withTimeout(
    supabase.from(table).insert(payload as never).select("id").maybeSingle(),
    15000,
    "Tiempo de espera agotado durante la sincronización"
  );

  if (!insertResult.error) {
    return insertResult.data?.id ?? id;
  }

  if (!isDuplicateError(insertResult.error)) {
    throw insertResult.error;
  }

  const existingResult = await withTimeout(
    supabase.from(table).select("id").eq("id", id).maybeSingle(),
    15000,
    "Tiempo de espera agotado verificando el registro sincronizado"
  );

  if (existingResult.error) throw existingResult.error;
  if (!existingResult.data?.id) {
    throw new Error("No fue posible confirmar el registro existente");
  }

  return existingResult.data.id;
}

function normalizeRecord(record: OfflineRecord): OfflineRecord {
  switch (record.module) {
    case "tasks": {
      const payload = record.payload as TaskSyncPayload;
      const id = payload.id ?? record.recordId ?? crypto.randomUUID();
      const normalizedPayload = { ...payload, id };
      updateRecordStatus(record.localId, record.status, {
        payload: normalizedPayload as OfflineRecord["payload"],
        recordId: id,
      });
      return { ...record, payload: normalizedPayload, recordId: id };
    }
    case "harvests": {
      const payload = record.payload as HarvestSyncPayload;
      const id = payload.id ?? record.recordId ?? crypto.randomUUID();
      const normalizedPayload = { ...payload, id };
      updateRecordStatus(record.localId, record.status, {
        payload: normalizedPayload as OfflineRecord["payload"],
        recordId: id,
      });
      return { ...record, payload: normalizedPayload, recordId: id };
    }
    case "applications": {
      const payload = record.payload as ApplicationSyncPayload;
      const id = payload.id ?? record.recordId ?? crypto.randomUUID();
      const normalizedProducts = (payload.application_products ?? []).map((item) => ({
        ...item,
        id: item.id ?? crypto.randomUUID(),
        application_id: id,
      }));
      const normalizedPayload = {
        ...payload,
        id,
        application_products: normalizedProducts,
      };
      updateRecordStatus(record.localId, record.status, {
        payload: normalizedPayload as OfflineRecord["payload"],
        recordId: id,
      });
      return { ...record, payload: normalizedPayload, recordId: id };
    }
    case "pest_reports": {
      const payload = record.payload as PestReportSyncPayload;
      const id = payload.id ?? record.recordId ?? crypto.randomUUID();
      const normalizedPhotos = (payload.pest_report_photos ?? []).map((item) => ({
        ...item,
        id: item.id ?? crypto.randomUUID(),
        pest_report_id: id,
      }));
      const normalizedPayload = {
        ...payload,
        id,
        pest_report_photos: normalizedPhotos,
      };
      updateRecordStatus(record.localId, record.status, {
        payload: normalizedPayload as OfflineRecord["payload"],
        recordId: id,
      });
      return { ...record, payload: normalizedPayload, recordId: id };
    }
    default:
      return record;
  }
}

async function syncRecord(record: OfflineRecord): Promise<SyncResult> {
  try {
    const normalizedRecord = normalizeRecord(record);

    switch (normalizedRecord.module) {
      case "tasks": {
        const payload = normalizedRecord.payload as TaskSyncPayload;
        const id = payload.id ?? normalizedRecord.recordId ?? normalizedRecord.localId;
        const remoteId = await insertOrConfirmExisting("tasks", { ...payload, id }, id);
        return { success: true, remoteId };
      }
      case "harvests": {
        const payload = normalizedRecord.payload as HarvestSyncPayload;
        const id = payload.id ?? normalizedRecord.recordId ?? normalizedRecord.localId;
        const remoteId = await insertOrConfirmExisting("harvests", { ...payload, id }, id);
        return { success: true, remoteId };
      }
      case "applications": {
        const payload = normalizedRecord.payload as ApplicationSyncPayload;
        const { application_products = [], ...applicationPayload } = payload;
        const id = applicationPayload.id ?? normalizedRecord.recordId ?? normalizedRecord.localId;

        const remoteId = await insertOrConfirmExisting(
          "applications",
          { ...applicationPayload, id },
          id
        );

        for (const product of application_products) {
          const productId = product.id ?? crypto.randomUUID();
          await insertOrConfirmExisting(
            "application_products",
            { ...product, id: productId, application_id: remoteId },
            productId
          );
        }

        return { success: true, remoteId };
      }
      case "pest_reports": {
        const payload = normalizedRecord.payload as PestReportSyncPayload;
        const { pest_report_photos = [], ...reportPayload } = payload;
        const id = reportPayload.id ?? normalizedRecord.recordId ?? normalizedRecord.localId;

        const remoteId = await insertOrConfirmExisting(
          "pest_reports",
          { ...reportPayload, id },
          id
        );

        for (const photo of pest_report_photos) {
          const photoId = photo.id ?? crypto.randomUUID();
          await insertOrConfirmExisting(
            "pest_report_photos",
            { ...photo, id: photoId, pest_report_id: remoteId },
            photoId
          );
        }

        return { success: true, remoteId };
      }
      default:
        return { success: false, error: "Unknown module" };
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
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
    updateRecordStatus(rec.localId, "syncing", { lastError: undefined });
    const result = await syncRecord(rec);

    if (result.success) {
      updateRecordStatus(rec.localId, "synced", {
        remoteId: result.remoteId,
        lastError: undefined,
      });
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
