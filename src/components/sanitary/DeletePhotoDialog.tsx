import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DeletePhotoDialogProps {
  photoId: string;
  photoUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoDeleted: () => void;
}

export function DeletePhotoDialog({
  photoId,
  photoUrl,
  open,
  onOpenChange,
  onPhotoDeleted,
}: DeletePhotoDialogProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (photoId === "single") {
      toast({
        title: "No disponible",
        description: "No se puede eliminar fotos antiguas del sistema anterior",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      // Delete from database first
      const { error: dbError } = await supabase
        .from("pest_report_photos")
        .delete()
        .eq("id", photoId);

      if (dbError) {
        throw dbError;
      }

      // Try to delete from storage (extract path from URL)
      try {
        const url = new URL(photoUrl);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/pest-photos\/(.+)/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await supabase.storage.from("pest-photos").remove([filePath]);
        }
      } catch (storageError) {
        // Storage deletion is best-effort, don't fail the whole operation
        console.warn("Could not delete file from storage:", storageError);
      }

      toast({
        title: "Foto eliminada",
        description: "La foto se eliminó correctamente",
      });
      
      onPhotoDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto. Verifica tus permisos.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar esta foto?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. La foto será eliminada permanentemente del reporte sanitario.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
