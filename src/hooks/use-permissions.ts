import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type AppModule = 
  | "aplicar_mezcla"
  | "reporte_sanitario"
  | "seguimiento_sanitario"
  | "cosecha"
  | "tareas"
  | "costos"
  | "informes"
  | "configuracion"
  | "roles";

export type AppAction = "view" | "create" | "edit" | "delete" | "approve" | "export";

interface RolePermission {
  role: string;
  module: AppModule;
  action: AppAction;
}

export function usePermissions() {
  const { roles } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["role-permissions", roles],
    queryFn: async () => {
      if (roles.length === 0) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, module, action")
        .in("role", roles);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: roles.length > 0,
  });

  const hasPermission = (module: AppModule, action: AppAction): boolean => {
    return permissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const canView = (module: AppModule) => hasPermission(module, "view");
  const canCreate = (module: AppModule) => hasPermission(module, "create");
  const canEdit = (module: AppModule) => hasPermission(module, "edit");
  const canDelete = (module: AppModule) => hasPermission(module, "delete");
  const canApprove = (module: AppModule) => hasPermission(module, "approve");
  const canExport = (module: AppModule) => hasPermission(module, "export");

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canExport,
  };
}
