import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  Users,
  Plus,
  Edit,
  Phone,
  IdCard,
  DollarSign,
  Loader2,
  TrendingUp,
  Clock,
  Sprout,
} from "lucide-react";
import { subDays } from "date-fns";

interface Operator {
  id: string;
  full_name: string;
  identification: string | null;
  phone: string | null;
  hourly_rate: number | null;
  currency: string;
  is_active: boolean;
  farm_id: string | null;
  user_id: string | null;
}

interface Farm {
  id: string;
  name: string;
}

interface OperatorStats {
  total_harvests: number;
  total_kg: number;
  total_applications: number;
  total_hours: number;
}

export default function Operarios() {
  const { canManage } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    identification: "",
    phone: "",
    hourly_rate: "",
    currency: "COP",
    farm_id: "",
    is_active: true,
  });

  // Fetch operators
  const { data: operators = [], isLoading: isLoadingOperators } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operators")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data as Operator[];
    },
  });

  // Fetch farms
  const { data: farms = [] } = useQuery({
    queryKey: ["farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Farm[];
    },
  });

  // Fetch stats for all operators
  const { data: operatorStats = {} } = useQuery({
    queryKey: ["operator-stats", operators.map(o => o.id)],
    queryFn: async () => {
      const stats: Record<string, OperatorStats> = {};
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      for (const op of operators) {
        const [harvests, applications] = await Promise.all([
          supabase
            .from("harvests")
            .select("total_kg")
            .eq("operator_id", op.id)
            .gte("harvest_date", thirtyDaysAgo.split("T")[0]),
          supabase
            .from("applications")
            .select("labor_hours")
            .eq("operator_id", op.id)
            .gte("device_time", thirtyDaysAgo)
        ]);

        stats[op.id] = {
          total_harvests: harvests.data?.length || 0,
          total_kg: harvests.data?.reduce((sum, h) => sum + (h.total_kg || 0), 0) || 0,
          total_applications: applications.data?.length || 0,
          total_hours: applications.data?.reduce((sum, a) => sum + (a.labor_hours || 0), 0) || 0,
        };
      }
      
      return stats;
    },
    enabled: operators.length > 0,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { isEdit: boolean; id?: string }) => {
      const payload = {
        full_name: form.full_name.trim(),
        identification: form.identification.trim() || null,
        phone: form.phone.trim() || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : 0,
        currency: form.currency,
        farm_id: form.farm_id || null,
        is_active: form.is_active,
      };

      if (data.isEdit && data.id) {
        const { error } = await supabase
          .from("operators")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("operators").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.isEdit ? "Operario actualizado" : "Operario creado",
        description: "Los cambios se guardaron correctamente"
      });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["operators"] });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "No se pudo guardar el operario", 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setForm({
      full_name: "",
      identification: "",
      phone: "",
      hourly_rate: "",
      currency: "COP",
      farm_id: "",
      is_active: true,
    });
    setEditingOperator(null);
  };

  const handleEdit = (operator: Operator) => {
    setEditingOperator(operator);
    setForm({
      full_name: operator.full_name,
      identification: operator.identification || "",
      phone: operator.phone || "",
      hourly_rate: operator.hourly_rate?.toString() || "",
      currency: operator.currency || "COP",
      farm_id: operator.farm_id || "",
      is_active: operator.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.full_name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ isEdit: !!editingOperator, id: editingOperator?.id });
  };

  const formatCurrency = (value: number, currency: string = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Summary calculations
  const activeOperators = operators.filter(o => o.is_active).length;
  const avgHourlyRate = operators.length > 0
    ? operators.reduce((sum, o) => sum + (o.hourly_rate || 0), 0) / operators.length
    : 0;
  const totalHoursLast30Days = Object.values(operatorStats).reduce((sum, s) => sum + s.total_hours, 0);
  const totalKgLast30Days = Object.values(operatorStats).reduce((sum, s) => sum + s.total_kg, 0);

  // Hide cost info for operario/consulta roles
  const showCostInfo = canManage;

  if (isLoadingOperators) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Gestión de Operarios
            </h1>
            <p className="text-muted-foreground">
              Administra el personal y su productividad
            </p>
          </div>
          
          {canManage && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Operario
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingOperator ? "Editar Operario" : "Nuevo Operario"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Nombre completo *</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Nombre del operario"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="identification">Identificación</Label>
                      <Input
                        id="identification"
                        value={form.identification}
                        onChange={(e) => setForm({ ...form, identification: e.target.value })}
                        placeholder="CC o documento"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Número de contacto"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="farm_id">Finca asignada</Label>
                    <Select 
                      value={form.farm_id || "__none__"} 
                      onValueChange={(v) => setForm({ ...form, farm_id: v === "__none__" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar finca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin asignar</SelectItem>
                        {farms.map((farm) => (
                          <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {showCostInfo && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourly_rate">Tarifa por hora</Label>
                        <Input
                          id="hourly_rate"
                          type="number"
                          value={form.hourly_rate}
                          onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency">Moneda</Label>
                        <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COP">COP</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={form.is_active}
                      onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Operario activo</Label>
                  </div>

                  <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingOperator ? "Guardar cambios" : "Crear operario"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operarios Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeOperators}</div>
              <p className="text-xs text-muted-foreground">
                de {operators.length} registrados
              </p>
            </CardContent>
          </Card>

          {showCostInfo && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tarifa Promedio</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgHourlyRate)}</div>
                <p className="text-xs text-muted-foreground">por hora</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Horas Trabajadas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursLast30Days.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">últimos 30 días</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kilos Cosechados</CardTitle>
              <Sprout className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKgLast30Days.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">últimos 30 días</p>
            </CardContent>
          </Card>
        </div>

        {/* Operators Table */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Operarios</CardTitle>
          </CardHeader>
          <CardContent>
            {operators.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay operarios registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Identificación</TableHead>
                    <TableHead>Teléfono</TableHead>
                    {showCostInfo && <TableHead className="text-right">Tarifa/hora</TableHead>}
                    <TableHead className="text-right">Cosechas (30d)</TableHead>
                    <TableHead className="text-right">Kg (30d)</TableHead>
                    <TableHead>Estado</TableHead>
                    {canManage && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((operator) => {
                    const stats = operatorStats[operator.id] || { total_harvests: 0, total_kg: 0, total_applications: 0, total_hours: 0 };
                    return (
                      <TableRow key={operator.id}>
                        <TableCell className="font-medium">{operator.full_name}</TableCell>
                        <TableCell>
                          {operator.identification ? (
                            <div className="flex items-center gap-1">
                              <IdCard className="w-3 h-3 text-muted-foreground" />
                              {operator.identification}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {operator.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              {operator.phone}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {showCostInfo && (
                          <TableCell className="text-right font-mono">
                            {operator.hourly_rate && operator.hourly_rate > 0 ? (
                              formatCurrency(operator.hourly_rate, operator.currency)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3 text-success" />
                            {stats.total_harvests}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {stats.total_kg.toFixed(1)} kg
                        </TableCell>
                        <TableCell>
                          <Badge variant={operator.is_active ? "default" : "secondary"}>
                            {operator.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(operator)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
