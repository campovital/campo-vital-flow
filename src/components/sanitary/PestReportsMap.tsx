import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bug, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface PestReport {
  id: string;
  pest_type: string;
  severity: number;
  gps_lat: number;
  gps_lng: number;
  created_at: string;
  incidence_percent: number | null;
  is_resolved: boolean;
  photo_url: string | null;
  lot: {
    name: string;
  } | null;
}

// Custom marker icons based on severity
const createSeverityIcon = (severity: number) => {
  const colors = {
    1: "#22c55e", // green
    2: "#84cc16", // lime
    3: "#eab308", // yellow
    4: "#f97316", // orange
    5: "#ef4444", // red
  };
  const color = colors[severity as keyof typeof colors] || colors[3];

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 14px;
        ">🐛</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to fit bounds when reports change
function FitBounds({ reports }: { reports: PestReport[] }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length > 0) {
      const bounds = L.latLngBounds(
        reports.map((r) => [r.gps_lat, r.gps_lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [reports, map]);

  return null;
}

interface PestReportsMapProps {
  lotId?: string;
  showResolved?: boolean;
}

export function PestReportsMap({ lotId, showResolved = false }: PestReportsMapProps) {
  const [reports, setReports] = useState<PestReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [lotId, showResolved]);

  const fetchReports = async () => {
    setLoading(true);
    
    let query = supabase
      .from("pest_reports")
      .select(`
        id,
        pest_type,
        severity,
        gps_lat,
        gps_lng,
        created_at,
        incidence_percent,
        is_resolved,
        photo_url,
        lot:lots(name)
      `)
      .not("gps_lat", "is", null)
      .not("gps_lng", "is", null);

    if (lotId) {
      query = query.eq("lot_id", lotId);
    }

    if (!showResolved) {
      query = query.eq("is_resolved", false);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as PestReport[]);
    }
    setLoading(false);
  };

  const getSeverityLabel = (value: number) => {
    const labels = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];
    return labels[value - 1] || "Moderado";
  };

  const getSeverityVariant = (value: number): "default" | "secondary" | "destructive" | "outline" => {
    if (value <= 2) return "secondary";
    if (value <= 3) return "default";
    return "destructive";
  };

  // Default center (Colombia)
  const defaultCenter: [number, number] = [4.570868, -74.297333];

  if (loading) {
    return (
      <div className="h-[400px] rounded-xl bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p>Cargando mapa...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="h-[400px] rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Sin reportes geolocalizados</p>
          <p className="text-sm">Los reportes con GPS aparecerán aquí</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds reports={reports} />
        
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.gps_lat, report.gps_lng]}
            icon={createSeverityIcon(report.severity)}
          >
            <Popup>
              <div className="min-w-[200px] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold flex items-center gap-1">
                    <Bug className="w-4 h-4" />
                    {report.pest_type}
                  </span>
                  <Badge variant={getSeverityVariant(report.severity)}>
                    {getSeverityLabel(report.severity)}
                  </Badge>
                </div>
                
                {report.lot && (
                  <p className="text-sm text-muted-foreground">
                    📍 {report.lot.name}
                  </p>
                )}
                
                {report.incidence_percent && (
                  <p className="text-sm">
                    Incidencia: <strong>{report.incidence_percent}%</strong>
                  </p>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </div>
                
                {report.photo_url && (
                  <img
                    src={report.photo_url}
                    alt="Evidencia"
                    className="w-full h-24 object-cover rounded mt-2"
                  />
                )}
                
                {report.is_resolved && (
                  <Badge variant="outline" className="w-full justify-center">
                    ✓ Resuelto
                  </Badge>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
