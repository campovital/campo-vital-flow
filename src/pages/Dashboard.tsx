import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Sprout,
  DollarSign,
  Bug,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Users,
  AlertTriangle,
  Loader2,
  FileDown,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

interface DashboardStats {
  totalKgThisMonth: number;
  totalKgLastMonth: number;
  totalCostThisMonth: number;
  totalCostLastMonth: number;
  costPerKg: number;
  pendingSanitaryReports: number;
  activeOperators: number;
  lowStockProducts: number;
}

interface HarvestByDay {
  date: string;
  kg: number;
}

interface CostByCategory {
  name: string;
  value: number;
  color: string;
}

interface SanitaryByStatus {
  status: string;
  count: number;
}

export default function Dashboard() {
  const { canManage } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [stats, setStats] = useState<DashboardStats>({
    totalKgThisMonth: 0,
    totalKgLastMonth: 0,
    totalCostThisMonth: 0,
    totalCostLastMonth: 0,
    costPerKg: 0,
    pendingSanitaryReports: 0,
    activeOperators: 0,
    lowStockProducts: 0,
  });
  const [harvestData, setHarvestData] = useState<HarvestByDay[]>([]);
  const [costData, setCostData] = useState<CostByCategory[]>([]);
  const [sanitaryData, setSanitaryData] = useState<SanitaryByStatus[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchHarvestTrend(),
        fetchCostBreakdown(),
        fetchSanitaryStatus(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Continue with whatever data we have - don't block the UI
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now).toISOString();
    const thisMonthEnd = endOfMonth(now).toISOString();
    const lastMonthStart = startOfMonth(subDays(now, 30)).toISOString();
    const lastMonthEnd = endOfMonth(subDays(now, 30)).toISOString();

    // Harvests this month
    const { data: harvestsThisMonth } = await supabase
      .from("harvests")
      .select("total_kg")
      .gte("harvest_date", thisMonthStart.split("T")[0])
      .lte("harvest_date", thisMonthEnd.split("T")[0]);

    const totalKgThisMonth = harvestsThisMonth?.reduce((sum, h) => sum + (h.total_kg || 0), 0) || 0;

    // Harvests last month
    const { data: harvestsLastMonth } = await supabase
      .from("harvests")
      .select("total_kg")
      .gte("harvest_date", lastMonthStart.split("T")[0])
      .lte("harvest_date", lastMonthEnd.split("T")[0]);

    const totalKgLastMonth = harvestsLastMonth?.reduce((sum, h) => sum + (h.total_kg || 0), 0) || 0;

    // Costs this month
    const { data: costsThisMonth } = await supabase
      .from("applications")
      .select("total_cost")
      .gte("device_time", thisMonthStart)
      .lte("device_time", thisMonthEnd);

    const totalCostThisMonth = costsThisMonth?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0;

    // Costs last month
    const { data: costsLastMonth } = await supabase
      .from("applications")
      .select("total_cost")
      .gte("device_time", lastMonthStart)
      .lte("device_time", lastMonthEnd);

    const totalCostLastMonth = costsLastMonth?.reduce((sum, c) => sum + (c.total_cost || 0), 0) || 0;

    // Cost per kg
    const costPerKg = totalKgThisMonth > 0 ? totalCostThisMonth / totalKgThisMonth : 0;

    // Pending sanitary reports
    const { count: pendingSanitaryReports } = await supabase
      .from("pest_reports")
      .select("*", { count: "exact", head: true })
      .neq("status", "resuelto");

    // Active operators
    const { count: activeOperators } = await supabase
      .from("operators")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    // Low stock products (quantity < 10)
    const { data: batches } = await supabase
      .from("inventory_batches")
      .select("product_id, quantity");
    
    const productQuantities: Record<string, number> = {};
    batches?.forEach(b => {
      productQuantities[b.product_id] = (productQuantities[b.product_id] || 0) + b.quantity;
    });
    const lowStockProducts = Object.values(productQuantities).filter(q => q < 10).length;

    setStats({
      totalKgThisMonth,
      totalKgLastMonth,
      totalCostThisMonth,
      totalCostLastMonth,
      costPerKg,
      pendingSanitaryReports: pendingSanitaryReports || 0,
      activeOperators: activeOperators || 0,
      lowStockProducts,
    });
  };

  const fetchHarvestTrend = async () => {
    const days = dateRange === "week" ? 7 : 30;
    const startDate = subDays(new Date(), days);
    
    const { data } = await supabase
      .from("harvests")
      .select("harvest_date, total_kg")
      .gte("harvest_date", startDate.toISOString().split("T")[0])
      .order("harvest_date");

    // Group by day
    const grouped: Record<string, number> = {};
    data?.forEach(h => {
      grouped[h.harvest_date] = (grouped[h.harvest_date] || 0) + h.total_kg;
    });

    // Fill in missing days
    const allDays = eachDayOfInterval({ start: startDate, end: new Date() });
    const chartData = allDays.map(day => {
      const dateKey = format(day, "yyyy-MM-dd");
      return {
        date: format(day, "dd MMM", { locale: es }),
        kg: grouped[dateKey] || 0,
      };
    });

    setHarvestData(chartData);
  };

  const fetchCostBreakdown = async () => {
    const startDate = subDays(new Date(), 30).toISOString();
    
    const { data: applications } = await supabase
      .from("applications")
      .select("total_product_cost, total_labor_cost")
      .gte("device_time", startDate);

    const productCost = applications?.reduce((sum, a) => sum + (a.total_product_cost || 0), 0) || 0;
    const laborCost = applications?.reduce((sum, a) => sum + (a.total_labor_cost || 0), 0) || 0;

    setCostData([
      { name: "Insumos", value: productCost, color: "hsl(var(--primary))" },
      { name: "Mano de obra", value: laborCost, color: "hsl(var(--success))" },
    ]);
  };

  const fetchSanitaryStatus = async () => {
    const { data } = await supabase
      .from("pest_reports")
      .select("status");

    const grouped: Record<string, number> = {};
    data?.forEach(r => {
      grouped[r.status] = (grouped[r.status] || 0) + 1;
    });

    const statusLabels: Record<string, string> = {
      pendiente: "Pendiente",
      en_tratamiento: "En Tratamiento",
      resuelto: "Resuelto",
    };

    setSanitaryData(
      Object.entries(grouped).map(([status, count]) => ({
        status: statusLabels[status] || status,
        count,
      }))
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    const change = ((current - previous) / previous) * 100;
    return isNaN(change) || !isFinite(change) ? 0 : change;
  };

  const kgChange = getPercentChange(stats.totalKgThisMonth, stats.totalKgLastMonth);
  const costChange = getPercentChange(stats.totalCostThisMonth, stats.totalCostLastMonth);

  // Safe cost per kg that handles NaN/Infinity
  const safeCostPerKg = isNaN(stats.costPerKg) || !isFinite(stats.costPerKg) ? 0 : stats.costPerKg;

  const handleExportReport = () => {
    const reportData = [
      { Métrica: "Producción este mes (kg)", Valor: stats.totalKgThisMonth },
      { Métrica: "Producción mes anterior (kg)", Valor: stats.totalKgLastMonth },
      { Métrica: "Variación producción (%)", Valor: kgChange.toFixed(1) },
      { Métrica: "Costo total este mes", Valor: stats.totalCostThisMonth },
      { Métrica: "Costo por kilo", Valor: stats.costPerKg.toFixed(0) },
      { Métrica: "Reportes sanitarios pendientes", Valor: stats.pendingSanitaryReports },
      { Métrica: "Operarios activos", Valor: stats.activeOperators },
      { Métrica: "Productos con stock bajo", Valor: stats.lowStockProducts },
    ];

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard");
    XLSX.writeFile(workbook, `dashboard_${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Resumen de indicadores del cultivo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mes</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportReport}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Producción</CardTitle>
              <Sprout className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalKgThisMonth.toFixed(0)} kg</div>
              <div className="flex items-center gap-1 text-xs">
                {kgChange >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className={kgChange >= 0 ? "text-success" : "text-destructive"}>
                  {kgChange >= 0 ? "+" : ""}{kgChange.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs mes anterior</span>
              </div>
            </CardContent>
          </Card>

          {canManage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalCostThisMonth)}</div>
                <div className="flex items-center gap-1 text-xs">
                  {costChange <= 0 ? (
                    <TrendingDown className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-warning" />
                  )}
                  <span className={costChange <= 0 ? "text-success" : "text-warning"}>
                    {costChange >= 0 ? "+" : ""}{costChange.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs mes anterior</span>
                </div>
              </CardContent>
            </Card>
          )}

          {canManage && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Costo por Kilo</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(safeCostPerKg)}</div>
                <p className="text-xs text-muted-foreground">promedio este mes</p>
              </CardContent>
            </Card>
          )}

          <Card className={stats.pendingSanitaryReports > 0 ? "border-warning" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alertas Sanitarias</CardTitle>
              <Bug className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSanitaryReports}</div>
              <p className="text-xs text-muted-foreground">reportes pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operarios Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeOperators}</div>
            </CardContent>
          </Card>

          <Card className={stats.lowStockProducts > 0 ? "border-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <Package className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStockProducts}</div>
              <p className="text-xs text-muted-foreground">productos por reabastecer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Fecha</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{format(new Date(), "d MMM", { locale: es })}</div>
              <p className="text-xs text-muted-foreground">
                Semana ISO {format(new Date(), "w")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Harvest Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tendencia de Cosecha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {harvestData.length === 0 || harvestData.every(d => d.kg === 0) ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Sprout className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Sin datos de cosecha</p>
                      <p className="text-sm">Registre cosechas para ver la tendencia</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={harvestData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        formatter={(value) => [`${value} kg`, "Cosecha"]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kg" 
                        stroke="hsl(var(--success))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribución de Costos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {costData.length === 0 || costData.every(d => d.value === 0) ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Sin datos de costos</p>
                        <p className="text-sm">Registre aplicaciones para ver costos</p>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={costData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {costData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                {costData.length > 0 && costData.some(d => d.value > 0) && (
                  <div className="flex justify-center gap-4 mt-2">
                    {costData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}: {formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sanitary Status */}
          <Card className={!canManage ? "lg:col-span-2" : ""}>
            <CardHeader>
              <CardTitle className="text-base">Estado Sanitario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {sanitaryData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Bug className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Sin reportes sanitarios</p>
                      <p className="text-sm">No hay incidencias registradas</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sanitaryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="status" type="category" className="text-xs" width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Section */}
        {(stats.pendingSanitaryReports > 0 || stats.lowStockProducts > 0) && (
          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Alertas Activas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.pendingSanitaryReports > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10">
                  <Bug className="w-4 h-4 text-warning" />
                  <span>{stats.pendingSanitaryReports} reportes sanitarios pendientes de atención</span>
                </div>
              )}
              {stats.lowStockProducts > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
                  <Package className="w-4 h-4 text-destructive" />
                  <span>{stats.lowStockProducts} productos con stock bajo (menos de 10 unidades)</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
