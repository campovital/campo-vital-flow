import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface ReportFiltersState {
  dateFrom?: Date;
  dateTo?: Date;
  lotId?: string;
  operatorId?: string;
}

interface ReportFiltersProps {
  filters: ReportFiltersState;
  onFiltersChange: (filters: ReportFiltersState) => void;
  showLotFilter?: boolean;
  showOperatorFilter?: boolean;
}

interface LotOption {
  id: string;
  name: string;
}

interface OperatorOption {
  id: string;
  full_name: string;
}

export function ReportFilters({
  filters,
  onFiltersChange,
  showLotFilter = true,
  showOperatorFilter = true,
}: ReportFiltersProps) {
  const [lots, setLots] = useState<LotOption[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);

  useEffect(() => {
    async function loadOptions() {
      const [lotsRes, operatorsRes] = await Promise.all([
        supabase.from("lots").select("id, name").order("name"),
        supabase.from("operators").select("id, full_name").eq("is_active", true).order("full_name"),
      ]);
      
      if (lotsRes.data) setLots(lotsRes.data);
      if (operatorsRes.data) setOperators(operatorsRes.data);
    }
    loadOptions();
  }, []);

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.lotId || filters.operatorId;

  return (
    <div className="flex flex-wrap gap-4 items-end p-4 bg-muted/50 rounded-lg">
      {/* Date From */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !filters.dateFrom && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "Fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
              locale={es}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Hasta</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !filters.dateTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy") : "Fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
              locale={es}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Lot Filter */}
      {showLotFilter && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Lote</Label>
          <Select
            value={filters.lotId || "__none__"}
            onValueChange={(val) => onFiltersChange({ ...filters, lotId: val === "__none__" ? undefined : val })}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Todos los lotes</SelectItem>
              {lots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  {lot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Operator Filter */}
      {showOperatorFilter && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Operario</Label>
          <Select
            value={filters.operatorId || "__none__"}
            onValueChange={(val) => onFiltersChange({ ...filters, operatorId: val === "__none__" ? undefined : val })}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Todos los operarios</SelectItem>
              {operators.map((op) => (
                <SelectItem key={op.id} value={op.id}>
                  {op.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Clear Filters */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearFilters}
        disabled={!hasActiveFilters}
      >
        Limpiar filtros
      </Button>
    </div>
  );
}
