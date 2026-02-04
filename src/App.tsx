import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { OverdueAlertsProvider } from "@/components/sanitary/OverdueAlertsProvider";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import AplicarMezcla from "./pages/AplicarMezcla";
import Cosecha from "./pages/Cosecha";
import ReporteSanitario from "./pages/ReporteSanitario";
import MapaPlagas from "./pages/MapaPlagas";
import SeguimientoSanitario from "./pages/SeguimientoSanitario";
import Historial from "./pages/Historial";
import Roles from "./pages/Roles";
import Tareas from "./pages/Tareas";
import Costos from "./pages/Costos";
import Protocolos from "./pages/Protocolos";
import ProgramadorProtocolos from "./pages/ProgramadorProtocolos";
import Inventario from "./pages/Inventario";
import Dashboard from "./pages/Dashboard";
import Operarios from "./pages/Operarios";
import Configuracion from "./pages/Configuracion";
import Informes from "./pages/Informes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on network errors - allow offline mode to work
        if (!navigator.onLine) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      // Don't throw on network errors
      throwOnError: false,
      // Keep showing cached data while refetching
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      retry: false, // Don't retry mutations - use offline queue instead
    },
  },
});

// Global error fallback for catastrophic failures
function GlobalErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground mb-6">
          La aplicación encontró un error inesperado. Por favor, recarga la página para continuar.
        </p>
        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Recargar aplicación
        </Button>
      </div>
    </div>
  );
}

const App = () => (
  <ErrorBoundary fallback={<GlobalErrorFallback />}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <OverdueAlertsProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/aplicar" element={<AplicarMezcla />} />
                  <Route path="/cosecha" element={<Cosecha />} />
                  <Route path="/plagas" element={<ReporteSanitario />} />
                  <Route path="/mapa-plagas" element={<MapaPlagas />} />
                  <Route path="/seguimiento-sanitario" element={<SeguimientoSanitario />} />
                  <Route path="/historial" element={<Historial />} />
                  <Route path="/roles" element={<Roles />} />
                  <Route path="/tareas" element={<Tareas />} />
                  <Route path="/costos" element={<Costos />} />
                  <Route path="/protocolos" element={<Protocolos />} />
                  <Route path="/protocolos/programador" element={<ProgramadorProtocolos />} />
                  <Route path="/inventario" element={<Inventario />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/operarios" element={<Operarios />} />
                  <Route path="/configuracion" element={<Configuracion />} />
                  <Route path="/informes" element={<Informes />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </OverdueAlertsProvider>
            </BrowserRouter>
          </TooltipProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
