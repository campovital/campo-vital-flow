import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

interface CostsExportButtonProps {
  dateRange: string;
}

export function CostsExportButton({ dateRange }: CostsExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "week":
        return subDays(now, 7).toISOString();
      case "month":
        return startOfMonth(now).toISOString();
      case "quarter":
        return subDays(now, 90).toISOString();
      default:
        return startOfMonth(now).toISOString();
    }
  };

  const formatCurrency = (value: number) => {
    return value || 0;
  };

  const fetchApplicationsData = async () => {
    const fromDate = getDateFilter();
    
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id,
        device_time,
        status,
        total_product_cost,
        total_labor_cost,
        total_cost,
        labor_hours,
        pumps_used,
        lot:lots(id, name),
        operator:operators(id, full_name, hourly_rate),
        protocol_version:protocol_versions(
          protocol:protocols(name, category)
        )
      `)
      .gte("device_time", fromDate)
      .order("device_time", { ascending: false });

    if (error) throw error;
    return data;
  };

  const exportByLot = async () => {
    setIsExporting(true);
    try {
      const data = await fetchApplicationsData();
      
      // Group by lot
      const byLot = data?.reduce((acc: Record<string, any>, app: any) => {
        const lotName = app.lot?.name || "Sin lote";
        if (!acc[lotName]) {
          acc[lotName] = {
            lote: lotName,
            aplicaciones: 0,
            costo_insumos: 0,
            costo_mano_obra: 0,
            costo_total: 0,
            horas_trabajadas: 0,
          };
        }
        acc[lotName].aplicaciones++;
        acc[lotName].costo_insumos += app.total_product_cost || 0;
        acc[lotName].costo_mano_obra += app.total_labor_cost || 0;
        acc[lotName].costo_total += app.total_cost || 0;
        acc[lotName].horas_trabajadas += app.labor_hours || 0;
        return acc;
      }, {});

      const rows = Object.values(byLot || {});
      
      // Add totals row
      const totals = rows.reduce((acc: any, row: any) => ({
        lote: "TOTAL",
        aplicaciones: acc.aplicaciones + row.aplicaciones,
        costo_insumos: acc.costo_insumos + row.costo_insumos,
        costo_mano_obra: acc.costo_mano_obra + row.costo_mano_obra,
        costo_total: acc.costo_total + row.costo_total,
        horas_trabajadas: acc.horas_trabajadas + row.horas_trabajadas,
      }), { lote: "", aplicaciones: 0, costo_insumos: 0, costo_mano_obra: 0, costo_total: 0, horas_trabajadas: 0 });
      
      rows.push(totals);

      exportToExcel(rows, `Costos_por_Lote_${format(new Date(), "yyyy-MM-dd")}`);
      
      toast({
        title: "Exportación exitosa",
        description: "Reporte de costos por lote descargado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const exportByOperator = async () => {
    setIsExporting(true);
    try {
      const data = await fetchApplicationsData();
      
      // Group by operator
      const byOperator = data?.reduce((acc: Record<string, any>, app: any) => {
        const operatorName = app.operator?.full_name || "Sin operario";
        const hourlyRate = app.operator?.hourly_rate || 0;
        if (!acc[operatorName]) {
          acc[operatorName] = {
            operario: operatorName,
            tarifa_hora: hourlyRate,
            aplicaciones: 0,
            horas_trabajadas: 0,
            costo_mano_obra: 0,
            costo_insumos_aplicados: 0,
            costo_total_generado: 0,
          };
        }
        acc[operatorName].aplicaciones++;
        acc[operatorName].horas_trabajadas += app.labor_hours || 0;
        acc[operatorName].costo_mano_obra += app.total_labor_cost || 0;
        acc[operatorName].costo_insumos_aplicados += app.total_product_cost || 0;
        acc[operatorName].costo_total_generado += app.total_cost || 0;
        return acc;
      }, {});

      const rows = Object.values(byOperator || {});
      
      // Add totals row
      const totals = rows.reduce((acc: any, row: any) => ({
        operario: "TOTAL",
        tarifa_hora: "-",
        aplicaciones: acc.aplicaciones + row.aplicaciones,
        horas_trabajadas: acc.horas_trabajadas + row.horas_trabajadas,
        costo_mano_obra: acc.costo_mano_obra + row.costo_mano_obra,
        costo_insumos_aplicados: acc.costo_insumos_aplicados + row.costo_insumos_aplicados,
        costo_total_generado: acc.costo_total_generado + row.costo_total_generado,
      }), { operario: "", tarifa_hora: 0, aplicaciones: 0, horas_trabajadas: 0, costo_mano_obra: 0, costo_insumos_aplicados: 0, costo_total_generado: 0 });
      
      rows.push(totals);

      exportToExcel(rows, `Costos_por_Operario_${format(new Date(), "yyyy-MM-dd")}`);
      
      toast({
        title: "Exportación exitosa",
        description: "Reporte de costos por operario descargado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const exportDetailed = async () => {
    setIsExporting(true);
    try {
      const data = await fetchApplicationsData();
      
      const rows = data?.map((app: any) => ({
        fecha: format(new Date(app.device_time), "dd/MM/yyyy HH:mm", { locale: es }),
        lote: app.lot?.name || "—",
        operario: app.operator?.full_name || "—",
        protocolo: app.protocol_version?.protocol?.name || "—",
        categoria: app.protocol_version?.protocol?.category || "—",
        estado: app.status?.replace(/_/g, " ") || "—",
        bombas: app.pumps_used || 0,
        horas: app.labor_hours || 0,
        costo_insumos: app.total_product_cost || 0,
        costo_mano_obra: app.total_labor_cost || 0,
        costo_total: app.total_cost || 0,
      })) || [];

      // Add totals row
      const totals = rows.reduce((acc, row) => ({
        fecha: "TOTAL",
        lote: "",
        operario: "",
        protocolo: "",
        categoria: "",
        estado: "",
        bombas: acc.bombas + row.bombas,
        horas: acc.horas + row.horas,
        costo_insumos: acc.costo_insumos + row.costo_insumos,
        costo_mano_obra: acc.costo_mano_obra + row.costo_mano_obra,
        costo_total: acc.costo_total + row.costo_total,
      }), { fecha: "", lote: "", operario: "", protocolo: "", categoria: "", estado: "", bombas: 0, horas: 0, costo_insumos: 0, costo_mano_obra: 0, costo_total: 0 });
      
      rows.push(totals);

      exportToExcel(rows, `Costos_Detallado_${format(new Date(), "yyyy-MM-dd")}`);
      
      toast({
        title: "Exportación exitosa",
        description: "Reporte detallado de costos descargado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el reporte",
        variant: "destructive",
      });
    }
    setIsExporting(false);
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 18 }));
    ws["!cols"] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Costos");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportByLot}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Por Lote
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportByOperator}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Por Operario
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportDetailed}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Detallado Completo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
