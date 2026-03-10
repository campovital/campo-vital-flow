import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

interface PhytosanitaryRecord {
  id: string;
  device_time: string;
  status: string;
  pumps_used: number | null;
  labor_hours: number | null;
  notes: string | null;
  issue_reason: string | null;
  weather_conditions: string | null;
  biological_target: string | null;
  equipment_type: string | null;
  application_type: string | null;
  start_time: string | null;
  end_time: string | null;
  water_volume_liters: number | null;
  tank_wash_management: string | null;
  leftover_broth_liters: number | null;
  reentry_hours: string | null;
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
  } | null;
}

async function fetchPhytosanitaryData(filters: ReportFilters) {
  let query = supabase
    .from("applications")
    .select(`
      id,
      device_time,
      status,
      pumps_used,
      labor_hours,
      notes,
      issue_reason,
      weather_conditions,
      biological_target,
      equipment_type,
      application_type,
      start_time,
      end_time,
      water_volume_liters,
      tank_wash_management,
      leftover_broth_liters,
      reentry_hours,
      lot:lots(name),
      operator:operators(full_name),
      protocol_version:protocol_versions(version_number, protocols(name, category))
    `)
    .order("device_time", { ascending: true });

  if (filters.dateFrom) {
    query = query.gte("device_time", filters.dateFrom.toISOString());
  }
  if (filters.dateTo) {
    query = query.lte("device_time", filters.dateTo.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error("Error al obtener datos: " + error.message);

  let records = (data || []) as unknown as PhytosanitaryRecord[];

  if (filters.lotId) {
    records = records.filter((r) => {
      const lotData = r.lot as any;
      return lotData?.id === filters.lotId || true; // lot only has name in select
    });
  }

  // Fetch products for all applications
  const appIds = records.map((r) => r.id);
  let products: ProductDetail[] = [];

  if (appIds.length > 0) {
    const { data: prodData } = await supabase
      .from("application_products")
      .select(`
        application_id,
        quantity_used,
        product:inventory_products(name, active_ingredient, unit)
      `)
      .in("application_id", appIds);
    products = (prodData || []) as unknown as ProductDetail[];
  }

  // Fetch farm info
  const { data: farmData } = await supabase
    .from("farms")
    .select("name, location")
    .limit(1)
    .single();

  // Fetch agronomist (admin/agronoma profile)
  const { data: agronomist } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("role", "agronoma")
    .limit(1)
    .maybeSingle();

  return {
    records,
    products,
    farm: farmData || { name: "—", location: "" },
    agronomist: agronomist?.full_name || "—",
  };
}

function getProductsForApp(products: ProductDetail[], appId: string) {
  return products.filter((p) => p.application_id === appId);
}

function getWeatherLabel(val: string | null): string {
  const map: Record<string, string> = {
    soleado: "Soleada",
    nublado: "Nublada",
    lluvioso: "Lluviosa",
  };
  return val ? map[val] || val : "—";
}

function getTankWashLabel(val: string | null): string {
  if (val === "si") return "Sí";
  if (val === "no") return "No aplica";
  return val || "—";
}

// ==========================================
// EXCEL EXPORT – FO-17-DA format
// ==========================================

export async function exportPhytosanitaryExcel(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchPhytosanitaryData(filters);

  if (records.length === 0) {
    throw new Error("No hay registros de aplicaciones fitosanitarias para exportar");
  }

  const workbook = XLSX.utils.book_new();

  // Build header rows
  const headerRows = [
    ["", "", "", "REGISTRO DE APLICACIONES FITOSANITARIAS", "", "", "", "", "", "", "", "", "", "", "", "", "FO-17-DA"],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "VERSION: 3"],
    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", `FECHA: ${format(new Date(), "MMM/yyyy", { locale: es }).toUpperCase()}`],
    [],
    [`CULTIVO: GULUPA`],
    [`NOMBRE DE LA FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`],
    [`INGENIERO AGRONOMO: ${agronomist}`],
    [],
    [
      "LOTE", "FECHA", "NOMBRE COMERCIAL", "INGREDIENTE ACTIVO",
      "DOSIS/Lt AGUA", "VOL. APLICADO Lts DE AGUA", "PRODUCTO TOTAL",
      "PERIODO DE CARENCIA*", "PERIODO DE REENTRADA*",
      "CONDICIONES CLIMATICAS*", "BLANCO BIOLÓGICO",
      "EQUIPO DE APLICACIÓN", "TIPO DE APLICACIÓN",
      "HORA DE INICIO - HORA DE FINALIZACIÓN",
      "GESTIÓN DE AGUAS DE LAVADO DE TANQUES Y MANGUERAS*",
      "CALDOS SOBRANTES", "NOMBRE COLABORADOR", "FIRMA COLABORADOR", "OBSERVACIONES"
    ],
  ];

  // Build data rows – one row per product per application
  const dataRows: any[][] = [];
  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "M/d/yy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time
      ? `${record.start_time} a ${record.end_time}`
      : "—";

    if (appProducts.length === 0) {
      dataRows.push([
        lotName, dateStr, "—", "—", "—",
        record.water_volume_liters || "—", "—", "—",
        record.reentry_hours || "—",
        getWeatherLabel(record.weather_conditions),
        record.biological_target || "—",
        record.equipment_type || "—",
        record.application_type || "—",
        timeRange,
        getTankWashLabel(record.tank_wash_management),
        record.leftover_broth_liters ?? 0,
        operatorName, "", record.notes || "",
      ]);
    } else {
      for (const prod of appProducts) {
        const productName = prod.product?.name || "—";
        const activeIngredient = prod.product?.active_ingredient || "—";
        const dosePerLt = prod.quantity_used && record.water_volume_liters
          ? (prod.quantity_used / record.water_volume_liters).toFixed(2) + " " + (prod.product?.unit || "")
          : "—";
        const totalProduct = prod.quantity_used
          ? `${prod.quantity_used} ${prod.product?.unit || ""}`
          : "—";

        dataRows.push([
          lotName, dateStr, productName, activeIngredient,
          dosePerLt,
          record.water_volume_liters || "—",
          totalProduct, "—",
          record.reentry_hours || "—",
          getWeatherLabel(record.weather_conditions),
          record.biological_target || "—",
          record.equipment_type || "—",
          record.application_type || "—",
          timeRange,
          getTankWashLabel(record.tank_wash_management),
          record.leftover_broth_liters ?? 0,
          operatorName, "", record.notes || "",
        ]);
      }
    }
    // Empty separator row
    dataRows.push([]);
  }

  // Footer notes
  const footerRows = [
    [],
    ["LOS CALDOS SOBRANTES SERÁN DESECHADOS EN LA ZONA DE BARBECHO AL IGUAL QUE LAS AGUAS RESULTANTES DE EL LAVADO DE MAQUINARIAS Y EPPs."],
    ["LA CANTIDAD DE AGUA UTILIZADA PARA EL LAVADO DE MAQUINARIAS, EQUIPOS Y EPPs SERA SIEMPRE DE NO MAS DE 100 LITROS."],
    ["PERIODO DE CARENCIA: DIAS QUE DEBEN TRANSCURRIR ENTRE LA ULTIMA APLICACION Y LA COSECHA"],
    ["PERIODO DE REENTRADA: INTERVALO QUE DEBE TRANSCURRIR ENTRE LA APLICACION Y EL REINGRESO DE PERSONAS Y ANIMALES AL AREA O CULTIVO TRATADO"],
    ["CONDICIONES CLIMATICAS: NUBLADO, SOLEADO, LLUVIOSO"],
  ];

  const allRows = [...headerRows, ...dataRows, ...footerRows];

  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 8 },  // Lote
    { wch: 12 }, // Fecha
    { wch: 18 }, // Nombre Comercial
    { wch: 25 }, // Ingrediente Activo
    { wch: 14 }, // Dosis
    { wch: 18 }, // Vol Aplicado
    { wch: 14 }, // Producto Total
    { wch: 16 }, // Periodo Carencia
    { wch: 16 }, // Periodo Reentrada
    { wch: 18 }, // Condiciones Climaticas
    { wch: 16 }, // Blanco Biologico
    { wch: 18 }, // Equipo Aplicacion
    { wch: 16 }, // Tipo Aplicacion
    { wch: 22 }, // Hora Inicio-Fin
    { wch: 30 }, // Gestion Aguas
    { wch: 14 }, // Caldos Sobrantes
    { wch: 18 }, // Nombre Colaborador
    { wch: 16 }, // Firma
    { wch: 25 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Registro Fitosanitario");
  XLSX.writeFile(workbook, `FO-17-DA_registro_fitosanitario_${format(new Date(), "yyyyMMdd")}.xlsx`);
}

// ==========================================
// PDF EXPORT – FO-17-DA format
// ==========================================

export async function exportPhytosanitaryPDF(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchPhytosanitaryData(filters);

  if (records.length === 0) {
    throw new Error("No hay registros de aplicaciones fitosanitarias para exportar");
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFillColor(34, 100, 34);
  doc.rect(0, 0, 297, 30, "F");
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("REGISTRO DE APLICACIONES FITOSANITARIAS", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("FO-17-DA | VERSION: 3", 250, 8);
  doc.text(`Generado: ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}`, 250, 14);

  // Farm info
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text(`CULTIVO: GULUPA`, 14, 37);
  doc.text(`FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`, 14, 43);
  doc.text(`ING. AGRÓNOMO: ${agronomist}`, 14, 49);

  // Build table data
  const tableData: string[][] = [];
  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "dd/MM/yy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time
      ? `${record.start_time} - ${record.end_time}`
      : "—";

    if (appProducts.length === 0) {
      tableData.push([
        lotName, dateStr, "—", "—", "—",
        String(record.water_volume_liters || "—"),
        "—", "—", record.reentry_hours || "—",
        getWeatherLabel(record.weather_conditions),
        record.biological_target || "—",
        record.equipment_type || "—",
        record.application_type || "—",
        timeRange,
        getTankWashLabel(record.tank_wash_management),
        String(record.leftover_broth_liters ?? 0),
        operatorName,
        record.notes || "",
      ]);
    } else {
      for (const prod of appProducts) {
        const dosePerLt = prod.quantity_used && record.water_volume_liters
          ? `${(prod.quantity_used / record.water_volume_liters).toFixed(2)} ${prod.product?.unit || ""}`
          : "—";
        tableData.push([
          lotName, dateStr,
          prod.product?.name || "—",
          prod.product?.active_ingredient || "—",
          dosePerLt,
          String(record.water_volume_liters || "—"),
          `${prod.quantity_used} ${prod.product?.unit || ""}`,
          "—",
          record.reentry_hours || "—",
          getWeatherLabel(record.weather_conditions),
          record.biological_target || "—",
          record.equipment_type || "—",
          record.application_type || "—",
          timeRange,
          getTankWashLabel(record.tank_wash_management),
          String(record.leftover_broth_liters ?? 0),
          operatorName,
          record.notes || "",
        ]);
      }
    }
  }

  autoTable(doc, {
    startY: 54,
    head: [[
      "Lote", "Fecha", "Producto", "Ingr. Activo", "Dosis/Lt",
      "Vol. Agua", "Prod. Total", "P. Carencia", "P. Reentrada",
      "Clima", "Blanco Biol.", "Equipo", "Tipo Aplic.",
      "Horario", "Gest. Aguas", "Sobrantes", "Colaborador", "Observaciones"
    ]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [34, 100, 34], textColor: 255, fontStyle: "bold", fontSize: 6 },
    bodyStyles: { fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 14 },
      2: { cellWidth: 16 },
      3: { cellWidth: 20 },
      4: { cellWidth: 12 },
      5: { cellWidth: 12 },
      6: { cellWidth: 14 },
      7: { cellWidth: 12 },
      8: { cellWidth: 14 },
      9: { cellWidth: 12 },
      10: { cellWidth: 14 },
      11: { cellWidth: 14 },
      12: { cellWidth: 12 },
      13: { cellWidth: 18 },
      14: { cellWidth: 14 },
      15: { cellWidth: 12 },
      16: { cellWidth: 16 },
      17: { cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Footer notes
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  doc.setFontSize(7);
  doc.setTextColor(80);
  doc.text("* PERIODO DE CARENCIA: Días entre la última aplicación y la cosecha.", 14, finalY + 6);
  doc.text("* PERIODO DE REENTRADA: Intervalo entre la aplicación y el reingreso de personas/animales al área tratada.", 14, finalY + 10);
  doc.text("* CONDICIONES CLIMÁTICAS: Nublado, Soleado, Lluvioso.", 14, finalY + 14);
  doc.text("Los caldos sobrantes serán desechados en zona de barbecho. Agua de lavado: máx 100 litros.", 14, finalY + 18);

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Página ${i} de ${pageCount} - Campo Vital Decisions`, 148.5, 200, { align: "center" });
  }

  doc.save(`FO-17-DA_registro_fitosanitario_${format(new Date(), "yyyyMMdd")}.pdf`);
}

// ==========================================
// WORD EXPORT – FO-17-DA format
// ==========================================

export async function exportPhytosanitaryWord(filters: ReportFilters): Promise<void> {
  const { records, products, farm, agronomist } = await fetchPhytosanitaryData(filters);

  if (records.length === 0) {
    throw new Error("No hay registros de aplicaciones fitosanitarias para exportar");
  }

  const headerCellProps = {
    shading: { fill: "226422" },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
  };

  const columns = [
    "Lote", "Fecha", "Nombre Comercial", "Ingrediente Activo",
    "Dosis/Lt Agua", "Vol. Aplicado (Lts)", "Producto Total",
    "P. Carencia", "P. Reentrada", "Condiciones Climáticas",
    "Blanco Biológico", "Equipo", "Tipo Aplicación",
    "Horario", "Gestión Aguas Lavado", "Caldos Sobrantes",
    "Colaborador", "Observaciones"
  ];

  // Header row
  const headerRow = new TableRow({
    children: columns.map((col) =>
      new TableCell({
        ...headerCellProps,
        children: [new Paragraph({
          children: [new TextRun({ text: col, bold: true, color: "FFFFFF", size: 14 })],
          alignment: AlignmentType.CENTER,
        })],
        width: { size: 100 / columns.length, type: WidthType.PERCENTAGE },
      })
    ),
  });

  // Data rows
  const dataRows: TableRow[] = [];
  for (const record of records) {
    const appProducts = getProductsForApp(products, record.id);
    const lotName = (record.lot as any)?.name || "—";
    const dateStr = format(new Date(record.device_time), "dd/MM/yy");
    const operatorName = (record.operator as any)?.full_name || "—";
    const timeRange = record.start_time && record.end_time
      ? `${record.start_time} - ${record.end_time}` : "—";

    const makeRow = (prod: ProductDetail | null) => {
      const dosePerLt = prod && prod.quantity_used && record.water_volume_liters
        ? `${(prod.quantity_used / record.water_volume_liters).toFixed(2)} ${prod?.product?.unit || ""}`
        : "—";
      const totalProduct = prod ? `${prod.quantity_used} ${prod?.product?.unit || ""}` : "—";

      const vals = [
        lotName, dateStr,
        prod?.product?.name || "—",
        prod?.product?.active_ingredient || "—",
        dosePerLt,
        String(record.water_volume_liters || "—"),
        totalProduct, "—",
        record.reentry_hours || "—",
        getWeatherLabel(record.weather_conditions),
        record.biological_target || "—",
        record.equipment_type || "—",
        record.application_type || "—",
        timeRange,
        getTankWashLabel(record.tank_wash_management),
        String(record.leftover_broth_liters ?? 0),
        operatorName,
        record.notes || "",
      ];

      return new TableRow({
        children: vals.map((v) =>
          new TableCell({
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
            },
            children: [new Paragraph({
              children: [new TextRun({ text: v, size: 14 })],
            })],
            width: { size: 100 / columns.length, type: WidthType.PERCENTAGE },
          })
        ),
      });
    };

    if (appProducts.length === 0) {
      dataRows.push(makeRow(null));
    } else {
      for (const prod of appProducts) {
        dataRows.push(makeRow(prod));
      }
    }
  }

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: { size: { orientation: "landscape" as any } },
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "REGISTRO DE APLICACIONES FITOSANITARIAS", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: "FO-17-DA | VERSION: 3", size: 18 })],
          alignment: AlignmentType.RIGHT,
        }),
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: "CULTIVO: GULUPA", bold: true, size: 20 })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: `NOMBRE DE LA FINCA: ${farm.name}${farm.location ? ` (${farm.location})` : ""}`,
            bold: true, size: 20,
          })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `INGENIERO AGRÓNOMO: ${agronomist}`, bold: true, size: 20 })],
        }),
        new Paragraph({ children: [] }),
        table,
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({
            text: "Los caldos sobrantes serán desechados en la zona de barbecho al igual que las aguas resultantes del lavado de maquinarias y EPPs.",
            size: 16, italics: true,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: "La cantidad de agua utilizada para el lavado de maquinarias, equipos y EPPs será siempre de no más de 100 litros.",
            size: 16, italics: true,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: "PERIODO DE CARENCIA: Días que deben transcurrir entre la última aplicación y la cosecha.",
            size: 16, italics: true,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: "PERIODO DE REENTRADA: Intervalo que debe transcurrir entre la aplicación y el reingreso de personas y animales al área o cultivo tratado.",
            size: 16, italics: true,
          })],
        }),
        new Paragraph({
          children: [new TextRun({
            text: "CONDICIONES CLIMÁTICAS: Nublado, Soleado, Lluvioso.",
            size: 16, italics: true,
          })],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `FO-17-DA_registro_fitosanitario_${format(new Date(), "yyyyMMdd")}.docx`);
}
