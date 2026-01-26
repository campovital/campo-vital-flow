import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compression";

interface PhotoUploadState {
  uploading: boolean;
  error: string | null;
  photoUrl: string | null;
  previewUrl: string | null;
}

interface UsePhotoUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
}

export function usePhotoUpload(options: UsePhotoUploadOptions) {
  const { bucket, folder = "", maxSizeMB = 5 } = options;

  const [state, setState] = useState<PhotoUploadState>({
    uploading: false,
    error: null,
    photoUrl: null,
    previewUrl: null,
  });

  const uploadPhoto = useCallback(
    async (file: File) => {
      // Validate file size
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setState((prev) => ({
          ...prev,
          error: `El archivo excede ${maxSizeMB}MB`,
        }));
        return null;
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
      if (!allowedTypes.includes(file.type)) {
        setState((prev) => ({
          ...prev,
          error: "Formato no soportado. Use JPG, PNG o WebP",
        }));
        return null;
      }

      setState({ uploading: true, error: null, photoUrl: null, previewUrl: null });

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

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
        const fileName = `${user.id}/${folder}${folder ? "/" : ""}${timestamp}.jpg`;

        // Upload compressed file to storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Get signed URL (bucket is now private)
        const { data: urlData, error: signedUrlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year expiry

        if (signedUrlError) throw signedUrlError;

        setState({
          uploading: false,
          error: null,
          photoUrl: urlData.signedUrl,
          previewUrl,
        });

        return urlData.signedUrl;
      } catch (error: any) {
        setState({
          uploading: false,
          error: error.message || "Error al subir la foto",
          photoUrl: null,
          previewUrl: null,
        });
        return null;
      }
    },
    [bucket, folder, maxSizeMB]
  );

  const clearPhoto = useCallback(() => {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({
      uploading: false,
      error: null,
      photoUrl: null,
      previewUrl: null,
    });
  }, [state.previewUrl]);

  return {
    ...state,
    uploadPhoto,
    clearPhoto,
  };
}
