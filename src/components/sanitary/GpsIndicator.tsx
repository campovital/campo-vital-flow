import { MapPin, Loader2, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GpsIndicatorProps {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function GpsIndicator({
  latitude,
  longitude,
  accuracy,
  loading,
  error,
  onRetry,
}: GpsIndicatorProps) {
  const hasCoordinates = latitude !== null && longitude !== null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Obteniendo ubicación GPS...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-7 px-2"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (hasCoordinates) {
    return (
      <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-success/10">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-success" />
          <div className="text-sm">
            <span className="font-medium text-success">Ubicación capturada</span>
            <span className="text-muted-foreground ml-2">
              {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </span>
          </div>
        </div>
        {accuracy && (
          <span className="text-xs text-muted-foreground">
            ±{Math.round(accuracy)}m
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 text-muted-foreground">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">Sin ubicación GPS</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="h-7 px-2"
      >
        <RefreshCw className="w-4 h-4" />
      </Button>
    </div>
  );
}
