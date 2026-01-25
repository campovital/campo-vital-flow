import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays, subMonths, startOfDay, endOfDay, differenceInDays, differenceInHours, startOfMonth, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Bug, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, CalendarIcon, RefreshCw, Timer, Target, BarChart3, GitCompare, Minus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardPdfExport } from "./DashboardPdfExport";
import { cn } from "@/lib/utils";

interface PestReport {
  id: string;
  pest_type: string;
  severity: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
  lot_id: string;
  lots: { name: string } | null;
}

interface LotStats {
  name: string;
  total: number;
  pendiente: number;
  en_tratamiento: number;
  resuelto: number;
  effectivenessRate: number;
}

interface TimeSeriesData {
  date: string;
  reportes: number;
}

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyTrendData {
  month: string;
  total: number;
  pendiente: number;
  en_tratamiento: number;
  resuelto: number;
}

interface ComparisonData {
  label: string;
  current: number;
  previous: number;
}

type DatePreset = "7days" | "30days" | "90days" | "custom";

interface DatePresetOption {
  id: DatePreset;
  label: string;
  getDays: () => number;
}

const SEVERITY_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
const STATUS_COLORS = {
  pendiente: "hsl(var(--warning))",
  en_tratamiento: "hsl(var(--info))",
  resuelto: "hsl(var(--success))",
};

const DATE_PRESETS: DatePresetOption[] = [
  { id: "7days", label: "7 días", getDays: () => 7 },
  { id: "30days", label: "30 días", getDays: () => 30 },
  { id: "90days", label: "90 días", getDays: () => 90 },
];

export function SanitaryDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<PestReport[]>([]);
  const [lotStats, setLotStats] = useState<LotStats[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [severityData, setSeverityData] = useState<SeverityData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [pestTypeData, setPestTypeData] = useState<{ name: string; value: number }[]>([]);
  const [avgResolutionHours, setAvgResolutionHours] = useState<number | null>(null);
  const [overallEffectivenessRate, setOverallEffectivenessRate] = useState<number>(0);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendData[]>([]);
  
  // Date range state
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [activePreset, setActivePreset] = useState<DatePreset>("30days");

  // Comparison mode state
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonDateFrom, setComparisonDateFrom] = useState<Date>(subDays(new Date(), 60));
  const [comparisonDateTo, setComparisonDateTo] = useState<Date>(subDays(new Date(), 31));
  const [comparisonReports, setComparisonReports] = useState<PestReport[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (comparisonEnabled) {
      fetchComparisonData();
    }
  }, [comparisonEnabled, comparisonDateFrom, comparisonDateTo, reports]);

  const handlePresetClick = (preset: DatePresetOption) => {
    const today = new Date();
    setDateTo(today);
    setDateFrom(subDays(today, preset.getDays()));
    setActivePreset(preset.id);
  };

  const handleCustomDateChange = (type: "from" | "to", date: Date | undefined) => {
    if (!date) return;
    
    if (type === "from") {
      setDateFrom(date);
    } else {
      setDateTo(date);
    }
    setActivePreset("custom");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pest_reports")
        .select("id, pest_type, severity, status, created_at, resolved_at, lot_id, lots(name)")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const typedData = (data || []) as PestReport[];
      setReports(typedData);
      processData(typedData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparisonData = async () => {
    if (!comparisonEnabled) return;
    
    try {
      const { data, error } = await supabase
        .from("pest_reports")
        .select("id, pest_type, severity, status, created_at, resolved_at, lot_id, lots(name)")
        .gte("created_at", startOfDay(comparisonDateFrom).toISOString())
        .lte("created_at", endOfDay(comparisonDateTo).toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const typedData = (data || []) as PestReport[];
      setComparisonReports(typedData);
      
      // Build comparison data
      buildComparisonData(reports, typedData);
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    }
  };

  const buildComparisonData = (currentData: PestReport[], previousData: PestReport[]) => {
    const currentTotal = currentData.length;
    const previousTotal = previousData.length;
    
    const currentPending = currentData.filter(r => r.status === "pendiente").length;
    const previousPending = previousData.filter(r => r.status === "pendiente").length;
    
    const currentTreatment = currentData.filter(r => r.status === "en_tratamiento").length;
    const previousTreatment = previousData.filter(r => r.status === "en_tratamiento").length;
    
    const currentResolved = currentData.filter(r => r.status === "resuelto").length;
    const previousResolved = previousData.filter(r => r.status === "resuelto").length;
    
    const currentEffectiveness = currentTotal > 0 ? Math.round((currentResolved / currentTotal) * 100) : 0;
    const previousEffectiveness = previousTotal > 0 ? Math.round((previousResolved / previousTotal) * 100) : 0;
    
    setComparisonData([
      { label: "Total", current: currentTotal, previous: previousTotal },
      { label: "Pendientes", current: currentPending, previous: previousPending },
      { label: "En Tratamiento", current: currentTreatment, previous: previousTreatment },
      { label: "Resueltos", current: currentResolved, previous: previousResolved },
      { label: "Efectividad %", current: currentEffectiveness, previous: previousEffectiveness },
    ]);
  };

  const handleComparisonPreset = (preset: "previous" | "lastYear") => {
    const daysDiff = differenceInDays(dateTo, dateFrom);
    
    if (preset === "previous") {
      // Set comparison to the previous period of the same length
      setComparisonDateTo(subDays(dateFrom, 1));
      setComparisonDateFrom(subDays(dateFrom, daysDiff + 1));
    } else {
      // Set comparison to same period last year
      setComparisonDateFrom(subDays(dateFrom, 365));
      setComparisonDateTo(subDays(dateTo, 365));
    }
  };

  const processData = (data: PestReport[]) => {
    // Calculate average resolution time
    const resolvedReports = data.filter(r => r.status === "resuelto" && r.resolved_at);
    if (resolvedReports.length > 0) {
      const totalHours = resolvedReports.reduce((sum, report) => {
        const hours = differenceInHours(new Date(report.resolved_at!), new Date(report.created_at));
        return sum + hours;
      }, 0);
      setAvgResolutionHours(Math.round(totalHours / resolvedReports.length));
    } else {
      setAvgResolutionHours(null);
    }

    // Calculate overall effectiveness rate
    const totalReports = data.length;
    const resolvedCount = data.filter(r => r.status === "resuelto").length;
    setOverallEffectivenessRate(totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0);

    // Process lot statistics
    const lotMap = new Map<string, LotStats>();
    data.forEach((report) => {
      const lotName = report.lots?.name || "Sin lote";
      if (!lotMap.has(lotName)) {
        lotMap.set(lotName, {
          name: lotName,
          total: 0,
          pendiente: 0,
          en_tratamiento: 0,
          resuelto: 0,
          effectivenessRate: 0,
        });
      }
      const stats = lotMap.get(lotName)!;
      stats.total++;
      if (report.status === "pendiente") stats.pendiente++;
      else if (report.status === "en_tratamiento") stats.en_tratamiento++;
      else if (report.status === "resuelto") stats.resuelto++;
    });
    
    // Calculate effectiveness rate per lot
    lotMap.forEach((stats) => {
      stats.effectivenessRate = stats.total > 0 ? Math.round((stats.resuelto / stats.total) * 100) : 0;
    });
    
    setLotStats(Array.from(lotMap.values()));

    // Process time series (daily counts for the selected range)
    const daysDiff = differenceInDays(dateTo, dateFrom);
    const dateMap = new Map<string, number>();
    for (let i = daysDiff; i >= 0; i--) {
      const date = format(subDays(dateTo, i), "yyyy-MM-dd");
      dateMap.set(date, 0);
    }
    data.forEach((report) => {
      const date = format(new Date(report.created_at), "yyyy-MM-dd");
      if (dateMap.has(date)) {
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });
    setTimeSeriesData(
      Array.from(dateMap.entries()).map(([date, count]) => ({
        date: format(new Date(date), "dd MMM", { locale: es }),
        reportes: count,
      }))
    );

    // Process severity distribution
    const severityCounts = [0, 0, 0, 0, 0];
    data.forEach((report) => {
      if (report.severity >= 1 && report.severity <= 5) {
        severityCounts[report.severity - 1]++;
      }
    });
    setSeverityData(
      severityCounts.map((count, index) => ({
        name: `Nivel ${index + 1}`,
        value: count,
        color: SEVERITY_COLORS[index],
      }))
    );

    // Process status distribution
    const statusCounts = { pendiente: 0, en_tratamiento: 0, resuelto: 0 };
    data.forEach((report) => {
      if (report.status in statusCounts) {
        statusCounts[report.status as keyof typeof statusCounts]++;
      }
    });
    setStatusData([
      { name: "Pendiente", value: statusCounts.pendiente, color: STATUS_COLORS.pendiente },
      { name: "En Tratamiento", value: statusCounts.en_tratamiento, color: STATUS_COLORS.en_tratamiento },
      { name: "Resuelto", value: statusCounts.resuelto, color: STATUS_COLORS.resuelto },
    ]);

    // Process pest type distribution
    const pestTypeMap = new Map<string, number>();
    data.forEach((report) => {
      pestTypeMap.set(report.pest_type, (pestTypeMap.get(report.pest_type) || 0) + 1);
    });
    setPestTypeData(
      Array.from(pestTypeMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    );

    // Process monthly trend data
    const monthlyMap = new Map<string, MonthlyTrendData>();
    data.forEach((report) => {
      const monthKey = format(new Date(report.created_at), "yyyy-MM");
      const monthLabel = format(new Date(report.created_at), "MMM yyyy", { locale: es });
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthLabel,
          total: 0,
          pendiente: 0,
          en_tratamiento: 0,
          resuelto: 0,
        });
      }
      
      const stats = monthlyMap.get(monthKey)!;
      stats.total++;
      if (report.status === "pendiente") stats.pendiente++;
      else if (report.status === "en_tratamiento") stats.en_tratamiento++;
      else if (report.status === "resuelto") stats.resuelto++;
    });
    
    // Sort by month and set data
    const sortedMonthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
    setMonthlyTrendData(sortedMonthly);
  };

  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === "pendiente").length;
  const inTreatmentReports = reports.filter((r) => r.status === "en_tratamiento").length;
  const resolvedReports = reports.filter((r) => r.status === "resuelto").length;

  // Comparison metrics from previous period
  const prevTotal = comparisonReports.length;
  const prevPending = comparisonReports.filter((r) => r.status === "pendiente").length;
  const prevTreatment = comparisonReports.filter((r) => r.status === "en_tratamiento").length;
  const prevResolved = comparisonReports.filter((r) => r.status === "resuelto").length;
  const prevEffectiveness = prevTotal > 0 ? Math.round((prevResolved / prevTotal) * 100) : 0;

  // Trend indicator component
  const TrendIndicator = ({ 
    current, 
    previous, 
    invertColors = false 
  }: { 
    current: number; 
    previous: number; 
    invertColors?: boolean;
  }) => {
    if (!comparisonEnabled || previous === 0 && current === 0) return null;
    
    const diff = current - previous;
    const percentChange = previous > 0 
      ? Math.round((diff / previous) * 100) 
      : current > 0 ? 100 : 0;
    
    if (diff === 0) {
      return (
        <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </span>
      );
    }
    
    const isPositive = diff > 0;
    // For some metrics (like pending), increase is bad, so we invert the colors
    const isGood = invertColors ? !isPositive : isPositive;
    
    return (
      <span className={cn(
        "flex items-center gap-0.5 text-xs font-medium ml-1 animate-fade-in",
        isGood ? "text-success" : "text-destructive"
      )}>
        {isPositive ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        <span>{isPositive ? "+" : ""}{percentChange}%</span>
      </span>
    );
  };
  
  const getDateRangeLabel = () => {
    const preset = DATE_PRESETS.find(p => p.id === activePreset);
    if (preset) return `Últimos ${preset.label}`;
    return `${format(dateFrom, "d MMM", { locale: es })} - ${format(dateTo, "d MMM yyyy", { locale: es })}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const chartConfig = {
    reportes: { label: "Reportes", color: "hsl(var(--primary))" },
    pendiente: { label: "Pendiente", color: STATUS_COLORS.pendiente },
    en_tratamiento: { label: "En Tratamiento", color: STATUS_COLORS.en_tratamiento },
    resuelto: { label: "Resuelto", color: STATUS_COLORS.resuelto },
  };

  return (
    <div className="space-y-4">
      {/* Date Range Controls & Export */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Período del Dashboard
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {/* Preset buttons */}
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={activePreset === preset.id ? "secondary" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs",
                      activePreset === preset.id && "bg-primary/10 border-primary/50"
                    )}
                    onClick={() => handlePresetClick(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
                
                {/* Custom date pickers */}
                <div className="flex items-center gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={activePreset === "custom" ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1",
                          activePreset === "custom" && "bg-primary/10 border-primary/50"
                        )}
                      >
                        <CalendarIcon className="w-3 h-3" />
                        {format(dateFrom, "d MMM", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => handleCustomDateChange("from", date)}
                        disabled={(date) => date > dateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-xs text-muted-foreground">a</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={activePreset === "custom" ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1",
                          activePreset === "custom" && "bg-primary/10 border-primary/50"
                        )}
                      >
                        <CalendarIcon className="w-3 h-3" />
                        {format(dateTo, "d MMM", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => handleCustomDateChange("to", date)}
                        disabled={(date) => date < dateFrom || date > new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={fetchData}
                >
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </div>

              {/* Comparison toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="comparison-mode"
                  checked={comparisonEnabled}
                  onCheckedChange={setComparisonEnabled}
                />
                <Label htmlFor="comparison-mode" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" />
                  Comparar
                </Label>
              </div>
            </div>
            
            <DashboardPdfExport
              dashboardRef={dashboardRef}
              totalReports={totalReports}
              pendingReports={pendingReports}
              inTreatmentReports={inTreatmentReports}
              resolvedReports={resolvedReports}
              avgResolutionHours={avgResolutionHours}
              overallEffectivenessRate={overallEffectivenessRate}
              dateFrom={dateFrom}
              dateTo={dateTo}
              dateRangeLabel={getDateRangeLabel()}
            />
          </div>

          {/* Comparison Period Selector */}
          {comparisonEnabled && (
            <div className="border-t pt-4 mt-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5" />
                  Período de Comparación
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleComparisonPreset("previous")}
                  >
                    Período anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleComparisonPreset("lastYear")}
                  >
                    Mismo período año anterior
                  </Button>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                        >
                          <CalendarIcon className="w-3 h-3" />
                          {format(comparisonDateFrom, "d MMM", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={comparisonDateFrom}
                          onSelect={(date) => date && setComparisonDateFrom(date)}
                          disabled={(date) => date > comparisonDateTo}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <span className="text-xs text-muted-foreground">a</span>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                        >
                          <CalendarIcon className="w-3 h-3" />
                          {format(comparisonDateTo, "d MMM", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={comparisonDateTo}
                          onSelect={(date) => date && setComparisonDateTo(date)}
                          disabled={(date) => date < comparisonDateFrom || date > new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div ref={dashboardRef} className="space-y-4 bg-background">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{totalReports}</p>
                  <TrendIndicator current={totalReports} previous={prevTotal} />
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{pendingReports}</p>
                  <TrendIndicator current={pendingReports} previous={prevPending} invertColors />
                </div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{inTreatmentReports}</p>
                  <TrendIndicator current={inTreatmentReports} previous={prevTreatment} />
                </div>
                <p className="text-xs text-muted-foreground">En Tratamiento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{resolvedReports}</p>
                  <TrendIndicator current={resolvedReports} previous={prevResolved} />
                </div>
                <p className="text-xs text-muted-foreground">Resueltos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Timer className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgResolutionHours !== null 
                    ? avgResolutionHours >= 24 
                      ? `${Math.round(avgResolutionHours / 24)}d`
                      : `${avgResolutionHours}h`
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Tiempo Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center">
                  <p className="text-2xl font-bold">{overallEffectivenessRate}%</p>
                  <TrendIndicator current={overallEffectivenessRate} previous={prevEffectiveness} />
                </div>
                <p className="text-xs text-muted-foreground">Tasa Efectividad</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      {comparisonEnabled && comparisonData.length > 0 && (
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Comparación de Períodos
            </CardTitle>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary" />
                Actual: {format(dateFrom, "d MMM", { locale: es })} - {format(dateTo, "d MMM", { locale: es })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-muted-foreground/50" />
                Anterior: {format(comparisonDateFrom, "d MMM", { locale: es })} - {format(comparisonDateTo, "d MMM", { locale: es })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ComparisonData;
                      const diff = data.current - data.previous;
                      const percentChange = data.previous > 0 
                        ? ((diff / data.previous) * 100).toFixed(1)
                        : data.current > 0 ? "+100" : "0";
                      
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-medium mb-2">{label}</p>
                          <div className="space-y-1">
                            <p className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary" />
                              Actual: <span className="font-medium">{data.current}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                              Anterior: <span className="font-medium">{data.previous}</span>
                            </p>
                            <p className={cn(
                              "border-t pt-1 mt-1 font-medium",
                              diff > 0 ? "text-destructive" : diff < 0 ? "text-success" : ""
                            )}>
                              Cambio: {diff > 0 ? "+" : ""}{diff} ({percentChange}%)
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="current" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Período Actual" />
                <Bar dataKey="previous" fill="hsl(var(--muted-foreground) / 0.4)" radius={[4, 4, 0, 0]} name="Período Anterior" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Time Series Chart */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Reportes por Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }} 
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="reportes"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Reports by Lot */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reportes por Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={lotStats} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pendiente" stackId="a" fill={STATUS_COLORS.pendiente} radius={[0, 0, 0, 0]} />
                <Bar dataKey="en_tratamiento" stackId="a" fill={STATUS_COLORS.en_tratamiento} radius={[0, 0, 0, 0]} />
                <Bar dataKey="resuelto" stackId="a" fill={STATUS_COLORS.resuelto} radius={[4, 4, 4, 4]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Effectiveness Rate by Lot */}
        <Card className="border-0 shadow-soft lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Tasa de Efectividad por Lote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={lotStats} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as LotStats;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-2 text-xs">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-muted-foreground">
                            Efectividad: <span className="font-medium text-foreground">{data.effectivenessRate}%</span>
                          </p>
                          <p className="text-muted-foreground">
                            Resueltos: {data.resuelto} de {data.total}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="effectivenessRate" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                  name="Efectividad"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por Severidad</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={severityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-0 shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Estado de Reportes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Pest Types */}
        {pestTypeData.length > 0 && (
          <Card className="border-0 shadow-soft lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 Tipos de Plaga</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={pestTypeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend Chart */}
        {monthlyTrendData.length > 1 && (
          <Card className="border-0 shadow-soft lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Tendencia Mensual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={monthlyTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as MonthlyTrendData;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
                            <p className="font-medium mb-2">{label}</p>
                            <div className="space-y-1">
                              <p className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.pendiente }} />
                                Pendientes: <span className="font-medium">{data.pendiente}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.en_tratamiento }} />
                                En Tratamiento: <span className="font-medium">{data.en_tratamiento}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.resuelto }} />
                                Resueltos: <span className="font-medium">{data.resuelto}</span>
                              </p>
                              <p className="border-t pt-1 mt-1">
                                Total: <span className="font-bold">{data.total}</span>
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="pendiente" stackId="monthly" fill={STATUS_COLORS.pendiente} radius={[0, 0, 0, 0]} name="Pendiente" />
                  <Bar dataKey="en_tratamiento" stackId="monthly" fill={STATUS_COLORS.en_tratamiento} radius={[0, 0, 0, 0]} name="En Tratamiento" />
                  <Bar dataKey="resuelto" stackId="monthly" fill={STATUS_COLORS.resuelto} radius={[4, 4, 0, 0]} name="Resuelto" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
