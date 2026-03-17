import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import {
  OFFLINE_OUTBOX_EVENT,
  getAllRecords,
  getPendingRecords,
} from "@/lib/offline/storage";
import { flushPendingRecords } from "@/lib/offline/syncEngine";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  errorCount: number;
  networkStatus: "online" | "slow" | "reconnecting" | "offline";
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

// Map module names to React Query cache keys that need to be invalidated
const moduleQueryKeyMap: Record<string, string[]> = {
  tasks: ["tasks"],
  harvests: ["harvests", "dashboard"],
  applications: ["applications", "dashboard"],
  pest_reports: ["pest-reports", "pest_reports", "dashboard"],
};

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, status: networkStatus } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshCount = useCallback(() => {
    const records = getAllRecords();
    setPendingCount(records.filter((r) => r.status !== "synced").length);
    setErrorCount(records.filter((r) => r.status === "error").length);
  }, []);

  useEffect(() => {
    refreshCount();

    const handleRefresh = () => refreshCount();
    window.addEventListener(OFFLINE_OUTBOX_EVENT, handleRefresh as EventListener);
    window.addEventListener("storage", handleRefresh);

    const fallbackInterval = setInterval(refreshCount, 10000);

    return () => {
      window.removeEventListener(
        OFFLINE_OUTBOX_EVENT,
        handleRefresh as EventListener
      );
      window.removeEventListener("storage", handleRefresh);
      clearInterval(fallbackInterval);
    };
  }, [refreshCount]);

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const pending = getPendingRecords();
    if (pending.length === 0) return;

    setIsSyncing(true);
    const result = await flushPendingRecords();
    setIsSyncing(false);
    refreshCount();

    if (result.modules && result.modules.length > 0) {
      result.modules.forEach((module) => {
        const queryKeys = moduleQueryKeyMap[module] || [module];
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      });
    }

    if (result.synced > 0) {
      toast({
        title: "Sincronización completada",
        description: `${result.synced} registro(s) sincronizado(s)`,
      });
    }

    if (result.failed > 0) {
      toast({
        title: "Algunos registros siguen pendientes",
        description: `${result.failed} registro(s) no pudieron sincronizarse`,
        variant: "destructive",
      });
    }
  }, [isOnline, isSyncing, refreshCount, toast, queryClient]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      triggerSync();
    }
  }, [isOnline, pendingCount, triggerSync]);

  useEffect(() => {
    if (!isOnline || pendingCount === 0) return;

    const intervalId = setInterval(() => {
      if (!isSyncing) {
        triggerSync();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isOnline, pendingCount, isSyncing, triggerSync]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        errorCount,
        networkStatus,
        triggerSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
