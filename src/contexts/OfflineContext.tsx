import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getAllRecords, getPendingRecords } from "@/lib/offline/storage";
import { flushPendingRecords } from "@/lib/offline/syncEngine";
import { useToast } from "@/hooks/use-toast";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  triggerSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(
  undefined
);

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be inside OfflineProvider");
  return ctx;
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  // Keep count updated
  const refreshCount = useCallback(() => {
    setPendingCount(getPendingRecords().length);
  }, []);

  useEffect(() => {
    refreshCount();
    // Poll every second to reflect new pending items quickly
    const id = setInterval(refreshCount, 1000);
    return () => clearInterval(id);
  }, [refreshCount]);

  // Sync when coming online
  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    const pending = getPendingRecords();
    if (pending.length === 0) return;

    setIsSyncing(true);
    const result = await flushPendingRecords();
    setIsSyncing(false);
    refreshCount();

    if (result.synced > 0) {
      toast({
        title: "Sincronización completada",
        description: `${result.synced} registro(s) sincronizado(s)`,
      });
    }
    if (result.failed > 0) {
      toast({
        title: "Error de sincronización",
        description: `${result.failed} registro(s) fallaron`,
        variant: "destructive",
      });
    }
  }, [isSyncing, refreshCount, toast]);

  // Auto-sync on reconnect
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return (
    <OfflineContext.Provider
      value={{ isOnline, isSyncing, pendingCount, triggerSync }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
