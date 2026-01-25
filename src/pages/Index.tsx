import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardList, 
  Sprout, 
  Bug, 
  Calendar,
  ArrowRight,
  Sun,
  CloudRain,
  TrendingUp,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  const { profile, canManage } = useAuth();

  const quickActions = [
    {
      title: "Aplicar Mezcla",
      description: "Confirmar ejecución de protocolo",
      icon: ClipboardList,
      to: "/aplicar",
      color: "bg-primary text-primary-foreground",
    },
    {
      title: "Registrar Cosecha",
      description: "Ingresar producción del día",
      icon: Sprout,
      to: "/cosecha",
      color: "bg-success text-success-foreground",
    },
    {
      title: "Reporte Sanitario",
      description: "Reportar plaga o enfermedad",
      icon: Bug,
      to: "/plagas",
      color: "bg-warning text-warning-foreground",
    },
    {
      title: "Ver Historial",
      description: "Calendario de actividades",
      icon: Calendar,
      to: "/historial",
      color: "bg-secondary text-secondary-foreground",
    },
  ];

  const stats = [
    { label: "Aplicaciones hoy", value: "3", icon: ClipboardList },
    { label: "Kg cosechados", value: "127", icon: Sprout },
    { label: "Alertas activas", value: "2", icon: Bug },
    { label: "Lotes activos", value: "4", icon: TrendingUp },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ¡Hola, {profile?.full_name?.split(" ")[0] || "Usuario"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tu cultivo de Gulupa de manera eficiente
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Sun className="w-5 h-5 text-harvest" />
            <span className="text-sm font-medium">28°C</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.to}>
                <Card className="card-interactive border-0 h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center`}>
                        <action.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Quick Access */}
        {canManage && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Administración</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link to="/protocolos">
                <Card className="card-interactive border-0">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-forest/10 flex items-center justify-center mx-auto mb-2">
                      <ClipboardList className="w-5 h-5 text-forest" />
                    </div>
                    <p className="text-sm font-medium">Protocolos</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/inventario">
                <Card className="card-interactive border-0">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-terracotta/10 flex items-center justify-center mx-auto mb-2">
                      <Package className="w-5 h-5 text-terracotta" />
                    </div>
                    <p className="text-sm font-medium">Inventario</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/dashboard">
                <Card className="card-interactive border-0">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center mx-auto mb-2">
                      <TrendingUp className="w-5 h-5 text-info" />
                    </div>
                    <p className="text-sm font-medium">Dashboard</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/protocolos/programador">
                <Card className="card-interactive border-0">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 rounded-lg bg-harvest/10 flex items-center justify-center mx-auto mb-2">
                      <Calendar className="w-5 h-5 text-harvest" />
                    </div>
                    <p className="text-sm font-medium">Programador</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {/* Weather Alert */}
        <Card className="border-0 shadow-soft bg-info/5 border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <CloudRain className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-info">Pronóstico: Lluvias probables</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se esperan lluvias para esta tarde. Considere ajustar las aplicaciones foliares.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
