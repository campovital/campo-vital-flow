import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePhotoUpload } from "@/hooks/use-photo-upload";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useOfflineSubmit } from "@/hooks/use-offline-submit";
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
  Camera,
  X,
  Star,
  Users,
  Settings,
  WifiOff,
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

interface Operator {
  id: string;
  full_name: string;
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

type Step = "operator" | "lot" | "check" | "form" | "result";
type Classification = "primera" | "segunda" | "merma";

const CLASSIFICATION_OPTIONS: { value: Classification; label: string; description: string; color: string }[] = [
  { value: "primera", label: "Primera", description: "Calidad exportación", color: "text-success" },
  { value: "segunda", label: "Segunda", description: "Mercado local", color: "text-warning" },
  { value: "merma", label: "Merma", description: "Pérdida/descarte", color: "text-destructive" },
];

export default function Cosecha() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, queueForSync } = useOfflineSubmit("harvests");
  const [currentStep, setCurrentStep] = useState<Step>("operator");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [harvestCheck, setHarvestCheck] = useState<HarvestCheck | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Photo upload hook
  const photo = usePhotoUpload({ bucket: "pest-photos", folder: "harvests" });
  
  // Form fields
  const [harvestDate, setHarvestDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [totalKg, setTotalKg] = useState("");
  const [exportableKg, setExportableKg] = useState("");
  const [rejectedKg, setRejectedKg] = useState("");
  const [classification, setClassification] = useState<Classification>("primera");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchOperators();
    fetchLots();
  }, []);

  const fetchOperators = async () => {
    try {
      const { data } = await supabase
        .from("operators")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (data) setOperators(data);
    } catch (error) {
      console.error("Error fetching operators:", error);
    }
  };

  const fetchLots = async () => {
    try {
      const { data } = await supabase
        .from("lots")
        .select("id, name, hectares, plant_count")
        .order("name");
      if (data) setLots(data);
    } catch (error) {
      console.error("Error fetching lots:", error);
    }
  };

  const checkHarvestAllowed = async (lotId: string) => {
    // In offline mode, skip the check and allow harvest
    if (!isOnline) {
      setHarvestCheck({ 
        allowed: true, 
        message: "Modo offline: verificación de carencias omitida. Se validará al sincronizar." 
      } as HarvestCheck);
      setIsLoading(false);
      setCurrentStep("check");
      return;
    }

    setIsLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    
    try {
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
    } catch (error) {
      // Network error - allow harvest in offline mode
      setHarvestCheck({ 
        allowed: true, 
        message: "Sin conexión: verificación de carencias omitida. Se validará al sincronizar." 
      } as HarvestCheck);
    }
    setIsLoading(false);
    setCurrentStep("check");
  };

  const handleSelectOperator = (operator: Operator) => {
    setSelectedOperator(operator);
    setCurrentStep("lot");
  };

  const handleSelectLot = (lot: Lot) => {
    setSelectedLot(lot);
    checkHarvestAllowed(lot.id);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await photo.uploadPhoto(file);
    }
  };

  const handleSubmitHarvest = async () => {
    if (!selectedLot) return;

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

    const payload = {
      lot_id: selectedLot.id,
      harvest_date: harvestDate,
      total_kg: total,
      exportable_kg: exportable,
      rejected_kg: rejected,
      classification,
      photo_url: photo.photoUrl,
      recorded_by: user?.id || null,
      operator_id: selectedOperator?.id || null,
      notes,
    };

    if (!isOnline) {
      queueForSync(payload);
      toast({
        title: "Cosecha guardada offline",
        description: "Se sincronizará al recuperar conexión",
      });
      setCurrentStep("result");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from("harvests").insert(payload);

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
    setCurrentStep("operator");
    setSelectedOperator(null);
    setSelectedLot(null);
    setHarvestCheck(null);
    setTotalKg("");
    setExportableKg("");
    setRejectedKg("");
    setClassification("primera");
    setNotes("");
    setHarvestDate(format(new Date(), "yyyy-MM-dd"));
    photo.clearPhoto();
  };

  const exportablePercent = totalKg && exportableKg 
    ? ((parseFloat(exportableKg) / parseFloat(totalKg)) * 100).toFixed(1)
    : "—";

  const classificationLabel = CLASSIFICATION_OPTIONS.find(c => c.value === classification);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {currentStep !== "operator" && currentStep !== "result" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentStep(currentStep === "form" ? "check" : currentStep === "check" ? "lot" : "operator")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sprout className="w-6 h-6 text-success" />
              Registro de Cosecha
            </h1>
            {selectedOperator && selectedLot && (
              <p className="text-muted-foreground">{selectedOperator.full_name} • {selectedLot.name}</p>
            )}
          </div>
        </div>

        {/* Step: Select Operator */}
        {currentStep === "operator" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">¿Quién realizó la cosecha?</p>
            <div className="grid gap-3">
              {operators.length === 0 ? (
                <EmptyStateCard
                  icon={Users}
                  title="No hay operarios registrados"
                  description="Necesita registrar operarios para asignar cosechas"
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
                      <Star className="w-6 h-6 text-primary" />
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
            <p className="text-muted-foreground">Seleccione el lote cosechado</p>
            
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
              <CardContent className="p-4 space-y-5">
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

                {/* Classification */}
                <div>
                  <Label className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4" />
                    Clasificación de calidad *
                  </Label>
                  <RadioGroup
                    value={classification}
                    onValueChange={(value) => setClassification(value as Classification)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {CLASSIFICATION_OPTIONS.map((option) => (
                      <div key={option.value}>
                        <RadioGroupItem
                          value={option.value}
                          id={option.value}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={option.value}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all",
                            classification === option.value && "border-primary bg-primary/5"
                          )}
                        >
                          <span className={cn("font-semibold", option.color)}>{option.label}</span>
                          <span className="text-xs text-muted-foreground text-center mt-1">{option.description}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
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

                {/* Photo Evidence */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4" />
                    Evidencia fotográfica (opcional)
                  </Label>
                  
                  {photo.previewUrl ? (
                    <div className="relative">
                      <img
                        src={photo.previewUrl}
                        alt="Evidencia"
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={photo.clearPhoto}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      {photo.uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Tomar o subir foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoCapture}
                      />
                    </label>
                  )}
                  
                  {photo.error && (
                    <p className="text-sm text-destructive mt-1">{photo.error}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="notes">Observaciones (opcional)</Label>
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
              disabled={isLoading || !totalKg || photo.uploading}
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
              <Badge 
                variant="outline" 
                className={cn("mt-4", classificationLabel?.color)}
              >
                {classificationLabel?.label} - {classificationLabel?.description}
              </Badge>
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
