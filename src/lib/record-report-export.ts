import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateWordFromHtml } from "./word-export-utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type RecordData = Record<string, unknown>;

function flattenData(data: RecordData): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined || val === "") continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      if (typeof val[0] === "object") {
        rows.push({ label, value: "" });
        val.forEach((item, i) => {
          const parts = Object.entries(item as Record<string, unknown>)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
            .join(", ");
          rows.push({ label: `  #${i + 1}`, value: parts });
        });
      } else {
        rows.push({ label, value: val.join(", ") });
      }
    } else if (typeof val === "object") {
      const parts = Object.entries(val as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
        .join(", ");
      rows.push({ label, value: parts });
    } else {
      rows.push({ label, value: String(val) });
    }
  }
  return rows;
}

const now = () => format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es });

// ── EXCEL ──
export async function exportRecordExcel(data: RecordData, moduleName: string, filename: string) {
  const rows = flattenData(data);
  const ws = XLSX.utils.aoa_to_sheet([
    ["Campo Vital - " + moduleName],
    ["Fecha de generación", now()],
    [],
    ["Campo", "Valor"],
    ...rows.map(r => [r.label, r.value]),
  ]);
  ws["!cols"] = [{ wch: 30 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, moduleName.slice(0, 31));
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), `${filename}.xlsx`);
}

// ── WORD ──
export async function exportRecordWord(data: RecordData, moduleName: string, filename: string) {
  const rows = flattenData(data);
  const tableRows = rows.map(r =>
    `<tr><td style="font-weight:bold;width:35%">${r.label}</td><td>${r.value}</td></tr>`
  ).join("");

  const html = `
    <h1>Campo Vital</h1>
    <h2>${moduleName}</h2>
    <p style="font-size:9pt;color:#888">Generado: ${now()}</p>
    <table>${tableRows}</table>
    <div class="footer">Documento generado automáticamente por Campo Vital</div>
  `;
  generateWordFromHtml(html, `${filename}.doc`);
}

// ── PDF ──
export async function exportRecordPdf(data: RecordData, moduleName: string, filename: string) {
  const rows = flattenData(data);
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.setTextColor(34, 100, 34);
  doc.text("Campo Vital", 14, 20);
  doc.setFontSize(13);
  doc.text(moduleName, 14, 28);
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Generado: ${now()}`, 14, 34);

  autoTable(doc, {
    startY: 40,
    head: [["Campo", "Valor"]],
    body: rows.map(r => [r.label, r.value]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [34, 100, 34], textColor: 255 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    didDrawPage: (d) => {
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text("Campo Vital – Documento generado automáticamente", 14, doc.internal.pageSize.height - 10);
    },
  });

  doc.save(`${filename}.pdf`);
}
