import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { GpsIndicator } from "@/components/sanitary/GpsIndicator";
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
  const [currentStep, setCurrentStep] = useState<Step>("lot");
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // GPS capture
  const gps = useGeolocation({ autoCapture: false });
  
  // Form fields
  const [pestType, setPestType] = useState("");
  const [severity, setSeverity] = useState([3]);
  const [incidence, setIncidence] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchLots();
  }, []);

  const fetchLots = async () => {
    const { data } = await supabase
      .from("lots")
      .select("id, name")
      .order("name");
    if (data) setLots(data);
  };

  const handleSelectLot = (lot: Lot) => {
    setSelectedLot(lot);
    setCurrentStep("form");
    // Trigger GPS capture when entering the form
    gps.capturePosition();
  };

  const handleSubmitReport = async () => {
    if (!selectedLot || !user || !pestType) return;

    setIsLoading(true);

    const { error } = await supabase.from("pest_reports").insert({
      lot_id: selectedLot.id,
      reported_by: user.id,
      pest_type: pestType,
      severity: severity[0],
      incidence_percent: incidence ? parseFloat(incidence) : null,
      gps_lat: gps.latitude,
      gps_lng: gps.longitude,
      notes,
    });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el reporte",
        variant: "destructive",
      });
    } else {
      toast({
        title: "¡Reporte enviado!",
        description: `${pestType} reportado en ${selectedLot.name}`,
      });
      setCurrentStep("result");
    }
    setIsLoading(false);
  };

  const resetFlow = () => {
    setCurrentStep("lot");
    setSelectedLot(null);
    setPestType("");
    setSeverity([3]);
    setIncidence("");
    setNotes("");
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
              {lots.map((lot) => (
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
              ))}
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

                {/* Incidence */}
                <div>
                  <Label htmlFor="incidence" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Incidencia (% de plantas afectadas)
                  </Label>
                  <Input
                    id="incidence"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="Ej: 15"
                    value={incidence}
                    onChange={(e) => setIncidence(e.target.value)}
                    className="mt-1"
                  />
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

                {/* Photo placeholder */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4" />
                    Evidencia fotográfica
                  </Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
                    <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Función próximamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              variant="confirm-warning"
              onClick={handleSubmitReport}
              disabled={isLoading || !pestType}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 mr-2" />
              )}
              Enviar Reporte
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
              <div className="flex items-center justify-center gap-4 mt-4">
                <Badge variant="outline" className="text-base py-1">
                  {pestType}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-base py-1", getSeverityColor(severity[0]))}
                >
                  Severidad {severity[0]}/5
                </Badge>
              </div>
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
