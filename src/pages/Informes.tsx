import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/use-permissions";
import {
  FileSpreadsheet,
  Sprout,
  Users,
  DollarSign,
  Package,
  Bug,
  Loader2,
  Download,
  Calendar,
} from "lucide-react";
import {
  exportProductionReport,
  exportProductivityReport,
  exportCostsReport,
  exportInventoryReport,
  exportSanitaryReport,
} from "@/lib/reports-export";

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  exportFn: (days?: number) => Promise<void>;
  requiresCostPermission?: boolean;
}

export default function Informes() {
  const { canManage } = useAuth();
  const { canExport } = usePermissions();
  const { toast } = useToast();
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [days, setDays] = useState("30");

  const reports: ReportType[] = [
    {
      id: "production",
      title: "Producción",
      description: "Registro de cosechas por día, lote y operario con totales y porcentajes de exportación",
      icon: <Sprout className="w-8 h-8 text-success" />,
      exportFn: exportProductionReport,
    },
    {
      id: "productivity",
      title: "Productividad por Operario",
      description: "Rendimiento de cada operario: cosechas realizadas, kilos y horas trabajadas",
      icon: <Users className="w-8 h-8 text-primary" />,
      exportFn: exportProductivityReport,
    },
    {
      id: "costs",
      title: "Costos vs Producción",
      description: "Análisis de costos de insumos, mano de obra y costo por kilo producido",
      icon: <DollarSign className="w-8 h-8 text-warning" />,
      exportFn: exportCostsReport,
      requiresCostPermission: true,
    },
    {
      id: "inventory",
      title: "Consumo de Insumos",
      description: "Stock actual y consumo de productos en los últimos 30 días",
      icon: <Package className="w-8 h-8 text-info" />,
      exportFn: exportInventoryReport,
      requiresCostPermission: true,
    },
    {
      id: "sanitary",
      title: "Historial Sanitario",
      description: "Reportes de plagas y enfermedades con estado, severidad y fechas de seguimiento",
      icon: <Bug className="w-8 h-8 text-destructive" />,
      exportFn: exportSanitaryReport,
    },
  ];

  const handleExport = async (report: ReportType) => {
    setLoadingReport(report.id);
    try {
      await report.exportFn(parseInt(days));
      toast({
        title: "Informe generado",
        description: `El informe de ${report.title.toLowerCase()} se ha descargado correctamente`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el informe",
        variant: "destructive",
      });
    } finally {
      setLoadingReport(null);
    }
  };

  const visibleReports = reports.filter(report => {
    if (report.requiresCostPermission && !canManage) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              Informes
            </h1>
            <p className="text-muted-foreground">
              Genera y exporta reportes del cultivo en formato Excel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 días</SelectItem>
                <SelectItem value="30">Últimos 30 días</SelectItem>
                <SelectItem value="60">Últimos 60 días</SelectItem>
                <SelectItem value="90">Últimos 90 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-muted">{report.icon}</div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleExport(report)}
                  disabled={loadingReport === report.id}
                >
                  {loadingReport === report.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Excel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Sobre los informes</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Todos los informes se exportan en formato Excel (.xlsx)</li>
                  <li>Los datos se filtran según el período seleccionado</li>
                  <li>Los informes de costos solo están disponibles para administradores y agrónomos</li>
                  <li>Los totales y promedios se calculan automáticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
