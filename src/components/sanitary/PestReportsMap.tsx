import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, AlertTriangle } from "lucide-react";
import { ErrorBoundary, MapFallback } from "@/components/common/ErrorBoundary";

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

interface PestReportsMapProps {
  lotId?: string;
  showResolved?: boolean;
}

// Completely isolated map rendering in a separate component
// This prevents any context issues from breaking the parent component
const MapRenderer = lazy(() => import("./MapRendererLeaflet"));

function LoadingState() {
  return (
    <div className="h-[400px] rounded-xl bg-muted flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        <p>Cargando mapa...</p>
      </div>
    </div>
  );
}

function EmptyState() {
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

export function PestReportsMap({ lotId, showResolved = false }: PestReportsMapProps) {
  const [reports, setReports] = useState<PestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    
    try {
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

      if (error) {
        console.error("Error fetching pest reports:", error);
        setFetchError("No se pudieron cargar los reportes");
      } else if (data) {
        setReports(data as PestReport[]);
      }
    } catch (err) {
      console.error("Unexpected error fetching pest reports:", err);
      setFetchError("Error de conexión");
    }
    
    setLoading(false);
  }, [lotId, showResolved]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return <LoadingState />;
  }

  if (fetchError) {
    return (
      <div className="h-[400px] rounded-xl bg-muted/50 border-2 border-dashed border-destructive/30 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-destructive/50" />
          <p className="font-medium">{fetchError}</p>
          <p className="text-sm">Intenta recargar la página</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return <EmptyState />;
  }

  // Wrap the lazy-loaded map in ErrorBoundary to prevent crashes
  return (
    <ErrorBoundary fallback={<MapFallback />}>
      <Suspense fallback={<LoadingState />}>
        <MapRenderer reports={reports} />
      </Suspense>
    </ErrorBoundary>
  );
}
