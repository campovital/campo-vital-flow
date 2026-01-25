import { useRef } from "react";
import { Camera, X, Loader2, Image as ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  previewUrl: string | null;
  uploading: boolean;
  error: string | null;
  onCapture: (file: File) => void;
  onClear: () => void;
}

export function PhotoCapture({
  previewUrl,
  uploading,
  error,
  onCapture,
  onClear,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  if (uploading) {
    return (
      <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5">
        <Loader2 className="w-10 h-10 mx-auto mb-2 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Subiendo foto...</p>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img
          src={previewUrl}
          alt="Evidencia fotográfica"
          className="w-full h-48 object-cover"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={onClear}
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <span className="text-white text-sm font-medium">Foto capturada</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload area */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={triggerCamera}
        >
          <Camera className="w-6 h-6 text-primary" />
          <span className="text-xs">Tomar foto</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={triggerGallery}
        >
          <Upload className="w-6 h-6 text-primary" />
          <span className="text-xs">Galería</span>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <p className="text-xs text-center text-muted-foreground">
        JPG, PNG o WebP • Máximo 5MB
      </p>
    </div>
  );
}
