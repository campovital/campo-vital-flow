import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";

interface FormData {
  name: string;
  description: string;
  notes: string;
}

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    notes: "",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simular guardado (aquí iría la lógica real con Supabase)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    toast({
      title: "Cambios guardados",
      description: "Los datos se han guardado correctamente.",
    });
    
    setIsSaving(false);
    setEditMode(false);
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", notes: "" });
    setEditMode(false);
    toast({
      title: "Edición cancelada",
      description: "Los cambios no fueron guardados.",
      variant: "destructive",
    });
  };

  const toggleEdit = () => {
    setEditMode(true);
  };

  return (
    <AppLayout>
      <section className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Link>
            </Button>
            {!editMode ? (
              <Button type="button" variant="secondary" onClick={toggleEdit}>
                <Pencil className="w-4 h-4" />
                Modificar
              </Button>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </>
            )}
          </div>
        </header>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>{editMode ? "Modo Edición" : "En construcción"}</CardTitle>
            <CardDescription>
              {editMode 
                ? "Modifica los campos y presiona Guardar para aplicar los cambios."
                : "Esta sección ya tiene ruta. Presiona Modificar para editar."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    placeholder="Ingresa el nombre"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    placeholder="Ingresa una descripción"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas adicionales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Agrega notas o comentarios..."
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Usa el botón <strong>Modificar</strong> para entrar al modo edición y agregar o actualizar información.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}