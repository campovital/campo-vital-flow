import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface EditPhotoCaptionDialogProps {
  photoId: string;
  currentCaption: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptionUpdated: (newCaption: string) => void;
}

export function EditPhotoCaptionDialog({
  photoId,
  currentCaption,
  open,
  onOpenChange,
  onCaptionUpdated,
}: EditPhotoCaptionDialogProps) {
  const { toast } = useToast();
  const [caption, setCaption] = useState(currentCaption || "");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    // Skip if photo is the legacy single photo (id = "single")
    if (photoId === "single") {
      toast({
        title: "No disponible",
        description: "No se puede editar la nota de fotos antiguas",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    
    const trimmedCaption = caption.trim();
    
    const { error } = await supabase
      .from("pest_report_photos")
      .update({ caption: trimmedCaption || null })
      .eq("id", photoId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la nota",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Nota actualizada",
        description: "La nota de la foto se guardó correctamente",
      });
      onCaptionUpdated(trimmedCaption);
      onOpenChange(false);
    }
    
    setIsUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar nota de la foto</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caption">Nota / Observación</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 150))}
              placeholder="Describe lo que se observa en la foto..."
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/150 caracteres
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
