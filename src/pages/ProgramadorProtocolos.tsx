import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Loader2, CalendarClock, Power,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ScheduleRule = Database["public"]["Tables"]["schedule_rules"]["Row"];
type RuleType = Database["public"]["Enums"]["schedule_rule_type"];
type SeasonType = Database["public"]["Enums"]["season_type"];

const RULE_TYPE_LABELS: Record<RuleType, string> = {
  DATE_RANGE: "Rango de Fechas",
  ISO_WEEK: "Semana ISO",
  SEASON: "Temporada",
  PHENO_WEEK: "Semana Fenológica",
  DEFAULT: "Por Defecto",
};

const SEASON_LABELS: Record<SeasonType, string> = {
  lluvias: "Lluvias",
  sequia: "Sequía",
  invierno: "Invierno",
  verano: "Verano",
};

interface FormData {
  name: string;
  rule_type: RuleType;
  protocol_version_id: string;
  farm_id: string;
  lot_id: string;
  date_start: string;
  date_end: string;
  iso_week_start: string;
  iso_week_end: string;
  season: SeasonType | "";
  pheno_week_start: string;
  pheno_week_end: string;
  priority: string;
}

const emptyForm: FormData = {
  name: "",
  rule_type: "DEFAULT",
  protocol_version_id: "",
  farm_id: "",
  lot_id: "",
  date_start: "",
  date_end: "",
  iso_week_start: "",
  iso_week_end: "",
  season: "",
  pheno_week_start: "",
  pheno_week_end: "",
  priority: "100",
};

export default function ProgramadorProtocolos() {
  const { toast } = useToast();
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScheduleRule | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });

  // ── Queries ──────────────────────────────────────────────
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["schedule-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_rules")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: publishedVersions = [] } = useQuery({
    queryKey: ["published-versions-for-scheduler"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_versions")
        .select("id, version_number, protocol_id, protocols(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        version_number: number;
        protocol_id: string;
        protocols: { name: string } | null;
      }>;
    },
  });

  const { data: farms = [] } = useQuery({
    queryKey: ["farms-for-scheduler"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lots = [] } = useQuery({
    queryKey: ["lots-for-scheduler", formData.farm_id],
    queryFn: async () => {
      let q = supabase.from("lots").select("id, name, farm_id").order("name");
      if (formData.farm_id) q = q.eq("farm_id", formData.farm_id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  // ── Mutations ────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Database["public"]["Tables"]["schedule_rules"]["Insert"]) => {
      const { error } = await supabase.from("schedule_rules").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Regla creada", description: `"${formData.name}" se guardó correctamente` });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la regla", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Database["public"]["Tables"]["schedule_rules"]["Update"] & { id: string }) => {
      const { error } = await supabase.from("schedule_rules").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Regla actualizada", description: "Los cambios se guardaron correctamente" });
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar la regla", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("schedule_rules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: () => {
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    },
  });

  // ── Handlers ─────────────────────────────────────────────
  const resetForm = () => {
    setEditingRule(null);
    setFormData({ ...emptyForm });
  };

  const handleOpenDialog = (rule?: ScheduleRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        rule_type: rule.rule_type,
        protocol_version_id: rule.protocol_version_id,
        farm_id: rule.farm_id || "",
        lot_id: rule.lot_id || "",
        date_start: rule.date_start || "",
        date_end: rule.date_end || "",
        iso_week_start: rule.iso_week_start?.toString() || "",
        iso_week_end: rule.iso_week_end?.toString() || "",
        season: (rule.season as SeasonType) || "",
        pheno_week_start: rule.pheno_week_start?.toString() || "",
        pheno_week_end: rule.pheno_week_end?.toString() || "",
        priority: rule.priority.toString(),
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    if (!formData.protocol_version_id) {
      toast({ title: "Error", description: "Selecciona una versión de protocolo", variant: "destructive" });
      return;
    }

    const payload: Database["public"]["Tables"]["schedule_rules"]["Insert"] = {
      name: formData.name.trim(),
      rule_type: formData.rule_type,
      protocol_version_id: formData.protocol_version_id,
      farm_id: formData.farm_id || null,
      lot_id: formData.lot_id || null,
      date_start: formData.date_start || null,
      date_end: formData.date_end || null,
      iso_week_start: formData.iso_week_start ? Number(formData.iso_week_start) : null,
      iso_week_end: formData.iso_week_end ? Number(formData.iso_week_end) : null,
      season: (formData.season as SeasonType) || null,
      pheno_week_start: formData.pheno_week_start ? Number(formData.pheno_week_start) : null,
      pheno_week_end: formData.pheno_week_end ? Number(formData.pheno_week_end) : null,
      priority: Number(formData.priority) || 100,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Helpers ──────────────────────────────────────────────
  const getProtocolLabel = (versionId: string) => {
    const v = publishedVersions.find((pv) => pv.id === versionId);
    if (!v) return versionId.slice(0, 8);
    return `${v.protocols?.name ?? "?"} v${v.version_number}`;
  };

  const getFarmName = (farmId: string | null) =>
    farms.find((f) => f.id === farmId)?.name ?? "-";

  const getLotName = (lotId: string | null) =>
    lots.find((l) => l.id === lotId)?.name ?? "-";

  const getRuleSummary = (rule: ScheduleRule) => {
    switch (rule.rule_type) {
      case "DATE_RANGE":
        return `${rule.date_start ?? "?"} → ${rule.date_end ?? "?"}`;
      case "ISO_WEEK":
        return `Sem ${rule.iso_week_start ?? "?"} – ${rule.iso_week_end ?? "?"}`;
      case "SEASON":
        return SEASON_LABELS[(rule.season as SeasonType)] ?? rule.season ?? "-";
      case "PHENO_WEEK":
        return `Feno ${rule.pheno_week_start ?? "?"} – ${rule.pheno_week_end ?? "?"}`;
      case "DEFAULT":
        return "Siempre activa";
      default:
        return "-";
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Conditional fields per rule type ─────────────────────
  const renderRuleFields = () => {
    switch (formData.rule_type) {
      case "DATE_RANGE":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input type="date" value={formData.date_start} onChange={(e) => setFormData({ ...formData, date_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input type="date" value={formData.date_end} onChange={(e) => setFormData({ ...formData, date_end: e.target.value })} />
            </div>
          </div>
        );
      case "ISO_WEEK":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Semana ISO inicio</Label>
              <Input type="number" min={1} max={53} value={formData.iso_week_start} onChange={(e) => setFormData({ ...formData, iso_week_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Semana ISO fin</Label>
              <Input type="number" min={1} max={53} value={formData.iso_week_end} onChange={(e) => setFormData({ ...formData, iso_week_end: e.target.value })} />
            </div>
          </div>
        );
      case "SEASON":
        return (
          <div className="space-y-2">
            <Label>Temporada</Label>
            <Select value={formData.season} onValueChange={(v) => setFormData({ ...formData, season: v as SeasonType })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar temporada" /></SelectTrigger>
              <SelectContent>
                {Object.entries(SEASON_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case "PHENO_WEEK":
        return (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Semana fenológica inicio</Label>
              <Input type="number" min={1} max={52} value={formData.pheno_week_start} onChange={(e) => setFormData({ ...formData, pheno_week_start: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Semana fenológica fin</Label>
              <Input type="number" min={1} max={52} value={formData.pheno_week_end} onChange={(e) => setFormData({ ...formData, pheno_week_end: e.target.value })} />
            </div>
          </div>
        );
      case "DEFAULT":
        return (
          <p className="text-sm text-muted-foreground">
            Esta regla aplica siempre como respaldo cuando no hay otra regla más específica.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <section className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-primary" />
              Programador de Protocolos
            </h1>
            <p className="text-muted-foreground mt-1">
              Reglas de programación que vinculan protocolos publicados a lotes y fincas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/protocolos">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Protocolos
              </Link>
            </Button>
            {canManage && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Nueva Regla
              </Button>
            )}
          </div>
        </header>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Reglas de Programación</CardTitle>
            <CardDescription>
              {rules.length} regla(s) registrada(s) · Prioridad: DATE_RANGE → ISO_WEEK → SEASON → PHENO_WEEK → DEFAULT
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay reglas de programación. Crea una para vincular protocolos a lotes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Condición</TableHead>
                      <TableHead>Alcance</TableHead>
                      <TableHead className="text-center">Prioridad</TableHead>
                      <TableHead className="text-center">Activa</TableHead>
                      {canManage && <TableHead className="w-24">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{RULE_TYPE_LABELS[rule.rule_type]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{getProtocolLabel(rule.protocol_version_id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{getRuleSummary(rule)}</TableCell>
                        <TableCell className="text-sm">
                          {rule.lot_id ? `Lote: ${getLotName(rule.lot_id)}` : rule.farm_id ? `Finca: ${getFarmName(rule.farm_id)}` : "Global"}
                        </TableCell>
                        <TableCell className="text-center">{rule.priority}</TableCell>
                        <TableCell className="text-center">
                          {canManage ? (
                            <Switch
                              checked={rule.is_active ?? true}
                              onCheckedChange={(checked) =>
                                toggleActiveMutation.mutate({ id: rule.id, is_active: checked })
                              }
                            />
                          ) : (
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? "Sí" : "No"}
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Create / Edit Dialog ── */}
        <ResponsiveDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editingRule ? "Editar Regla" : "Nueva Regla de Programación"}
          description={editingRule ? "Modifica los parámetros de la regla" : "Define cuándo y dónde aplica un protocolo"}
        >
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="Ej: Floración semanas 10-20"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Protocol version */}
            <div className="space-y-2">
              <Label>Versión de Protocolo (publicada) *</Label>
              {publishedVersions.length === 0 ? (
                <p className="text-sm text-warning">No hay versiones publicadas. Publica una versión desde el módulo de Protocolos.</p>
              ) : (
                <Select
                  value={formData.protocol_version_id}
                  onValueChange={(v) => setFormData({ ...formData, protocol_version_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar versión" /></SelectTrigger>
                  <SelectContent>
                    {publishedVersions.map((pv) => (
                      <SelectItem key={pv.id} value={pv.id}>
                        {pv.protocols?.name ?? "?"} — v{pv.version_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Rule type */}
            <div className="space-y-2">
              <Label>Tipo de Regla</Label>
              <Select
                value={formData.rule_type}
                onValueChange={(v) => setFormData({ ...formData, rule_type: v as RuleType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic fields */}
            {renderRuleFields()}

            {/* Scope: farm / lot */}
            <div className="space-y-2">
              <Label>Finca (opcional — vacío = todas)</Label>
              <Select
                value={formData.farm_id || "__none__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, farm_id: v === "__none__" ? "" : v, lot_id: "" })
                }
              >
                <SelectTrigger><SelectValue placeholder="Todas las fincas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas las fincas</SelectItem>
                  {farms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lote (opcional — vacío = todos los lotes de la finca)</Label>
              <Select
                value={formData.lot_id || "__none__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, lot_id: v === "__none__" ? "" : v })
                }
              >
                <SelectTrigger><SelectValue placeholder="Todos los lotes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos los lotes</SelectItem>
                  {lots.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Prioridad (menor = mayor prioridad)</Label>
              <Input
                type="number"
                min={1}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              />
            </div>

            <ResponsiveDialogFooter>
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRule ? "Guardar Cambios" : "Crear Regla"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </ResponsiveDialogFooter>
          </div>
        </ResponsiveDialog>
      </section>
    </AppLayout>
  );
}
