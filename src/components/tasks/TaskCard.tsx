import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle,
  Timer
} from "lucide-react";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type TaskStatus = Database["public"]["Enums"]["task_status"];

interface Task {
  id: string;
  task_type_id: string;
  lot_id: string | null;
  assigned_to: string | null;
  scheduled_date: string;
  priority: number;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  hours_worked: number | null;
  notes: string | null;
  completion_notes: string | null;
  task_type: { name: string; estimated_hours: number | null };
  lot: { name: string } | null;
  operator: { full_name: string } | null;
}

interface TaskCardProps {
  task: Task;
  onStart?: () => void;
  onComplete?: (notes?: string) => void;
  canEdit: boolean;
  isOverdue?: boolean;
  showTimer?: boolean;
  showHoursWorked?: boolean;
}

const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: "Crítica", color: "bg-destructive text-destructive-foreground" },
  2: { label: "Alta", color: "bg-warning text-warning-foreground" },
  3: { label: "Media", color: "bg-primary text-primary-foreground" },
  4: { label: "Baja", color: "bg-muted text-muted-foreground" },
  5: { label: "Mínima", color: "bg-muted text-muted-foreground" },
};

function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(startedAt).getTime();
    
    const updateElapsed = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [startedAt]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex items-center gap-2 text-primary font-mono text-lg">
      <Timer className="w-5 h-5 animate-pulse" />
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
}

export function TaskCard({ 
  task, 
  onStart, 
  onComplete, 
  canEdit, 
  isOverdue,
  showTimer,
  showHoursWorked 
}: TaskCardProps) {
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");

  const handleComplete = () => {
    onComplete?.(completionNotes);
    setCompleteDialogOpen(false);
    setCompletionNotes("");
  };

  const priorityInfo = priorityConfig[task.priority] || priorityConfig[3];

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-md",
        isOverdue && "border-destructive/50 bg-destructive/5",
        task.status === "en_progreso" && "border-primary/50 bg-primary/5"
      )}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Task Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {task.task_type.name}
                    </h3>
                    <Badge className={priorityInfo.color} variant="secondary">
                      {priorityInfo.label}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Vencida
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(task.scheduled_date), "d MMM yyyy", { locale: es })}
                    </span>
                    {task.lot && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {task.lot.name}
                      </span>
                    )}
                    {task.operator && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {task.operator.full_name}
                      </span>
                    )}
                    {task.task_type.estimated_hours && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        Est: {task.task_type.estimated_hours}h
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {task.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions / Status */}
            <div className="flex items-center gap-3">
              {showTimer && task.started_at && (
                <LiveTimer startedAt={task.started_at} />
              )}

              {showHoursWorked && task.hours_worked !== null && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-success">{task.hours_worked.toFixed(2)}h</p>
                  <p className="text-xs text-muted-foreground">trabajadas</p>
                </div>
              )}

              {task.status === "pendiente" && canEdit && onStart && (
                <Button onClick={onStart} size="sm" className="gap-2">
                  <Play className="w-4 h-4" />
                  Iniciar
                </Button>
              )}

              {task.status === "en_progreso" && canEdit && onComplete && (
                <Button 
                  onClick={() => setCompleteDialogOpen(true)} 
                  size="sm" 
                  variant="success"
                  className="gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completar
                </Button>
              )}

              {task.status === "completada" && (
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Completada
                </Badge>
              )}
            </div>
          </div>

          {/* Completion notes display */}
          {task.completion_notes && task.status === "completada" && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Notas de cierre:</span> {task.completion_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium">{task.task_type.name}</p>
              {task.lot && <p className="text-sm text-muted-foreground">{task.lot.name}</p>}
            </div>
            {task.started_at && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Tiempo transcurrido</p>
                <LiveTimer startedAt={task.started_at} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Notas de cierre (opcional)</label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Observaciones sobre la tarea completada..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleComplete}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
