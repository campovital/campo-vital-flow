import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { OverdueAlertsProvider } from "@/components/sanitary/OverdueAlertsProvider";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OverdueAlertsProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
