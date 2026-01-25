import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

        // Generate unique file name
        const timestamp = Date.now();
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${user.id}/${folder}${folder ? "/" : ""}${timestamp}.${ext}`;

        // Upload to storage
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        setState({
          uploading: false,
          error: null,
          photoUrl: urlData.publicUrl,
          previewUrl,
        });

        return urlData.publicUrl;
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
