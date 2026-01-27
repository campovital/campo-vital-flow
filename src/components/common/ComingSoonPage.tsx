import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);

  const toggleEdit = () => {
    setEditMode((v) => !v);
    toast({
      title: !editMode ? "Modo edición" : "Modo vista",
      description: !editMode
        ? "Aquí quedará el botón para modificar cuando implementemos la gestión completa."
        : "Volviste al modo vista.",
    });
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
            <Button type="button" variant="secondary" onClick={toggleEdit}>
              <Pencil className="w-4 h-4" />
              {editMode ? "Salir de edición" : "Modificar"}
            </Button>
          </div>
        </header>

        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>En construcción</CardTitle>
            <CardDescription>
              Esta sección ya tiene ruta para que no aparezca el error 404. Seguimos con la implementación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <div className="text-sm text-muted-foreground">
                Modo edición activado (placeholder). Aquí aparecerán los formularios y acciones de actualización.
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Modo vista. Usa el botón <strong>Modificar</strong> para entrar al modo edición.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
