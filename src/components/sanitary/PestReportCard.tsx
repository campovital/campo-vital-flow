import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PestReportStatusBadge } from "./PestReportStatusBadge";
import { StatusHistoryDialog } from "./StatusHistoryDialog";
import {
  Bug,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface PestReport {
  id: string;
  pest_type: string;
  severity: number;
  status: PestReportStatus;
  follow_up_date: string | null;
  created_at: string;
  incidence_percent: number | null;
  photo_url: string | null;
  lot: {
    name: string;
  } | null;
}

interface PestReportCardProps {
  report: PestReport;
  onStatusChange: (id: string, newStatus: PestReportStatus) => void;
  isUpdating?: boolean;
}

const getSeverityColor = (severity: number) => {
  if (severity <= 2) return "text-success";
  if (severity <= 3) return "text-warning";
  return "text-destructive";
};

const getSeverityLabel = (severity: number) => {
  const labels = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];
  return labels[severity - 1] || "Moderado";
};

export function PestReportCard({ report, onStatusChange, isUpdating }: PestReportCardProps) {
  const followUpDate = report.follow_up_date ? new Date(report.follow_up_date) : null;
  const isOverdue = followUpDate && isPast(followUpDate) && report.status !== "resuelto";
  const isDueToday = followUpDate && isToday(followUpDate);

  const getNextStatus = (current: PestReportStatus): PestReportStatus | null => {
    if (current === "pendiente") return "en_tratamiento";
    if (current === "en_tratamiento") return "resuelto";
    return null;
  };

  const getActionLabel = (current: PestReportStatus): string => {
    if (current === "pendiente") return "Iniciar tratamiento";
    if (current === "en_tratamiento") return "Marcar resuelto";
    return "";
  };

  const nextStatus = getNextStatus(report.status);

  return (
    <Card className={cn(
      "p-4 space-y-3 transition-all",
      isOverdue && "border-destructive/50 bg-destructive/5",
      isDueToday && report.status !== "resuelto" && "border-warning/50 bg-warning/5"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bug className={cn("w-5 h-5", getSeverityColor(report.severity))} />
          <span className="font-semibold">{report.pest_type}</span>
        </div>
        <div className="flex items-center gap-1">
          <StatusHistoryDialog reportId={report.id} pestType={report.pest_type} />
          <PestReportStatusBadge status={report.status} />
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {report.lot && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {report.lot.name}
          </span>
        )}
        <Badge variant="outline" className={cn("text-xs", getSeverityColor(report.severity))}>
          Severidad {report.severity}/5
        </Badge>
        {report.incidence_percent && (
          <span className="text-xs">
            {report.incidence_percent}% incidencia
          </span>
        )}
      </div>

      {/* Photo preview */}
      {report.photo_url && (
        <img
          src={report.photo_url}
          alt="Evidencia"
          className="w-full h-24 object-cover rounded-lg"
        />
      )}

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Creado: {format(new Date(report.created_at), "d MMM yyyy", { locale: es })}
        </span>
        {followUpDate && report.status !== "resuelto" && (
          <span className={cn(
            "flex items-center gap-1",
            isOverdue && "text-destructive font-medium",
            isDueToday && !isOverdue && "text-warning font-medium"
          )}>
            {isOverdue ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            Seguimiento: {format(followUpDate, "d MMM yyyy", { locale: es })}
            {isOverdue && " (vencido)"}
            {isDueToday && !isOverdue && " (hoy)"}
          </span>
        )}
      </div>

      {/* Action button */}
      {nextStatus && (
        <Button
          variant={report.status === "en_tratamiento" ? "success" : "confirm-warning"}
          size="sm"
          className="w-full"
          onClick={() => onStatusChange(report.id, nextStatus)}
          disabled={isUpdating}
        >
          {getActionLabel(report.status)}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </Card>
  );
}
