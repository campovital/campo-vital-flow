import { Badge } from "@/components/ui/badge";
import { Clock, Wrench, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface PestReportStatusBadgeProps {
  status: PestReportStatus;
  className?: string;
}

const statusConfig = {
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    variant: "outline" as const,
    className: "border-warning text-warning",
  },
  en_tratamiento: {
    label: "En tratamiento",
    icon: Wrench,
    variant: "secondary" as const,
    className: "bg-blue-500/20 text-blue-600 border-blue-500",
  },
  resuelto: {
    label: "Resuelto",
    icon: CheckCircle,
    variant: "outline" as const,
    className: "border-success text-success",
  },
};

export function PestReportStatusBadge({ status, className }: PestReportStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={cn("flex items-center gap-1", config.className, className)}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
