import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AplicarMezcla from "./pages/AplicarMezcla";
import Cosecha from "./pages/Cosecha";
import ReporteSanitario from "./pages/ReporteSanitario";
import MapaPlagas from "./pages/MapaPlagas";
import Historial from "./pages/Historial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/aplicar" element={<AplicarMezcla />} />
            <Route path="/cosecha" element={<Cosecha />} />
            <Route path="/plagas" element={<ReporteSanitario />} />
            <Route path="/mapa-plagas" element={<MapaPlagas />} />
            <Route path="/historial" element={<Historial />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
