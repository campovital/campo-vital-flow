import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import {
  FileSpreadsheet,
  Sprout,
  Users,
  DollarSign,
  Package,
  Bug,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Leaf,
} from "lucide-react";
import { ReportFilters, ReportFiltersState } from "@/components/reports/ReportFilters";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import {
  exportProductivityReport,
  exportCostsReport,
  exportInventoryReport,
  exportSanitaryReport,
} from "@/lib/reports-export";
import {
  exportProductivityPDF,
  exportCostsPDF,
  exportInventoryPDF,
  exportSanitaryPDF,
} from "@/lib/reports-pdf-export";
import {
  exportPhytosanitaryExcel,
  exportPhytosanitaryPDF,
  exportPhytosanitaryWord,
} from "@/lib/phytosanitary-report-export";
import {
  exportHarvestExcel,
  exportHarvestPDF,
  exportHarvestWord,
} from "@/lib/harvest-report-export";
import {
  exportFertilizationExcel,
  exportFertilizationPDF,
  exportFertilizationWord,
} from "@/lib/fertilization-report-export";
import {
  exportProductivityWord,
  exportCostsWord,
  exportInventoryWord,
  exportSanitaryWord,
} from "@/lib/reports-word-export";

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  showLotFilter: boolean;
  showOperatorFilter: boolean;
  requiresCostPermission?: boolean;
  hasWordExport?: boolean;
}

const reportConfigs: ReportConfig[] = [
  {
    id: "harvest",
    title: "Registro de Cosechas (FO-09-DA)",
    description: "Informe formal de cosechas con estructura del formato FO-09-DA-0: lote, operario, kg totales, exportable, rechazo y clasificación",
    icon: <Sprout className="w-6 h-6 text-success" />,
    showLotFilter: true,
    showOperatorFilter: true,
    hasWordExport: true,
  },
  {
    id: "phytosanitary",
    title: "Registro Fitosanitario (FO-17-DA)",
    description: "Informe formal de aplicaciones fitosanitarias con todos los campos del formato FO-17-DA V3",
    icon: <ClipboardList className="w-6 h-6 text-primary" />,
    showLotFilter: true,
    showOperatorFilter: true,
    hasWordExport: true,
  },
  {
    id: "fertilization",
    title: "Registro de Fertilización (FO-12-DA)",
    description: "Informe formal de aplicaciones de fertilizantes con estructura del formato FO-12-DA-1: producto, dosis, equipo y condiciones",
    icon: <Leaf className="w-6 h-6 text-success" />,
    showLotFilter: true,
    showOperatorFilter: false,
    hasWordExport: true,
  },
  {
    id: "productivity",
    title: "Productividad por Operario",
    description: "Rendimiento de cada operario: cosechas realizadas, kilos y horas trabajadas",
    icon: <Users className="w-6 h-6 text-primary" />,
    showLotFilter: false,
    showOperatorFilter: true,
    hasWordExport: true,
  },
  {
    id: "costs",
    title: "Costos vs Producción",
    description: "Análisis de costos de insumos, mano de obra y costo por kilo producido",
    icon: <DollarSign className="w-6 h-6 text-warning" />,
    showLotFilter: true,
    showOperatorFilter: false,
    requiresCostPermission: true,
    hasWordExport: true,
  },
  {
    id: "inventory",
    title: "Consumo de Insumos",
    description: "Stock actual y consumo de productos en el inventario",
    icon: <Package className="w-6 h-6 text-info" />,
    showLotFilter: false,
    showOperatorFilter: false,
    requiresCostPermission: true,
    hasWordExport: true,
  },
  {
    id: "sanitary",
    title: "Historial Sanitario",
    description: "Reportes de plagas y enfermedades con estado, severidad y fechas de seguimiento",
    icon: <Bug className="w-6 h-6 text-destructive" />,
    showLotFilter: true,
    showOperatorFilter: false,
    hasWordExport: true,
  },
];
export default function Informes() {
  const { canManage } = useAuth();
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, ReportFiltersState>>({});

  const visibleReports = reportConfigs.filter((report) => {
    if (report.requiresCostPermission && !canManage) {
      return false;
    }
    return true;
  });

  const getFilters = (reportId: string): ReportFiltersState => filters[reportId] || {};

  const updateFilters = (reportId: string, newFilters: ReportFiltersState) => {
    setFilters((prev) => ({ ...prev, [reportId]: newFilters }));
  };

  const handleExportExcel = async (reportId: string) => {
    const reportFilters = getFilters(reportId);
    switch (reportId) {
      case "phytosanitary": await exportPhytosanitaryExcel(reportFilters); break;
      case "production": await exportProductionReport(reportFilters); break;
      case "productivity": await exportProductivityReport(reportFilters); break;
      case "costs": await exportCostsReport(reportFilters); break;
      case "inventory": await exportInventoryReport(); break;
      case "sanitary": await exportSanitaryReport(reportFilters); break;
    }
  };

  const handleExportPDF = async (reportId: string) => {
    const reportFilters = getFilters(reportId);
    switch (reportId) {
      case "phytosanitary": await exportPhytosanitaryPDF(reportFilters); break;
      case "production": await exportProductionPDF(reportFilters); break;
      case "productivity": await exportProductivityPDF(reportFilters); break;
      case "costs": await exportCostsPDF(reportFilters); break;
      case "inventory": await exportInventoryPDF(); break;
      case "sanitary": await exportSanitaryPDF(reportFilters); break;
    }
  };

  const handleExportWord = async (reportId: string) => {
    const reportFilters = getFilters(reportId);
    switch (reportId) {
      case "phytosanitary": await exportPhytosanitaryWord(reportFilters); break;
      case "production": await exportProductionWord(reportFilters); break;
      case "productivity": await exportProductivityWord(reportFilters); break;
      case "costs": await exportCostsWord(reportFilters); break;
      case "inventory": await exportInventoryWord(); break;
      case "sanitary": await exportSanitaryWord(reportFilters); break;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Informes
          </h1>
          <p className="text-muted-foreground">
            Genera y exporta reportes del cultivo en formato Excel, PDF o Word
          </p>
        </div>

        <div className="grid gap-4">
          {visibleReports.map((report) => {
            const isExpanded = expandedReport === report.id;
            const reportFilters = getFilters(report.id);

            return (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-muted">{report.icon}</div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-1">{report.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isExpanded && (
                        <ReportExportButtons
                          onExportExcel={() => handleExportExcel(report.id)}
                          onExportPDF={() => handleExportPDF(report.id)}
                          onExportWord={report.hasWordExport ? () => handleExportWord(report.id) : undefined}
                        />
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    <ReportFilters
                      filters={reportFilters}
                      onFiltersChange={(newFilters) => updateFilters(report.id, newFilters)}
                      showLotFilter={report.showLotFilter}
                      showOperatorFilter={report.showOperatorFilter}
                    />
                    <div className="flex justify-end">
                      <ReportExportButtons
                        onExportExcel={() => handleExportExcel(report.id)}
                        onExportPDF={() => handleExportPDF(report.id)}
                        onExportWord={report.hasWordExport ? () => handleExportWord(report.id) : undefined}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Sobre los informes</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Exporta en Excel (.xlsx), PDF o Word (.docx) para compartir fácilmente</li>
                  <li>Usa los filtros para obtener datos específicos por fecha, lote u operario</li>
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
