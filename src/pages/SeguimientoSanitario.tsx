import { useState, useEffect, useMemo } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PestReportCard } from "@/components/sanitary/PestReportCard";
import { SanitaryFilters } from "@/components/sanitary/SanitaryFilters";
import { ExportButton } from "@/components/sanitary/ExportButton";
import {
  Bug,
  Clock,
  Wrench,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface PestReport {
  id: string;
  pest_type: string;
  severity: number;
  status: PestReportStatus;
  follow_up_date: string | null;
  created_at: string;
  incidence_percent: number | null;
  photo_url: string | null;
  lot: {
    name: string;
  } | null;
}

interface Lot {
  id: string;
  name: string;
}

export default function SeguimientoSanitario() {
  const { toast } = useToast();
  const [reports, setReports] = useState<PestReport[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Filters
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [selectedPestType, setSelectedPestType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("pendiente");

  // Get unique pest types from all reports
  const [allPestTypes, setAllPestTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchLots();
    fetchPestTypes();
    fetchReports();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedLot, selectedPestType, dateFrom, dateTo]);

  const fetchLots = async () => {
    const { data } = await supabase
      .from("lots")
      .select("id, name")
      .order("name");
    if (data) setLots(data);
  };

  const fetchPestTypes = async () => {
    const { data } = await supabase
      .from("pest_reports")
      .select("pest_type");
    if (data) {
      const uniqueTypes = [...new Set(data.map((r) => r.pest_type))].sort();
      setAllPestTypes(uniqueTypes);
    }
  };

  const fetchReports = async () => {
    setLoading(true);

    let query = supabase
      .from("pest_reports")
      .select(`
        id,
        pest_type,
        severity,
        status,
        follow_up_date,
        created_at,
        incidence_percent,
        photo_url,
        lot:lots(name)
      `)
      .order("follow_up_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (selectedLot !== "all") {
      query = query.eq("lot_id", selectedLot);
    }

    if (selectedPestType !== "all") {
      query = query.eq("pest_type", selectedPestType);
    }

    if (dateFrom) {
      query = query.gte("created_at", startOfDay(dateFrom).toISOString());
    }

    if (dateTo) {
      query = query.lte("created_at", endOfDay(dateTo).toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setReports(data as unknown as PestReport[]);
    }
    setLoading(false);
  };

  const hasActiveFilters = 
    selectedLot !== "all" || 
    selectedPestType !== "all" || 
    dateFrom !== undefined || 
    dateTo !== undefined;

  const clearFilters = () => {
    setSelectedLot("all");
    setSelectedPestType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleStatusChange = async (id: string, newStatus: PestReportStatus) => {
    setUpdating(id);

    const { error } = await supabase
      .from("pest_reports")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Estado actualizado",
        description: `Reporte marcado como "${newStatus.replace("_", " ")}"`,
      });
      fetchReports();
    }
    setUpdating(null);
  };

  const filterReportsByStatus = (status: PestReportStatus) =>
    reports.filter((r) => r.status === status);

  const pendientes = filterReportsByStatus("pendiente");
  const enTratamiento = filterReportsByStatus("en_tratamiento");
  const resueltos = filterReportsByStatus("resuelto");

  const overdueCount = reports.filter(
    (r) =>
      r.status !== "resuelto" &&
      r.follow_up_date &&
      new Date(r.follow_up_date) < new Date()
  ).length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="w-6 h-6 text-warning flex-shrink-0" />
              <span className="truncate">Seguimiento Sanitario</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestiona el estado de los reportes de plagas
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ExportButton reports={reports} disabled={loading} />
            <Button variant="ghost" size="icon" onClick={fetchReports}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium">
                {overdueCount} reporte{overdueCount > 1 ? "s" : ""} con
                seguimiento vencido
              </span>
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card
            className="cursor-pointer transition-all hover:border-warning"
            onClick={() => setActiveTab("pendiente")}
          >
            <CardContent className="py-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-warning" />
              <p className="text-2xl font-bold">{pendientes.length}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-blue-500"
            onClick={() => setActiveTab("en_tratamiento")}
          >
            <CardContent className="py-3 text-center">
              <Wrench className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{enTratamiento.length}</p>
              <p className="text-xs text-muted-foreground">En tratamiento</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:border-success"
            onClick={() => setActiveTab("resuelto")}
          >
            <CardContent className="py-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-2xl font-bold">{resueltos.length}</p>
              <p className="text-xs text-muted-foreground">Resueltos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <SanitaryFilters
          lots={lots}
          pestTypes={allPestTypes}
          selectedLot={selectedLot}
          selectedPestType={selectedPestType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onLotChange={setSelectedLot}
          onPestTypeChange={setSelectedPestType}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Tabs with reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pendiente" className="gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pendientes</span>
              <span className="sm:hidden">{pendientes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="en_tratamiento" className="gap-1">
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tratamiento</span>
              <span className="sm:hidden">{enTratamiento.length}</span>
            </TabsTrigger>
            <TabsTrigger value="resuelto" className="gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resueltos</span>
              <span className="sm:hidden">{resueltos.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendiente" className="space-y-3 mt-4">
            {pendientes.length === 0 ? (
              <EmptyState message="No hay reportes pendientes" />
            ) : (
              pendientes.map((report) => (
                <PestReportCard
                  key={report.id}
                  report={report}
                  onStatusChange={handleStatusChange}
                  isUpdating={updating === report.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="en_tratamiento" className="space-y-3 mt-4">
            {enTratamiento.length === 0 ? (
              <EmptyState message="No hay reportes en tratamiento" />
            ) : (
              enTratamiento.map((report) => (
                <PestReportCard
                  key={report.id}
                  report={report}
                  onStatusChange={handleStatusChange}
                  isUpdating={updating === report.id}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="resuelto" className="space-y-3 mt-4">
            {resueltos.length === 0 ? (
              <EmptyState message="No hay reportes resueltos" />
            ) : (
              resueltos.map((report) => (
                <PestReportCard
                  key={report.id}
                  report={report}
                  onStatusChange={handleStatusChange}
                  isUpdating={updating === report.id}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <Bug className="w-10 h-10 mx-auto mb-2 opacity-30" />
      <p>{message}</p>
    </div>
  );
}
