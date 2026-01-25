import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PestReportsMap } from "@/components/sanitary/PestReportsMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Bug, Filter } from "lucide-react";

interface Lot {
  id: string;
  name: string;
}

export default function MapaPlagas() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);

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

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-warning" />
            Mapa de Plagas
          </h1>
          <p className="text-muted-foreground">
            Visualización geográfica de reportes sanitarios
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lot-filter" className="text-sm">
                  Lote
                </Label>
                <Select
                  value={selectedLot}
                  onValueChange={setSelectedLot}
                >
                  <SelectTrigger id="lot-filter" className="mt-1">
                    <SelectValue placeholder="Todos los lotes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los lotes</SelectItem>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-3 pt-6">
                <Label htmlFor="show-resolved" className="text-sm cursor-pointer">
                  Mostrar resueltos
                </Label>
                <Switch
                  id="show-resolved"
                  checked={showResolved}
                  onCheckedChange={setShowResolved}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map */}
        <PestReportsMap
          lotId={selectedLot === "all" ? undefined : selectedLot}
          showResolved={showResolved}
        />

        {/* Legend */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="font-medium flex items-center gap-1">
                <Bug className="w-4 h-4" />
                Severidad:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span>Muy baja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-lime-500" />
                <span>Baja</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Moderada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Alta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>Muy alta</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
