import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// PRODUCTION REPORTS
// ============================================

export interface ProductionReportData {
  harvest_date: string;
  lot_name: string;
  operator_name: string;
  total_kg: number;
  exportable_kg: number;
  rejected_kg: number;
  classification: string;
}

export async function exportProductionReport(days: number = 30): Promise<void> {
  const startDate = subDays(new Date(), days).toISOString().split("T")[0];
  
  const { data } = await supabase
    .from("harvests")
    .select(`
      harvest_date,
      total_kg,
      exportable_kg,
      rejected_kg,
      classification,
      lot:lots(name),
      operator:operators(full_name)
    `)
    .gte("harvest_date", startDate)
    .order("harvest_date", { ascending: false });

  if (!data || data.length === 0) {
    throw new Error("No hay datos de producción para exportar");
  }

  const reportData = data.map((row: any) => ({
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
  const totalKg = data.reduce((sum: number, r: any) => sum + (r.total_kg || 0), 0);
  const totalExportable = data.reduce((sum: number, r: any) => sum + (r.exportable_kg || 0), 0);
  const totalRejected = data.reduce((sum: number, r: any) => sum + (r.rejected_kg || 0), 0);

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

export async function exportProductivityReport(days: number = 30): Promise<void> {
  const startDate = subDays(new Date(), days).toISOString().split("T")[0];
  
  // Fetch harvests grouped by operator
  const { data: harvests } = await supabase
    .from("harvests")
    .select(`
      total_kg,
      operator:operators(id, full_name)
    `)
    .gte("harvest_date", startDate);

  // Fetch applications grouped by operator
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      labor_hours,
      operator:operators(id, full_name)
    `)
    .gte("device_time", subDays(new Date(), days).toISOString());

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

  const reportData = Object.values(operatorStats).map(op => ({
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

export async function exportCostsReport(days: number = 30): Promise<void> {
  const startDate = subDays(new Date(), days).toISOString();
  
  const { data: applications } = await supabase
    .from("applications")
    .select(`
      device_time,
      total_product_cost,
      total_labor_cost,
      total_cost,
      lot:lots(name)
    `)
    .gte("device_time", startDate)
    .order("device_time", { ascending: false });

  const { data: harvests } = await supabase
    .from("harvests")
    .select("harvest_date, total_kg")
    .gte("harvest_date", startDate.split("T")[0]);

  const totalCost = applications?.reduce((sum: number, a: any) => sum + (a.total_cost || 0), 0) || 0;
  const totalProductCost = applications?.reduce((sum: number, a: any) => sum + (a.total_product_cost || 0), 0) || 0;
  const totalLaborCost = applications?.reduce((sum: number, a: any) => sum + (a.total_labor_cost || 0), 0) || 0;
  const totalKg = harvests?.reduce((sum: number, h: any) => sum + (h.total_kg || 0), 0) || 0;
  const costPerKg = totalKg > 0 ? totalCost / totalKg : 0;

  // Detailed applications
  const detailData = applications?.map((app: any) => ({
    Fecha: format(new Date(app.device_time), "dd/MM/yyyy"),
    Lote: app.lot?.name || "—",
    "Costo Insumos": app.total_product_cost || 0,
    "Costo M.O.": app.total_labor_cost || 0,
    "Costo Total": app.total_cost || 0,
  })) || [];

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
  
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalle");
  
  XLSX.writeFile(workbook, `costos_produccion_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ============================================
// INVENTORY CONSUMPTION
// ============================================

export async function exportInventoryReport(): Promise<void> {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
  
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
      product:inventory_products(name, unit),
      application:applications(device_time)
    `)
    .gte("application.device_time", thirtyDaysAgo);

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

  const reportData = Object.values(stockByProduct).map(p => ({
    Producto: p.name,
    Unidad: p.unit,
    "Stock Actual": p.stock.toFixed(2),
    "Consumo (30 días)": p.used.toFixed(2),
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

export async function exportSanitaryReport(days: number = 90): Promise<void> {
  const startDate = subDays(new Date(), days).toISOString();
  
  const { data } = await supabase
    .from("pest_reports")
    .select(`
      created_at,
      pest_type,
      severity,
      status,
      incidence_percent,
      follow_up_date,
      resolved_at,
      lot:lots(name)
    `)
    .gte("created_at", startDate)
    .order("created_at", { ascending: false });

  const statusLabels: Record<string, string> = {
    pendiente: "Pendiente",
    en_tratamiento: "En Tratamiento",
    resuelto: "Resuelto",
  };

  const reportData = data?.map((r: any) => ({
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
  })) || [];

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Sanitario");
  XLSX.writeFile(workbook, `historial_sanitario_${format(new Date(), "yyyyMMdd")}.xlsx`);
}
