import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Shield, Users, Save, Loader2, Building2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { UserRolesManager } from "@/components/roles/UserRolesManager";
import { UserFarmsManager } from "@/components/roles/UserFarmsManager";

type AppRole = "admin" | "agronoma" | "operario" | "consulta";
type AppModule = "aplicar_mezcla" | "reporte_sanitario" | "seguimiento_sanitario" | "cosecha" | "tareas" | "costos" | "informes" | "configuracion" | "roles";
type AppAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

const ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Administrador", description: "Acceso total al sistema" },
  { value: "agronoma", label: "Agrónoma", description: "Gestión técnica y protocolos" },
  { value: "operario", label: "Operario", description: "Ejecución de tareas en campo" },
  { value: "consulta", label: "Consulta", description: "Solo visualización de datos" },
];

const MODULES: { value: AppModule; label: string }[] = [
  { value: "aplicar_mezcla", label: "Aplicar Mezcla" },
  { value: "reporte_sanitario", label: "Reporte Sanitario" },
  { value: "seguimiento_sanitario", label: "Seguimiento Sanitario" },
  { value: "cosecha", label: "Cosecha" },
  { value: "tareas", label: "Tareas" },
  { value: "costos", label: "Costos" },
  { value: "informes", label: "Informes" },
  { value: "configuracion", label: "Configuración" },
  { value: "roles", label: "Roles y Permisos" },
];

const ACTIONS: { value: AppAction; label: string }[] = [
  { value: "view", label: "Ver" },
  { value: "create", label: "Crear" },
  { value: "edit", label: "Editar" },
  { value: "delete", label: "Eliminar" },
  { value: "approve", label: "Aprobar" },
  { value: "export", label: "Exportar" },
];

interface Permission {
  id: string;
  role: AppRole;
  module: AppModule;
  action: AppAction;
}

export default function Roles() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [pendingChanges, setPendingChanges] = useState<Map<string, boolean>>(new Map());

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["all-role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role")
        .order("module")
        .order("action");

      if (error) throw error;
      return data as Permission[];
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ role, module, action, enabled }: { role: AppRole; module: AppModule; action: AppAction; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role, module, action });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("module", module)
          .eq("action", action);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    },
  });

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const changes = Array.from(pendingChanges.entries());
      for (const [key, enabled] of changes) {
        const [role, module, action] = key.split(":") as [AppRole, AppModule, AppAction];
        await updatePermissionMutation.mutateAsync({ role, module, action, enabled });
      }
    },
    onSuccess: () => {
      setPendingChanges(new Map());
      toast({
        title: "Permisos actualizados",
        description: "Los cambios se han guardado correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const hasPermission = (role: AppRole, module: AppModule, action: AppAction): boolean => {
    const key = `${role}:${module}:${action}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    return permissions.some(
      (p) => p.role === role && p.module === module && p.action === action
    );
  };

  const togglePermission = (role: AppRole, module: AppModule, action: AppAction) => {
    const key = `${role}:${module}:${action}`;
    const currentValue = hasPermission(role, module, action);
    const originalValue = permissions.some(
      (p) => p.role === role && p.module === module && p.action === action
    );

    if (!currentValue === originalValue) {
      // Remove from pending if it matches original
      const newPending = new Map(pendingChanges);
      newPending.delete(key);
      setPendingChanges(newPending);
    } else {
      // Add to pending
      setPendingChanges(new Map(pendingChanges).set(key, !currentValue));
    }
  };

  const rolePermissions = permissions.filter((p) => p.role === selectedRole);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Roles y Permisos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona los permisos de cada rol en el sistema
            </p>
          </div>
          {pendingChanges.size > 0 && (
            <Button
              onClick={() => saveChangesMutation.mutate()}
              disabled={saveChangesMutation.isPending}
            >
              {saveChangesMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar ({pendingChanges.size} cambios)
            </Button>
          )}
        </div>

        <Tabs defaultValue="permissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Permisos por Rol
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Usuarios y Roles
            </TabsTrigger>
            <TabsTrigger value="farms" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Fincas por Usuario
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ROLES.map((role) => (
                <Card
                  key={role.value}
                  className={`cursor-pointer transition-all ${
                    selectedRole === role.value
                      ? "ring-2 ring-primary border-primary"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{role.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Permisos de {ROLES.find((r) => r.value === selectedRole)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">Módulo</th>
                          {ACTIONS.map((action) => (
                            <th key={action.value} className="text-center py-3 px-2 font-medium">
                              {action.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULES.map((module) => (
                          <tr key={module.value} className="border-b last:border-0">
                            <td className="py-3 px-2 font-medium">{module.label}</td>
                            {ACTIONS.map((action) => {
                              const checked = hasPermission(selectedRole, module.value, action.value);
                              const key = `${selectedRole}:${module.value}:${action.value}`;
                              const isPending = pendingChanges.has(key);
                              
                              return (
                                <td key={action.value} className="text-center py-3 px-2">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      togglePermission(selectedRole, module.value, action.value)
                                    }
                                    className={isPending ? "ring-2 ring-warning" : ""}
                                    disabled={selectedRole === "admin" && module.value === "roles"}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <UserRolesManager />
          </TabsContent>

          <TabsContent value="farms">
            <UserFarmsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
