import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getDateRangeLabel, toDateOnly, toTimestampEnd, toTimestampStart } from "@/lib/report-filter-utils";

export interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

export type ReportId =
  | "harvest"
  | "phytosanitary"
  | "fertilization"
  | "productivity"
  | "costs"
  | "inventory"
  | "sanitary";

export interface ReportPreviewData {
  columns: string[];
  rows: Array<Record<string, string>>;
  summary: Array<{ label: string; value: string }>;
  emptyMessage: string;
  rangeLabel: string;
}

const sanitaryStatusLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_tratamiento: "En Tratamiento",
  resuelto: "Resuelto",
};

const applicationStatusLabels: Record<string, string> = {
  ejecutada: "Ejecutada",
  no_ejecutada: "No Ejecutada",
  ejecutada_con_novedad: "Con Novedad",
};

function emptyPreview(columns: string[], emptyMessage: string, filters: ReportFilters): ReportPreviewData {
  return {
    columns,
    rows: [],
    summary: [{ label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) }],
    emptyMessage,
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchProductsByApplicationIds(appIds: string[]) {
  if (appIds.length === 0) return new Map<string, string[]>();

  const { data, error } = await supabase
    .from("application_products")
    .select("application_id, product:inventory_products(name)")
    .in("application_id", appIds);

  if (error) throw new Error(`Error al obtener productos del informe: ${error.message}`);

  const map = new Map<string, string[]>();
  (data || []).forEach((item: any) => {
    const current = map.get(item.application_id) || [];
    const productName = item.product?.name;
    if (productName) {
      current.push(productName);
      map.set(item.application_id, current);
    }
  });

  return map;
}

async function fetchHarvestPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  let query = supabase
    .from("harvests")
    .select(`
      harvest_date,
      total_kg,
      exportable_kg,
      rejected_kg,
      classification,
      notes,
      lot:lots(name),
      operator:operators(full_name)
    `)
    .order("harvest_date", { ascending: true });

  if (filters.dateFrom) query = query.gte("harvest_date", toDateOnly(filters.dateFrom));
  if (filters.dateTo) query = query.lte("harvest_date", toDateOnly(filters.dateTo));
  if (filters.lotId) query = query.eq("lot_id", filters.lotId);
  if (filters.operatorId) query = query.eq("operator_id", filters.operatorId);

  const { data, error } = await query;
  if (error) throw new Error(`Error al consultar cosechas: ${error.message}`);

  const records = data || [];
  const columns = ["Fecha", "Lote", "Operario", "Total kg", "Exportable kg", "Rechazo kg", "Clasificación"];
  if (records.length === 0) {
    return emptyPreview(columns, "No hay registros de cosecha en el rango seleccionado.", filters);
  }

  const totalKg = records.reduce((sum: number, row: any) => sum + (row.total_kg || 0), 0);
  const exportableKg = records.reduce((sum: number, row: any) => sum + (row.exportable_kg || 0), 0);

  return {
    columns,
    rows: records.map((row: any) => ({
      Fecha: format(new Date(row.harvest_date), "dd/MM/yyyy"),
      Lote: row.lot?.name || "—",
      Operario: row.operator?.full_name || "—",
      "Total kg": (row.total_kg || 0).toFixed(1),
      "Exportable kg": (row.exportable_kg || 0).toFixed(1),
      "Rechazo kg": (row.rejected_kg || 0).toFixed(1),
      Clasificación: row.classification || "—",
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Registros", value: String(records.length) },
      { label: "Producción", value: `${totalKg.toFixed(1)} kg` },
      {
        label: "% exportable",
        value: totalKg > 0 ? `${((exportableKg / totalKg) * 100).toFixed(1)}%` : "0%",
      },
    ],
    emptyMessage: "No hay registros de cosecha en el rango seleccionado.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchPhytosanitaryPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  let query = supabase
    .from("applications")
    .select(`
      id,
      device_time,
      status,
      biological_target,
      application_type,
      equipment_type,
      weather_conditions,
      water_volume_liters,
      lot:lots(name),
      operator:operators(full_name),
      protocol_version:protocol_versions(version_number, protocols(name))
    `)
    .order("device_time", { ascending: true });

  if (filters.dateFrom) query = query.gte("device_time", toTimestampStart(filters.dateFrom));
  if (filters.dateTo) query = query.lte("device_time", toTimestampEnd(filters.dateTo));
  if (filters.lotId) query = query.eq("lot_id", filters.lotId);
  if (filters.operatorId) query = query.eq("operator_id", filters.operatorId);

  const { data, error } = await query;
  if (error) throw new Error(`Error al consultar aplicaciones fitosanitarias: ${error.message}`);

  const records = data || [];
  const columns = ["Fecha", "Lote", "Operario", "Protocolo", "Productos", "Blanco biológico", "Estado"];
  if (records.length === 0) {
    return emptyPreview(columns, "No hay aplicaciones fitosanitarias en el rango seleccionado.", filters);
  }

  const productsByApplication = await fetchProductsByApplicationIds(records.map((record: any) => record.id));
  const executed = records.filter((record: any) => record.status === "ejecutada").length;

  return {
    columns,
    rows: records.map((record: any) => ({
      Fecha: format(new Date(record.device_time), "dd/MM/yyyy"),
      Lote: record.lot?.name || "—",
      Operario: record.operator?.full_name || "—",
      Protocolo: record.protocol_version?.protocols?.name || "—",
      Productos: (productsByApplication.get(record.id) || []).join(", ") || "—",
      "Blanco biológico": record.biological_target || "—",
      Estado: applicationStatusLabels[record.status] || record.status,
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Registros", value: String(records.length) },
      { label: "Ejecutadas", value: String(executed) },
    ],
    emptyMessage: "No hay aplicaciones fitosanitarias en el rango seleccionado.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchFertilizationPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  const { data: nutritionVersions, error: versionError } = await supabase
    .from("protocol_versions")
    .select("id, protocols!inner(category)")
    .eq("protocols.category", "nutricion");

  if (versionError) throw new Error(`Error al consultar protocolos de fertilización: ${versionError.message}`);

  const nutritionVersionIds = (nutritionVersions || []).map((version: any) => version.id);
  const columns = ["Fecha", "Lote", "Operario", "Protocolo", "Productos", "Equipo", "Estado"];

  if (nutritionVersionIds.length === 0) {
    return emptyPreview(columns, "No hay protocolos de nutrición publicados para consultar este informe.", filters);
  }

  let query = supabase
    .from("applications")
    .select(`
      id,
      device_time,
      status,
      equipment_type,
      lot:lots(name),
      operator:operators(full_name),
      protocol_version:protocol_versions(version_number, protocols(name))
    `)
    .in("protocol_version_id", nutritionVersionIds)
    .order("device_time", { ascending: true });

  if (filters.dateFrom) query = query.gte("device_time", toTimestampStart(filters.dateFrom));
  if (filters.dateTo) query = query.lte("device_time", toTimestampEnd(filters.dateTo));
  if (filters.lotId) query = query.eq("lot_id", filters.lotId);
  if (filters.operatorId) query = query.eq("operator_id", filters.operatorId);

  const { data, error } = await query;
  if (error) throw new Error(`Error al consultar fertilizaciones: ${error.message}`);

  const records = data || [];
  if (records.length === 0) {
    return emptyPreview(columns, "No hay registros de fertilización en el rango seleccionado.", filters);
  }

  const productsByApplication = await fetchProductsByApplicationIds(records.map((record: any) => record.id));

  return {
    columns,
    rows: records.map((record: any) => ({
      Fecha: format(new Date(record.device_time), "dd/MM/yyyy"),
      Lote: record.lot?.name || "—",
      Operario: record.operator?.full_name || "—",
      Protocolo: record.protocol_version?.protocols?.name || "—",
      Productos: (productsByApplication.get(record.id) || []).join(", ") || "—",
      Equipo: record.equipment_type || "—",
      Estado: applicationStatusLabels[record.status] || record.status,
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Registros", value: String(records.length) },
    ],
    emptyMessage: "No hay registros de fertilización en el rango seleccionado.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchProductivityPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  let harvestQuery = supabase.from("harvests").select(`total_kg, operator:operators(id, full_name)`);
  let applicationQuery = supabase.from("applications").select(`labor_hours, operator:operators(id, full_name)`);

  if (filters.dateFrom) {
    harvestQuery = harvestQuery.gte("harvest_date", toDateOnly(filters.dateFrom));
    applicationQuery = applicationQuery.gte("device_time", toTimestampStart(filters.dateFrom));
  } else {
    const defaultStart = subDays(new Date(), 30);
    harvestQuery = harvestQuery.gte("harvest_date", toDateOnly(defaultStart));
    applicationQuery = applicationQuery.gte("device_time", toTimestampStart(defaultStart));
  }

  if (filters.dateTo) {
    harvestQuery = harvestQuery.lte("harvest_date", toDateOnly(filters.dateTo));
    applicationQuery = applicationQuery.lte("device_time", toTimestampEnd(filters.dateTo));
  }

  const [{ data: harvests, error: harvestError }, { data: applications, error: appError }] = await Promise.all([
    harvestQuery,
    applicationQuery,
  ]);

  if (harvestError) throw new Error(`Error al consultar cosechas para productividad: ${harvestError.message}`);
  if (appError) throw new Error(`Error al consultar aplicaciones para productividad: ${appError.message}`);

  const stats: Record<string, { Operario: string; Cosechas: number; "Total kg": number; Aplicaciones: number; "Horas trabajadas": number }> = {};

  (harvests || []).forEach((row: any) => {
    const operatorId = row.operator?.id;
    if (!operatorId || (filters.operatorId && operatorId !== filters.operatorId)) return;
    if (!stats[operatorId]) {
      stats[operatorId] = { Operario: row.operator.full_name, Cosechas: 0, "Total kg": 0, Aplicaciones: 0, "Horas trabajadas": 0 };
    }
    stats[operatorId].Cosechas += 1;
    stats[operatorId]["Total kg"] += row.total_kg || 0;
  });

  (applications || []).forEach((row: any) => {
    const operatorId = row.operator?.id;
    if (!operatorId || (filters.operatorId && operatorId !== filters.operatorId)) return;
    if (!stats[operatorId]) {
      stats[operatorId] = { Operario: row.operator.full_name, Cosechas: 0, "Total kg": 0, Aplicaciones: 0, "Horas trabajadas": 0 };
    }
    stats[operatorId].Aplicaciones += 1;
    stats[operatorId]["Horas trabajadas"] += row.labor_hours || 0;
  });

  const rows = Object.values(stats);
  const columns = ["Operario", "Cosechas", "Total kg", "Aplicaciones", "Horas trabajadas", "Prom. kg/cosecha"];
  if (rows.length === 0) {
    return emptyPreview(columns, "No hay datos de productividad con los filtros seleccionados.", filters);
  }

  return {
    columns,
    rows: rows.map((row) => ({
      Operario: row.Operario,
      Cosechas: String(row.Cosechas),
      "Total kg": row["Total kg"].toFixed(1),
      Aplicaciones: String(row.Aplicaciones),
      "Horas trabajadas": row["Horas trabajadas"].toFixed(1),
      "Prom. kg/cosecha": row.Cosechas > 0 ? (row["Total kg"] / row.Cosechas).toFixed(1) : "0",
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Operarios", value: String(rows.length) },
    ],
    emptyMessage: "No hay datos de productividad con los filtros seleccionados.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchCostsPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  let appQuery = supabase
    .from("applications")
    .select(`device_time, total_product_cost, total_labor_cost, total_cost, lot:lots(id, name)`)
    .order("device_time", { ascending: true });

  let harvestQuery = supabase.from("harvests").select(`harvest_date, total_kg, lot:lots(id, name)`);

  if (filters.dateFrom) {
    appQuery = appQuery.gte("device_time", toTimestampStart(filters.dateFrom));
    harvestQuery = harvestQuery.gte("harvest_date", toDateOnly(filters.dateFrom));
  } else {
    const defaultStart = subDays(new Date(), 30);
    appQuery = appQuery.gte("device_time", toTimestampStart(defaultStart));
    harvestQuery = harvestQuery.gte("harvest_date", toDateOnly(defaultStart));
  }

  if (filters.dateTo) {
    appQuery = appQuery.lte("device_time", toTimestampEnd(filters.dateTo));
    harvestQuery = harvestQuery.lte("harvest_date", toDateOnly(filters.dateTo));
  }

  const [{ data: applications, error: appError }, { data: harvests, error: harvestError }] = await Promise.all([
    appQuery,
    harvestQuery,
  ]);

  if (appError) throw new Error(`Error al consultar costos: ${appError.message}`);
  if (harvestError) throw new Error(`Error al consultar producción para costos: ${harvestError.message}`);

  let filteredApps = applications || [];
  let filteredHarvests = harvests || [];

  if (filters.lotId) {
    filteredApps = filteredApps.filter((row: any) => row.lot?.id === filters.lotId);
    filteredHarvests = filteredHarvests.filter((row: any) => row.lot?.id === filters.lotId);
  }

  const columns = ["Fecha", "Lote", "Costo insumos", "Costo mano de obra", "Costo total"];
  if (filteredApps.length === 0) {
    return emptyPreview(columns, "No hay costos registrados con los filtros seleccionados.", filters);
  }

  const totalCost = filteredApps.reduce((sum: number, row: any) => sum + (row.total_cost || 0), 0);
  const totalKg = filteredHarvests.reduce((sum: number, row: any) => sum + (row.total_kg || 0), 0);

  return {
    columns,
    rows: filteredApps.map((row: any) => ({
      Fecha: format(new Date(row.device_time), "dd/MM/yyyy"),
      Lote: row.lot?.name || "—",
      "Costo insumos": `$${(row.total_product_cost || 0).toLocaleString()}`,
      "Costo mano de obra": `$${(row.total_labor_cost || 0).toLocaleString()}`,
      "Costo total": `$${(row.total_cost || 0).toLocaleString()}`,
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Costo total", value: `$${totalCost.toLocaleString()}` },
      { label: "Producción", value: `${totalKg.toFixed(1)} kg` },
      {
        label: "Costo/kg",
        value: totalKg > 0 ? `$${(totalCost / totalKg).toFixed(0)}` : "$0",
      },
    ],
    emptyMessage: "No hay costos registrados con los filtros seleccionados.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchInventoryPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  const [{ data: batches, error: batchError }, { data: usedProducts, error: usedError }] = await Promise.all([
    supabase.from("inventory_batches").select(`quantity, product:inventory_products(name, unit)`),
    supabase.from("application_products").select(`quantity_used, product:inventory_products(name, unit)`),
  ]);

  if (batchError) throw new Error(`Error al consultar inventario: ${batchError.message}`);
  if (usedError) throw new Error(`Error al consultar consumo de inventario: ${usedError.message}`);

  const stockByProduct: Record<string, { unit: string; stock: number; used: number }> = {};

  (batches || []).forEach((row: any) => {
    const name = row.product?.name;
    if (!name) return;
    if (!stockByProduct[name]) stockByProduct[name] = { unit: row.product.unit, stock: 0, used: 0 };
    stockByProduct[name].stock += row.quantity || 0;
  });

  (usedProducts || []).forEach((row: any) => {
    const name = row.product?.name;
    if (!name) return;
    if (!stockByProduct[name]) stockByProduct[name] = { unit: row.product.unit, stock: 0, used: 0 };
    stockByProduct[name].used += row.quantity_used || 0;
  });

  const products = Object.entries(stockByProduct);
  const columns = ["Producto", "Unidad", "Stock actual", "Consumo total", "Estado"];
  if (products.length === 0) {
    return emptyPreview(columns, "No hay datos de inventario para mostrar.", filters);
  }

  return {
    columns,
    rows: products.map(([name, values]) => ({
      Producto: name,
      Unidad: values.unit,
      "Stock actual": values.stock.toFixed(2),
      "Consumo total": values.used.toFixed(2),
      Estado: values.stock < 10 ? "Bajo" : "OK",
    })),
    summary: [
      { label: "Productos", value: String(products.length) },
      { label: "Stock bajo", value: String(products.filter(([, values]) => values.stock < 10).length) },
    ],
    emptyMessage: "No hay datos de inventario para mostrar.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

async function fetchSanitaryPreview(filters: ReportFilters): Promise<ReportPreviewData> {
  let query = supabase
    .from("pest_reports")
    .select(`created_at, pest_type, severity, status, incidence_percent, follow_up_date, lot:lots(id, name)`)
    .order("created_at", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("created_at", toTimestampStart(filters.dateFrom));
  } else {
    query = query.gte("created_at", toTimestampStart(subDays(new Date(), 90)));
  }
  if (filters.dateTo) query = query.lte("created_at", toTimestampEnd(filters.dateTo));
  if (filters.lotId) query = query.eq("lot_id", filters.lotId);

  const { data, error } = await query;
  if (error) throw new Error(`Error al consultar historial sanitario: ${error.message}`);

  const records = data || [];
  const columns = ["Fecha", "Lote", "Plaga o enfermedad", "Severidad", "Incidencia", "Estado", "Seguimiento"];
  if (records.length === 0) {
    return emptyPreview(columns, "No hay reportes sanitarios en el rango seleccionado.", filters);
  }

  return {
    columns,
    rows: records.map((record: any) => ({
      Fecha: format(new Date(record.created_at), "dd/MM/yyyy"),
      Lote: record.lot?.name || "—",
      "Plaga o enfermedad": record.pest_type,
      Severidad: `${record.severity}/5`,
      Incidencia: record.incidence_percent ? `${record.incidence_percent}%` : "—",
      Estado: sanitaryStatusLabels[record.status] || record.status,
      Seguimiento: record.follow_up_date ? format(new Date(record.follow_up_date), "dd/MM/yyyy") : "—",
    })),
    summary: [
      { label: "Período", value: getDateRangeLabel(filters.dateFrom, filters.dateTo) },
      { label: "Pendientes", value: String(records.filter((record: any) => record.status === "pendiente").length) },
      { label: "Resueltos", value: String(records.filter((record: any) => record.status === "resuelto").length) },
    ],
    emptyMessage: "No hay reportes sanitarios en el rango seleccionado.",
    rangeLabel: getDateRangeLabel(filters.dateFrom, filters.dateTo),
  };
}

export async function fetchReportPreview(reportId: ReportId, filters: ReportFilters): Promise<ReportPreviewData> {
  switch (reportId) {
    case "harvest":
      return fetchHarvestPreview(filters);
    case "phytosanitary":
      return fetchPhytosanitaryPreview(filters);
    case "fertilization":
      return fetchFertilizationPreview(filters);
    case "productivity":
      return fetchProductivityPreview(filters);
    case "costs":
      return fetchCostsPreview(filters);
    case "inventory":
      return fetchInventoryPreview(filters);
    case "sanitary":
      return fetchSanitaryPreview(filters);
    default:
      throw new Error("Tipo de informe no soportado.");
  }
}
