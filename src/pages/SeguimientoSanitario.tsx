import React, { useState, useEffect } from "react";
import { useReadOnly } from "@/hooks/use-read-only";
import { startOfDay, endOfDay } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagination } from "@/hooks/use-pagination";
import { PestReportCard } from "@/components/sanitary/PestReportCard";
import { SanitaryFilters, SortOption, SortDirection } from "@/components/sanitary/SanitaryFilters";
import { ExportButton } from "@/components/sanitary/ExportButton";
import { SanitaryDashboard } from "@/components/sanitary/SanitaryDashboard";
import { BatchActionsBar } from "@/components/sanitary/BatchActionsBar";
import { PaginationControls } from "@/components/sanitary/PaginationControls";
import {
  Bug,
  Clock,
  Wrench,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  List,
  CheckSquare,
} from "lucide-react";

type PestReportStatus = "pendiente" | "en_tratamiento" | "resuelto";

interface PestReportPhoto {
  id: string;
  photo_url: string;
  caption?: string | null;
  created_at?: string;
}

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
  pest_report_photos?: PestReportPhoto[];
}

interface Lot {
  id: string;
  name: string;
}

export default function SeguimientoSanitario() {
  const { toast } = useToast();
  const readOnly = useReadOnly();
  const [reports, setReports] = useState<PestReport[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // Filters
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [selectedPestType, setSelectedPestType] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortOption>("follow_up_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [activeTab, setActiveTab] = useState<string>("pendiente");
  const [viewMode, setViewMode] = useState<"list" | "dashboard">("list");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);
  
  // Debounced search for performance
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  // Debounce search text
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Get unique pest types from all reports
  const [allPestTypes, setAllPestTypes] = useState<string[]>([]);

  useEffect(() => {
    fetchLots();
    fetchPestTypes();
    fetchReports();
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedLot, selectedPestType, selectedSeverity, debouncedSearch, dateFrom, dateTo, sortBy, sortDirection]);

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

  const fetchTotalCount = async () => {
    const { count } = await supabase
      .from("pest_reports")
      .select("*", { count: "exact", head: true });
    if (count !== null) {
      setTotalCount(count);
    }
  };

  const fetchReports = async () => {
    setLoading(true);

    const isAscending = sortDirection === "asc";

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
        lot:lots(name),
        pest_report_photos(id, photo_url, caption, created_at)
      `)
      .order(sortBy, { ascending: isAscending, nullsFirst: false });

    if (selectedLot !== "all") {
      query = query.eq("lot_id", selectedLot);
    }

    if (selectedPestType !== "all") {
      query = query.eq("pest_type", selectedPestType);
    }

    if (selectedSeverity !== "all") {
      query = query.eq("severity", parseInt(selectedSeverity));
    }

    // Text search filter - search in pest_type and notes
    if (debouncedSearch) {
      query = query.or(`pest_type.ilike.%${debouncedSearch}%,notes.ilike.%${debouncedSearch}%`);
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
    selectedSeverity !== "all" ||
    searchText.trim() !== "" ||
    dateFrom !== undefined || 
    dateTo !== undefined;

  const clearFilters = () => {
    setSelectedLot("all");
    setSelectedPestType("all");
    setSelectedSeverity("all");
    setSearchText("");
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

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleBatchStatusChange = async (newStatus: PestReportStatus) => {
    if (selectedReports.size === 0) return;
    
    setBatchUpdating(true);
    
    const { error } = await supabase
      .from("pest_reports")
      .update({ status: newStatus })
      .in("id", Array.from(selectedReports));

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los reportes",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Estados actualizados",
        description: `${selectedReports.size} reporte${selectedReports.size > 1 ? "s" : ""} actualizado${selectedReports.size > 1 ? "s" : ""} a "${newStatus.replace("_", " ")}"`,
      });
      setSelectedReports(new Set());
      setSelectionMode(false);
      fetchReports();
    }
    
    setBatchUpdating(false);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedReports(new Set());
    }
  };

  const getCurrentTabReports = () => {
    if (activeTab === "pendiente") return pendientesPagination.paginatedItems;
    if (activeTab === "en_tratamiento") return enTratamientoPagination.paginatedItems;
    return resueltosPagination.paginatedItems;
  };

  const getAllCurrentTabReports = () => {
    if (activeTab === "pendiente") return pendientes;
    if (activeTab === "en_tratamiento") return enTratamiento;
    return resueltos;
  };

  const handleSelectAll = () => {
    const currentReports = getAllCurrentTabReports();
    const currentIds = currentReports.map(r => r.id);
    const allSelected = currentIds.every(id => selectedReports.has(id));
    
    if (allSelected) {
      // Deselect all from current tab
      setSelectedReports(prev => {
        const newSet = new Set(prev);
        currentIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all from current tab
      setSelectedReports(prev => {
        const newSet = new Set(prev);
        currentIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const getCurrentTabSelectionState = () => {
    const currentReports = getAllCurrentTabReports();
    if (currentReports.length === 0) return "none";
    const currentIds = currentReports.map(r => r.id);
    const selectedInTab = currentIds.filter(id => selectedReports.has(id)).length;
    if (selectedInTab === 0) return "none";
    if (selectedInTab === currentIds.length) return "all";
    return "partial";
  };

  const filterReportsByStatus = (status: PestReportStatus) =>
    reports.filter((r) => r.status === status);

  const pendientes = filterReportsByStatus("pendiente");
  const enTratamiento = filterReportsByStatus("en_tratamiento");
  const resueltos = filterReportsByStatus("resuelto");

  // Pagination for each tab
  const pendientesPagination = usePagination({ items: pendientes, itemsPerPage: 10 });
  const enTratamientoPagination = usePagination({ items: enTratamiento, itemsPerPage: 10 });
  const resueltosPagination = usePagination({ items: resueltos, itemsPerPage: 10 });

  // Reset pagination when filters change
  useEffect(() => {
    pendientesPagination.resetPage();
    enTratamientoPagination.resetPage();
    resueltosPagination.resetPage();
  }, [selectedLot, selectedPestType, selectedSeverity, debouncedSearch, dateFrom, dateTo]);

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
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Gestiona el estado de los reportes de plagas</span>
              {hasActiveFilters && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {reports.length} de {totalCount} reportes
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "dashboard" ? "secondary" : "ghost"}
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={() => setViewMode("dashboard")}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
            {viewMode === "list" && !readOnly && (
              <Button
                variant={selectionMode ? "secondary" : "outline"}
                size="sm"
                onClick={toggleSelectionMode}
                className="gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Seleccionar</span>
              </Button>
            )}
            <ExportButton reports={reports} disabled={loading} isFiltered={hasActiveFilters} totalCount={totalCount} />
            <Button variant="ghost" size="icon" onClick={fetchReports}>
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {viewMode === "dashboard" ? (
          <SanitaryDashboard />
        ) : (
          <>
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
          selectedSeverity={selectedSeverity}
          searchText={searchText}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onLotChange={setSelectedLot}
          onPestTypeChange={setSelectedPestType}
          onSeverityChange={setSelectedSeverity}
          onSearchTextChange={setSearchText}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSortChange={setSortBy}
          onSortDirectionToggle={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Tabs with reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-2">
            <TabsList className="flex-1 grid grid-cols-3">
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
            
            {selectionMode && getAllCurrentTabReports().length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 flex-shrink-0"
                onClick={handleSelectAll}
              >
                <Checkbox
                  checked={getCurrentTabSelectionState() === "all"}
                  className={getCurrentTabSelectionState() === "partial" ? "data-[state=checked]:bg-primary/50" : ""}
                />
                <span className="text-xs">
                  {getCurrentTabSelectionState() === "all" ? "Deseleccionar" : "Seleccionar"} todos
                </span>
              </Button>
            )}
          </div>

          <TabsContent value="pendiente" className="space-y-3 mt-4">
            {pendientes.length === 0 ? (
              <EmptyState message="No hay reportes pendientes" />
            ) : (
              <>
                {pendientesPagination.paginatedItems.map((report) => (
                  <PestReportCard
                    key={report.id}
                    report={report}
                    onStatusChange={handleStatusChange}
                    onPhotosAdded={fetchReports}
                    isUpdating={updating === report.id}
                    selectable={!readOnly && selectionMode}
                    isSelected={selectedReports.has(report.id)}
                    onSelectionChange={handleSelectionChange}
                    readOnly={readOnly}
                  />
                ))}
                <PaginationControls
                  currentPage={pendientesPagination.currentPage}
                  totalPages={pendientesPagination.totalPages}
                  totalItems={pendientes.length}
                  startIndex={pendientesPagination.startIndex}
                  endIndex={pendientesPagination.endIndex}
                  itemsPerPage={pendientesPagination.itemsPerPage}
                  onPageChange={pendientesPagination.setCurrentPage}
                  onNextPage={pendientesPagination.nextPage}
                  onPrevPage={pendientesPagination.prevPage}
                  onFirstPage={pendientesPagination.goToFirstPage}
                  onLastPage={pendientesPagination.goToLastPage}
                  onItemsPerPageChange={pendientesPagination.setItemsPerPage}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="en_tratamiento" className="space-y-3 mt-4">
            {enTratamiento.length === 0 ? (
              <EmptyState message="No hay reportes en tratamiento" />
            ) : (
              <>
                {enTratamientoPagination.paginatedItems.map((report) => (
                  <PestReportCard
                    key={report.id}
                    report={report}
                    onStatusChange={handleStatusChange}
                    onPhotosAdded={fetchReports}
                    isUpdating={updating === report.id}
                    selectable={!readOnly && selectionMode}
                    isSelected={selectedReports.has(report.id)}
                    onSelectionChange={handleSelectionChange}
                    readOnly={readOnly}
                  />
                ))}
                <PaginationControls
                  currentPage={enTratamientoPagination.currentPage}
                  totalPages={enTratamientoPagination.totalPages}
                  totalItems={enTratamiento.length}
                  startIndex={enTratamientoPagination.startIndex}
                  endIndex={enTratamientoPagination.endIndex}
                  itemsPerPage={enTratamientoPagination.itemsPerPage}
                  onPageChange={enTratamientoPagination.setCurrentPage}
                  onNextPage={enTratamientoPagination.nextPage}
                  onPrevPage={enTratamientoPagination.prevPage}
                  onFirstPage={enTratamientoPagination.goToFirstPage}
                  onLastPage={enTratamientoPagination.goToLastPage}
                  onItemsPerPageChange={enTratamientoPagination.setItemsPerPage}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="resuelto" className="space-y-3 mt-4">
            {resueltos.length === 0 ? (
              <EmptyState message="No hay reportes resueltos" />
            ) : (
              <>
                {resueltosPagination.paginatedItems.map((report) => (
                  <PestReportCard
                    key={report.id}
                    report={report}
                    onStatusChange={handleStatusChange}
                    isUpdating={updating === report.id}
                    selectable={!readOnly && selectionMode}
                    isSelected={selectedReports.has(report.id)}
                    onSelectionChange={handleSelectionChange}
                    readOnly={readOnly}
                  />
                ))}
                <PaginationControls
                  currentPage={resueltosPagination.currentPage}
                  totalPages={resueltosPagination.totalPages}
                  totalItems={resueltos.length}
                  startIndex={resueltosPagination.startIndex}
                  endIndex={resueltosPagination.endIndex}
                  itemsPerPage={resueltosPagination.itemsPerPage}
                  onPageChange={resueltosPagination.setCurrentPage}
                  onNextPage={resueltosPagination.nextPage}
                  onPrevPage={resueltosPagination.prevPage}
                  onFirstPage={resueltosPagination.goToFirstPage}
                  onLastPage={resueltosPagination.goToLastPage}
                  onItemsPerPageChange={resueltosPagination.setItemsPerPage}
                />
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Batch Actions Bar */}
        <BatchActionsBar
          selectedCount={selectedReports.size}
          onClearSelection={() => {
            setSelectedReports(new Set());
            setSelectionMode(false);
          }}
          onBatchStatusChange={handleBatchStatusChange}
          isUpdating={batchUpdating}
        />
          </>
        )}
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
