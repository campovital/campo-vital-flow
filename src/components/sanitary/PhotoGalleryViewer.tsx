import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Clock, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EditPhotoCaptionDialog } from "./EditPhotoCaptionDialog";
import { DeletePhotoDialog } from "./DeletePhotoDialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface Photo {
  id: string;
  photo_url: string;
  caption?: string | null;
  created_at?: string;
}

interface PhotoGalleryViewerProps {
  photos: Photo[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUpdated?: () => void;
}

export function PhotoGalleryViewer({
  photos,
  initialIndex = 0,
  open,
  onOpenChange,
  onPhotoUpdated,
}: PhotoGalleryViewerProps) {
  const { canManage } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localPhotos, setLocalPhotos] = useState(photos);

  // Sync localPhotos when photos prop changes
  useEffect(() => {
    setLocalPhotos(photos);
    // Adjust currentIndex if it's now out of bounds
    if (currentIndex >= photos.length && photos.length > 0) {
      setCurrentIndex(photos.length - 1);
    }
  }, [photos, currentIndex]);

  const currentPhoto = localPhotos[currentIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : localPhotos.length - 1));
    resetZoom();
  }, [localPhotos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < localPhotos.length - 1 ? prev + 1 : 0));
    resetZoom();
  }, [localPhotos.length]);

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomLevel === 1) {
      setZoomLevel(2);
    } else {
      resetZoom();
    }
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [goToPrevious, goToNext, onOpenChange]
  );

  const handleCaptionUpdated = (newCaption: string) => {
    setLocalPhotos((prev) =>
      prev.map((photo, idx) =>
        idx === currentIndex ? { ...photo, caption: newCaption } : photo
      )
    );
    onPhotoUpdated?.();
  };

  const handlePhotoDeleted = () => {
    // Remove photo from local state
    const newPhotos = localPhotos.filter((_, idx) => idx !== currentIndex);
    setLocalPhotos(newPhotos);
    
    // Adjust index if needed
    if (currentIndex >= newPhotos.length && newPhotos.length > 0) {
      setCurrentIndex(newPhotos.length - 1);
    }
    
    // Close gallery if no photos left
    if (newPhotos.length === 0) {
      onOpenChange(false);
    }
    
    // Notify parent to refresh data
    onPhotoUpdated?.();
  };

  const canModifyPhoto = currentPhoto?.id !== "single";
  const canDeletePhoto = canModifyPhoto && canManage;

  const handleDeleteClick = () => {
    if (!canManage) {
      toast({
        title: "Permisos insuficientes",
        description: "Solo administradores y agrónomos pueden eliminar fotos",
        variant: "destructive",
      });
      return;
    }
    setDeleteDialogOpen(true);
  };

  if (!currentPhoto) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-full w-full h-full max-h-full p-0 border-0 bg-black/95 rounded-none"
          onKeyDown={handleKeyDown}
        >
          <VisuallyHidden>
            <DialogTitle>Galería de fotos</DialogTitle>
          </VisuallyHidden>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-50 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {currentIndex + 1} / {localPhotos.length}
          </div>

          {/* Zoom controls */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 rounded-full px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={zoomOut}
              disabled={zoomLevel <= 1}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-xs min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={zoomIn}
              disabled={zoomLevel >= 4}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation arrows */}
          {localPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={goToNext}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            </>
          )}

          {/* Image container */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          >
            <img
              src={currentPhoto.photo_url}
              alt={`Foto ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-200",
                zoomLevel > 1 && "cursor-grab",
                isDragging && "cursor-grabbing"
              )}
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              }}
              draggable={false}
            />
            {/* Caption and date overlay */}
            {zoomLevel === 1 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-md bg-black/70 text-white px-4 py-2 rounded-lg text-sm text-center space-y-1">
                {currentPhoto.caption ? (
                  <p>{currentPhoto.caption}</p>
                ) : (
                  <p className="text-white/60 italic">Sin nota</p>
                )}
                {currentPhoto.created_at && (
                  <p className="flex items-center justify-center gap-1 text-xs text-white/80">
                    <Clock className="w-3 h-3" />
                    {format(new Date(currentPhoto.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </p>
                )}
                {canModifyPhoto && (
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-white/20 h-7"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Editar nota
                    </Button>
                    {canDeletePhoto ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/20 h-7"
                        onClick={handleDeleteClick}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground/60 cursor-not-allowed h-7"
                        onClick={handleDeleteClick}
                        title="Solo administradores y agrónomos pueden eliminar fotos"
                      >
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {localPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-black/50 p-2 rounded-lg max-w-[90%] overflow-x-auto">
              {localPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    resetZoom();
                  }}
                  className={cn(
                    "w-12 h-12 rounded overflow-hidden flex-shrink-0 border-2 transition-all",
                    index === currentIndex
                      ? "border-primary"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Caption Dialog */}
      <EditPhotoCaptionDialog
        photoId={currentPhoto.id}
        currentCaption={currentPhoto.caption}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onCaptionUpdated={handleCaptionUpdated}
      />

      {/* Delete Photo Dialog */}
      <DeletePhotoDialog
        photoId={currentPhoto.id}
        photoUrl={currentPhoto.photo_url}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onPhotoDeleted={handlePhotoDeleted}
      />
    </>
  );
}
