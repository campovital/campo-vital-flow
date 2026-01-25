import { useRef } from "react";
import { Camera, X, Loader2, Upload, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoItem {
  id: string;
  previewUrl: string;
  photoUrl: string | null;
  uploading: boolean;
  error: string | null;
}

interface MultiPhotoCaptureProps {
  photos: PhotoItem[];
  maxPhotos?: number;
  onCapture: (file: File) => void;
  onRemove: (id: string) => void;
}

export function MultiPhotoCapture({
  photos,
  maxPhotos = 5,
  onCapture,
  onRemove,
}: MultiPhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (photos.length < maxPhotos) {
          onCapture(file);
        }
      });
    }
    e.target.value = "";
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const triggerGallery = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;
  const uploadingCount = photos.filter((p) => p.uploading).length;

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
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-border"
            >
              <img
                src={photo.previewUrl}
                alt="Evidencia"
                className={cn(
                  "w-full h-full object-cover",
                  photo.uploading && "opacity-50"
                )}
              />
              {photo.uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => onRemove(photo.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
              {photo.error && (
                <div className="absolute bottom-0 left-0 right-0 bg-destructive/90 px-1 py-0.5">
                  <span className="text-[10px] text-white">{photo.error}</span>
                </div>
              )}
            </div>
          ))}

          {/* Add more button in grid */}
          {canAddMore && (
            <button
              type="button"
              onClick={triggerGallery}
              className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Agregar</span>
            </button>
          )}
        </div>
      )}

      {/* Upload buttons when no photos */}
      {photos.length === 0 && (
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
      )}

      {/* Status and info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {photos.length}/{maxPhotos} fotos
          {uploadingCount > 0 && ` (${uploadingCount} subiendo...)`}
        </span>
        <span>JPG, PNG o WebP • Máx 5MB c/u</span>
      </div>
    </div>
  );
}
