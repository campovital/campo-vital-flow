import { useOffline } from "@/contexts/OfflineContext";
import { addToOutbox } from "@/lib/offline/storage";
import type { OfflineRecord } from "@/lib/offline/types";

type Payload = Record<string, unknown>;

/**
 * A hook that returns helpers to submit a record online or queue it offline.
 */
export function useOfflineSubmit<T extends Payload = Payload>(
  module: OfflineRecord["module"]
) {
  const { isOnline } = useOffline();

  /**
   * Queues the payload for later sync.
   */
  const queueForSync = (
    payload: T,
    meta?: { userId?: string | null; recordId?: string }
  ): OfflineRecord<T> => {
    return addToOutbox(module, payload, meta);
  };

  return { isOnline, queueForSync };
}
