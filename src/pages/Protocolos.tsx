import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<Protocol | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "otro" as ProtocolCategory,
  });
  const [versionsProtocol, setVersionsProtocol] = useState<Protocol | null>(null);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("protocols")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los protocolos",
        variant: "destructive",
      });
    } else {
      setProtocols(data || []);
    }
    setIsLoading(false);
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
      setEditingProtocol(null);
      setFormData({ name: "", description: "", category: "otro" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es requerido",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    if (editingProtocol) {
      const { error } = await supabase
        .from("protocols")
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
        })
        .eq("id", editingProtocol.id);

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el protocolo",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Protocolo actualizado",
          description: `"${formData.name}" se actualizó correctamente`,
        });
        setDialogOpen(false);
        fetchProtocols();
      }
    } else {
      const { error } = await supabase.from("protocols").insert({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el protocolo",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Protocolo creado",
          description: `"${formData.name}" se creó correctamente`,
        });
        setDialogOpen(false);
        fetchProtocols();
      }
    }

    setIsSaving(false);
  };

  const handleDelete = async (protocol: Protocol) => {
    if (!confirm(`¿Eliminar el protocolo "${protocol.name}"?`)) return;

    const { error } = await supabase
      .from("protocols")
      .delete()
      .eq("id", protocol.id);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el protocolo. Puede tener versiones asociadas.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Protocolo eliminado",
        description: `"${protocol.name}" fue eliminado`,
      });
      fetchProtocols();
    }
  };

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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProtocol ? "Editar Protocolo" : "Nuevo Protocolo"}
              </DialogTitle>
              <DialogDescription>
                {editingProtocol
                  ? "Modifica los datos del protocolo"
                  : "Ingresa los datos del nuevo protocolo"}
              </DialogDescription>
            </DialogHeader>

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

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProtocol ? "Guardar Cambios" : "Crear Protocolo"}
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
