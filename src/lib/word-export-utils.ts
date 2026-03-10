import { saveAs } from "file-saver";

/**
 * Generate a .doc file from HTML content using the mso-application approach.
 * Word opens these files natively without needing the docx library.
 */
export function generateWordFromHtml(htmlContent: string, filename: string): void {
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; margin: 20px; }
        h1 { font-size: 18pt; color: #226422; margin-bottom: 4pt; }
        h2 { font-size: 14pt; color: #226422; margin-top: 16pt; margin-bottom: 6pt; border-bottom: 2px solid #226422; padding-bottom: 4pt; }
        h3 { font-size: 12pt; color: #444; margin-top: 12pt; margin-bottom: 4pt; }
        table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
        th { background-color: #226422; color: white; font-weight: bold; padding: 6pt 8pt; border: 1px solid #ccc; font-size: 9pt; text-align: left; }
        td { padding: 5pt 8pt; border: 1px solid #ddd; font-size: 9pt; vertical-align: top; }
        tr:nth-child(even) td { background-color: #f5f5f5; }
        .header-info { margin-bottom: 12pt; }
        .header-info p { margin: 2pt 0; font-size: 10pt; }
        .section { margin-bottom: 12pt; }
        .footer { margin-top: 20pt; font-size: 8pt; color: #888; border-top: 1px solid #ccc; padding-top: 6pt; }
        .badge { display: inline-block; padding: 2pt 8pt; border-radius: 4pt; font-size: 8pt; font-weight: bold; }
        .badge-pendiente { background-color: #FED7AA; color: #9A3412; }
        .badge-en_tratamiento { background-color: #BFDBFE; color: #1E40AF; }
        .badge-resuelto { background-color: #BBF7D0; color: #166534; }
        .italic-note { font-style: italic; font-size: 9pt; color: #666; margin: 2pt 0; }
        @page { size: landscape; margin: 1.5cm; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", fullHtml], { type: "application/msword" });
  saveAs(blob, filename);
}

/** Helper to build an HTML table from headers and rows */
export function buildHtmlTable(headers: string[], rows: string[][]): string {
  const headerHtml = headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const rowsHtml = rows.map(row =>
    `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
  ).join("");
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

/** Helper to build key-value info section */
export function buildInfoSection(pairs: [string, string][]): string {
  return `<div class="header-info">${pairs.map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</p>`).join("")}</div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
