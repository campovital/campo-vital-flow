import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { NavLink } from "react-router-dom";
import {
  Leaf,
  Home,
  ClipboardList,
  Sprout,
  Package,
  Bug,
  Target,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  FileText,
  Users,
  MapPin,
  ClipboardCheck,
  Bell,
  Shield,
  ListTodo,
  DollarSign,
  FileBarChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState, forwardRef } from "react";
import { useOverdueAlertsContext } from "@/components/sanitary/OverdueAlertsProvider";
import { OverdueBadge } from "@/components/sanitary/OverdueBadge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar({ className }, ref) {
  const { profile, canManage, isAdmin, signOut } = useAuth();
  const [protocolsOpen, setProtocolsOpen] = useState(true);
  const { overdueCount, notificationsEnabled, requestNotificationPermission } = useOverdueAlertsContext();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
    );

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-sidebar border-r border-sidebar-border",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-harvest flex items-center justify-center">
            <Leaf className="w-5 h-5 text-sidebar-background" />
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground">Campovital</h1>
            <p className="text-xs text-sidebar-foreground/60">Gulupa</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <NavLink to="/" className={navLinkClass} end>
          <Home className="w-5 h-5" />
          Inicio
        </NavLink>

        <NavLink to="/aplicar" className={navLinkClass}>
          <ClipboardList className="w-5 h-5" />
          Aplicar Mezcla
        </NavLink>

        <NavLink to="/cosecha" className={navLinkClass}>
          <Sprout className="w-5 h-5" />
          Cosecha
        </NavLink>

        <NavLink to="/plagas" className={navLinkClass}>
          <Bug className="w-5 h-5" />
          Reporte Sanitario
        </NavLink>

        <NavLink to="/mapa-plagas" className={navLinkClass}>
          <MapPin className="w-5 h-5" />
          Mapa de Plagas
        </NavLink>

        <NavLink to="/seguimiento-sanitario" className={navLinkClass}>
          <div className="relative">
            <ClipboardCheck className="w-5 h-5" />
            <OverdueBadge count={overdueCount} className="-top-2 -right-2" />
          </div>
          Seguimiento Sanitario
        </NavLink>

        <NavLink to="/control-trampas" className={navLinkClass}>
          <Target className="w-5 h-5" />
          Control de Trampas
        </NavLink>

        <NavLink to="/historial" className={navLinkClass}>
          <Calendar className="w-5 h-5" />
          Historial
        </NavLink>

        <NavLink to="/tareas" className={navLinkClass}>
          <ListTodo className="w-5 h-5" />
          Tareas
        </NavLink>

        {canManage && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administración
              </p>
            </div>

            <Collapsible open={protocolsOpen} onOpenChange={setProtocolsOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent/50">
                  <span className="flex items-center gap-3">
                    <FileText className="w-5 h-5" />
                    Protocolos
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      protocolsOpen && "rotate-180"
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1">
                <NavLink to="/protocolos" className={navLinkClass} end>
                  <FileText className="w-4 h-4" />
                  Librería
                </NavLink>
                <NavLink to="/protocolos/programador" className={navLinkClass}>
                  <Calendar className="w-4 h-4" />
                  Programador
                </NavLink>
              </CollapsibleContent>
            </Collapsible>

            <NavLink to="/inventario" className={navLinkClass}>
              <Package className="w-5 h-5" />
              Inventario
            </NavLink>

            <NavLink to="/costos" className={navLinkClass}>
              <DollarSign className="w-5 h-5" />
              Costos
            </NavLink>

            <NavLink to="/operarios" className={navLinkClass}>
              <Users className="w-5 h-5" />
              Operarios
            </NavLink>

            <NavLink to="/dashboard" className={navLinkClass}>
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </NavLink>

            <NavLink to="/informes" className={navLinkClass}>
              <FileBarChart className="w-5 h-5" />
              Informes
            </NavLink>

            <NavLink to="/configuracion" className={navLinkClass}>
              <Settings className="w-5 h-5" />
              Configuración
            </NavLink>

            {isAdmin && (
              <NavLink to="/roles" className={navLinkClass}>
                <Shield className="w-5 h-5" />
                Roles y Permisos
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* User Info */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-semibold text-sidebar-accent-foreground">
              {profile?.full_name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "Usuario"}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">
              {profile?.role || "operario"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  notificationsEnabled 
                    ? "text-success" 
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                )}
                onClick={requestNotificationPermission}
              >
                <Bell className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {notificationsEnabled 
                ? "Notificaciones activadas" 
                : "Activar notificaciones"}
            </TooltipContent>
          </Tooltip>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
});
