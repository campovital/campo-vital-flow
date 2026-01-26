import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Package, Users } from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CostsExportButton } from "./CostsExportButton";

interface ApplicationWithCosts {
  id: string;
  device_time: string;
  status: string;
  total_product_cost: number;
  total_labor_cost: number;
  total_cost: number;
  labor_hours: number;
  lot: { name: string };
  operator: { full_name: string };
  protocol_version: {
    protocol: { name: string };
  };
}

export function ApplicationCostsSummary() {
  const [applications, setApplications] = useState<ApplicationWithCosts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [totals, setTotals] = useState({
    productCost: 0,
    laborCost: 0,
    totalCost: 0,
    count: 0,
  });

  useEffect(() => {
    fetchApplications();
  }, [dateRange]);

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

  const fetchApplications = async () => {
    setIsLoading(true);
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
        lot:lots(name),
        operator:operators(full_name),
        protocol_version:protocol_versions(
          protocol:protocols(name)
        )
      `)
      .gte("device_time", fromDate)
      .order("device_time", { ascending: false });

    if (data) {
      const apps = data as unknown as ApplicationWithCosts[];
      setApplications(apps);

      // Calculate totals
      const totalsCalc = apps.reduce(
        (acc, app) => ({
          productCost: acc.productCost + (app.total_product_cost || 0),
          laborCost: acc.laborCost + (app.total_labor_cost || 0),
          totalCost: acc.totalCost + (app.total_cost || 0),
          count: acc.count + 1,
        }),
        { productCost: 0, laborCost: 0, totalCost: 0, count: 0 }
      );
      setTotals(totalsCalc);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ejecutada":
        return <Badge variant="default">Ejecutada</Badge>;
      case "ejecutada_con_novedad":
        return <Badge variant="secondary">Con novedad</Badge>;
      case "no_ejecutada":
        return <Badge variant="destructive">No ejecutada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex justify-between items-center gap-4">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Este mes</SelectItem>
            <SelectItem value="quarter">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>
        
        <CostsExportButton dateRange={dateRange} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aplicaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Costo Insumos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.productCost)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Costo Mano de Obra</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.laborCost)}</div>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totals.totalCost)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Aplicaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay aplicaciones en el período seleccionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Operario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Insumos</TableHead>
                  <TableHead className="text-right">M. Obra</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      {format(new Date(app.device_time), "dd MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{app.lot?.name || "—"}</TableCell>
                    <TableCell>{app.protocol_version?.protocol?.name || "—"}</TableCell>
                    <TableCell>{app.operator?.full_name || "—"}</TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(app.total_product_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(app.total_labor_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(app.total_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
