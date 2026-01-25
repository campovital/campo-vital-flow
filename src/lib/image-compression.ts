/**
 * Compress an image file using Canvas API
 * Maintains aspect ratio while reducing file size
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeMB: 1,
};

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for small files (under 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  // Skip non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // HEIC files need special handling - return as-is for now
  if (file.type === "image/heic" || file.name.toLowerCase().endsWith(".heic")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      const maxW = opts.maxWidth!;
      const maxH = opts.maxHeight!;

      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image with white background (for transparency)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob with quality setting
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image"));
            return;
          }

          // If still too large, try lower quality
          if (blob.size > opts.maxSizeMB! * 1024 * 1024 && opts.quality! > 0.5) {
            compressImage(file, { ...opts, quality: opts.quality! - 0.1 })
              .then(resolve)
              .catch(reject);
            return;
          }

          // Create new file with same name
          const compressedFile = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // Log compression stats
          const savings = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
          console.log(
            `📸 Compressed: ${file.name} | ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)} (${savings}% saved)`
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error("Could not load image"));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error("Could not read file"));
    };
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
