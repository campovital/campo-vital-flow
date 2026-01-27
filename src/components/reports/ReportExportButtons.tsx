import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportExportButtonsProps {
  onExportExcel: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  disabled?: boolean;
}

export function ReportExportButtons({
  onExportExcel,
  onExportPDF,
  disabled,
}: ReportExportButtonsProps) {
  const { toast } = useToast();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await onExportExcel();
      toast({
        title: "Excel generado",
        description: "El archivo se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el Excel",
        variant: "destructive",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      await onExportPDF();
      toast({
        title: "PDF generado",
        description: "El archivo se ha descargado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el PDF",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={disabled || exportingExcel || exportingPDF}
        className="gap-2"
      >
        {exportingExcel ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={disabled || exportingExcel || exportingPDF}
        className="gap-2"
      >
        {exportingPDF ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 text-red-600" />
        )}
        PDF
      </Button>
    </div>
  );
}
