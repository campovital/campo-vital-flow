import { format, subDays } from "date-fns";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

// ============================================
// PRODUCTION REPORTS
// ============================================

export async function exportProductionReport(filters: ReportFilters = {}): Promise<void> {
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
  } else {
    query = query.gte("harvest_date", subDays(new Date(), 30).toISOString().split("T")[0]);
  }
  if (filters.dateTo) {
    query = query.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
  }

  const { data, error } = await query;

  if (error) throw new Error("Error al obtener datos: " + error.message);
  if (!data || data.length === 0) {
    throw new Error("No hay datos de producción para exportar");
  }

  let filteredData = data;
  if (filters.lotId) {
    filteredData = filteredData.filter((d: any) => d.lot?.id === filters.lotId);
  }
  if (filters.operatorId) {
    filteredData = filteredData.filter((d: any) => d.operator?.id === filters.operatorId);
  }

  if (filteredData.length === 0) {
    throw new Error("No hay datos con los filtros seleccionados");
  }

  const reportData = filteredData.map((row: any) => ({
    Fecha: format(new Date(row.harvest_date), "dd/MM/yyyy"),
    Lote: row.lot?.name || "—",
    Operario: row.operator?.full_name || "—",
    "Total (kg)": row.total_kg || 0,
    "Exportable (kg)": row.exportable_kg || 0,
    "Rechazo (kg)": row.rejected_kg || 0,
    Clasificación: row.classification || "—",
    "% Exportable": row.total_kg > 0 
      ? ((row.exportable_kg / row.total_kg) * 100).toFixed(1) + "%" 
      : "0%",
  }));

  // Add summary row
  const totalKg = filteredData.reduce((sum: number, r: any) => sum + (r.total_kg || 0), 0);
  const totalExportable = filteredData.reduce((sum: number, r: any) => sum + (r.exportable_kg || 0), 0);
  const totalRejected = filteredData.reduce((sum: number, r: any) => sum + (r.rejected_kg || 0), 0);

  reportData.push({
    Fecha: "TOTALES",
    Lote: "",
    Operario: "",
    "Total (kg)": totalKg,
    "Exportable (kg)": totalExportable,
    "Rechazo (kg)": totalRejected,
    Clasificación: "",
    "% Exportable": totalKg > 0 ? ((totalExportable / totalKg) * 100).toFixed(1) + "%" : "0%",
  });

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Producción");
  XLSX.writeFile(workbook, `produccion_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ============================================
// PRODUCTIVITY BY OPERATOR
// ============================================

export async function exportProductivityReport(filters: ReportFilters = {}): Promise<void> {
  let harvestQuery = supabase.from("harvests").select(`total_kg, operator:operators(id, full_name)`);
  let appQuery = supabase.from("applications").select(`labor_hours, operator:operators(id, full_name)`);

  if (filters.dateFrom) {
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
  } else {
    const startDate = subDays(new Date(), 30);
    harvestQuery = harvestQuery.gte("harvest_date", startDate.toISOString().split("T")[0]);
    appQuery = appQuery.gte("device_time", startDate.toISOString());
  }

  if (filters.dateTo) {
    harvestQuery = harvestQuery.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
    appQuery = appQuery.lte("device_time", filters.dateTo.toISOString());
  }

  const { data: harvests } = await harvestQuery;
  const { data: applications } = await appQuery;

  // Aggregate by operator
  const operatorStats: Record<string, {
    name: string;
    harvests: number;
    totalKg: number;
    applications: number;
    totalHours: number;
  }> = {};

  harvests?.forEach((h: any) => {
    const opId = h.operator?.id;
    if (!opId) return;
    if (filters.operatorId && opId !== filters.operatorId) return;
    if (!operatorStats[opId]) {
      operatorStats[opId] = {
        name: h.operator.full_name,
        harvests: 0,
        totalKg: 0,
        applications: 0,
        totalHours: 0,
      };
    }
    operatorStats[opId].harvests++;
    operatorStats[opId].totalKg += h.total_kg || 0;
  });

  applications?.forEach((a: any) => {
    const opId = a.operator?.id;
    if (!opId) return;
    if (filters.operatorId && opId !== filters.operatorId) return;
    if (!operatorStats[opId]) {
      operatorStats[opId] = {
        name: a.operator.full_name,
        harvests: 0,
        totalKg: 0,
        applications: 0,
        totalHours: 0,
      };
    }
    operatorStats[opId].applications++;
    operatorStats[opId].totalHours += a.labor_hours || 0;
  });

  const stats = Object.values(operatorStats);
  if (stats.length === 0) {
    throw new Error("No hay datos de productividad para exportar");
  }

  const reportData = stats.map(op => ({
    Operario: op.name,
    "Cosechas realizadas": op.harvests,
    "Total kg cosechados": op.totalKg.toFixed(1),
    "Aplicaciones realizadas": op.applications,
    "Horas trabajadas": op.totalHours.toFixed(1),
    "Promedio kg/cosecha": op.harvests > 0 ? (op.totalKg / op.harvests).toFixed(1) : "0",
  }));

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productividad");
  XLSX.writeFile(workbook, `productividad_operarios_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ============================================
// COSTS VS PRODUCTION
// ============================================

export async function exportCostsReport(filters: ReportFilters = {}): Promise<void> {
  let appQuery = supabase
    .from("applications")
    .select(`device_time, total_product_cost, total_labor_cost, total_cost, lot:lots(id, name)`)
    .order("device_time", { ascending: false });

  let harvestQuery = supabase.from("harvests").select("harvest_date, total_kg, lot:lots(id, name)");

  if (filters.dateFrom) {
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  } else {
    const startDate = subDays(new Date(), 30).toISOString();
    appQuery = appQuery.gte("device_time", startDate);
    harvestQuery = harvestQuery.gte("harvest_date", startDate.split("T")[0]);
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

  // Detailed applications
  const detailData = filteredApps.map((app: any) => ({
    Fecha: format(new Date(app.device_time), "dd/MM/yyyy"),
    Lote: app.lot?.name || "—",
    "Costo Insumos": app.total_product_cost || 0,
    "Costo M.O.": app.total_labor_cost || 0,
    "Costo Total": app.total_cost || 0,
  }));

  // Summary sheet
  const summaryData = [
    { Métrica: "Total Producción (kg)", Valor: totalKg.toFixed(1) },
    { Métrica: "Costo Total Insumos", Valor: totalProductCost },
    { Métrica: "Costo Total Mano de Obra", Valor: totalLaborCost },
    { Métrica: "Costo Total", Valor: totalCost },
    { Métrica: "Costo por Kilo", Valor: costPerKg.toFixed(0) },
  ];

  const workbook = XLSX.utils.book_new();
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");
  
  if (detailData.length > 0) {
    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");
  }
  
  XLSX.writeFile(workbook, `costos_produccion_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ============================================
// INVENTORY CONSUMPTION
// ============================================

export async function exportInventoryReport(): Promise<void> {
  // Current stock
  const { data: batches } = await supabase
    .from("inventory_batches")
    .select(`
      quantity,
      expiry_date,
      product:inventory_products(name, unit)
    `);

  // Products used in applications
  const { data: usedProducts } = await supabase
    .from("application_products")
    .select(`
      quantity_used,
      product:inventory_products(name, unit)
    `);

  // Aggregate stock by product
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
  
  if (products.length === 0) {
    throw new Error("No hay datos de inventario para exportar");
  }

  const reportData = products.map(p => ({
    Producto: p.name,
    Unidad: p.unit,
    "Stock Actual": p.stock.toFixed(2),
    "Consumo Total": p.used.toFixed(2),
    "Estado": p.stock < 10 ? "BAJO" : "OK",
  }));

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
  XLSX.writeFile(workbook, `inventario_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ============================================
// SANITARY HISTORY
// ============================================

export async function exportSanitaryReport(filters: ReportFilters = {}): Promise<void> {
  let query = supabase
    .from("pest_reports")
    .select(`
      created_at,
      pest_type,
      severity,
      status,
      incidence_percent,
      follow_up_date,
      resolved_at,
      lot:lots(id, name)
    `)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom.toISOString());
  } else {
    query = query.gte("created_at", subDays(new Date(), 90).toISOString());
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

  if (filteredData.length === 0) {
    throw new Error("No hay reportes sanitarios para exportar");
  }

  const statusLabels: Record<string, string> = {
    pendiente: "Pendiente",
    en_tratamiento: "En Tratamiento",
    resuelto: "Resuelto",
  };

  const reportData = filteredData.map((r: any) => ({
    Fecha: format(new Date(r.created_at), "dd/MM/yyyy"),
    Lote: r.lot?.name || "—",
    "Tipo de Plaga": r.pest_type,
    Severidad: `${r.severity}/5`,
    "Incidencia (%)": r.incidence_percent || "—",
    Estado: statusLabels[r.status] || r.status,
    "Fecha Seguimiento": r.follow_up_date 
      ? format(new Date(r.follow_up_date), "dd/MM/yyyy") 
      : "—",
    "Fecha Resolución": r.resolved_at 
      ? format(new Date(r.resolved_at), "dd/MM/yyyy") 
      : "—",
  }));

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Sanitario");
  XLSX.writeFile(workbook, `historial_sanitario_${format(new Date(), "yyyyMMdd")}.xlsx`);
}
