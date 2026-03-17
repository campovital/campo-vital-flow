import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import {
  Settings,
  MapPin,
  Layers,
  ListTodo,
  Plus,
  Pencil,
  Loader2,
  Package,
  Users,
  FileText,
  ExternalLink,
  Search,
  Trash2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

// ─── Types ───────────────────────────────────────────────────
type Farm = Database["public"]["Tables"]["farms"]["Row"];
type Lot = Database["public"]["Tables"]["lots"]["Row"];
type TaskType = Database["public"]["Tables"]["task_types"]["Row"];
type SeasonType = Database["public"]["Enums"]["season_type"];

const SEASON_OPTIONS: { value: SeasonType; label: string }[] = [
  { value: "lluvias", label: "Lluvias" },
  { value: "sequia", label: "Sequía" },
  { value: "invierno", label: "Invierno" },
  { value: "verano", label: "Verano" },
];

// ─── Farm Form ───────────────────────────────────────────────
function FarmTab() {
  const { canManage } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Farm | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    location: "",
    total_hectares: "",
  });

  const { data: farms = [], isLoading } = useQuery({
    queryKey: ["config-farms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farms").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim() || null,
        total_hectares: form.total_hectares ? parseFloat(form.total_hectares) : null,
      };
      if (!payload.name) throw new Error("El nombre es obligatorio");

      if (editing) {
        const { error } = await supabase.from("farms").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("farms").insert({ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Finca actualizada" : "Finca creada" });
      queryClient.invalidateQueries({ queryKey: ["config-farms"] });
      queryClient.invalidateQueries({ queryKey: ["farms"] });
      closeDialog();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", location: "", total_hectares: "" });
    setDialogOpen(true);
  };

  const openEdit = (farm: Farm) => {
    setEditing(farm);
    setForm({
      name: farm.name,
      location: farm.location || "",
      total_hectares: farm.total_hectares?.toString() || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const filtered = farms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.location || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Fincas / Predios
          </CardTitle>
          <CardDescription>{farms.length} finca(s) registrada(s)</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Finca
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar finca..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No se encontraron fincas</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Hectáreas</TableHead>
                  {canManage && <TableHead className="w-20">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((farm) => (
                  <TableRow key={farm.id}>
                    <TableCell className="font-medium">{farm.name}</TableCell>
                    <TableCell>{farm.location || "—"}</TableCell>
                    <TableCell className="text-right">{farm.total_hectares ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(farm)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Finca" : "Nueva Finca"}</DialogTitle>
            <DialogDescription>Datos del predio o finca</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la finca" />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Municipio, vereda, etc." />
            </div>
            <div className="space-y-2">
              <Label>Hectáreas totales</Label>
              <Input type="number" value={form.total_hectares} onChange={(e) => setForm({ ...form, total_hectares: e.target.value })} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear finca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Lots Tab ────────────────────────────────────────────────
function LotsTab() {
  const { canManage } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lot | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    farm_id: "",
    hectares: "",
    plant_count: "",
    planting_date: "",
    phenological_week: "1",
    current_season: "" as string,
  });

  const { data: farms = [] } = useQuery({
    queryKey: ["config-farms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("farms").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ["config-lots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lots")
        .select("*, farms:farm_id(name)")
        .order("name");
      if (error) throw error;
      return data as (Lot & { farms: { name: string } | null })[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("El nombre es obligatorio");
      if (!form.farm_id) throw new Error("Debe seleccionar una finca");

      const payload = {
        name: form.name.trim(),
        farm_id: form.farm_id,
        hectares: form.hectares ? parseFloat(form.hectares) : null,
        plant_count: form.plant_count ? parseInt(form.plant_count) : null,
        planting_date: form.planting_date || null,
        phenological_week: parseInt(form.phenological_week) || 1,
        current_season: (form.current_season || null) as SeasonType | null,
      };

      if (editing) {
        const { error } = await supabase.from("lots").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lots").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Lote actualizado" : "Lote creado" });
      queryClient.invalidateQueries({ queryKey: ["config-lots"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      closeDialog();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", farm_id: farms[0]?.id || "", hectares: "", plant_count: "", planting_date: "", phenological_week: "1", current_season: "" });
    setDialogOpen(true);
  };

  const openEdit = (lot: Lot) => {
    setEditing(lot);
    setForm({
      name: lot.name,
      farm_id: lot.farm_id,
      hectares: lot.hectares?.toString() || "",
      plant_count: lot.plant_count?.toString() || "",
      planting_date: lot.planting_date || "",
      phenological_week: lot.phenological_week?.toString() || "1",
      current_season: lot.current_season || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const filtered = lots.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Lotes / Bloques
          </CardTitle>
          <CardDescription>{lots.length} lote(s) registrado(s)</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Lote
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar lote..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No se encontraron lotes</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Finca</TableHead>
                  <TableHead className="text-right">Ha</TableHead>
                  <TableHead className="text-right">Plantas</TableHead>
                  <TableHead>Época</TableHead>
                  <TableHead className="text-right">Sem. Feno.</TableHead>
                  {canManage && <TableHead className="w-20">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell className="font-medium">{lot.name}</TableCell>
                    <TableCell>{(lot as any).farms?.name || "—"}</TableCell>
                    <TableCell className="text-right">{lot.hectares ?? "—"}</TableCell>
                    <TableCell className="text-right">{lot.plant_count ?? "—"}</TableCell>
                    <TableCell>
                      {lot.current_season ? (
                        <Badge variant="outline" className="capitalize">{lot.current_season}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{lot.phenological_week ?? "—"}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lot)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Lote" : "Nuevo Lote"}</DialogTitle>
            <DialogDescription>Datos del lote o bloque productivo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Lote 1A" />
            </div>
            <div className="space-y-2">
              <Label>Finca *</Label>
              <Select value={form.farm_id || "__none__"} onValueChange={(v) => setForm({ ...form, farm_id: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar finca" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Seleccionar...</SelectItem>
                  {farms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hectáreas</Label>
                <Input type="number" value={form.hectares} onChange={(e) => setForm({ ...form, hectares: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Nº de plantas</Label>
                <Input type="number" value={form.plant_count} onChange={(e) => setForm({ ...form, plant_count: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de siembra</Label>
              <Input type="date" value={form.planting_date} onChange={(e) => setForm({ ...form, planting_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Semana fenológica</Label>
                <Input type="number" min="1" value={form.phenological_week} onChange={(e) => setForm({ ...form, phenological_week: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Época actual</Label>
                <Select value={form.current_season || "__none__"} onValueChange={(v) => setForm({ ...form, current_season: v === "__none__" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin definir</SelectItem>
                    {SEASON_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Task Types Tab ──────────────────────────────────────────
function TaskTypesTab() {
  const { canManage } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskType | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    estimated_hours: "",
    requires_lot: true,
    is_active: true,
  });

  const { data: taskTypes = [], isLoading } = useQuery({
    queryKey: ["config-task-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_types").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("El nombre es obligatorio");

      // Check duplicates
      const existing = taskTypes.find(
        (t) => t.name.toLowerCase() === form.name.trim().toLowerCase() && t.id !== editing?.id
      );
      if (existing) throw new Error("Ya existe un tipo de labor con ese nombre");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        requires_lot: form.requires_lot,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase.from("task_types").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("task_types").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Tipo de labor actualizado" : "Tipo de labor creado" });
      queryClient.invalidateQueries({ queryKey: ["config-task-types"] });
      queryClient.invalidateQueries({ queryKey: ["task-types"] });
      closeDialog();
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", estimated_hours: "", requires_lot: true, is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (tt: TaskType) => {
    setEditing(tt);
    setForm({
      name: tt.name,
      description: tt.description || "",
      estimated_hours: tt.estimated_hours?.toString() || "",
      requires_lot: tt.requires_lot ?? true,
      is_active: tt.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const filtered = taskTypes.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            Tipos de Labor
          </CardTitle>
          <CardDescription>{taskTypes.length} tipo(s) de labor</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Tipo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar tipo de labor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No se encontraron tipos de labor</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Horas est.</TableHead>
                  <TableHead>Req. lote</TableHead>
                  <TableHead>Estado</TableHead>
                  {canManage && <TableHead className="w-20">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tt) => (
                  <TableRow key={tt.id}>
                    <TableCell className="font-medium">{tt.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tt.description || "—"}</TableCell>
                    <TableCell className="text-right">{tt.estimated_hours ?? "—"}</TableCell>
                    <TableCell>{tt.requires_lot ? "Sí" : "No"}</TableCell>
                    <TableCell>
                      <Badge variant={tt.is_active ? "default" : "secondary"}>
                        {tt.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tt)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tipo de Labor" : "Nuevo Tipo de Labor"}</DialogTitle>
            <DialogDescription>Catálogo de labores para asignación de tareas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Poda de formación" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción de la labor" rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Horas estimadas</Label>
              <Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} placeholder="0" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="requires_lot" checked={form.requires_lot} onCheckedChange={(c) => setForm({ ...form, requires_lot: c })} />
                <Label htmlFor="requires_lot">Requiere lote</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="is_active" checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
                <Label htmlFor="is_active">Activo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── Quick Links to existing admin modules ───────────────────
function QuickLinksCard() {
  const links = [
    { to: "/operarios", icon: Users, label: "Operarios", desc: "Gestión de personal y tarifas" },
    { to: "/inventario", icon: Package, label: "Inventario", desc: "Productos e insumos agrícolas" },
    { to: "/protocolos", icon: FileText, label: "Protocolos", desc: "Librería de protocolos y versiones" },
    { to: "/costos", icon: Settings, label: "Costos", desc: "Precios y costos operativos" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Otros módulos de administración</CardTitle>
        <CardDescription>Estos catálogos se administran en sus módulos dedicados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
            >
              <div className="p-2 rounded-md bg-muted">
                <link.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{link.label}</p>
                <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function Configuracion() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Configuración
          </h1>
          <p className="text-muted-foreground">
            Parámetros del sistema, fincas, lotes y catálogos operativos
          </p>
        </div>

        <Tabs defaultValue="farms" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="farms" className="flex flex-col gap-1.5 px-2 py-2 text-xs sm:flex-row sm:text-sm">
              <MapPin className="w-4 h-4" />
              <span>Fincas</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="flex flex-col gap-1.5 px-2 py-2 text-xs sm:flex-row sm:text-sm">
              <Layers className="w-4 h-4" />
              <span>Lotes</span>
            </TabsTrigger>
            <TabsTrigger value="task-types" className="flex flex-col gap-1.5 px-2 py-2 text-xs sm:flex-row sm:text-sm">
              <ListTodo className="w-4 h-4" />
              <span className="sm:hidden">Labores</span>
              <span className="hidden sm:inline">Tipos de Labor</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="farms">
            <FarmTab />
          </TabsContent>
          <TabsContent value="lots">
            <LotsTab />
          </TabsContent>
          <TabsContent value="task-types">
            <TaskTypesTab />
          </TabsContent>
        </Tabs>

        <QuickLinksCard />
      </div>
    </AppLayout>
  );
}
