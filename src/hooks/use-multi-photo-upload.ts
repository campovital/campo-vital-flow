import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compression";

interface PhotoItem {
  id: string;
  previewUrl: string;
  photoUrl: string | null;
  uploading: boolean;
  error: string | null;
}

interface UseMultiPhotoUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  maxPhotos?: number;
}

export function useMultiPhotoUpload(options: UseMultiPhotoUploadOptions) {
  const { bucket, folder = "", maxSizeMB = 5, maxPhotos = 5 } = options;

  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const uploadPhoto = useCallback(
    async (file: File) => {
      if (photos.length >= maxPhotos) {
        return null;
      }

      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return null;
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowedTypes.includes(file.type)) {
        return null;
      }

      // Generate unique ID for this photo
      const photoId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      // Add to state immediately with uploading status
      setPhotos((prev) => [
        ...prev,
        {
          id: photoId,
          previewUrl,
          photoUrl: null,
          uploading: true,
          error: null,
        },
      ]);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Usuario no autenticado");
        }

        // Compress image before upload
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeMB: 1,
        });

        // Generate unique file name (always .jpg after compression)
        const timestamp = Date.now();
        const fileName = `${user.id}/${folder}${folder ? "/" : ""}${timestamp}-${photoId.slice(0, 8)}.jpg`;

        // Upload compressed file to storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        // Update state with successful upload
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, photoUrl: urlData.publicUrl, uploading: false }
              : p
          )
        );

        return urlData.publicUrl;
      } catch (error: any) {
        // Update state with error
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, uploading: false, error: error.message || "Error al subir" }
              : p
          )
        );
        return null;
      }
    },
    [bucket, folder, maxSizeMB, maxPhotos, photos.length]
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo?.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clearAllPhotos = useCallback(() => {
    photos.forEach((photo) => {
      if (photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });
    setPhotos([]);
  }, [photos]);

  const getUploadedUrls = useCallback(() => {
    return photos
      .filter((p) => p.photoUrl !== null && !p.uploading && !p.error)
      .map((p) => p.photoUrl as string);
  }, [photos]);

  const isUploading = photos.some((p) => p.uploading);

  return {
    photos,
    uploadPhoto,
    removePhoto,
    clearAllPhotos,
    getUploadedUrls,
    isUploading,
  };
}
