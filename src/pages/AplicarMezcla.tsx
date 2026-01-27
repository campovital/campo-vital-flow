import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import {
  MapPin,
  User,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2,
  Droplet,
  Clock,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lot {
  id: string;
  name: string;
  hectares: number;
  plant_count: number;
  farm_id: string;
}

interface Operator {
  id: string;
  full_name: string;
}

interface SuggestedMix {
  success: boolean;
  error?: string;
  rule_id?: string;
  protocol_version_id?: string;
  protocol_name?: string;
  protocol_category?: string;
  version_number?: number;
  reason?: string;
  iso_week?: number;
  phenological_week?: number;
  current_season?: string;
  steps?: Array<{ order: number; instruction: string; is_required: boolean }>;
  components?: Array<{
    product_id: string;
    product_name: string;
    dose_amount: number;
    dose_unit: string;
    dose_base: string;
    withdrawal_days: number;
  }>;
}

type Step = "operator" | "lot" | "confirm" | "result";

export default function AplicarMezcla() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("operator");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [suggestedMix, setSuggestedMix] = useState<SuggestedMix | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"ejecutada" | "no_ejecutada" | "ejecutada_con_novedad" | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const [pumpsUsed, setPumpsUsed] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchOperators();
    fetchLots();
  }, []);

  const fetchOperators = async () => {
    const { data } = await supabase
      .from("operators")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name");
    if (data) setOperators(data);
  };

  const fetchLots = async () => {
    const { data } = await supabase
      .from("lots")
      .select("id, name, hectares, plant_count, farm_id")
      .order("name");
    if (data) setLots(data);
  };

  const fetchSuggestedMix = async (lotId: string) => {
    setIsLoading(true);
    const today = new Date().toISOString().split("T")[0];
    
    const { data, error } = await supabase.rpc("get_suggested_mix", {
      p_lot_id: lotId,
      p_date: today,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo obtener la mezcla sugerida",
        variant: "destructive",
      });
      setSuggestedMix({ success: false, error: error.message } as SuggestedMix);
    } else {
      setSuggestedMix(data as unknown as SuggestedMix);
    }
    setIsLoading(false);
  };

  const handleSelectOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setCurrentStep("lot");
  };

  const handleSelectLot = (lot: Lot) => {
    setSelectedLot(lot);
    fetchSuggestedMix(lot.id);
    setCurrentStep("confirm");
  };

  const toggleStep = (stepOrder: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepOrder)
        ? prev.filter((s) => s !== stepOrder)
        : [...prev, stepOrder]
    );
  };

  const handleSubmitApplication = async (status: "ejecutada" | "no_ejecutada" | "ejecutada_con_novedad") => {
    if (!selectedOperator || !selectedLot || !suggestedMix?.protocol_version_id) return;

    setIsLoading(true);
    setApplicationStatus(status);

    const { data, error } = await supabase.from("applications").insert({
      lot_id: selectedLot.id,
      operator_id: selectedOperator.id,
      protocol_version_id: suggestedMix.protocol_version_id,
      schedule_rule_id: suggestedMix.rule_id,
      status,
      device_time: new Date().toISOString(),
      pumps_used: pumpsUsed ? parseFloat(pumpsUsed) : null,
      labor_hours: laborHours ? parseFloat(laborHours) : null,
      notes,
      issue_reason: status === "ejecutada_con_novedad" ? issueReason : null,
      reason_explanation: suggestedMix.reason,
    }).select().single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la aplicación",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Insert application products
    if (data && suggestedMix.components) {
      for (const component of suggestedMix.components) {
        await supabase.from("application_products").insert({
          application_id: data.id,
          product_id: component.product_id,
          quantity_used: component.dose_amount * (parseFloat(pumpsUsed) || 1),
        });
      }
    }

    setIsLoading(false);
    setCurrentStep("result");
    
    toast({
      title: "¡Aplicación registrada!",
      description: `Se ha registrado la aplicación como "${status.replace("_", " ")}"`,
    });
  };

  const resetFlow = () => {
    setCurrentStep("operator");
    setSelectedOperator(null);
    setSelectedLot(null);
    setSuggestedMix(null);
    setCompletedSteps([]);
    setApplicationStatus(null);
    setIssueReason("");
    setPumpsUsed("");
    setLaborHours("");
    setNotes("");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { step: "operator", label: "Operario" },
            { step: "lot", label: "Lote" },
            { step: "confirm", label: "Confirmar" },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  currentStep === item.step || 
                  (currentStep === "result" && index < 3) ||
                  (currentStep === "confirm" && index < 2) ||
                  (currentStep === "lot" && index < 1)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div className="w-8 h-0.5 bg-muted mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Step: Select Operator */}
        {currentStep === "operator" && (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold">Seleccionar Operario</h1>
              <p className="text-muted-foreground mt-1">¿Quién realizará la aplicación?</p>
            </div>

            <div className="grid gap-3">
              {operators.length === 0 ? (
                <EmptyStateCard
                  icon={User}
                  title="No hay operarios registrados"
                  description="Necesita registrar operarios para asignar aplicaciones"
                  primaryAction={{ label: "Ir a Operarios", href: "/operarios" }}
                />
              ) : (
                operators.map((operator) => (
                  <Card
                    key={operator.id}
                    className="lot-card"
                    onClick={() => handleSelectOperator(operator)}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{operator.full_name}</h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: Select Lot */}
        {currentStep === "lot" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentStep("operator")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Seleccionar Lote</h1>
                <p className="text-muted-foreground">Operario: {selectedOperator?.full_name}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {lots.length === 0 ? (
                <EmptyStateCard
                  icon={MapPin}
                  title="No hay lotes registrados"
                  description="Configure lotes en el módulo de Configuración"
                  primaryAction={{ label: "Ir a Configuración", href: "/configuracion", icon: Settings }}
                />
              ) : (
                lots.map((lot) => (
                  <Card
                    key={lot.id}
                    className="lot-card"
                    onClick={() => handleSelectLot(lot)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{lot.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {lot.hectares} ha • {lot.plant_count?.toLocaleString() || "—"} plantas
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: Confirm Application */}
        {currentStep === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentStep("lot")}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Confirmar Aplicación</h1>
                <p className="text-muted-foreground">
                  {selectedOperator?.full_name} • {selectedLot?.name}
                </p>
              </div>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                  <p className="mt-4 text-muted-foreground">Cargando protocolo...</p>
                </CardContent>
              </Card>
            ) : suggestedMix?.error || !suggestedMix?.success ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-2" />
                  <p className="font-medium text-destructive">No hay protocolo disponible</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {suggestedMix?.error || "No se encontró una regla aplicable para este lote y fecha"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Protocol Info */}
                <Card className="protocol-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {suggestedMix.protocol_category}
                      </Badge>
                      <h2 className="text-lg font-bold">{suggestedMix.protocol_name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Versión {suggestedMix.version_number}
                      </p>
                    </div>
                  </div>
                  
                  {/* Reason explanation */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/20">
                    <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-info">{suggestedMix.reason}</p>
                  </div>
                </Card>

                {/* Steps Checklist */}
                {suggestedMix.steps && suggestedMix.steps.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Pasos a seguir</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {suggestedMix.steps.map((step) => (
                        <div
                          key={step.order}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => toggleStep(step.order)}
                        >
                          <Checkbox
                            checked={completedSteps.includes(step.order)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className={cn(
                              "text-sm",
                              completedSteps.includes(step.order) && "line-through text-muted-foreground"
                            )}>
                              {step.instruction}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">#{step.order}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Components/Products */}
                {suggestedMix.components && suggestedMix.components.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Droplet className="w-4 h-4" />
                        Productos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {suggestedMix.components.map((component, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{component.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {component.dose_amount} {component.dose_unit} / {component.dose_base}
                            </p>
                          </div>
                          {component.withdrawal_days > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              PC: {component.withdrawal_days}d
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Additional Info */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pumps">Bombas utilizadas</Label>
                        <Input
                          id="pumps"
                          type="number"
                          step="0.5"
                          placeholder="Ej: 2.5"
                          value={pumpsUsed}
                          onChange={(e) => setPumpsUsed(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="laborHours">Horas de trabajo</Label>
                        <Input
                          id="laborHours"
                          type="number"
                          step="0.5"
                          placeholder="Ej: 2"
                          value={laborHours}
                          onChange={(e) => setLaborHours(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notas (opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Observaciones adicionales..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <Button
                    variant="confirm"
                    onClick={() => handleSubmitApplication("ejecutada")}
                    disabled={isLoading}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Ejecutada
                  </Button>
                  
                  <Button
                    variant="confirm-warning"
                    onClick={() => {
                      const reason = prompt("Describa la novedad:");
                      if (reason) {
                        setIssueReason(reason);
                        handleSubmitApplication("ejecutada_con_novedad");
                      }
                    }}
                    disabled={isLoading}
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Ejecutada con Novedad
                  </Button>
                  
                  <Button
                    variant="confirm-danger"
                    onClick={() => handleSubmitApplication("no_ejecutada")}
                    disabled={isLoading}
                  >
                    <X className="w-5 h-5 mr-2" />
                    No Ejecutada
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Result */}
        {currentStep === "result" && (
          <div className="space-y-6 text-center py-8">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
              applicationStatus === "ejecutada" 
                ? "bg-success/20" 
                : applicationStatus === "ejecutada_con_novedad"
                ? "bg-warning/20"
                : "bg-destructive/20"
            )}>
              {applicationStatus === "ejecutada" ? (
                <Check className="w-10 h-10 text-success" />
              ) : applicationStatus === "ejecutada_con_novedad" ? (
                <AlertTriangle className="w-10 h-10 text-warning" />
              ) : (
                <X className="w-10 h-10 text-destructive" />
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">¡Aplicación Registrada!</h1>
              <p className="text-muted-foreground mt-2">
                {selectedOperator?.full_name} • {selectedLot?.name}
              </p>
              <Badge className="mt-4" variant={
                applicationStatus === "ejecutada" ? "default" :
                applicationStatus === "ejecutada_con_novedad" ? "secondary" : "destructive"
              }>
                {applicationStatus?.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>

            <Button variant="field" onClick={resetFlow} className="mx-auto">
              Nueva Aplicación
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
