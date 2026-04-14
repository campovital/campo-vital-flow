import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTraps, useTrapEvents, useTrapTypes } from "@/hooks/use-traps";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { History, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function TrapsHistoryView() {
  const { data: traps = [] } = useTraps();
  const { data: trapTypes = [] } = useTrapTypes();
  const [filterTrapId, setFilterTrapId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: events = [], isLoading } = useTrapEvents({
    trapId: filterTrapId !== "all" ? filterTrapId : undefined,
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
  });

  const trapMap = useMemo(() => {
    const map: Record<string, typeof traps[0]> = {};
    traps.forEach(t => { map[t.id] = t; });
    return map;
  }, [traps]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label>Trampa</Label>
            <Select value={filterTrapId} onValueChange={setFilterTrapId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las trampas</SelectItem>
                {traps.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.code} — {t.trap_types?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events list */}
      {events.length === 0 ? (
        <EmptyStateCard
          icon={History}
          title="Sin registros"
          description="No se encontraron actividades con los filtros seleccionados"
        />
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const trap = trapMap[event.trap_id];
            return (
              <Card key={event.id}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{trap?.code || "—"}</p>
                      <p className="text-xs text-muted-foreground">{trap?.trap_types?.name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(event.event_date), "d MMM yyyy", { locale: es })}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="font-medium">{event.event_type}</span>
                    {event.product_applied && (
                      <Badge variant="secondary" className="text-xs">{event.product_applied}</Badge>
                    )}
                    {event.physical_status && (
                      <Badge variant="outline" className="text-xs capitalize">{event.physical_status}</Badge>
                    )}
                  </div>
                  {event.operator_name && (
                    <p className="text-xs text-muted-foreground">Operario: {event.operator_name}</p>
                  )}
                  {event.observations && (
                    <p className="text-xs text-muted-foreground">{event.observations}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
