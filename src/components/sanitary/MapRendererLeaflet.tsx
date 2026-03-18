import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Bug, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

interface MapRendererLeafletProps {
  reports: PestReport[];
}

const getSeverityLabel = (value: number) => {
  const labels = ["Muy bajo", "Bajo", "Moderado", "Alto", "Muy alto"];
  return labels[value - 1] || "Moderado";
};

const getSeverityColor = (severity: number): string => {
  const colors: Record<number, string> = {
    1: "#22c55e",
    2: "#84cc16",
    3: "#eab308",
    4: "#f97316",
    5: "#ef4444",
  };
  return colors[severity] || colors[3];
};

// Use vanilla Leaflet instead of react-leaflet to avoid React context issues
export default function MapRendererLeaflet({ reports }: MapRendererLeafletProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        // Dynamically import Leaflet
        const L = await import("leaflet");
        
        if (!mounted || !mapContainerRef.current) return;

        // Fix default marker icons
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });

        // Default center (Colombia)
        const defaultCenter: [number, number] = [4.570868, -74.297333];

        // Create map instance
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 6,
          scrollWheelZoom: true,
        });

        mapInstanceRef.current = map;

        // Geolocation with low-signal tolerance
        const locateOptions = {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 60000,
        };

        map.locate(locateOptions);
        map.on("locationfound", (e: any) => {
          if (reports.length === 0) {
            map.setView(e.latlng, 14);
          }
        });

        // Manual locate button
        const LocateControl = L.Control.extend({
          options: { position: "topleft" as const },
          onAdd() {
            const btn = L.DomUtil.create("div", "leaflet-bar leaflet-control");
            btn.innerHTML = `<a href="#" title="Mi ubicación" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;font-size:18px;background:#fff;cursor:pointer;" aria-label="Mi ubicación">📍</a>`;
            btn.onclick = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              map.locate(locateOptions);
            };
            L.DomEvent.disableClickPropagation(btn);
            return btn;
          },
        });
        new LocateControl().addTo(map);

        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        // Add markers for each report
        const markers: any[] = [];

        reports.forEach((report) => {
          const color = getSeverityColor(report.severity);

          const icon = L.divIcon({
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

          const marker = L.marker([report.gps_lat, report.gps_lng], { icon }).addTo(map);
          markers.push(marker);

          // Build popup content
          const popupContent = `
            <div style="min-width: 200px; font-family: system-ui, sans-serif;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                <strong style="display: flex; align-items: center; gap: 4px;">
                  🐛 ${report.pest_type}
                </strong>
                <span style="
                  background: ${color}20;
                  color: ${color};
                  padding: 2px 8px;
                  border-radius: 9999px;
                  font-size: 12px;
                  font-weight: 500;
                ">${getSeverityLabel(report.severity)}</span>
              </div>
              ${report.lot ? `<p style="font-size: 14px; color: #666; margin: 4px 0;">📍 ${report.lot.name}</p>` : ""}
              ${report.incidence_percent ? `<p style="font-size: 14px; margin: 4px 0;">Incidencia: <strong>${report.incidence_percent}%</strong></p>` : ""}
              <p style="font-size: 12px; color: #888; margin: 8px 0 0 0;">
                📅 ${format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
              </p>
              ${report.photo_url ? `<img src="${report.photo_url}" alt="Evidencia" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; margin-top: 8px;" />` : ""}
              ${report.is_resolved ? `<div style="text-align: center; margin-top: 8px; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">✓ Resuelto</div>` : ""}
            </div>
          `;

          marker.bindPopup(popupContent);
        });

        // Fit bounds if there are reports
        if (reports.length > 0) {
          const bounds = L.latLngBounds(
            reports.map((r) => [r.gps_lat, r.gps_lng] as [number, number])
          );
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }

        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize Leaflet map:", error);
        setLoadError(true);
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [reports]);

  if (loadError) {
    return (
      <div className="h-[400px] rounded-xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No se pudo cargar el mapa</p>
          <p className="text-sm">Intenta recargar la página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[400px] rounded-xl overflow-hidden border border-border relative">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      {!isReady && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            <p>Inicializando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}
