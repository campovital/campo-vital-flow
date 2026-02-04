import { useOffline } from "@/contexts/OfflineContext";
import { WifiOff, RefreshCw, Loader2, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOffline();

  // Show nothing if online and nothing pending
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 bg-warning/90 text-warning-foreground py-2 px-4 text-sm shadow-md lg:left-64">
      {!isOnline && (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">Modo offline activo</span>
        </>
      )}
      
      {pendingCount > 0 && (
        <Badge 
          variant="secondary" 
          className="bg-warning-foreground/20 text-warning-foreground"
        >
          {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
        </Badge>
      )}

      {isOnline && pendingCount > 0 && (
        <>
          <CloudOff className="w-4 h-4" />
          <span className="font-medium">Registros por sincronizar</span>
        </>
      )}

      {pendingCount > 0 && isOnline && (
        <Button
          size="sm"
          variant="secondary"
          className="h-7"
          onClick={triggerSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span className="ml-1 hidden sm:inline">
            {isSyncing ? "Sincronizando…" : "Sincronizar ahora"}
          </span>
        </Button>
      )}

      {!isOnline && pendingCount > 0 && (
        <span className="text-xs opacity-80">
          Se sincronizará al recuperar conexión
        </span>
      )}
    </div>
  );
}
