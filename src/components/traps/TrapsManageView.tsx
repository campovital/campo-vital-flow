import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTraps, useTrapTypes, useTrapCycles, useCreateTrap, useUpdateTrapCycle, TrapCycle } from "@/hooks/use-traps";
import { useReadOnly } from "@/hooks/use-read-only";
import { supabase } from "@/integrations/supabase/client";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { Loader2, Plus, Settings2, Target, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

export function TrapsManageView() {
  const readOnly = useReadOnly();
  const { data: traps = [], isLoading } = useTraps();
  const { data: trapTypes = [] } = useTrapTypes();
  const createTrap = useCreateTrap();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTrapId, setSelectedTrapId] = useState<string | null>(null);

  // Create trap form
  const [newCode, setNewCode] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newLotId, setNewLotId] = useState("");
  const [newMunicipality, setNewMunicipality] = useState("");
  const [newVillage, setNewVillage] = useState("");
  const [newLocationDetail, setNewLocationDetail] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const { data: lots = [] } = useQuery({
    queryKey: ["lots-for-traps"],
    queryFn: async () => {
      const { data } = await supabase.from("lots").select("id, name").order("name");
      return data || [];
    },
  });

  const handleCreate = () => {
    if (!newCode || !newTypeId || !newLotId) return;
    createTrap.mutate({
      code: newCode,
      trap_type_id: newTypeId,
      lot_id: newLotId,
      municipality: newMunicipality || undefined,
      village: newVillage || undefined,
      location_detail: newLocationDetail || undefined,
      installation_date: format(new Date(), "yyyy-MM-dd"),
      general_notes: newNotes || undefined,
    }, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewCode(""); setNewTypeId(""); setNewLotId("");
        setNewMunicipality(""); setNewVillage(""); setNewLocationDetail(""); setNewNotes("");
      },
    });
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Nueva Trampa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Trampa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Código de trampa *</Label>
                <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ej: T-001" className="mt-1" />
              </div>
              <div>
                <Label>Tipo de trampa *</Label>
                <Select value={newTypeId} onValueChange={setNewTypeId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccione tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trapTypes.map(tt => (
                      <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lote *</Label>
                <Select value={newLotId} onValueChange={setNewLotId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccione lote..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Municipio</Label>
                  <Input value={newMunicipality} onChange={(e) => setNewMunicipality(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Vereda</Label>
                  <Input value={newVillage} onChange={(e) => setNewVillage(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Ubicación detallada</Label>
                <Input value={newLocationDetail} onChange={(e) => setNewLocationDetail(e.target.value)} placeholder="Ej: Hilera 5, poste 12" className="mt-1" />
              </div>
              <div>
                <Label>Observaciones</Label>
                <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="mt-1" rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={!newCode || !newTypeId || !newLotId || createTrap.isPending} className="w-full">
                {createTrap.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Trampa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Trap list */}
      {traps.length === 0 ? (
        <EmptyStateCard
          icon={Target}
          title="Sin trampas registradas"
          description="Crea la primera trampa para empezar el control"
        />
      ) : (
        <div className="space-y-3">
          {traps.map(trap => (
            <Card key={trap.id} className={!trap.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{trap.code}</h3>
                      <Badge variant="outline" className="text-xs">{trap.trap_types?.name}</Badge>
                      {!trap.is_active && <Badge variant="secondary" className="text-xs">Inactiva</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{trap.lots?.name}</p>
                    {trap.municipality && (
                      <p className="text-xs text-muted-foreground">{trap.municipality}{trap.village ? `, ${trap.village}` : ""}</p>
                    )}
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedTrapId(selectedTrapId === trap.id ? null : trap.id)}
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {selectedTrapId === trap.id && (
                  <TrapCycleEditor trapId={trap.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TrapCycleEditor({ trapId }: { trapId: string }) {
  const { data: cycles = [], isLoading } = useTrapCycles(trapId);
  const updateCycle = useUpdateTrapCycle();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrequency, setEditFrequency] = useState("");
  const [editProduct, setEditProduct] = useState("");

  const startEdit = (cycle: TrapCycle) => {
    setEditingId(cycle.id);
    setEditFrequency(String(cycle.frequency_days));
    setEditProduct(cycle.product_name || "");
  };

  const saveEdit = (cycleId: string) => {
    updateCycle.mutate({
      cycleId,
      updates: {
        frequency_days: parseInt(editFrequency) || 15,
        product_name: editProduct || null,
      },
    });
    setEditingId(null);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground mt-3">Cargando ciclos...</p>;

  return (
    <div className="mt-4 pt-4 border-t space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Settings2 className="w-4 h-4" />
        Configuración de ciclos
      </h4>
      {cycles.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin ciclos configurados</p>
      ) : (
        cycles.map(cycle => (
          <div key={cycle.id} className="p-3 rounded-lg bg-muted/30 border space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{cycle.cycle_name}</p>
                {cycle.uses_default && <Badge variant="outline" className="text-xs mt-1">Valor por defecto</Badge>}
              </div>
              {editingId !== cycle.id && (
                <Button variant="ghost" size="sm" onClick={() => startEdit(cycle)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {editingId === cycle.id ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Frecuencia (días)</Label>
                  <Input type="number" value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Producto</Label>
                  <Input value={editProduct} onChange={(e) => setEditProduct(e.target.value)} className="mt-1 h-8 text-sm" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(cycle.id)} disabled={updateCycle.isPending}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Frecuencia: cada {cycle.frequency_days} días</p>
                {cycle.product_name && <p>Producto: {cycle.product_name}</p>}
                <p>Estado: {cycle.is_active ? "Activo" : "Inactivo"}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
