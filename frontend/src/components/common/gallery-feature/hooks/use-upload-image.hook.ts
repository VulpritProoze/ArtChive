import { useState } from 'react';
import { galleryService } from '@services/gallery.service';

interface UseUploadImageReturn {
  upload: (file: File) => Promise<string | null>;
  isUploading: boolean;
  error: string | null;
  progress: number;
}

export function useUploadImage(): UseUploadImageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return null;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return null;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    try {
      const url = await galleryService.uploadImage(file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 100)
        );
        setProgress(percentCompleted);
      });

      setProgress(100);
      return url;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    upload,
    isUploading,
    error,
    progress,
  };
}
