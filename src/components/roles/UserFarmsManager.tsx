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
import { Search, MapPin, Trash2, Loader2, Building2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
}

interface Farm {
  id: string;
  name: string;
  location: string | null;
}

interface UserFarm {
  id: string;
  user_id: string;
  farm_id: string;
  farm: Farm;
}

export function UserFarmsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles-for-farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: farms = [], isLoading: loadingFarms } = useQuery({
    queryKey: ["all-farms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("farms")
        .select("id, name, location")
        .order("name");

      if (error) throw error;
      return data as Farm[];
    },
  });

  const { data: userFarms = [], isLoading: loadingUserFarms } = useQuery({
    queryKey: ["user-farms-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_farms")
        .select(`
          id,
          user_id,
          farm_id,
          farm:farms(id, name, location)
        `);

      if (error) throw error;
      return data as unknown as UserFarm[];
    },
  });

  const addFarmMutation = useMutation({
    mutationFn: async ({ userId, farmId }: { userId: string; farmId: string }) => {
      const { error } = await supabase
        .from("user_farms")
        .insert({ user_id: userId, farm_id: farmId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-farms-all"] });
      toast({
        title: "Finca asignada",
        description: "La finca ha sido asignada correctamente al usuario.",
      });
      setDialogOpen(false);
      setSelectedUserId(null);
      setSelectedFarmId("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message.includes("duplicate")
          ? "El usuario ya tiene esta finca asignada."
          : "No se pudo asignar la finca.",
        variant: "destructive",
      });
    },
  });

  const removeFarmMutation = useMutation({
    mutationFn: async (userFarmId: string) => {
      const { error } = await supabase
        .from("user_farms")
        .delete()
        .eq("id", userFarmId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-farms-all"] });
      toast({
        title: "Asignación eliminada",
        description: "La asignación de finca ha sido eliminada correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación.",
        variant: "destructive",
      });
    },
  });

  const filteredProfiles = profiles.filter((profile) =>
    profile.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserFarms = (userId: string): UserFarm[] => {
    return userFarms.filter((uf) => uf.user_id === userId);
  };

  const getAvailableFarms = (userId: string): Farm[] => {
    const assignedFarmIds = getUserFarms(userId).map((uf) => uf.farm_id);
    return farms.filter((farm) => !assignedFarmIds.includes(farm.id));
  };

  const isLoading = loadingProfiles || loadingFarms || loadingUserFarms;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Asignación de Fincas por Usuario
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Los usuarios solo podrán ver datos de las fincas que tengan asignadas.
          Los administradores y agrónomos ven todas las fincas.
        </p>
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
        ) : farms.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay fincas registradas en el sistema.
          </p>
        ) : filteredProfiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No se encontraron usuarios
          </p>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => {
              const assignedFarms = getUserFarms(profile.id);
              const availableFarms = getAvailableFarms(profile.id);

              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <p className="font-medium">{profile.full_name}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {assignedFarms.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Sin fincas asignadas
                        </span>
                      ) : (
                        assignedFarms.map((userFarm) => (
                          <Badge
                            key={userFarm.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {userFarm.farm?.name || "Finca desconocida"}
                            <button
                              onClick={() => removeFarmMutation.mutate(userFarm.id)}
                              className="ml-1 hover:text-destructive"
                              disabled={removeFarmMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {availableFarms.length > 0 && (
                    <Dialog 
                      open={dialogOpen && selectedUserId === profile.id} 
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) {
                          setSelectedUserId(null);
                          setSelectedFarmId("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(profile.id);
                            setSelectedFarmId(availableFarms[0]?.id || "");
                            setDialogOpen(true);
                          }}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          Asignar finca
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Asignar finca a {profile.full_name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Select
                            value={selectedFarmId}
                            onValueChange={setSelectedFarmId}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar finca" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFarms.map((farm) => (
                                <SelectItem key={farm.id} value={farm.id}>
                                  {farm.name}
                                  {farm.location && (
                                    <span className="text-muted-foreground ml-1">
                                      ({farm.location})
                                    </span>
                                  )}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full"
                            onClick={() =>
                              addFarmMutation.mutate({
                                userId: profile.id,
                                farmId: selectedFarmId,
                              })
                            }
                            disabled={addFarmMutation.isPending || !selectedFarmId}
                          >
                            {addFarmMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            Asignar Finca
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
