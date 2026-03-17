import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportPreviewData } from "@/lib/report-previews";

interface ReportPreviewTableProps {
  preview?: ReportPreviewData;
  isLoading?: boolean;
}

export function ReportPreviewTable({ preview, isLoading = false }: ReportPreviewTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Consultando datos del informe…</span>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center gap-3 py-10 text-center">
          <Search className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Usa los filtros y pulsa Consultar para ver los datos reales antes de exportar.</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vista previa</CardTitle>
        <CardDescription>
          {preview.rows.length > 0
            ? `${preview.rows.length} registro(s) encontrados para ${preview.rangeLabel.toLowerCase()}.`
            : preview.emptyMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview.summary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {preview.summary.map((item) => (
              <Badge key={item.label} variant="outline" className="px-3 py-1">
                <span className="font-medium">{item.label}:</span>&nbsp;{item.value}
              </Badge>
            ))}
          </div>
        )}

        {preview.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            {preview.emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {preview.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.rows.map((row, index) => (
                <TableRow key={`${index}-${preview.columns[0] ?? "row"}`}>
                  {preview.columns.map((column) => (
                    <TableCell key={`${index}-${column}`}>{row[column] ?? "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
