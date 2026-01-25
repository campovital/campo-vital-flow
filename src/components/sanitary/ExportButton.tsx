import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";

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

interface ExportButtonProps {
  reports: PestReport[];
  disabled?: boolean;
}

export function ExportButton({ reports, disabled }: ExportButtonProps) {
  const handleExportExcel = () => {
    exportToExcel(reports);
  };

  const handleExportPDF = () => {
    exportToPDF(reports);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || reports.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background">
        <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Exportar a Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-red-600" />
          Exportar a PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
