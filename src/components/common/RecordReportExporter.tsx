import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, FileType, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecordReportExporterProps {
  data: Record<string, unknown>;
  moduleName: string;
  filename: string;
}

export function RecordReportExporter({ data, moduleName, filename }: RecordReportExporterProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: "excel" | "word" | "pdf") => {
    setLoading(type);
    try {
      const { exportRecordExcel, exportRecordWord, exportRecordPdf } = await import("@/lib/record-report-export");
      if (type === "excel") await exportRecordExcel(data, moduleName, filename);
      if (type === "word") await exportRecordWord(data, moduleName, filename);
      if (type === "pdf") await exportRecordPdf(data, moduleName, filename);
      toast({ title: "Informe generado", description: `${type.toUpperCase()} descargado correctamente` });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "No se pudo generar el informe", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <Button variant="outline" size="sm" onClick={() => handleExport("excel")} disabled={!!loading} className="gap-2">
        {loading === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-success" />}
        Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!!loading} className="gap-2">
        {loading === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-destructive" />}
        PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("word")} disabled={!!loading} className="gap-2">
        {loading === "word" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4 text-primary" />}
        Word
      </Button>
    </div>
  );
}
