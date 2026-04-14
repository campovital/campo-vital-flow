import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTraps, useTrapCycleStatuses, useTrapTypes } from "@/hooks/use-traps";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { AlertTriangle, CheckCircle, Clock, Filter, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface TrapsPendingViewProps {
  onRegister?: (trapId: string) => void;
}

export function TrapsPendingView({ onRegister }: TrapsPendingViewProps) {
  const { data: traps = [], isLoading: trapsLoading } = useTraps();
  const { data: trapTypes = [] } = useTrapTypes();
  const trapIds = useMemo(() => traps.filter(t => t.is_active).map(t => t.id), [traps]);
  const { data: statuses = [], isLoading: statusLoading } = useTrapCycleStatuses(trapIds);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const activeTraps = useMemo(() => traps.filter(t => t.is_active), [traps]);

  const statusMap = useMemo(() => {
    const map: Record<string, typeof statuses> = {};
    statuses.forEach(s => {
      if (!map[s.trap_id]) map[s.trap_id] = [];
      map[s.trap_id].push(s);
    });
    return map;
  }, [statuses]);

  const getWorstStatus = (trapId: string) => {
    const trapStatuses = statusMap[trapId] || [];
    if (trapStatuses.some(s => s.status === "vencido")) return "vencido";
    if (trapStatuses.some(s => s.status === "proximo")) return "proximo";
    return "al_dia";
  };

  const filteredTraps = useMemo(() => {
    let result = activeTraps;
    if (filterType !== "all") result = result.filter(t => t.trap_type_id === filterType);
    if (filterStatus !== "all") result = result.filter(t => getWorstStatus(t.id) === filterStatus);
    return result;
  }, [activeTraps, filterType, filterStatus, statusMap]);

  const isLoading = trapsLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const counts = {
    vencido: activeTraps.filter(t => getWorstStatus(t.id) === "vencido").length,
    proximo: activeTraps.filter(t => getWorstStatus(t.id) === "proximo").length,
    al_dia: activeTraps.filter(t => getWorstStatus(t.id) === "al_dia").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{counts.vencido}</p>
            <p className="text-xs text-muted-foreground">Vencidas</p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-warning">{counts.proximo}</p>
            <p className="text-xs text-muted-foreground">Próximas</p>
          </CardContent>
        </Card>
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-success">{counts.al_dia}</p>
            <p className="text-xs text-muted-foreground">Al día</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Tipo de trampa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {trapTypes.map(tt => (
              <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vencido">Vencidas</SelectItem>
            <SelectItem value="proximo">Próximas</SelectItem>
            <SelectItem value="al_dia">Al día</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Trap list */}
      {filteredTraps.length === 0 ? (
        <EmptyStateCard
          icon={Target}
          title="Sin trampas pendientes"
          description="No hay trampas que coincidan con los filtros seleccionados"
        />
      ) : (
        <div className="space-y-3">
          {filteredTraps.map(trap => {
            const trapStatuses = statusMap[trap.id] || [];
            const worstStatus = getWorstStatus(trap.id);

            return (
              <Card key={trap.id} className={cn(
                "transition-colors",
                worstStatus === "vencido" && "border-destructive/40",
                worstStatus === "proximo" && "border-warning/40"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{trap.code}</h3>
                        <StatusBadge status={worstStatus} />
                      </div>
                      <p className="text-sm text-muted-foreground">{trap.trap_types?.name}</p>
                      <p className="text-xs text-muted-foreground">{trap.lots?.name}</p>
                    </div>
                  </div>

                  {/* Cycle statuses */}
                  <div className="space-y-1.5">
                    {trapStatuses.map(cs => (
                      <div key={cs.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{getCycleName(cs.trap_cycle_id, trap.id, statuses)}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={cs.status} size="sm" />
                          {cs.days_remaining !== null && (
                            <span className={cn(
                              "text-xs",
                              cs.status === "vencido" ? "text-destructive" :
                              cs.status === "proximo" ? "text-warning" : "text-muted-foreground"
                            )}>
                              {cs.days_remaining <= 0 ? `${Math.abs(cs.days_remaining)}d atrás` : `${cs.days_remaining}d`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {trapStatuses.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Sin ciclos registrados aún</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getCycleName(cycleId: string, trapId: string, allStatuses: any[]) {
  // We'll just show the cycle ID short form - the real name comes from trap_cycles
  // For now return a placeholder that will be enhanced
  return cycleId.slice(0, 8);
}

function StatusBadge({ status, size = "default" }: { status: string; size?: "default" | "sm" }) {
  const config = {
    vencido: { label: "Vencido", className: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
    proximo: { label: "Próximo", className: "bg-warning/10 text-warning border-warning/20", icon: Clock },
    al_dia: { label: "Al día", className: "bg-success/10 text-success border-success/20", icon: CheckCircle },
  }[status] || { label: status, className: "", icon: CheckCircle };

  return (
    <Badge variant="outline" className={cn(config.className, size === "sm" && "text-xs px-1.5 py-0")}>
      <config.icon className={cn("mr-1", size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5")} />
      {config.label}
    </Badge>
  );
}
