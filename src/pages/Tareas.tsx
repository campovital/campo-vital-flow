import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Play, 
  CheckCircle2, 
  Clock, 
  Calendar,
  User,
  MapPin,
  AlertCircle,
  Filter
} from "lucide-react";
import { format, isToday, isPast, isFuture } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useCurrentOperator } from "@/hooks/use-current-operator";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import type { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];

interface Task {
  id: string;
  task_type_id: string;
  lot_id: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  scheduled_date: string;
  priority: number;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  hours_worked: number | null;
  notes: string | null;
  completion_notes: string | null;
  created_at: string;
  task_type: { name: string; estimated_hours: number | null };
  lot: { name: string } | null;
  operator: { full_name: string } | null;
}

export default function Tareas() {
  const { toast } = useToast();
  const { canManage } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const { operatorId } = useCurrentOperator();
  const { isOperario } = useAuth();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pendientes");
  const [filters, setFilters] = useState({
    lotId: "",
    operatorId: "",
    taskTypeId: "",
    dateFrom: "",
    dateTo: "",
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(`
          *,
          task_type:task_types(name, estimated_hours),
          lot:lots(name),
          operator:operators!tasks_assigned_to_fkey(full_name)
        `)
        .order("scheduled_date", { ascending: true })
        .order("priority", { ascending: true });

      if (filters.lotId) {
        query = query.eq("lot_id", filters.lotId);
      }
      if (filters.operatorId) {
        query = query.eq("assigned_to", filters.operatorId);
      }
      if (filters.taskTypeId) {
        query = query.eq("task_type_id", filters.taskTypeId);
      }
      if (filters.dateFrom) {
        query = query.gte("scheduled_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("scheduled_date", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "en_progreso" as TaskStatus, 
          started_at: new Date().toISOString() 
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Tarea iniciada", description: "El cronómetro ha comenzado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo iniciar la tarea", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, completionNotes }: { taskId: string; completionNotes?: string }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "completada" as TaskStatus, 
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes || null
        })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Tarea completada", description: "Las horas han sido registradas" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo completar la tarea", variant: "destructive" });
    },
  });

  const pendingTasks = tasks.filter(t => t.status === "pendiente");
  const inProgressTasks = tasks.filter(t => t.status === "en_progreso");
  const completedTasks = tasks.filter(t => t.status === "completada");

  const todayTasks = pendingTasks.filter(t => isToday(new Date(t.scheduled_date)));
  const overdueTasks = pendingTasks.filter(t => isPast(new Date(t.scheduled_date)) && !isToday(new Date(t.scheduled_date)));
  const upcomingTasks = pendingTasks.filter(t => isFuture(new Date(t.scheduled_date)));

  const totalHoursWorked = completedTasks.reduce((acc, t) => acc + (t.hours_worked || 0), 0);

  // Operario can only interact with tasks assigned to them
  const canEditTask = (task: Task) => {
    if (!canEdit("tareas")) return false;
    if (!isOperario) return true; // admin/agronoma can edit all
    return task.assigned_to === operatorId;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Tareas</h1>
            <p className="text-muted-foreground">Asigna, ejecuta y monitorea tareas del equipo</p>
          </div>
          {canCreate("tareas") && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Tarea
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overdueTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Para hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-info/10 rounded-lg">
                  <Play className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressTasks.length}</p>
                  <p className="text-xs text-muted-foreground">En progreso</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalHoursWorked.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Horas trabajadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TaskFilters filters={filters} onFiltersChange={setFilters} />

        {/* Tasks Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendientes" className="gap-2">
              Pendientes
              {pendingTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{pendingTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="en_progreso" className="gap-2">
              En Progreso
              {inProgressTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{inProgressTasks.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completadas" className="gap-2">
              Completadas
              {completedTasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{completedTasks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes" className="space-y-4 mt-4">
            {overdueTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Vencidas ({overdueTasks.length})
                </h3>
                <div className="grid gap-3">
                  {overdueTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStart={() => startTaskMutation.mutate(task.id)}
                      canEdit={canEditTask(task)}
                      isOverdue
                    />
                  ))}
                </div>
              </div>
            )}

            {todayTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Hoy ({todayTasks.length})
                </h3>
                <div className="grid gap-3">
                  {todayTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStart={() => startTaskMutation.mutate(task.id)}
                      canEdit={canEditTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Próximas ({upcomingTasks.length})
                </h3>
                <div className="grid gap-3">
                  {upcomingTasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onStart={() => startTaskMutation.mutate(task.id)}
                      canEdit={canEditTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}

            {pendingTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay tareas pendientes</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="en_progreso" className="space-y-4 mt-4">
            {inProgressTasks.length > 0 ? (
              <div className="grid gap-3">
                {inProgressTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={(notes) => completeTaskMutation.mutate({ taskId: task.id, completionNotes: notes })}
                    canEdit={canEditTask(task)}
                    showTimer
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay tareas en progreso</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completadas" className="space-y-4 mt-4">
            {completedTasks.length > 0 ? (
              <div className="grid gap-3">
                {completedTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    canEdit={false}
                    showHoursWorked
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay tareas completadas</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateTaskDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tasks"] })}
      />
    </AppLayout>
  );
}
