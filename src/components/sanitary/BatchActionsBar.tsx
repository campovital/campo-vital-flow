import { Button } from "@/components/ui/button";
import { X, Clock, Wrench, CheckCircle } from "lucide-react";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchStatusChange: (status: PestReportStatus) => void;
  isUpdating: boolean;
}

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onBatchStatusChange,
  isUpdating,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 pr-3 border-r">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClearSelection}
        >
          <X className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium">
          {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Cambiar a:
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onBatchStatusChange("pendiente")}
          disabled={isUpdating}
        >
          <Clock className="w-3.5 h-3.5 text-warning" />
          <span className="hidden sm:inline">Pendiente</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onBatchStatusChange("en_tratamiento")}
          disabled={isUpdating}
        >
          <Wrench className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">En tratamiento</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onBatchStatusChange("resuelto")}
          disabled={isUpdating}
        >
          <CheckCircle className="w-3.5 h-3.5 text-success" />
          <span className="hidden sm:inline">Resuelto</span>
        </Button>
      </div>
    </div>
  );
}
