import { useState, useEffect } from "react";
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
  const [steps, setSteps] = useState<ProtocolStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newStep, setNewStep] = useState({ instruction: "", is_required: true });

  useEffect(() => {
    fetchSteps();
  }, [versionId]);

  const fetchSteps = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("protocol_steps")
      .select("*")
      .eq("protocol_version_id", versionId)
      .order("step_order");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pasos",
        variant: "destructive",
      });
    } else {
      setSteps(data || []);
    }
    setIsLoading(false);
  };

  const handleAddStep = async () => {
    if (!newStep.instruction.trim()) {
      toast({
        title: "Error",
        description: "La instrucción es requerida",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;

    const { error } = await supabase.from("protocol_steps").insert({
      protocol_version_id: versionId,
      step_order: nextOrder,
      instruction: newStep.instruction.trim(),
      is_required: newStep.is_required,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el paso",
        variant: "destructive",
      });
    } else {
      toast({ title: "Paso agregado" });
      setNewStep({ instruction: "", is_required: true });
      fetchSteps();
    }
    setIsSaving(false);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("¿Eliminar este paso?")) return;

    const { error } = await supabase
      .from("protocol_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el paso",
        variant: "destructive",
      });
    } else {
      toast({ title: "Paso eliminado" });
      fetchSteps();
    }
  };

  const handleUpdateStep = async (step: ProtocolStep, updates: Partial<ProtocolStep>) => {
    const { error } = await supabase
      .from("protocol_steps")
      .update(updates)
      .eq("id", step.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el paso",
        variant: "destructive",
      });
    } else {
      fetchSteps();
    }
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
                className="flex items-start gap-2 p-2 rounded-md border bg-card"
              >
                <GripVertical className="w-4 h-4 mt-1 text-muted-foreground" />
                <span className="font-medium text-sm min-w-[24px]">{step.step_order}.</span>
                <div className="flex-1">
                  {canEdit ? (
                    <Input
                      value={step.instruction}
                      onChange={(e) => handleUpdateStep(step, { instruction: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm">{step.instruction}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <Checkbox
                        checked={step.is_required ?? true}
                        onCheckedChange={(checked) =>
                          handleUpdateStep(step, { is_required: checked as boolean })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Req.</span>
                    </div>
                  )}
                  {!canEdit && step.is_required && (
                    <span className="text-xs text-muted-foreground">(Obligatorio)</span>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
            <Button onClick={handleAddStep} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
