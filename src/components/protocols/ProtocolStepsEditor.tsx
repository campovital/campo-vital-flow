import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Loader2, GripVertical, ListOrdered } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ProtocolStep = Database["public"]["Tables"]["protocol_steps"]["Row"];

interface Props {
  versionId: string;
  canEdit: boolean;
}

export function ProtocolStepsEditor({ versionId, canEdit }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStep, setNewStep] = useState({ instruction: "", is_required: true });

  // Query for steps
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["protocol-steps", versionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocol_steps")
        .select("*")
        .eq("protocol_version_id", versionId)
        .order("step_order");
      if (error) throw error;
      return data as ProtocolStep[];
    },
  });

  // Add step mutation
  const addStepMutation = useMutation({
    mutationFn: async (step: { instruction: string; is_required: boolean }) => {
      const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;
      const { error } = await supabase.from("protocol_steps").insert({
        protocol_version_id: versionId,
        step_order: nextOrder,
        instruction: step.instruction.trim(),
        is_required: step.is_required,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-steps", versionId] });
      queryClient.invalidateQueries({ queryKey: ["protocol-versions"] });
      toast({ title: "Paso agregado" });
      setNewStep({ instruction: "", is_required: true });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el paso",
        variant: "destructive",
      });
    },
  });

  // Update step mutation
  const updateStepMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProtocolStep> }) => {
      const { error } = await supabase
        .from("protocol_steps")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-steps", versionId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el paso",
        variant: "destructive",
      });
    },
  });

  // Delete step mutation
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from("protocol_steps")
        .delete()
        .eq("id", stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocol-steps", versionId] });
      queryClient.invalidateQueries({ queryKey: ["protocol-versions"] });
      toast({ title: "Paso eliminado" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el paso",
        variant: "destructive",
      });
    },
  });

  const handleAddStep = () => {
    if (!newStep.instruction.trim()) {
      toast({
        title: "Error",
        description: "La instrucción es requerida",
        variant: "destructive",
      });
      return;
    }
    addStepMutation.mutate(newStep);
  };

  const handleDeleteStep = (stepId: string) => {
    if (!confirm("¿Eliminar este paso?")) return;
    deleteStepMutation.mutate(stepId);
  };

  const handleUpdateStep = (step: ProtocolStep, updates: Partial<ProtocolStep>) => {
    updateStepMutation.mutate({ id: step.id, updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListOrdered className="w-4 h-4" />
          Pasos del Protocolo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pasos definidos</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="p-3 rounded-md border bg-card space-y-2"
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm shrink-0">{step.step_order}.</span>
                  <div className="flex-1 min-w-0">
                    {canEdit ? (
                      <Input
                        value={step.instruction}
                        onChange={(e) => handleUpdateStep(step, { instruction: e.target.value })}
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-sm break-words">{step.instruction}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pl-10">
                  {canEdit ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`req-${step.id}`}
                          checked={step.is_required ?? true}
                          onCheckedChange={(checked) =>
                            handleUpdateStep(step, { is_required: checked as boolean })
                          }
                        />
                        <label htmlFor={`req-${step.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          Obligatorio
                        </label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStep(step.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={deleteStepMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </>
                  ) : (
                    step.is_required && (
                      <span className="text-xs text-muted-foreground">(Obligatorio)</span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {canEdit && (
          <div className="flex items-end gap-2 pt-2 border-t">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nueva instrucción</Label>
              <Input
                placeholder="Ej: Calibrar la bomba antes de iniciar"
                value={newStep.instruction}
                onChange={(e) => setNewStep({ ...newStep, instruction: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-1 pb-2">
              <Checkbox
                checked={newStep.is_required}
                onCheckedChange={(checked) =>
                  setNewStep({ ...newStep, is_required: checked as boolean })
                }
              />
              <span className="text-xs">Req.</span>
            </div>
            <Button onClick={handleAddStep} disabled={addStepMutation.isPending} size="sm">
              {addStepMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
