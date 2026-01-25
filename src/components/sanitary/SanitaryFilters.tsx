import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Filter, CalendarIcon, X, ArrowUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = "follow_up_date" | "severity" | "created_at";
export type SortDirection = "asc" | "desc";

interface Lot {
  id: string;
  name: string;
}

interface SanitaryFiltersProps {
  lots: Lot[];
  pestTypes: string[];
  selectedLot: string;
  selectedPestType: string;
  selectedSeverity: string;
  searchText: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sortBy: SortOption;
  sortDirection: SortDirection;
  onLotChange: (value: string) => void;
  onPestTypeChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  onSortChange: (sort: SortOption) => void;
  onSortDirectionToggle: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function SanitaryFilters({
  lots,
  pestTypes,
  selectedLot,
  selectedPestType,
  selectedSeverity,
  searchText,
  dateFrom,
  dateTo,
  sortBy,
  sortDirection,
  onLotChange,
  onPestTypeChange,
  onSeverityChange,
  onSearchTextChange,
  onDateFromChange,
  onDateToChange,
  onSortChange,
  onSortDirectionToggle,
  onClearFilters,
  hasActiveFilters,
}: SanitaryFiltersProps) {
  const severityOptions = [
    { value: "1", label: "1 - Muy bajo" },
    { value: "2", label: "2 - Bajo" },
    { value: "3", label: "3 - Moderado" },
    { value: "4", label: "4 - Alto" },
    { value: "5", label: "5 - Muy alto" },
  ];

  const sortOptions = [
    { value: "follow_up_date", label: "Fecha de seguimiento" },
    { value: "severity", label: "Severidad" },
    { value: "created_at", label: "Fecha de creación" },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-7 text-xs gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en notas o tipo de plaga..."
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              className="h-9 pl-9"
              maxLength={100}
            />
          </div>
        </div>

        {/* Row 1: Lot and Pest Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Lote
            </label>
            <Select value={selectedLot} onValueChange={onLotChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los lotes</SelectItem>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tipo de plaga
            </label>
            <Select value={selectedPestType} onValueChange={onPestTypeChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las plagas</SelectItem>
                {pestTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Severity filter */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Severidad
          </label>
          <Select value={selectedSeverity} onValueChange={onSeverityChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las severidades</SelectItem>
              {severityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 3: Sorting */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Ordenar por
          </label>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={onSortDirectionToggle}
            >
              <ArrowUpDown className={cn(
                "w-4 h-4 transition-transform",
                sortDirection === "desc" && "rotate-180"
              )} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {sortDirection === "asc" ? "Ascendente" : "Descendente"}
          </p>
        </div>

        {/* Row 4: Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Desde
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateFrom ? (
                    format(dateFrom, "d MMM yyyy", { locale: es })
                  ) : (
                    <span className="text-xs">Fecha inicio</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={onDateFromChange}
                  disabled={(date) => (dateTo ? date > dateTo : false)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Hasta
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {dateTo ? (
                    format(dateTo, "d MMM yyyy", { locale: es })
                  ) : (
                    <span className="text-xs">Fecha fin</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={onDateToChange}
                  disabled={(date) => (dateFrom ? date < dateFrom : false)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
