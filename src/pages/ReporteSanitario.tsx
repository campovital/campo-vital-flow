import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useMultiPhotoUpload } from "@/hooks/use-multi-photo-upload";
import { GpsIndicator } from "@/components/sanitary/GpsIndicator";
import { MultiPhotoCapture } from "@/components/sanitary/MultiPhotoCapture";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { useOfflineSubmit } from "@/hooks/use-offline-submit";
import {
  Bug,
  MapPin,
  Camera,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Target,
  Thermometer,
  Calculator,
  Leaf,
  Settings,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Lot {
  id: string;
  name: string;
}

const PEST_TYPES = [
  "Fusarium",
  "Roña",
  "Trips",
  "Mosca del botón floral",
  "Botrytis",
  "Antracnosis",
  "Ácaros",
  "Nematodos",
  "Secadera",
  "Virus",
  "Otra",
];

type Step = "lot" | "form" | "result";

export default function ReporteSanitario() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, queueForSync } = useOfflineSubmit("pest_reports");
  const [currentStep, setCurrentStep] = useState<Step>("lot");
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // GPS capture
  const gps = useGeolocation({ autoCapture: false });
  
  // Multiple photo upload
  const photos = useMultiPhotoUpload({ bucket: "pest-photos", folder: "reports", maxPhotos: 5 });
  
  // Form fields
  const [pestType, setPestType] = useState("");
  const [severity, setSeverity] = useState([3]);
  const [notes, setNotes] = useState("");
  
  // Incidence calculation - new fields
  const [useAutoIncidence, setUseAutoIncidence] = useState(false);
  const [plantsInspected, setPlantsInspected] = useState("");
  const [plantsAffected, setPlantsAffected] = useState("");
  const [manualIncidence, setManualIncidence] = useState("");

  // Calculated incidence
  const calculatedIncidence = useMemo(() => {
    if (!useAutoIncidence) return null;
    const inspected = parseInt(plantsInspected);
    const affected = parseInt(plantsAffected);
    if (inspected > 0 && affected >= 0 && affected <= inspected) {
      return ((affected / inspected) * 100).toFixed(1);
    }
    return null;
  }, [useAutoIncidence, plantsInspected, plantsAffected]);

  // Final incidence value (auto or manual)
  const finalIncidence = useMemo(() => {
    if (useAutoIncidence && calculatedIncidence) {
      return parseFloat(calculatedIncidence);
    }
    if (!useAutoIncidence && manualIncidence) {
      return parseFloat(manualIncidence);
    }
    return null;
  }, [useAutoIncidence, calculatedIncidence, manualIncidence]);

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    try {
      const { data } = await supabase
        .from("lots")
        .select("id, name")
        .order("name");
      if (data) setLots(data);
    } catch (error) {
      console.error("Error fetching lots:", error);
    }
  };

  const handleSelectLot = (lot: Lot) => {
    setSelectedLot(lot);
    setCurrentStep("form");
    // Trigger GPS capture when entering the form
    gps.capturePosition();
  };

  const handleSubmitReport = async () => {
    if (!selectedLot || !pestType) return;

    const uploadedPhotos = photos.getUploadedPhotos();
    const mainPhotoUrl = uploadedPhotos.length > 0 ? uploadedPhotos[0].url : null;

    const payload = {
      lot_id: selectedLot.id,
      reported_by: user?.id || null,
      pest_type: pestType,
      severity: severity[0],
      incidence_percent: finalIncidence,
      plants_inspected: useAutoIncidence && plantsInspected ? parseInt(plantsInspected) : null,
      plants_affected: useAutoIncidence && plantsAffected ? parseInt(plantsAffected) : null,
      gps_lat: gps.latitude,
      gps_lng: gps.longitude,
      photo_url: mainPhotoUrl,
      notes,
    };

    if (!isOnline) {
      queueForSync(payload);
      toast({
        title: "Reporte guardado offline",
        description: "Se sincronizará al recuperar conexión",
      });
      setCurrentStep("result");
      return;
    }

    setIsLoading(true);

    const { data: reportData, error: reportError } = await supabase
      .from("pest_reports")
      .insert(payload)
      .select("id")
      .single();

    if (reportError) {
      toast({
        title: "Error",
        description: "No se pudo registrar el reporte",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Insert all photos into pest_report_photos table with captions
    if (uploadedPhotos.length > 0 && user) {
      const photosToInsert = uploadedPhotos.map((photo) => ({
        pest_report_id: reportData.id,
        photo_url: photo.url,
        caption: photo.caption || null,
        uploaded_by: user.id,
      }));

      await supabase.from("pest_report_photos").insert(photosToInsert);
    }

    toast({
      title: "¡Reporte enviado!",
      description: `${pestType} reportado en ${selectedLot.name} con ${uploadedPhotos.length} foto(s)`,
    });
    setCurrentStep("result");
    setIsLoading(false);
  };

  const resetFlow = () => {
    setCurrentStep("lot");
    setSelectedLot(null);
    setPestType("");
    setSeverity([3]);
    setManualIncidence("");
    setPlantsInspected("");
    setPlantsAffected("");
    setUseAutoIncidence(false);
    setNotes("");
    photos.clearAllPhotos();
  };

  const getSeverityColor = (value: number) => {
    if (value <= 2) return "text-success";
    if (value <= 3) return "text-warning";
    return "text-destructive";
  };

  const getSeverityLabel = (value: number) => {
    const labels = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];
    return labels[value - 1] || "Moderado";
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {currentStep !== "lot" && currentStep !== "result" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setCurrentStep("lot")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bug className="w-6 h-6 text-warning" />
              Reporte Sanitario
            </h1>
            {selectedLot && (
              <p className="text-muted-foreground">{selectedLot.name}</p>
            )}
          </div>
        </div>

        {/* Step: Select Lot */}
        {currentStep === "lot" && (
          <div className="space-y-4">
            <p className="text-muted-foreground">¿Dónde detectó el problema?</p>
            
            <div className="grid gap-3">
              {lots.length === 0 ? (
                <EmptyStateCard
                  icon={MapPin}
                  title="No hay lotes registrados"
                  description="Configure lotes en el módulo de Configuración para poder reportar problemas"
                  primaryAction={{ label: "Ir a Configuración", href: "/configuracion", icon: Settings }}
                />
              ) : (
                lots.map((lot) => (
                  <Card
                    key={lot.id}
                    className="lot-card"
                    onClick={() => handleSelectLot(lot)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{lot.name}</h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step: Report Form */}
        {currentStep === "form" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-6">
                {/* Pest Type */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4" />
                    Tipo de plaga/enfermedad *
                  </Label>
                  <Select value={pestType} onValueChange={setPestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Severity */}
                <div>
                  <Label className="flex items-center gap-2 mb-4">
                    <Thermometer className="w-4 h-4" />
                    Severidad: 
                    <span className={cn("font-bold", getSeverityColor(severity[0]))}>
                      {getSeverityLabel(severity[0])}
                    </span>
                  </Label>
                  <div className="px-2">
                    <Slider
                      value={severity}
                      onValueChange={setSeverity}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                    </div>
                  </div>
                </div>

                {/* Incidence Section - Enhanced */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Incidencia
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {useAutoIncidence ? "Automático" : "Manual"}
                      </span>
                      <Switch
                        checked={useAutoIncidence}
                        onCheckedChange={setUseAutoIncidence}
                      />
                    </div>
                  </div>

                  {useAutoIncidence ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="inspected" className="flex items-center gap-1 text-sm">
                            <Leaf className="w-3 h-3" />
                            Plantas inspeccionadas
                          </Label>
                          <Input
                            id="inspected"
                            type="number"
                            min="1"
                            placeholder="Ej: 100"
                            value={plantsInspected}
                            onChange={(e) => setPlantsInspected(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="affected" className="flex items-center gap-1 text-sm">
                            <Bug className="w-3 h-3" />
                            Plantas afectadas
                          </Label>
                          <Input
                            id="affected"
                            type="number"
                            min="0"
                            max={plantsInspected || undefined}
                            placeholder="Ej: 15"
                            value={plantsAffected}
                            onChange={(e) => setPlantsAffected(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      {calculatedIncidence && (
                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10">
                          <Calculator className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Incidencia calculada:</span>
                          <span className="text-xl font-bold text-primary">{calculatedIncidence}%</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="incidence" className="text-sm">
                        % de plantas afectadas
                      </Label>
                      <Input
                        id="incidence"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="Ej: 15"
                        value={manualIncidence}
                        onChange={(e) => setManualIncidence(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Observaciones</Label>
                  <Textarea
                    id="notes"
                    placeholder="Describa lo observado, ubicación específica, síntomas..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                {/* GPS Location */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    Ubicación GPS
                  </Label>
                  <GpsIndicator
                    latitude={gps.latitude}
                    longitude={gps.longitude}
                    accuracy={gps.accuracy}
                    loading={gps.loading}
                    error={gps.error}
                    onRetry={gps.capturePosition}
                  />
                </div>

                {/* Multiple photo capture */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4" />
                    Evidencia fotográfica (múltiples)
                  </Label>
                  <MultiPhotoCapture
                    photos={photos.photos}
                    maxPhotos={5}
                    onCapture={photos.uploadPhoto}
                    onRemove={photos.removePhoto}
                    onCaptionChange={photos.updateCaption}
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              variant="confirm-warning"
              onClick={handleSubmitReport}
              disabled={isLoading || !pestType || photos.isUploading}
            >
              {isLoading || photos.isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 mr-2" />
              )}
              {photos.isUploading ? "Subiendo fotos..." : "Enviar Reporte"}
            </Button>
          </div>
        )}

        {/* Step: Result */}
        {currentStep === "result" && (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-warning" />
            </div>
            
            <div>
              <h1 className="text-2xl font-bold">¡Reporte Enviado!</h1>
              <p className="text-muted-foreground mt-2">
                {selectedLot?.name}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
                <Badge variant="outline" className="text-base py-1">
                  {pestType}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-base py-1", getSeverityColor(severity[0]))}
                >
                  Severidad {severity[0]}/5
                </Badge>
                {finalIncidence !== null && (
                  <Badge variant="outline" className="text-base py-1">
                    {finalIncidence}% incidencia
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Generar Informe</p>
              <RecordReportExporter
                moduleName="Reporte Sanitario"
                filename={`sanitario_${selectedLot?.name || "registro"}_${format(new Date(), "yyyyMMdd")}`}
                data={{
                  modulo: "Reporte Sanitario",
                  fecha: format(new Date(), "d/MM/yyyy HH:mm"),
                  lote: selectedLot?.name || "",
                  plaga_tipo: pestType,
                  severidad: `${severity[0]}/5`,
                  incidencia: finalIncidence !== null ? `${finalIncidence}%` : "No registrada",
                  plantas_inspeccionadas: plantsInspected || "N/A",
                  plantas_afectadas: plantsAffected || "N/A",
                  metodo_incidencia: useAutoIncidence ? "Cálculo automático" : "Manual",
                  ubicacion_gps: gps.latitude && gps.longitude ? `${gps.latitude}, ${gps.longitude}` : "No capturada",
                  fotos: photos.getUploadedPhotos().length > 0 ? `${photos.getUploadedPhotos().length} foto(s) adjunta(s)` : "Sin fotos",
                  observaciones: notes,
                }}
              />
            </div>

            <Button variant="field" onClick={resetFlow} className="mx-auto">
              Nuevo Reporte
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}