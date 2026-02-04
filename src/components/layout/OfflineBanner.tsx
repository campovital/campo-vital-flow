import { useOffline } from "@/contexts/OfflineContext";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOffline();

  // Show nothing if online and nothing pending
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-warning/90 text-warning-foreground py-2 px-4 text-sm shadow-md lg:left-64">
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">Trabajando sin conexión</span>
        </>
      )}
      {isOnline && pendingCount > 0 && (
        <>
          <span className="font-medium">
            {pendingCount} registro(s) pendiente(s)
          </span>
        </>
      )}
      {pendingCount > 0 && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7"
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-1 hidden sm:inline">
            {isSyncing ? "Sincronizando…" : "Sincronizar"}
          </span>
        </Button>
      )}
    </div>
  );
}
