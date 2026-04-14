import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTraps, useTrapCycles, useRegisterTrapEvent } from "@/hooks/use-traps";
import { useReadOnly } from "@/hooks/use-read-only";
import { Loader2, Save, Target } from "lucide-react";
import { format } from "date-fns";

const PHYSICAL_STATUSES = [
  { value: "buena", label: "Buena" },
  { value: "deteriorada", label: "Deteriorada" },
  { value: "caida", label: "Caída" },
  { value: "perdida", label: "Perdida" },
  { value: "requiere_reposicion", label: "Requiere reposición" },
];

export function TrapsRegisterActivity() {
  const readOnly = useReadOnly();
  const { data: traps = [] } = useTraps();
  const registerEvent = useRegisterTrapEvent();

  const [selectedTrapId, setSelectedTrapId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [operatorName, setOperatorName] = useState("");
  const [physicalStatus, setPhysicalStatus] = useState("");
  const [productApplied, setProductApplied] = useState("");
  const [observations, setObservations] = useState("");

  const activeTraps = useMemo(() => traps.filter(t => t.is_active), [traps]);
  const selectedTrap = activeTraps.find(t => t.id === selectedTrapId);

  const { data: cycles = [] } = useTrapCycles(selectedTrapId || undefined);

  // When cycle is selected, suggest product
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const suggestedProduct = selectedCycle?.product_name || "";

  const handleCycleChange = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    const cycle = cycles.find(c => c.id === cycleId);
    if (cycle) {
      setEventType(cycle.cycle_name);
      if (cycle.product_name) setProductApplied(cycle.product_name);
    }
  };

  const handleSubmit = () => {
    if (!selectedTrapId || !eventType) return;
    registerEvent.mutate({
      trap_id: selectedTrapId,
      trap_cycle_id: selectedCycleId || undefined,
      event_type: eventType,
      event_date: new Date(eventDate).toISOString(),
      operator_name: operatorName || undefined,
      physical_status: physicalStatus || undefined,
      product_applied: productApplied || undefined,
      observations: observations || undefined,
    }, {
      onSuccess: () => {
        setSelectedCycleId("");
        setEventType("");
        setOperatorName("");
        setPhysicalStatus("");
        setProductApplied("");
        setObservations("");
      },
    });
  };

  if (readOnly) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Tu rol es de solo consulta. No puedes registrar actividades.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Select trap */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            Trampa *
          </Label>
          <Select value={selectedTrapId} onValueChange={(v) => { setSelectedTrapId(v); setSelectedCycleId(""); setEventType(""); setProductApplied(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione trampa..." />
            </SelectTrigger>
            <SelectContent>
              {activeTraps.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.code} — {t.trap_types?.name} ({t.lots?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTrap && (
            <p className="text-xs text-muted-foreground mt-1">
              Tipo: {selectedTrap.trap_types?.name} · Lote: {selectedTrap.lots?.name}
            </p>
          )}
        </div>

        {/* Select cycle / event type */}
        {selectedTrapId && (
          <div>
            <Label className="mb-2">Ciclo / Tipo de evento *</Label>
            {cycles.length > 0 ? (
              <Select value={selectedCycleId} onValueChange={handleCycleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione ciclo..." />
                </SelectTrigger>
                <SelectContent>
                  {cycles.filter(c => c.is_active).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cycle_name} {c.product_name ? `(${c.product_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="Tipo de evento..."
              />
            )}
          </div>
        )}

        {/* Date */}
        <div>
          <Label>Fecha del evento</Label>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1" />
        </div>

        {/* Operator */}
        <div>
          <Label>Operario</Label>
          <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Nombre del operario" className="mt-1" />
        </div>

        {/* Physical status */}
        <div>
          <Label>Estado físico de la trampa</Label>
          <Select value={physicalStatus} onValueChange={setPhysicalStatus}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Seleccione estado..." />
            </SelectTrigger>
            <SelectContent>
              {PHYSICAL_STATUSES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product applied */}
        <div>
          <Label>Producto aplicado</Label>
          <Input
            value={productApplied}
            onChange={(e) => setProductApplied(e.target.value)}
            placeholder={suggestedProduct || "Nombre del producto"}
            className="mt-1"
          />
          {suggestedProduct && productApplied !== suggestedProduct && (
            <p className="text-xs text-muted-foreground mt-1">Sugerido: {suggestedProduct}</p>
          )}
        </div>

        {/* Observations */}
        <div>
          <Label>Observaciones</Label>
          <Textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observaciones del evento..."
            className="mt-1"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedTrapId || !eventType || registerEvent.isPending}
          className="w-full"
        >
          {registerEvent.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Actividad
        </Button>
      </CardContent>
    </Card>
  );
}
