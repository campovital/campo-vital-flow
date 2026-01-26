import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Trash2, Loader2 } from "lucide-react";

type AppRole = "admin" | "agronoma" | "operario" | "consulta";

interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  agronoma: "bg-primary text-primary-foreground",
  operario: "bg-secondary text-secondary-foreground",
  consulta: "bg-muted text-muted-foreground",
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  agronoma: "Agrónoma",
  operario: "Operario",
  consulta: "Consulta",
};

export function UserRolesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("operario");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-for-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles = [], isLoading: loadingRoles } = useQuery({
    queryKey: ["user-roles-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) throw error;
      return data as UserRole[];
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado correctamente.",
      });
      setDialogOpen(false);
      setSelectedUserId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "El usuario ya tiene este rol asignado."
          : "No se pudo asignar el rol.",
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles-all"] });
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    },
  });

  const filteredProfiles = profiles.filter((profile) =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRoles = (userId: string): UserRole[] => {
    return userRoles.filter((ur) => ur.user_id === userId);
  };

  const getAvailableRoles = (userId: string): AppRole[] => {
    const existingRoles = getUserRoles(userId).map((ur) => ur.role);
    return (["admin", "agronoma", "operario", "consulta"] as AppRole[]).filter(
      (role) => !existingRoles.includes(role)
    );
  };

  const isLoading = loadingProfiles || loadingRoles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Usuarios y sus Roles</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No se encontraron usuarios
          </p>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const roles = getUserRoles(profile.id);
              const availableRoles = getAvailableRoles(profile.id);

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <p className="font-medium">{profile.full_name}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Sin roles asignados
                        </span>
                      ) : (
                        roles.map((userRole) => (
                          <Badge
                            key={userRole.id}
                            className={`${ROLE_COLORS[userRole.role]} flex items-center gap-1`}
                          >
                            {ROLE_LABELS[userRole.role]}
                            <button
                              onClick={() => removeRoleMutation.mutate(userRole.id)}
                              className="ml-1 hover:text-destructive-foreground/80"
                              disabled={removeRoleMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {availableRoles.length > 0 && (
                    <Dialog open={dialogOpen && selectedUserId === profile.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) setSelectedUserId(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(profile.id);
                            setNewRole(availableRoles[0]);
                            setDialogOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Agregar rol
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar rol a {profile.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Select
                            value={newRole}
                            onValueChange={(value) => setNewRole(value as AppRole)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRoles.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full"
                            onClick={() =>
                              addRoleMutation.mutate({
                                userId: profile.id,
                                role: newRole,
                              })
                            }
                            disabled={addRoleMutation.isPending}
                          >
                            {addRoleMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Asignar Rol
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
