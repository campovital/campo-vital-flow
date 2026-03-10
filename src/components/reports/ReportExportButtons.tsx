import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportExportButtonsProps {
  onExportExcel: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  onExportWord?: () => Promise<void>;
  disabled?: boolean;
}

export function ReportExportButtons({
  onExportExcel,
  onExportPDF,
  onExportWord,
  disabled,
}: ReportExportButtonsProps) {
  const { toast } = useToast();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  const isExporting = exportingExcel || exportingPDF || exportingWord;

  const handleExport = async (
    type: "excel" | "pdf" | "word",
    fn: () => Promise<void>,
    setLoading: (v: boolean) => void,
    successMsg: string
  ) => {
    setLoading(true);
    try {
      await fn();
      toast({ title: `${successMsg} generado`, description: "El archivo se ha descargado correctamente" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `No se pudo generar el ${successMsg}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline" size="sm"
        onClick={() => handleExport("excel", onExportExcel, setExportingExcel, "Excel")}
        disabled={disabled || isExporting}
        className="gap-2"
      >
        {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-green-600" />}
        Excel
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={() => handleExport("pdf", onExportPDF, setExportingPDF, "PDF")}
        disabled={disabled || isExporting}
        className="gap-2"
      >
        {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
        PDF
      </Button>
      {onExportWord && (
        <Button
          variant="outline" size="sm"
          onClick={() => handleExport("word", onExportWord, setExportingWord, "Word")}
          disabled={disabled || isExporting}
          className="gap-2"
        >
          {exportingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4 text-blue-600" />}
          Word
        </Button>
      )}
    </div>
  );
}
