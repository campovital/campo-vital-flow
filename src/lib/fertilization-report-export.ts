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

interface FertilizationRecord {
  id: string;
  device_time: string;
  status: string;
  pumps_used: number | null;
  labor_hours: number | null;
  notes: string | null;
  water_volume_liters: number | null;
  equipment_type: string | null;
  application_type: string | null;
  start_time: string | null;
  end_time: string | null;
  weather_conditions: string | null;
  lot: { name: string } | null;
  operator: { full_name: string } | null;
  protocol_version: {
    version_number: number;
    protocols: { name: string; category: string } | null;
  } | null;
}

interface ProductDetail {
  application_id: string;
  quantity_used: number;
  product: {
    name: string;
    active_ingredient: string | null;
    unit: string;
    category: string | null;
  } | null;
}

async function fetchFertilizationData(filters: ReportFilters) {
  // Get protocol_version IDs that belong to 'nutricion' category
  const { data: nutritionVersions } = await supabase
    .from("protocol_versions")
    .select("id, protocols!inner(category)")
    .eq("protocols.category", "nutricion");

  const nutritionVersionIds = (nutritionVersions || []).map((v: any) => v.id);

  let query = supabase
    .from("applications")
    .select(`
      id, device_time, status, pumps_used, labor_hours, notes,
      water_volume_liters, equipment_type, application_type,
      start_time, end_time, weather_conditions,
      lot:lots(name),
      operator:operators(full_name),
      protocol_version:protocol_versions(version_number, protocols(name, category))
    `)
    .order("device_time", { ascending: true });

  if (nutritionVersionIds.length > 0) {
    query = query.in("protocol_version_id", nutritionVersionIds);
  } else {
    // If no nutrition protocols exist, we still try - the report will be empty
    query = query.eq("protocol_version_id", "00000000-0000-0000-0000-000000000000");
  }

  if (filters.dateFrom) query = query.gte("device_time", filters.dateFrom.toISOString());
  if (filters.dateTo) query = query.lte("device_time", filters.dateTo.toISOString());

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let records = (data || []) as unknown as FertilizationRecord[];

  // Fetch products
  const appIds = records.map((r) => r.id);
  let products: ProductDetail[] = [];
  if (appIds.length > 0) {
    const { data: prodData } = await supabase
      .from("application_products")
      .select(`application_id, quantity_used, product:inventory_products(name, active_ingredient, unit, category)`)
      .in("application_id", appIds);
    products = (prodData || []) as unknown as ProductDetail[];
  }

  // Apply lot/operator filters on fetched data
  if (filters.lotId) {
    // Re-query with lot filter
    let q2 = supabase
      .from("applications")
      .select(`id, device_time, status, pumps_used, labor_hours, notes, water_volume_liters, equipment_type, application_type, start_time, end_time, weather_conditions, lot_id, operator_id, lot:lots(name), operator:operators(full_name), protocol_version:protocol_versions(version_number, protocols(name, category))`)
      .order("device_time", { ascending: true })
      .eq("lot_id", filters.lotId);

    if (nutritionVersionIds.length > 0) q2 = q2.in("protocol_version_id", nutritionVersionIds);
    if (filters.dateFrom) q2 = q2.gte("device_time", filters.dateFrom.toISOString());
    if (filters.dateTo) q2 = q2.lte("device_time", filters.dateTo.toISOString());

    const { data: d2 } = await q2;
    records = (d2 || []) as unknown as FertilizationRecord[];

    const newAppIds = records.map((r) => r.id);
    if (newAppIds.length > 0) {
      const { data: pd2 } = await supabase
        .from("application_products")
        .select(`application_id, quantity_used, product:inventory_products(name, active_ingredient, unit, category)`)
        .in("application_id", newAppIds);
      products = (pd2 || []) as unknown as ProductDetail[];
    } else {
      products = [];
    }
  }

  if (records.length === 0) throw new Error("No hay registros de fertilización en el rango seleccionado");

  const { data: farmData } = await supabase.from("farms").select("name, location").limit(1).single();
  const { data: agronomist } = await supabase.from("profiles").select("full_name").eq("role", "agronoma").limit(1).maybeSingle();

  return {
    records,
    products,
    farm: farmData || { name: "—", location: "" },
    agronomist: agronomist?.full_name || "—",
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

function getProductsForApp(products: ProductDetail[], appId: string) {
  return products.filter((p) => p.application_id === appId);
}

function getWeatherLabel(val: string | null): string {
  const map: Record<string, string> = { soleado: "Soleada", nublado: "Nublada", lluvioso: "Lluviosa" };
  return val ? map[val] || val : "—";
}

const statusLabels: Record<string, string> = {
  ejecutada: "Ejecutada",
  no_ejecutada: "No Ejecutada",
  ejecutada_con_novedad: "Con Novedad",
};

// ==========================================
// EXCEL – FO-12-DA-1 REGISTRO DE FERTILIZACIÓN
// ==========================================
export async function exportFertilizationExcel(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchFertilizationData(filters);

  const headerRows: any[][] = [
    ["", "", "", "REGISTRO DE FERTILIZACIÓN", "", "", "", "", "", "", "FO-12-DA-1"],
    [],
    [`FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`],
    [`CULTIVO: GULUPA`],
    [`INGENIERO AGRÓNOMO: ${agronomist}`],
    [`PERIODO: ${getDateRangeLabel(filters)}`],
    [`FECHA DE GENERACIÓN: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`],
    [],
    ["No.", "FECHA", "LOTE", "FERTILIZANTE/PRODUCTO", "INGREDIENTE ACTIVO", "DOSIS", "UNIDAD",
     "VOL. AGUA (Lts)", "EQUIPO", "TIPO APLICACIÓN", "CONDICIONES CLIMÁTICAS",
     "HORA INICIO - FIN", "OPERARIO", "ESTADO", "OBSERVACIONES"],
  ];

  const dataRows: any[][] = [];
  let rowNum = 0;

  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "dd/MM/yyyy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time ? `${record.start_time} - ${record.end_time}` : "—";

    if (appProducts.length === 0) {
      rowNum++;
      dataRows.push([
        rowNum, dateStr, lotName, "—", "—", "—", "—",
        record.water_volume_liters || "—",
        record.equipment_type || "—",
        record.application_type || "—",
        getWeatherLabel(record.weather_conditions),
        timeRange, operatorName,
        statusLabels[record.status] || record.status,
        record.notes || "",
      ]);
    } else {
      for (const prod of appProducts) {
        rowNum++;
        dataRows.push([
          rowNum, dateStr, lotName,
          prod.product?.name || "—",
          prod.product?.active_ingredient || "—",
          prod.quantity_used || "—",
          prod.product?.unit || "—",
          record.water_volume_liters || "—",
          record.equipment_type || "—",
          record.application_type || "—",
          getWeatherLabel(record.weather_conditions),
          timeRange, operatorName,
          statusLabels[record.status] || record.status,
          record.notes || "",
        ]);
      }
    }
  }

  const allRows = [...headerRows, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
    { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fertilización");
  XLSX.writeFile(wb, `FO-12-DA_fertilizacion_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ==========================================
// PDF – FO-12-DA-1
// ==========================================
export async function exportFertilizationPDF(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchFertilizationData(filters);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFillColor(34, 100, 34);
  doc.rect(0, 0, 297, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO DE FERTILIZACIÓN", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("FO-12-DA-1", 260, 8);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 220, 14);

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`, 14, 35);
  doc.text(`CULTIVO: GULUPA    |    ING. AGRÓNOMO: ${agronomist}`, 14, 41);
  doc.text(`PERIODO: ${getDateRangeLabel(filters)}`, 14, 47);

  const tableData: string[][] = [];
  let rowNum = 0;

  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "dd/MM/yy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time ? `${record.start_time}-${record.end_time}` : "—";

    if (appProducts.length === 0) {
      rowNum++;
      tableData.push([
        String(rowNum), dateStr, lotName, "—", "—", "—",
        String(record.water_volume_liters || "—"),
        record.equipment_type || "—",
        record.application_type || "—",
        getWeatherLabel(record.weather_conditions),
        timeRange, operatorName,
        statusLabels[record.status] || record.status,
        record.notes || "",
      ]);
    } else {
      for (const prod of appProducts) {
        rowNum++;
        tableData.push([
          String(rowNum), dateStr, lotName,
          prod.product?.name || "—",
          `${prod.quantity_used || "—"} ${prod.product?.unit || ""}`,
          prod.product?.active_ingredient || "—",
          String(record.water_volume_liters || "—"),
          record.equipment_type || "—",
          record.application_type || "—",
          getWeatherLabel(record.weather_conditions),
          timeRange, operatorName,
          statusLabels[record.status] || record.status,
          record.notes || "",
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: 52,
    head: [["No.", "Fecha", "Lote", "Fertilizante", "Dosis", "Ingr. Activo",
      "Vol. Agua", "Equipo", "Tipo", "Clima", "Horario", "Operario", "Estado", "Observaciones"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [34, 100, 34], textColor: 255, fontStyle: "bold", fontSize: 6 },
    bodyStyles: { fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 14 },
      2: { cellWidth: 14 },
      3: { cellWidth: 22 },
      4: { cellWidth: 16 },
      5: { cellWidth: 20 },
      6: { cellWidth: 14 },
      7: { cellWidth: 14 },
      8: { cellWidth: 14 },
      9: { cellWidth: 14 },
      10: { cellWidth: 18 },
      11: { cellWidth: 20 },
      12: { cellWidth: 14 },
      13: { cellWidth: 28 },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Página ${i} de ${pageCount} - Campo Vital`, 148.5, 200, { align: "center" });
  }

  doc.save(`FO-12-DA_fertilizacion_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ==========================================
// WORD – FO-12-DA-1
// ==========================================
export async function exportFertilizationWord(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchFertilizationData(filters);

  const columns = ["No.", "Fecha", "Lote", "Fertilizante/Producto", "Ingr. Activo", "Dosis", "Unidad",
    "Vol. Agua", "Equipo", "Tipo", "Clima", "Horario", "Operario", "Estado", "Observaciones"];

  const rows: string[][] = [];
  let rowNum = 0;

  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "dd/MM/yyyy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time ? `${record.start_time} - ${record.end_time}` : "—";

    if (appProducts.length === 0) {
      rowNum++;
      rows.push([
        String(rowNum), dateStr, lotName, "—", "—", "—", "—",
        String(record.water_volume_liters || "—"),
        record.equipment_type || "—",
        record.application_type || "—",
        getWeatherLabel(record.weather_conditions),
        timeRange, operatorName,
        statusLabels[record.status] || record.status,
        record.notes || "",
      ]);
    } else {
      for (const prod of appProducts) {
        rowNum++;
        rows.push([
          String(rowNum), dateStr, lotName,
          prod.product?.name || "—",
          prod.product?.active_ingredient || "—",
          String(prod.quantity_used || "—"),
          prod.product?.unit || "—",
          String(record.water_volume_liters || "—"),
          record.equipment_type || "—",
          record.application_type || "—",
          getWeatherLabel(record.weather_conditions),
          timeRange, operatorName,
          statusLabels[record.status] || record.status,
          record.notes || "",
        ]);
      }
    }
  }

  const html = `
    <h1 style="text-align:center;">REGISTRO DE FERTILIZACIÓN</h1>
    <p style="text-align:right;"><strong>FO-12-DA-1</strong></p>
    <p style="text-align:right;">Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
    <div class="header-info">
      <p><strong>FINCA:</strong> ${farm.name}${farm.location ? ` (${farm.location})` : ""}</p>
      <p><strong>CULTIVO:</strong> GULUPA</p>
      <p><strong>INGENIERO AGRÓNOMO:</strong> ${agronomist}</p>
      <p><strong>PERIODO:</strong> ${getDateRangeLabel(filters)}</p>
    </div>
    <h2>Detalle de Fertilizaciones</h2>
    ${buildHtmlTable(columns, rows)}
    <div class="footer">Documento generado automáticamente por Campo Vital</div>
  `;

  generateWordFromHtml(html, `FO-12-DA_fertilizacion_${format(new Date(), "yyyyMMdd")}.doc`);
}
