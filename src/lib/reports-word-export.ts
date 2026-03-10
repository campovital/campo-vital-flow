import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { generateWordFromHtml, buildHtmlTable, buildInfoSection } from "@/lib/word-export-utils";

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
  ejecutada: "Ejecutada",
  no_ejecutada: "No Ejecutada",
  ejecutada_con_novedad: "Ejecutada con Novedad",
};

function genDate(): string {
  return format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
}

// ============================================
// PRODUCTION WORD
// ============================================
export async function exportProductionWord(filters: ReportFilters = {}): Promise<void> {
  let query = supabase
    .from("harvests")
    .select(`
      harvest_date, total_kg, exportable_kg, rejected_kg, classification, notes,
      lot:lots(id, name),
      operator:operators(id, full_name)
    `)
    .order("harvest_date", { ascending: false });

  if (filters.dateFrom) query = query.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  else query = query.gte("harvest_date", subDays(new Date(), 30).toISOString().split("T")[0]);
  if (filters.dateTo) query = query.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let filtered = data || [];
  if (filters.lotId) filtered = filtered.filter((d: any) => d.lot?.id === filters.lotId);
  if (filters.operatorId) filtered = filtered.filter((d: any) => d.operator?.id === filters.operatorId);
  if (filtered.length === 0) throw new Error("No hay datos de producción para exportar");

  const totalKg = filtered.reduce((s: number, r: any) => s + (r.total_kg || 0), 0);
  const totalExp = filtered.reduce((s: number, r: any) => s + (r.exportable_kg || 0), 0);
  const totalRej = filtered.reduce((s: number, r: any) => s + (r.rejected_kg || 0), 0);

  const headers = ["Fecha", "Lote", "Operario", "Total (kg)", "Exportable (kg)", "Rechazo (kg)", "Clasificación", "% Exportable", "Notas"];
  const rows = filtered.map((r: any) => [
    format(new Date(r.harvest_date), "dd/MM/yyyy"),
    r.lot?.name || "—",
    r.operator?.full_name || "—",
    String(r.total_kg || 0),
    String(r.exportable_kg || 0),
    String(r.rejected_kg || 0),
    r.classification || "—",
    r.total_kg > 0 ? ((r.exportable_kg / r.total_kg) * 100).toFixed(1) + "%" : "0%",
    r.notes || "—",
  ]);

  const html = `
    <h1>Informe de Producción</h1>
    ${buildInfoSection([
      ["Generado", genDate()],
      ["Total registros", String(filtered.length)],
    ])}
    <h2>Resumen</h2>
    ${buildHtmlTable(["Métrica", "Valor"], [
      ["Total Producción", `${totalKg.toFixed(1)} kg`],
      ["Total Exportable", `${totalExp.toFixed(1)} kg`],
      ["Total Rechazo", `${totalRej.toFixed(1)} kg`],
      ["% Exportable", totalKg > 0 ? ((totalExp / totalKg) * 100).toFixed(1) + "%" : "0%"],
    ])}
    <h2>Detalle</h2>
    ${buildHtmlTable(headers, rows)}
  `;

  generateWordFromHtml(html, `produccion_${format(new Date(), "yyyyMMdd")}.doc`);
}

// ============================================
// PRODUCTIVITY WORD
// ============================================
export async function exportProductivityWord(filters: ReportFilters = {}): Promise<void> {
  let harvestQuery = supabase.from("harvests").select(`total_kg, operator:operators(id, full_name)`);
  let appQuery = supabase.from("applications").select(`labor_hours, operator:operators(id, full_name)`);

  if (filters.dateFrom) {
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
  } else {
    const s = subDays(new Date(), 30);
    harvestQuery = harvestQuery.gte("harvest_date", s.toISOString().split("T")[0]);
    appQuery = appQuery.gte("device_time", s.toISOString());
  }
  if (filters.dateTo) {
    harvestQuery = harvestQuery.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
    appQuery = appQuery.lte("device_time", filters.dateTo.toISOString());
  }

  const { data: harvests } = await harvestQuery;
  const { data: applications } = await appQuery;

  const stats: Record<string, { name: string; harvests: number; totalKg: number; applications: number; totalHours: number }> = {};

  harvests?.forEach((h: any) => {
    const opId = h.operator?.id;
    if (!opId || (filters.operatorId && opId !== filters.operatorId)) return;
    if (!stats[opId]) stats[opId] = { name: h.operator.full_name, harvests: 0, totalKg: 0, applications: 0, totalHours: 0 };
    stats[opId].harvests++;
    stats[opId].totalKg += h.total_kg || 0;
  });

  applications?.forEach((a: any) => {
    const opId = a.operator?.id;
    if (!opId || (filters.operatorId && opId !== filters.operatorId)) return;
    if (!stats[opId]) stats[opId] = { name: a.operator.full_name, harvests: 0, totalKg: 0, applications: 0, totalHours: 0 };
    stats[opId].applications++;
    stats[opId].totalHours += a.labor_hours || 0;
  });

  const values = Object.values(stats);
  if (values.length === 0) throw new Error("No hay datos de productividad para exportar");

  const headers = ["Operario", "Cosechas", "Total kg", "Aplicaciones", "Horas Trabajadas", "Prom kg/cosecha"];
  const rows = values.map(op => [
    op.name, String(op.harvests), op.totalKg.toFixed(1),
    String(op.applications), op.totalHours.toFixed(1),
    op.harvests > 0 ? (op.totalKg / op.harvests).toFixed(1) : "0",
  ]);

  const html = `
    <h1>Productividad por Operario</h1>
    ${buildInfoSection([["Generado", genDate()], ["Operarios analizados", String(values.length)]])}
    <h2>Detalle por Operario</h2>
    ${buildHtmlTable(headers, rows)}
  `;

  generateWordFromHtml(html, `productividad_${format(new Date(), "yyyyMMdd")}.doc`);
}

// ============================================
// COSTS WORD
// ============================================
export async function exportCostsWord(filters: ReportFilters = {}): Promise<void> {
  let appQuery = supabase.from("applications")
    .select(`device_time, total_product_cost, total_labor_cost, total_cost, lot:lots(id, name)`)
    .order("device_time", { ascending: false });
  let harvestQuery = supabase.from("harvests").select("harvest_date, total_kg, lot:lots(id, name)");

  if (filters.dateFrom) {
    appQuery = appQuery.gte("device_time", filters.dateFrom.toISOString());
    harvestQuery = harvestQuery.gte("harvest_date", format(filters.dateFrom, "yyyy-MM-dd"));
  } else {
    const s = subDays(new Date(), 30).toISOString();
    appQuery = appQuery.gte("device_time", s);
    harvestQuery = harvestQuery.gte("harvest_date", s.split("T")[0]);
  }
  if (filters.dateTo) {
    appQuery = appQuery.lte("device_time", filters.dateTo.toISOString());
    harvestQuery = harvestQuery.lte("harvest_date", format(filters.dateTo, "yyyy-MM-dd"));
  }

  const { data: apps } = await appQuery;
  const { data: harvests } = await harvestQuery;

  let filteredApps = apps || [];
  let filteredHarvests = harvests || [];
  if (filters.lotId) {
    filteredApps = filteredApps.filter((a: any) => a.lot?.id === filters.lotId);
    filteredHarvests = filteredHarvests.filter((h: any) => h.lot?.id === filters.lotId);
  }

  const totalCost = filteredApps.reduce((s: number, a: any) => s + (a.total_cost || 0), 0);
  const totalProdCost = filteredApps.reduce((s: number, a: any) => s + (a.total_product_cost || 0), 0);
  const totalLabor = filteredApps.reduce((s: number, a: any) => s + (a.total_labor_cost || 0), 0);
  const totalKg = filteredHarvests.reduce((s: number, h: any) => s + (h.total_kg || 0), 0);
  const costPerKg = totalKg > 0 ? totalCost / totalKg : 0;

  const detailHeaders = ["Fecha", "Lote", "Costo Insumos", "Costo M.O.", "Costo Total"];
  const detailRows = filteredApps.map((a: any) => [
    format(new Date(a.device_time), "dd/MM/yyyy"),
    a.lot?.name || "—",
    `$${(a.total_product_cost || 0).toLocaleString()}`,
    `$${(a.total_labor_cost || 0).toLocaleString()}`,
    `$${(a.total_cost || 0).toLocaleString()}`,
  ]);

  const html = `
    <h1>Costos vs Producción</h1>
    ${buildInfoSection([["Generado", genDate()]])}
    <h2>Resumen</h2>
    ${buildHtmlTable(["Métrica", "Valor"], [
      ["Total Producción", `${totalKg.toFixed(1)} kg`],
      ["Costo Total Insumos", `$${totalProdCost.toLocaleString()}`],
      ["Costo Total Mano de Obra", `$${totalLabor.toLocaleString()}`],
      ["Costo Total", `$${totalCost.toLocaleString()}`],
      ["Costo por Kilo", `$${costPerKg.toFixed(0)}`],
    ])}
    <h2>Detalle de Aplicaciones</h2>
    ${buildHtmlTable(detailHeaders, detailRows)}
  `;

  generateWordFromHtml(html, `costos_${format(new Date(), "yyyyMMdd")}.doc`);
}

// ============================================
// INVENTORY WORD
// ============================================
export async function exportInventoryWord(): Promise<void> {
  const { data: batches } = await supabase.from("inventory_batches")
    .select(`quantity, expiry_date, product:inventory_products(name, unit)`);
  const { data: usedProducts } = await supabase.from("application_products")
    .select(`quantity_used, product:inventory_products(name, unit)`);

  const stock: Record<string, { name: string; unit: string; stock: number; used: number }> = {};

  batches?.forEach((b: any) => {
    const n = b.product?.name;
    if (!n) return;
    if (!stock[n]) stock[n] = { name: n, unit: b.product.unit, stock: 0, used: 0 };
    stock[n].stock += b.quantity || 0;
  });

  usedProducts?.forEach((u: any) => {
    const n = u.product?.name;
    if (!n) return;
    if (!stock[n]) stock[n] = { name: n, unit: u.product.unit, stock: 0, used: 0 };
    stock[n].used += u.quantity_used || 0;
  });

  const products = Object.values(stock);
  if (products.length === 0) throw new Error("No hay datos de inventario para exportar");

  const headers = ["Producto", "Unidad", "Stock Actual", "Consumo Total", "Estado"];
  const rows = products.map(p => [
    p.name, p.unit, p.stock.toFixed(2), p.used.toFixed(2), p.stock < 10 ? "BAJO" : "OK",
  ]);

  const html = `
    <h1>Consumo de Insumos</h1>
    ${buildInfoSection([["Generado", genDate()], ["Total productos", String(products.length)]])}
    <h2>Detalle de Inventario</h2>
    ${buildHtmlTable(headers, rows)}
  `;

  generateWordFromHtml(html, `inventario_${format(new Date(), "yyyyMMdd")}.doc`);
}

// ============================================
// SANITARY WORD
// ============================================
export async function exportSanitaryWord(filters: ReportFilters = {}): Promise<void> {
  let query = supabase
    .from("pest_reports")
    .select(`
      created_at, pest_type, severity, status, incidence_percent,
      follow_up_date, resolved_at, notes,
      lot:lots(id, name)
    `)
    .order("created_at", { ascending: false });

  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom.toISOString());
  else query = query.gte("created_at", subDays(new Date(), 90).toISOString());
  if (filters.dateTo) query = query.lte("created_at", filters.dateTo.toISOString());

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let filtered = data || [];
  if (filters.lotId) filtered = filtered.filter((d: any) => d.lot?.id === filters.lotId);
  if (filtered.length === 0) throw new Error("No hay reportes sanitarios para exportar");

  const pending = filtered.filter((r: any) => r.status === "pendiente").length;
  const treating = filtered.filter((r: any) => r.status === "en_tratamiento").length;
  const resolved = filtered.filter((r: any) => r.status === "resuelto").length;

  const headers = ["Fecha", "Lote", "Plaga/Enfermedad", "Severidad", "Incidencia", "Estado", "Seguimiento", "Resolución", "Notas"];
  const rows = filtered.map((r: any) => [
    format(new Date(r.created_at), "dd/MM/yyyy"),
    r.lot?.name || "—",
    r.pest_type,
    `${r.severity}/5`,
    r.incidence_percent ? `${r.incidence_percent}%` : "—",
    statusLabels[r.status] || r.status,
    r.follow_up_date ? format(new Date(r.follow_up_date), "dd/MM/yyyy") : "—",
    r.resolved_at ? format(new Date(r.resolved_at), "dd/MM/yyyy") : "—",
    r.notes || "—",
  ]);

  const html = `
    <h1>Historial Sanitario</h1>
    ${buildInfoSection([["Generado", genDate()], ["Total reportes", String(filtered.length)]])}
    <h2>Resumen</h2>
    ${buildHtmlTable(["Estado", "Cantidad"], [
      ["Pendientes", String(pending)],
      ["En Tratamiento", String(treating)],
      ["Resueltos", String(resolved)],
    ])}
    <h2>Detalle de Reportes</h2>
    ${buildHtmlTable(headers, rows)}
  `;

  generateWordFromHtml(html, `historial_sanitario_${format(new Date(), "yyyyMMdd")}.doc`);
}
