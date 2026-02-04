import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2, WifiOff } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useOfflineSubmit } from "@/hooks/use-offline-submit";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [taskTypeId, setTaskTypeId] = useState("");
  const [lotId, setLotId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [priority, setPriority] = useState("3");
  const [notes, setNotes] = useState("");

  const { data: taskTypes = [] } = useQuery({
    queryKey: ["task-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_types")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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

  const selectedTaskType = taskTypes.find(t => t.id === taskTypeId);

  const { isOnline, queueForSync } = useOfflineSubmit("tasks");

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!taskTypeId || !scheduledDate) {
        throw new Error("Faltan campos requeridos");
      }

      const payload = {
        task_type_id: taskTypeId,
        lot_id: lotId || null,
        assigned_to: operatorId || null,
        assigned_by: user?.id || null,
        scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
        priority: parseInt(priority),
        notes: notes || null,
      };

      if (!isOnline) {
        // Queue for later sync
        queueForSync(payload);
        return;
      }

      const { error } = await supabase.from("tasks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: isOnline ? "Tarea creada" : "Tarea guardada offline",
        description: isOnline
          ? "La tarea ha sido asignada correctamente"
          : "Se sincronizará automáticamente al recuperar conexión",
      });
      resetForm();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo crear la tarea",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setTaskTypeId("");
    setLotId("");
    setOperatorId("");
    setScheduledDate(undefined);
    setPriority("3");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Tarea</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="taskType">Tipo de Tarea *</Label>
            <Select value={taskTypeId || "__none__"} onValueChange={(v) => setTaskTypeId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de tarea" />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.length === 0 ? (
                  <SelectItem value="__none__" disabled>No hay tipos de tarea</SelectItem>
                ) : (
                  taskTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{type.name}</span>
                        {type.estimated_hours && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({type.estimated_hours}h est.)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Lot - conditionally required */}
          <div className="space-y-2">
            <Label htmlFor="lot">
              Lote {selectedTaskType?.requires_lot && "*"}
            </Label>
            <Select value={lotId || "__none__"} onValueChange={(v) => setLotId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin lote asignado</SelectItem>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator */}
          <div className="space-y-2">
            <Label htmlFor="operator">Asignar a</Label>
            <Select value={operatorId || "__none__"} onValueChange={(v) => setOperatorId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label>Fecha Programada *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? (
                    format(scheduledDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Crítica (1)</SelectItem>
                <SelectItem value="2">Alta (2)</SelectItem>
                <SelectItem value="3">Media (3)</SelectItem>
                <SelectItem value="4">Baja (4)</SelectItem>
                <SelectItem value="5">Mínima (5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones adicionales..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !taskTypeId || !scheduledDate}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Crear Tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
