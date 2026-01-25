import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PestReportStatusBadge } from "./PestReportStatusBadge";
import { StatusHistoryDialog } from "./StatusHistoryDialog";
import { PhotoGalleryViewer } from "./PhotoGalleryViewer";
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

interface PestReportPhoto {
  id: string;
  photo_url: string;
}

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
  pest_report_photos?: PestReportPhoto[];
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);

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

  // Prepare photos for gallery - combine multiple photos or single photo_url
  const galleryPhotos = report.pest_report_photos && report.pest_report_photos.length > 0
    ? report.pest_report_photos
    : report.photo_url
    ? [{ id: "single", photo_url: report.photo_url }]
    : [];

  const openGallery = (index: number = 0) => {
    setGalleryStartIndex(index);
    setGalleryOpen(true);
  };

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

      {/* Photo preview - multiple photos support with gallery viewer */}
      {galleryPhotos.length > 0 && (
        <>
          {report.pest_report_photos && report.pest_report_photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {report.pest_report_photos.slice(0, 3).map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className="relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
                  onClick={() => openGallery(index)}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Evidencia ${index + 1}`}
                    className="w-full h-16 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                  {index === 2 && report.pest_report_photos!.length > 3 && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center hover:bg-black/40 transition-colors">
                      <span className="text-white text-sm font-medium">
                        +{report.pest_report_photos!.length - 3}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : report.photo_url ? (
            <button
              type="button"
              className="w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              onClick={() => openGallery(0)}
            >
              <img
                src={report.photo_url}
                alt="Evidencia"
                className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
              />
            </button>
          ) : null}

          {/* Gallery Viewer */}
          <PhotoGalleryViewer
            photos={galleryPhotos}
            initialIndex={galleryStartIndex}
            open={galleryOpen}
            onOpenChange={setGalleryOpen}
          />
        </>
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
