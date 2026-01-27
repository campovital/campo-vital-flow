import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

const statusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_tratamiento: "En Tratamiento",
  resuelto: "Resuelto",
};

function createPdfDocument(title: string, subtitle?: string): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  // Header
  doc.setFillColor(34, 139, 34);
  doc.rect(0, 0, 297, 25, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 15);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const dateStr = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  doc.text(`Generado: ${dateStr}`, 200, 15);

  if (subtitle) {
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, 32);
  }

  return doc;
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${pageCount} - Campo Vital Gulupa`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" }
    );
  }
}

// ============================================
// PRODUCTION PDF
// ============================================
export async function exportProductionPDF(filters: ReportFilters): Promise<void> {
  let query = supabase
    .from("harvests")
    .select(`
      harvest_date,
      total_kg,
      exportable_kg,
      rejected_kg,
      classification,
      lot:lots(id, name),
      operator:operators(id, full_name)
    `)
    .order("harvest_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  }
  if (filters.dateTo) {
    query = query.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
  }

  const { data, error } = await query;
  
  if (error) throw new Error("Error al obtener datos: " + error.message);
  if (!data || data.length === 0) throw new Error("No hay datos de producción para exportar");

  let filteredData = data;
  if (filters.lotId) {
    filteredData = filteredData.filter((d: any) => d.lot?.id === filters.lotId);
  }
  if (filters.operatorId) {
    filteredData = filteredData.filter((d: any) => d.operator?.id === filters.operatorId);
  }

  if (filteredData.length === 0) throw new Error("No hay datos con los filtros seleccionados");

  const totalKg = filteredData.reduce((sum: number, r: any) => sum + (r.total_kg || 0), 0);
  const totalExportable = filteredData.reduce((sum: number, r: any) => sum + (r.exportable_kg || 0), 0);

  const subtitle = `Total: ${filteredData.length} registros | ${totalKg.toFixed(1)} kg | ${((totalExportable / totalKg) * 100).toFixed(1)}% exportable`;
  const doc = createPdfDocument("Informe de Producción", subtitle);

  const tableData = filteredData.map((row: any) => [
    format(new Date(row.harvest_date), "dd/MM/yyyy"),
    row.lot?.name || "—",
    row.operator?.full_name || "—",
    row.total_kg?.toFixed(1) || "0",
    row.exportable_kg?.toFixed(1) || "0",
    row.rejected_kg?.toFixed(1) || "0",
    row.total_kg > 0 ? ((row.exportable_kg / row.total_kg) * 100).toFixed(1) + "%" : "0%",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Fecha", "Lote", "Operario", "Total (kg)", "Exportable (kg)", "Rechazo (kg)", "% Export."]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "center" },
    },
  });

  addFooter(doc);
  doc.save(`produccion_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ============================================
// PRODUCTIVITY PDF
// ============================================
export async function exportProductivityPDF(filters: ReportFilters): Promise<void> {
  let harvestQuery = supabase.from("harvests").select(`total_kg, operator:operators(id, full_name)`);
  let appQuery = supabase.from("applications").select(`labor_hours, operator:operators(id, full_name)`);

  if (filters.dateFrom) {
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
  }
  if (filters.dateTo) {
    harvestQuery = harvestQuery.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
    appQuery = appQuery.lte("device_time", filters.dateTo.toISOString());
  }

  const { data: harvests } = await harvestQuery;
  const { data: applications } = await appQuery;

  const operatorStats: Record<string, { name: string; harvests: number; totalKg: number; applications: number; totalHours: number }> = {};

  harvests?.forEach((h: any) => {
    const opId = h.operator?.id;
    if (!opId) return;
    if (filters.operatorId && opId !== filters.operatorId) return;
    if (!operatorStats[opId]) {
      operatorStats[opId] = { name: h.operator.full_name, harvests: 0, totalKg: 0, applications: 0, totalHours: 0 };
    }
    operatorStats[opId].harvests++;
    operatorStats[opId].totalKg += h.total_kg || 0;
  });

  applications?.forEach((a: any) => {
    const opId = a.operator?.id;
    if (!opId) return;
    if (filters.operatorId && opId !== filters.operatorId) return;
    if (!operatorStats[opId]) {
      operatorStats[opId] = { name: a.operator.full_name, harvests: 0, totalKg: 0, applications: 0, totalHours: 0 };
    }
    operatorStats[opId].applications++;
    operatorStats[opId].totalHours += a.labor_hours || 0;
  });

  const stats = Object.values(operatorStats);
  if (stats.length === 0) throw new Error("No hay datos de productividad para exportar");

  const doc = createPdfDocument("Productividad por Operario", `${stats.length} operarios analizados`);

  const tableData = stats.map((op) => [
    op.name,
    op.harvests.toString(),
    op.totalKg.toFixed(1),
    op.applications.toString(),
    op.totalHours.toFixed(1),
    op.harvests > 0 ? (op.totalKg / op.harvests).toFixed(1) : "0",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Operario", "Cosechas", "Total kg", "Aplicaciones", "Horas Trab.", "Prom kg/cosecha"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "center" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  addFooter(doc);
  doc.save(`productividad_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ============================================
// COSTS PDF
// ============================================
export async function exportCostsPDF(filters: ReportFilters): Promise<void> {
  let appQuery = supabase
    .from("applications")
    .select(`device_time, total_product_cost, total_labor_cost, total_cost, lot:lots(id, name)`)
    .order("device_time", { ascending: false });

  let harvestQuery = supabase.from("harvests").select("harvest_date, total_kg, lot:lots(id, name)");

  if (filters.dateFrom) {
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  }
  if (filters.dateTo) {
    appQuery = appQuery.lte("device_time", filters.dateTo.toISOString());
    harvestQuery = harvestQuery.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
  }

  const { data: applications } = await appQuery;
  const { data: harvests } = await harvestQuery;

  let filteredApps = applications || [];
  let filteredHarvests = harvests || [];

  if (filters.lotId) {
    filteredApps = filteredApps.filter((a: any) => a.lot?.id === filters.lotId);
    filteredHarvests = filteredHarvests.filter((h: any) => h.lot?.id === filters.lotId);
  }

  const totalCost = filteredApps.reduce((sum: number, a: any) => sum + (a.total_cost || 0), 0);
  const totalProductCost = filteredApps.reduce((sum: number, a: any) => sum + (a.total_product_cost || 0), 0);
  const totalLaborCost = filteredApps.reduce((sum: number, a: any) => sum + (a.total_labor_cost || 0), 0);
  const totalKg = filteredHarvests.reduce((sum: number, h: any) => sum + (h.total_kg || 0), 0);
  const costPerKg = totalKg > 0 ? totalCost / totalKg : 0;

  const subtitle = `Costo Total: $${totalCost.toLocaleString()} | Producción: ${totalKg.toFixed(1)} kg | Costo/kg: $${costPerKg.toFixed(0)}`;
  const doc = createPdfDocument("Costos vs Producción", subtitle);

  // Summary table
  autoTable(doc, {
    startY: 38,
    head: [["Métrica", "Valor"]],
    body: [
      ["Total Producción (kg)", totalKg.toFixed(1)],
      ["Costo Total Insumos", `$${totalProductCost.toLocaleString()}`],
      ["Costo Total Mano de Obra", `$${totalLaborCost.toLocaleString()}`],
      ["Costo Total", `$${totalCost.toLocaleString()}`],
      ["Costo por Kilo", `$${costPerKg.toFixed(0)}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
  });

  // Detail table
  if (filteredApps.length > 0) {
    const detailData = filteredApps.map((app: any) => [
      format(new Date(app.device_time), "dd/MM/yyyy"),
      app.lot?.name || "—",
      `$${(app.total_product_cost || 0).toLocaleString()}`,
      `$${(app.total_labor_cost || 0).toLocaleString()}`,
      `$${(app.total_cost || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Fecha", "Lote", "Costo Insumos", "Costo M.O.", "Costo Total"]],
      body: detailData,
      theme: "striped",
      headStyles: { fillColor: [100, 100, 100], textColor: 255 },
    });
  }

  addFooter(doc);
  doc.save(`costos_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ============================================
// INVENTORY PDF
// ============================================
export async function exportInventoryPDF(): Promise<void> {
  const { data: batches } = await supabase
    .from("inventory_batches")
    .select(`quantity, expiry_date, product:inventory_products(name, unit)`);

  const { data: usedProducts } = await supabase
    .from("application_products")
    .select(`quantity_used, product:inventory_products(name, unit)`);

  const stockByProduct: Record<string, { name: string; unit: string; stock: number; used: number }> = {};

  batches?.forEach((b: any) => {
    const name = b.product?.name;
    if (!name) return;
    if (!stockByProduct[name]) {
      stockByProduct[name] = { name, unit: b.product.unit, stock: 0, used: 0 };
    }
    stockByProduct[name].stock += b.quantity || 0;
  });

  usedProducts?.forEach((u: any) => {
    const name = u.product?.name;
    if (!name) return;
    if (!stockByProduct[name]) {
      stockByProduct[name] = { name, unit: u.product.unit, stock: 0, used: 0 };
    }
    stockByProduct[name].used += u.quantity_used || 0;
  });

  const products = Object.values(stockByProduct);
  const lowStock = products.filter((p) => p.stock < 10).length;

  const doc = createPdfDocument("Consumo de Insumos", `${products.length} productos | ${lowStock} con stock bajo`);

  const tableData = products.map((p) => [
    p.name,
    p.unit,
    p.stock.toFixed(2),
    p.used.toFixed(2),
    p.stock < 10 ? "⚠ BAJO" : "OK",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Producto", "Unidad", "Stock Actual", "Consumo Total", "Estado"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
    didDrawCell: (data) => {
      if (data.column.index === 4 && data.section === "body") {
        const text = data.cell.raw as string;
        if (text.includes("BAJO")) {
          doc.setFillColor(255, 237, 213);
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`inventario_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ============================================
// SANITARY PDF
// ============================================
export async function exportSanitaryPDF(filters: ReportFilters): Promise<void> {
  let query = supabase
    .from("pest_reports")
    .select(`created_at, pest_type, severity, status, incidence_percent, follow_up_date, resolved_at, lot:lots(id, name)`)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom.toISOString());
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let filteredData = data || [];
  if (filters.lotId) {
    filteredData = filteredData.filter((d: any) => d.lot?.id === filters.lotId);
  }

  if (filteredData.length === 0) throw new Error("No hay reportes sanitarios para exportar");

  const pending = filteredData.filter((r: any) => r.status === "pendiente").length;
  const resolved = filteredData.filter((r: any) => r.status === "resuelto").length;

  const doc = createPdfDocument("Historial Sanitario", `${filteredData.length} reportes | ${pending} pendientes | ${resolved} resueltos`);

  const tableData = filteredData.map((r: any) => [
    format(new Date(r.created_at), "dd/MM/yyyy"),
    r.lot?.name || "—",
    r.pest_type,
    `${r.severity}/5`,
    r.incidence_percent ? `${r.incidence_percent}%` : "—",
    statusLabels[r.status] || r.status,
    r.follow_up_date ? format(new Date(r.follow_up_date), "dd/MM/yyyy") : "—",
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Fecha", "Lote", "Plaga/Enfermedad", "Severidad", "Incidencia", "Estado", "Seguimiento"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center" },
    },
    didDrawCell: (data) => {
      if (data.column.index === 5 && data.section === "body") {
        const text = data.cell.raw as string;
        if (text === "Pendiente") {
          doc.setFillColor(255, 237, 213);
        } else if (text === "En Tratamiento") {
          doc.setFillColor(219, 234, 254);
        } else if (text === "Resuelto") {
          doc.setFillColor(220, 252, 231);
        }
      }
    },
  });

  addFooter(doc);
  doc.save(`historial_sanitario_${format(new Date(), "yyyyMMdd")}.pdf`);
}
