import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin,
  Sprout,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
  Package,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Lot {
  id: string;
  name: string;
  hectares: number;
  plant_count: number;
}

interface HarvestCheck {
  allowed: boolean;
  release_date?: string;
  blocking_products?: Array<{
    product_name: string;
    application_date: string;
    withdrawal_days: number;
    release_date: string;
  }>;
  message: string;
}

type Step = "lot" | "check" | "form" | "result";

export default function Cosecha() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<Step>("lot");
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [harvestCheck, setHarvestCheck] = useState<HarvestCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [harvestDate, setHarvestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [totalKg, setTotalKg] = useState("");
  const [exportableKg, setExportableKg] = useState("");
  const [rejectedKg, setRejectedKg] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    const { data } = await supabase
      .from("lots")
      .select("id, name, hectares, plant_count")
      .order("name");
    if (data) setLots(data);
  };

  const checkHarvestAllowed = async (lotId: string) => {
    setIsLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data, error } = await supabase.rpc("can_harvest", {
      p_lot_id: lotId,
      p_date: today,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo verificar el estado de carencias",
        variant: "destructive",
      });
      setHarvestCheck({ allowed: false, message: error.message } as HarvestCheck);
    } else {
      setHarvestCheck(data as unknown as HarvestCheck);
    }
    setIsLoading(false);
    setCurrentStep("check");
  };

  const handleSelectLot = (lot: Lot) => {
    setSelectedLot(lot);
    checkHarvestAllowed(lot.id);
  };

  const handleSubmitHarvest = async () => {
    if (!selectedLot || !user) return;

    const total = parseFloat(totalKg);
    const exportable = parseFloat(exportableKg) || 0;
    const rejected = parseFloat(rejectedKg) || 0;

    if (isNaN(total) || total <= 0) {
      toast({
        title: "Error",
        description: "Ingrese un peso total válido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("harvests").insert({
      lot_id: selectedLot.id,
      harvest_date: harvestDate,
      total_kg: total,
      exportable_kg: exportable,
      rejected_kg: rejected,
      recorded_by: user.id,
      notes,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la cosecha",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Cosecha registrada!",
        description: `${total} kg registrados en ${selectedLot.name}`,
      });
      setCurrentStep("result");
    }
    setIsLoading(false);
  };

  const resetFlow = () => {
    setCurrentStep("lot");
    setSelectedLot(null);
    setHarvestCheck(null);
    setTotalKg("");
    setExportableKg("");
    setRejectedKg("");
    setNotes("");
    setHarvestDate(format(new Date(), "yyyy-MM-dd"));
  };

  const exportablePercent = totalKg && exportableKg 
    ? ((parseFloat(exportableKg) / parseFloat(totalKg)) * 100).toFixed(1)
    : "—";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {currentStep !== "lot" && currentStep !== "result" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentStep(currentStep === "form" ? "check" : "lot")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sprout className="w-6 h-6 text-success" />
              Registro de Cosecha
            </h1>
            {selectedLot && (
              <p className="text-muted-foreground">{selectedLot.name}</p>
            )}
          </div>
        </div>

        {/* Step: Select Lot */}
        {currentStep === "lot" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">Seleccione el lote cosechado</p>
            
            <div className="grid gap-3">
              {lots.map((lot) => (
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
              ))}
            </div>
          </div>
        )}

        {/* Step: Check Harvest Allowed */}
        {currentStep === "check" && (
          <div className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                  <p className="mt-4 text-muted-foreground">Verificando carencias...</p>
                </CardContent>
              </Card>
            ) : harvestCheck?.allowed ? (
              <>
                <Card className="border-success/50 bg-success/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <h3 className="font-bold text-success">Cosecha Permitida</h3>
                        <p className="text-muted-foreground mt-1">
                          {harvestCheck.message}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Button 
                  variant="confirm" 
                  onClick={() => setCurrentStep("form")}
                >
                  Continuar al Registro
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-destructive">Cosecha Bloqueada</h3>
                        <p className="text-muted-foreground mt-1">
                          {harvestCheck?.message}
                        </p>
                        {harvestCheck?.release_date && (
                          <p className="text-sm font-medium mt-2">
                            Fecha de liberación: {format(new Date(harvestCheck.release_date), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {harvestCheck?.blocking_products && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Productos con carencia activa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {harvestCheck.blocking_products.map((product, index) => (
                        <div key={index} className="p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{product.product_name}</p>
                            <Badge variant="outline">{product.withdrawal_days} días PC</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Aplicado: {format(new Date(product.application_date), "d MMM", { locale: es })} • 
                            Libera: {format(new Date(product.release_date), "d MMM", { locale: es })}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Button variant="outline" onClick={resetFlow} className="w-full">
                  Seleccionar otro lote
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step: Harvest Form */}
        {currentStep === "form" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de cosecha
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="total" className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Peso total (kg) *
                  </Label>
                  <Input
                    id="total"
                    type="number"
                    step="0.1"
                    placeholder="Ej: 150.5"
                    value={totalKg}
                    onChange={(e) => setTotalKg(e.target.value)}
                    className="mt-1 text-lg font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="exportable" className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-success" />
                      Exportable (kg)
                    </Label>
                    <Input
                      id="exportable"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={exportableKg}
                      onChange={(e) => setExportableKg(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rejected" className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-destructive" />
                      Rechazo (kg)
                    </Label>
                    <Input
                      id="rejected"
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={rejectedKg}
                      onChange={(e) => setRejectedKg(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {totalKg && exportableKg && (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">Porcentaje exportable</p>
                    <p className="text-2xl font-bold text-success">{exportablePercent}%</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Observaciones de la cosecha..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              variant="confirm"
              onClick={handleSubmitHarvest}
              disabled={isLoading || !totalKg}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              Registrar Cosecha
            </Button>
          </div>
        )}

        {/* Step: Result */}
        {currentStep === "result" && (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-success" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">¡Cosecha Registrada!</h1>
              <p className="text-muted-foreground mt-2">
                {selectedLot?.name} • {format(new Date(harvestDate), "d 'de' MMMM", { locale: es })}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalKg}</p>
                  <p className="text-sm text-muted-foreground">kg total</p>
                </div>
                {exportableKg && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-success">{exportablePercent}%</p>
                    <p className="text-sm text-muted-foreground">exportable</p>
                  </div>
                )}
              </div>
            </div>

            <Button variant="field" onClick={resetFlow} className="mx-auto">
              Nueva Cosecha
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
