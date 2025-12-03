import { useQuery } from '@tanstack/react-query';
import { galleryService, type Gallery } from '@services/gallery.service';

/**
 * Hook to fetch a single gallery by ID
 */
export const useGallery = (galleryId: string, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;

  return useQuery<Gallery>({
    queryKey: ['gallery', galleryId],
    queryFn: () => galleryService.getGallery(galleryId),
    enabled: enabled && Boolean(galleryId),
  });
};

