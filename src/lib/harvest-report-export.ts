import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { generateWordFromHtml, buildHtmlTable, buildInfoSection } from "@/lib/word-export-utils";

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

interface HarvestRecord {
  id: string;
  harvest_date: string;
  total_kg: number;
  exportable_kg: number | null;
  rejected_kg: number | null;
  classification: string | null;
  notes: string | null;
  lot: { name: string } | null;
  operator: { full_name: string } | null;
}

async function fetchHarvestData(filters: ReportFilters) {
  let query = supabase
    .from("harvests")
    .select(`
      id, harvest_date, total_kg, exportable_kg, rejected_kg, classification, notes,
      lot:lots(name),
      operator:operators(full_name)
    `)
    .order("harvest_date", { ascending: true });

  if (filters.dateFrom) query = query.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  if (filters.dateTo) query = query.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let records = (data || []) as unknown as HarvestRecord[];
  if (filters.lotId) records = records.filter((r) => (r.lot as any)?.name && r.lot !== null);
  if (filters.operatorId) records = records.filter((r) => (r.operator as any)?.full_name);

  // We need lot/operator ID filtering - re-query with IDs
  if (filters.lotId || filters.operatorId) {
    let q2 = supabase
      .from("harvests")
      .select(`id, harvest_date, total_kg, exportable_kg, rejected_kg, classification, notes, lot_id, operator_id, lot:lots(name), operator:operators(full_name)`)
      .order("harvest_date", { ascending: true });

    if (filters.dateFrom) q2 = q2.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
    if (filters.dateTo) q2 = q2.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
    if (filters.lotId) q2 = q2.eq("lot_id", filters.lotId);
    if (filters.operatorId) q2 = q2.eq("operator_id", filters.operatorId);

    const { data: d2, error: e2 } = await q2;
    if (e2) throw new Error("Error al obtener datos: " + e2.message);
    records = (d2 || []) as unknown as HarvestRecord[];
  }

  if (records.length === 0) throw new Error("No hay registros de cosecha en el rango seleccionado");

  const { data: farmData } = await supabase.from("farms").select("name, location").limit(1).single();

  return {
    records,
    farm: farmData || { name: "—", location: "" },
  };
}

function getDateRangeLabel(filters: ReportFilters): string {
  const from = filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "—";
  const to = filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy") : "—";
  if (filters.dateFrom && filters.dateTo) return `${from} al ${to}`;
  if (filters.dateFrom) return `Desde ${from}`;
  if (filters.dateTo) return `Hasta ${to}`;
  return "Todos los registros";
}

function classLabel(c: string | null): string {
  const m: Record<string, string> = { primera: "Primera", segunda: "Segunda", merma: "Merma" };
  return c ? m[c] || c : "—";
}

// ==========================================
// EXCEL – FO-09-DA-0 REGISTRO Y CONTROL DE COSECHAS
// ==========================================
export async function exportHarvestExcel(filters: ReportFilters): Promise<void> {
  const { records, farm } = await fetchHarvestData(filters);

  const totalKg = records.reduce((s, r) => s + (r.total_kg || 0), 0);
  const totalExp = records.reduce((s, r) => s + (r.exportable_kg || 0), 0);
  const totalRej = records.reduce((s, r) => s + (r.rejected_kg || 0), 0);

  const headerRows: any[][] = [
    ["", "", "", "REGISTRO Y CONTROL DE COSECHAS", "", "", "", "", "FO-09-DA-0"],
    [],
    [`FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`],
    [`CULTIVO: GULUPA`],
    [`PERIODO: ${getDateRangeLabel(filters)}`],
    [`FECHA DE GENERACIÓN: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`],
    [],
    ["No.", "FECHA", "LOTE", "OPERARIO/RECOLECTOR", "TOTAL KG", "EXPORTABLE KG", "RECHAZO KG", "% EXPORTABLE", "CLASIFICACIÓN", "OBSERVACIONES"],
  ];

  const dataRows = records.map((r, i) => [
    i + 1,
    format(new Date(r.harvest_date), "dd/MM/yyyy"),
    (r.lot as any)?.name || "—",
    (r.operator as any)?.full_name || "—",
    r.total_kg || 0,
    r.exportable_kg || 0,
    r.rejected_kg || 0,
    r.total_kg > 0 ? ((r.exportable_kg || 0) / r.total_kg * 100).toFixed(1) + "%" : "0%",
    classLabel(r.classification),
    r.notes || "",
  ]);

  const summaryRows: any[][] = [
    [],
    ["", "TOTALES", "", "", totalKg, totalExp, totalRej,
      totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) + "%" : "0%", "", ""],
    [],
    ["RESUMEN"],
    ["Total Registros", records.length],
    ["Total Producción (kg)", totalKg.toFixed(1)],
    ["Total Exportable (kg)", totalExp.toFixed(1)],
    ["Total Rechazo (kg)", totalRej.toFixed(1)],
    ["% Exportable Global", totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) + "%" : "0%"],
  ];

  const allRows = [...headerRows, ...dataRows, ...summaryRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cosechas");
  XLSX.writeFile(wb, `FO-09-DA_cosechas_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ==========================================
// PDF – FO-09-DA-0
// ==========================================
export async function exportHarvestPDF(filters: ReportFilters): Promise<void> {
  const { records, farm } = await fetchHarvestData(filters);

  const totalKg = records.reduce((s, r) => s + (r.total_kg || 0), 0);
  const totalExp = records.reduce((s, r) => s + (r.exportable_kg || 0), 0);
  const totalRej = records.reduce((s, r) => s + (r.rejected_kg || 0), 0);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(34, 100, 34);
  doc.rect(0, 0, 297, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO Y CONTROL DE COSECHAS", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("FO-09-DA-0", 260, 8);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 220, 14);

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`, 14, 35);
  doc.text(`CULTIVO: GULUPA`, 14, 41);
  doc.text(`PERIODO: ${getDateRangeLabel(filters)}`, 14, 47);

  // Summary
  doc.setFontSize(9);
  doc.text(`Total: ${records.length} registros | ${totalKg.toFixed(1)} kg | Exportable: ${totalExp.toFixed(1)} kg (${totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) : "0"}%) | Rechazo: ${totalRej.toFixed(1)} kg`, 14, 53);

  const tableData = records.map((r, i) => [
    String(i + 1),
    format(new Date(r.harvest_date), "dd/MM/yyyy"),
    (r.lot as any)?.name || "—",
    (r.operator as any)?.full_name || "—",
    (r.total_kg || 0).toFixed(1),
    (r.exportable_kg || 0).toFixed(1),
    (r.rejected_kg || 0).toFixed(1),
    r.total_kg > 0 ? ((r.exportable_kg || 0) / r.total_kg * 100).toFixed(1) + "%" : "0%",
    classLabel(r.classification),
    r.notes || "",
  ]);

  // Totals row
  tableData.push([
    "", "TOTALES", "", "",
    totalKg.toFixed(1), totalExp.toFixed(1), totalRej.toFixed(1),
    totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) + "%" : "0%",
    "", "",
  ]);

  autoTable(doc, {
    startY: 57,
    head: [["No.", "Fecha", "Lote", "Operario", "Total kg", "Export. kg", "Rechazo kg", "% Export.", "Clasificación", "Observaciones"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [34, 100, 34], textColor: 255, fontStyle: "bold", fontSize: 7 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { cellWidth: 16, halign: "right" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 16, halign: "center" },
      8: { cellWidth: 20 },
      9: { cellWidth: 40 },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (data) => {
      // Bold totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 240, 220];
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Página ${i} de ${pageCount} - Campo Vital`, 148.5, 200, { align: "center" });
  }

  doc.save(`FO-09-DA_cosechas_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ==========================================
// WORD – FO-09-DA-0
// ==========================================
export async function exportHarvestWord(filters: ReportFilters): Promise<void> {
  const { records, farm } = await fetchHarvestData(filters);

  const totalKg = records.reduce((s, r) => s + (r.total_kg || 0), 0);
  const totalExp = records.reduce((s, r) => s + (r.exportable_kg || 0), 0);
  const totalRej = records.reduce((s, r) => s + (r.rejected_kg || 0), 0);

  const headers = ["No.", "Fecha", "Lote", "Operario/Recolector", "Total kg", "Exportable kg", "Rechazo kg", "% Export.", "Clasificación", "Observaciones"];
  const rows = records.map((r, i) => [
    String(i + 1),
    format(new Date(r.harvest_date), "dd/MM/yyyy"),
    (r.lot as any)?.name || "—",
    (r.operator as any)?.full_name || "—",
    String(r.total_kg || 0),
    String(r.exportable_kg || 0),
    String(r.rejected_kg || 0),
    r.total_kg > 0 ? ((r.exportable_kg || 0) / r.total_kg * 100).toFixed(1) + "%" : "0%",
    classLabel(r.classification),
    r.notes || "",
  ]);

  rows.push(["", "TOTALES", "", "", totalKg.toFixed(1), totalExp.toFixed(1), totalRej.toFixed(1),
    totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) + "%" : "0%", "", ""]);

  const html = `
    <h1 style="text-align:center;">REGISTRO Y CONTROL DE COSECHAS</h1>
    <p style="text-align:right;"><strong>FO-09-DA-0</strong></p>
    <p style="text-align:right;">Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
    <div class="header-info">
      <p><strong>FINCA:</strong> ${farm.name}${farm.location ? ` (${farm.location})` : ""}</p>
      <p><strong>CULTIVO:</strong> GULUPA</p>
      <p><strong>PERIODO:</strong> ${getDateRangeLabel(filters)}</p>
    </div>
    <h2>Resumen</h2>
    ${buildHtmlTable(["Métrica", "Valor"], [
      ["Total Registros", String(records.length)],
      ["Total Producción", `${totalKg.toFixed(1)} kg`],
      ["Total Exportable", `${totalExp.toFixed(1)} kg`],
      ["Total Rechazo", `${totalRej.toFixed(1)} kg`],
      ["% Exportable Global", totalKg > 0 ? (totalExp / totalKg * 100).toFixed(1) + "%" : "0%"],
    ])}
    <h2>Detalle de Cosechas</h2>
    ${buildHtmlTable(headers, rows)}
    <div class="footer">Documento generado automáticamente por Campo Vital</div>
  `;

  generateWordFromHtml(html, `FO-09-DA_cosechas_${format(new Date(), "yyyyMMdd")}.doc`);
}
