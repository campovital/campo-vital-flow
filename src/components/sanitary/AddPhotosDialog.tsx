import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2 } from "lucide-react";
import { MultiPhotoCapture } from "./MultiPhotoCapture";
import { useMultiPhotoUpload } from "@/hooks/use-multi-photo-upload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddPhotosDialogProps {
  reportId: string;
  pestType: string;
  currentPhotoCount: number;
  onPhotosAdded: () => void;
}

const MAX_PHOTOS_PER_REPORT = 10;

export function AddPhotosDialog({
  reportId,
  pestType,
  currentPhotoCount,
  onPhotosAdded,
}: AddPhotosDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { photos, uploadPhoto, removePhoto, clearAllPhotos, getUploadedUrls, isUploading } =
    useMultiPhotoUpload({ bucket: "pest-photos", folder: "reports" });

  const remainingSlots = MAX_PHOTOS_PER_REPORT - currentPhotoCount;

  const handleSave = async () => {
    const uploadedUrls = getUploadedUrls();
    if (uploadedUrls.length === 0) {
      toast.error("No hay fotos para agregar");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const photoRecords = uploadedUrls.map((url) => ({
        pest_report_id: reportId,
        photo_url: url,
        uploaded_by: userData.user?.id || null,
      }));

      const { error } = await supabase
        .from("pest_report_photos")
        .insert(photoRecords);

      if (error) throw error;

      toast.success(`${uploadedUrls.length} foto(s) agregada(s) al reporte`);
      clearAllPhotos();
      setOpen(false);
      onPhotosAdded();
    } catch (error) {
      console.error("Error adding photos:", error);
      toast.error("Error al agregar las fotos");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      clearAllPhotos();
    }
    setOpen(newOpen);
  };

  const uploadedCount = getUploadedUrls().length;
  const canSave = uploadedCount > 0 && !isUploading && !isSaving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={remainingSlots <= 0}
        >
          <ImagePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar fotos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar fotos a "{pestType}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Documenta la evolución del tratamiento agregando fotos adicionales.
            Puedes agregar hasta {remainingSlots} foto(s) más.
          </p>

          <MultiPhotoCapture
            photos={photos}
            maxPhotos={remainingSlots}
            onCapture={uploadPhoto}
            onRemove={removePhoto}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                `Agregar ${uploadedCount} foto(s)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
