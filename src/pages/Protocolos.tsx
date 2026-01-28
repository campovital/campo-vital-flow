import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveDialog, ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, Loader2, FileText } from "lucide-react";
import { ProtocolVersionsManager } from "@/components/protocols/ProtocolVersionsManager";
import type { Database } from "@/integrations/supabase/types";

type Protocol = Database["public"]["Tables"]["protocols"]["Row"];
type ProtocolCategory = Database["public"]["Enums"]["protocol_category"];

const CATEGORY_LABELS: Record<ProtocolCategory, string> = {
  fenologia: "Fenología",
  epoca: "Época",
  sanitario: "Sanitario",
  nutricion: "Nutrición",
  otro: "Otro",
};

const CATEGORY_COLORS: Record<ProtocolCategory, string> = {
  fenologia: "bg-success/10 text-success",
  epoca: "bg-info/10 text-info",
  sanitario: "bg-warning/10 text-warning",
  nutricion: "bg-primary/10 text-primary",
  otro: "bg-muted text-muted-foreground",
};

export default function Protocolos() {
  const { toast } = useToast();
  const { canManage } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "otro" as ProtocolCategory,
  });
  const [versionsProtocol, setVersionsProtocol] = useState<Protocol | null>(null);

  // Query for protocols using React Query
  const { data: protocols = [], isLoading } = useQuery({
    queryKey: ["protocols"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("protocols")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Protocol[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null; category: ProtocolCategory }) => {
      const { error } = await supabase.from("protocols").insert({
        name: data.name,
        description: data.description,
        category: data.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-versions"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Protocolo creado",
        description: `"${formData.name}" se creó correctamente`,
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el protocolo",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string | null; category: ProtocolCategory }) => {
      const { error } = await supabase
        .from("protocols")
        .update({
          name: data.name,
          description: data.description,
          category: data.category,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-versions"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Protocolo actualizado",
        description: `"${formData.name}" se actualizó correctamente`,
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el protocolo",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("protocols").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
      queryClient.invalidateQueries({ queryKey: ["protocol-versions"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-rules"] });
      toast({
        title: "Protocolo eliminado",
        description: "El protocolo fue eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el protocolo. Puede tener versiones asociadas.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEditingProtocol(null);
    setFormData({ name: "", description: "", category: "otro" });
  };

  const handleOpenDialog = (protocol?: Protocol) => {
    if (protocol) {
      setEditingProtocol(protocol);
      setFormData({
        name: protocol.name,
        description: protocol.description || "",
        category: protocol.category,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      category: formData.category,
    };

    if (editingProtocol) {
      updateMutation.mutate({ id: editingProtocol.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (protocol: Protocol) => {
    if (!confirm(`¿Eliminar el protocolo "${protocol.name}"?`)) return;
    deleteMutation.mutate(protocol.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <section className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-primary" />
              Protocolos
            </h1>
            <p className="text-muted-foreground mt-1">
              Librería de protocolos de aplicación
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver
              </Link>
            </Button>
            {canManage && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Nuevo Protocolo
              </Button>
            )}
          </div>
        </header>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Lista de Protocolos</CardTitle>
            <CardDescription>
              {protocols.length} protocolo(s) registrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : protocols.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay protocolos registrados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-48">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocols.map((protocol) => (
                    <TableRow key={protocol.id}>
                      <TableCell className="font-medium">{protocol.name}</TableCell>
                      <TableCell>
                        <Badge className={CATEGORY_COLORS[protocol.category]}>
                          {CATEGORY_LABELS[protocol.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {protocol.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setVersionsProtocol(protocol)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Versiones
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(protocol)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(protocol)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ResponsiveDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={editingProtocol ? "Editar Protocolo" : "Nuevo Protocolo"}
          description={editingProtocol
            ? "Modifica los datos del protocolo"
            : "Ingresa los datos del nuevo protocolo"}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Protocolo Floración"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value: ProtocolCategory) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del protocolo..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <ResponsiveDialogFooter>
              <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProtocol ? "Guardar Cambios" : "Crear Protocolo"}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </ResponsiveDialogFooter>
          </div>
        </ResponsiveDialog>

        {versionsProtocol && (
          <ProtocolVersionsManager
            protocol={versionsProtocol}
            open={!!versionsProtocol}
            onOpenChange={(open) => !open && setVersionsProtocol(null)}
            canManage={canManage}
          />
        )}
      </section>
    </AppLayout>
  );
}
