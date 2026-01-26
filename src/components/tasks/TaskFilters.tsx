import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface Filters {
  lotId: string;
  operatorId: string;
  taskTypeId: string;
  dateFrom: string;
  dateTo: string;
}

interface TaskFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: lots = [] } = useQuery({
    queryKey: ["lots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: taskTypes = [] } = useQuery({
    queryKey: ["task-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_types")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  const clearFilters = () => {
    onFiltersChange({
      lotId: "",
      operatorId: "",
      taskTypeId: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>
        </CollapsibleTrigger>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          {/* Lot Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Lote</Label>
            <Select
              value={filters.lotId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, lotId: value === "all" ? "" : value })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Operario</Label>
            <Select
              value={filters.operatorId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, operatorId: value === "all" ? "" : value })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Type Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Tipo de Tarea</Label>
            <Select
              value={filters.taskTypeId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, taskTypeId: value === "all" ? "" : value })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {taskTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateFrom: e.target.value })
              }
              className="h-9"
            />
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                onFiltersChange({ ...filters, dateTo: e.target.value })
              }
              className="h-9"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
