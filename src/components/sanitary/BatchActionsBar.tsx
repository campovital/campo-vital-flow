import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Clock, Wrench, CheckCircle } from "lucide-react";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchStatusChange: (status: PestReportStatus) => void;
  isUpdating: boolean;
}

const statusLabels: Record<PestReportStatus, string> = {
  pendiente: "Pendiente",
  en_tratamiento: "En tratamiento",
  resuelto: "Resuelto",
};

const statusIcons: Record<PestReportStatus, React.ReactNode> = {
  pendiente: <Clock className="w-4 h-4 text-warning" />,
  en_tratamiento: <Wrench className="w-4 h-4 text-blue-500" />,
  resuelto: <CheckCircle className="w-4 h-4 text-success" />,
};

export function BatchActionsBar({
  selectedCount,
  onClearSelection,
  onBatchStatusChange,
  isUpdating,
}: BatchActionsBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PestReportStatus | null>(null);

  if (selectedCount === 0) return null;

  const handleStatusClick = (status: PestReportStatus) => {
    setPendingStatus(status);
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onBatchStatusChange(pendingStatus);
    }
    setConfirmOpen(false);
    setPendingStatus(null);
  };

  const handleCancel = () => {
    setConfirmOpen(false);
    setPendingStatus(null);
  };

  return (
    <>
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
            onClick={() => handleStatusClick("pendiente")}
            disabled={isUpdating}
          >
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span className="hidden sm:inline">Pendiente</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleStatusClick("en_tratamiento")}
            disabled={isUpdating}
          >
            <Wrench className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">En tratamiento</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => handleStatusClick("resuelto")}
            disabled={isUpdating}
          >
            <CheckCircle className="w-3.5 h-3.5 text-success" />
            <span className="hidden sm:inline">Resuelto</span>
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {pendingStatus && statusIcons[pendingStatus]}
              Confirmar cambio de estado
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de cambiar el estado de{" "}
              <strong>{selectedCount} reporte{selectedCount !== 1 ? "s" : ""}</strong>{" "}
              a <strong>"{pendingStatus && statusLabels[pendingStatus]}"</strong>?
              <br />
              <span className="text-xs mt-2 block">
                Esta acción actualizará todos los reportes seleccionados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isUpdating}>
              {isUpdating ? "Actualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
