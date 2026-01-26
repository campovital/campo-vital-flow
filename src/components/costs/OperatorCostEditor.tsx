import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User } from "lucide-react";

interface Operator {
  id: string;
  full_name: string;
  hourly_rate: number;
  currency: string;
  is_active: boolean;
}

interface OperatorCostEditorProps {
  operator: Operator;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperatorCostEditor({ operator, open, onOpenChange }: OperatorCostEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(operator.hourly_rate?.toString() || "");
  const [currency, setCurrency] = useState(operator.currency || "COP");

  const handleSave = async () => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate < 0) {
      toast({
        title: "Error",
        description: "Ingrese una tarifa válida",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("operators")
      .update({
        hourly_rate: rate,
        currency,
      })
      .eq("id", operator.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la tarifa",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Tarifa actualizada",
        description: `Tarifa de ${operator.full_name} actualizada a ${formatCurrency(rate, currency)}/hora`,
      });
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  const formatCurrency = (value: number, curr: string = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Editar Tarifa - {operator.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="hourlyRate">Tarifa por hora</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="hourlyRate"
                type="number"
                placeholder="Ej: 15000"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="flex-1"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Esta tarifa se usará para calcular automáticamente el costo de mano de obra en las aplicaciones.
            </p>
          </div>

          {hourlyRate && parseFloat(hourlyRate) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Estimación de costos:</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">1 hora:</span>{" "}
                  <span className="font-medium">{formatCurrency(parseFloat(hourlyRate), currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">4 horas:</span>{" "}
                  <span className="font-medium">{formatCurrency(parseFloat(hourlyRate) * 4, currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">8 horas:</span>{" "}
                  <span className="font-medium">{formatCurrency(parseFloat(hourlyRate) * 8, currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mensual (160h):</span>{" "}
                  <span className="font-medium">{formatCurrency(parseFloat(hourlyRate) * 160, currency)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
