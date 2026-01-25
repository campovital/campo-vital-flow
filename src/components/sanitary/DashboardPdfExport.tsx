import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardPdfExportProps {
  dashboardRef: React.RefObject<HTMLDivElement>;
  totalReports: number;
  pendingReports: number;
  inTreatmentReports: number;
  resolvedReports: number;
  dateFrom?: Date;
  dateTo?: Date;
  dateRangeLabel?: string;
}

export function DashboardPdfExport({
  dashboardRef,
  totalReports,
  pendingReports,
  inTreatmentReports,
  resolvedReports,
  dateFrom,
  dateTo,
  dateRangeLabel,
}: DashboardPdfExportProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportToPdf = async () => {
    if (!dashboardRef.current) {
      toast({
        title: "Error",
        description: "No se pudo acceder al dashboard",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);
    
    try {
      toast({
        title: "Generando PDF",
        description: "Por favor espere mientras se capturan los gráficos...",
      });

      // Create canvas from the dashboard element
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: dashboardRef.current.scrollWidth,
        windowHeight: dashboardRef.current.scrollHeight,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      // Header
      pdf.setFillColor(34, 139, 34); // Forest green
      pdf.rect(0, 0, pageWidth, 40, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Dashboard Sanitario", margin, 18);
      
      // Date range info
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const generatedDateStr = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
      pdf.text(`Generado el ${generatedDateStr}`, margin, 28);
      
      // Period info
      if (dateFrom && dateTo) {
        const periodStr = `Período: ${format(dateFrom, "d MMM yyyy", { locale: es })} - ${format(dateTo, "d MMM yyyy", { locale: es })}`;
        pdf.text(periodStr, margin, 36);
      } else if (dateRangeLabel) {
        pdf.text(`Período: ${dateRangeLabel}`, margin, 36);
      }

      // Summary section
      let yPos = 50;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Resumen del Período", margin, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      // Summary boxes
      const boxWidth = (contentWidth - 9) / 4;
      const boxHeight = 22;
      
      // Total reports
      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, "F");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(totalReports), margin + boxWidth / 2, yPos + 10, { align: "center" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Total", margin + boxWidth / 2, yPos + 17, { align: "center" });
      
      // Pending
      pdf.setFillColor(254, 243, 199);
      pdf.roundedRect(margin + boxWidth + 3, yPos, boxWidth, boxHeight, 2, 2, "F");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(180, 83, 9);
      pdf.text(String(pendingReports), margin + boxWidth + 3 + boxWidth / 2, yPos + 10, { align: "center" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Pendientes", margin + boxWidth + 3 + boxWidth / 2, yPos + 17, { align: "center" });
      
      // In treatment
      pdf.setFillColor(219, 234, 254);
      pdf.setTextColor(29, 78, 216);
      pdf.roundedRect(margin + (boxWidth + 3) * 2, yPos, boxWidth, boxHeight, 2, 2, "F");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(inTreatmentReports), margin + (boxWidth + 3) * 2 + boxWidth / 2, yPos + 10, { align: "center" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("En Tratamiento", margin + (boxWidth + 3) * 2 + boxWidth / 2, yPos + 17, { align: "center" });
      
      // Resolved
      pdf.setFillColor(220, 252, 231);
      pdf.setTextColor(22, 101, 52);
      pdf.roundedRect(margin + (boxWidth + 3) * 3, yPos, boxWidth, boxHeight, 2, 2, "F");
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(resolvedReports), margin + (boxWidth + 3) * 3 + boxWidth / 2, yPos + 10, { align: "center" });
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.text("Resueltos", margin + (boxWidth + 3) * 3 + boxWidth / 2, yPos + 17, { align: "center" });
      
      // Reset text color
      pdf.setTextColor(0, 0, 0);
      
      // Charts section
      yPos += boxHeight + 15;
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Gráficos", margin, yPos);
      
      yPos += 8;
      
      // Add the dashboard canvas image
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Check if image fits on current page
      const remainingSpace = pageHeight - yPos - margin;
      
      if (imgHeight > remainingSpace) {
        // Scale down to fit
        const scaleFactor = remainingSpace / imgHeight;
        const scaledWidth = imgWidth * scaleFactor;
        const scaledHeight = imgHeight * scaleFactor;
        pdf.addImage(imgData, "PNG", margin + (contentWidth - scaledWidth) / 2, yPos, scaledWidth, scaledHeight);
      } else {
        pdf.addImage(imgData, "PNG", margin, yPos, imgWidth, imgHeight);
      }

      // Footer
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(128, 128, 128);
      pdf.text("Sistema de Gestión Agrícola - Dashboard Sanitario", pageWidth / 2, footerY, { align: "center" });

      // Save PDF
      const datePrefix = dateFrom && dateTo 
        ? `${format(dateFrom, "yyyyMMdd")}-${format(dateTo, "yyyyMMdd")}`
        : format(new Date(), "yyyy-MM-dd-HHmm");
      const fileName = `dashboard-sanitario-${datePrefix}.pdf`;
      pdf.save(fileName);

      toast({
        title: "PDF exportado",
        description: `El archivo ${fileName} ha sido descargado`,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToPdf}
      disabled={exporting}
      className="gap-1.5"
    >
      {exporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Exportar PDF</span>
    </Button>
  );
}
