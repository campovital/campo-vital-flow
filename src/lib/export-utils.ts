import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PestReport {
  id: string;
  pest_type: string;
  severity: number;
  status: "pendiente" | "en_tratamiento" | "resuelto";
  follow_up_date: string | null;
  created_at: string;
  incidence_percent: number | null;
  lot: {
    name: string;
  } | null;
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    en_tratamiento: "En Tratamiento",
    resuelto: "Resuelto",
  };
  return labels[status] || status;
};

const getSeverityLabel = (severity: number) => {
  const labels = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];
  return labels[severity - 1] || "Moderado";
};

const formatReportData = (reports: PestReport[]) => {
  return reports.map((report) => ({
    "Tipo de Plaga": report.pest_type,
    Lote: report.lot?.name || "Sin lote",
    Severidad: `${report.severity}/5 - ${getSeverityLabel(report.severity)}`,
    "Incidencia (%)": report.incidence_percent || "-",
    Estado: getStatusLabel(report.status),
    "Fecha de Creación": format(new Date(report.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
    "Fecha de Seguimiento": report.follow_up_date 
      ? format(new Date(report.follow_up_date), "dd/MM/yyyy", { locale: es }) 
      : "-",
  }));
};

export const exportToExcel = (reports: PestReport[], filename?: string) => {
  const data = formatReportData(reports);
  
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Tipo de Plaga
    { wch: 20 }, // Lote
    { wch: 18 }, // Severidad
    { wch: 15 }, // Incidencia
    { wch: 15 }, // Estado
    { wch: 20 }, // Fecha de Creación
    { wch: 20 }, // Fecha de Seguimiento
  ];
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes Sanitarios");
  
  const defaultFilename = `reportes_sanitarios_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
  XLSX.writeFile(workbook, filename || defaultFilename);
};

export const exportToPDF = (reports: PestReport[], filename?: string) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Seguimiento Sanitario", 14, 20);

  // Subtitle with date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}`,
    14,
    28
  );

  // Summary
  const pendientes = reports.filter((r) => r.status === "pendiente").length;
  const enTratamiento = reports.filter((r) => r.status === "en_tratamiento").length;
  const resueltos = reports.filter((r) => r.status === "resuelto").length;
  
  doc.text(
    `Total: ${reports.length} reportes | Pendientes: ${pendientes} | En tratamiento: ${enTratamiento} | Resueltos: ${resueltos}`,
    14,
    35
  );

  // Table data
  const tableData = reports.map((report) => [
    report.pest_type,
    report.lot?.name || "Sin lote",
    `${report.severity}/5`,
    report.incidence_percent ? `${report.incidence_percent}%` : "-",
    getStatusLabel(report.status),
    format(new Date(report.created_at), "dd/MM/yyyy", { locale: es }),
    report.follow_up_date 
      ? format(new Date(report.follow_up_date), "dd/MM/yyyy", { locale: es }) 
      : "-",
  ]);

  // Generate table
  autoTable(doc, {
    startY: 42,
    head: [["Tipo de Plaga", "Lote", "Severidad", "Incidencia", "Estado", "Creación", "Seguimiento"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [34, 139, 34], // Forest green
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 30, halign: "center" },
      5: { cellWidth: 28, halign: "center" },
      6: { cellWidth: 28, halign: "center" },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    didDrawCell: (data) => {
      // Color code status cells
      if (data.column.index === 4 && data.section === "body") {
        const status = reports[data.row.index]?.status;
        if (status === "pendiente") {
          doc.setFillColor(255, 237, 213); // Orange light
        } else if (status === "en_tratamiento") {
          doc.setFillColor(219, 234, 254); // Blue light
        } else if (status === "resuelto") {
          doc.setFillColor(220, 252, 231); // Green light
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }

  const defaultFilename = `reportes_sanitarios_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`;
  doc.save(filename || defaultFilename);
};
