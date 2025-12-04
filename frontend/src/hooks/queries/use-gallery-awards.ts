import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { galleryService } from '@services/gallery.service';

export interface GalleryAward {
  id: number;
  gallery_id: string;
  author: number;
  author_username: string;
  author_picture: string | null;
  gallery_title: string;
  award_type: string;
  brush_drip_value: number;
  awarded_at: string;
  is_deleted: boolean;
}

export interface GalleryAwardsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GalleryAward[];
}

/**
 * Hook to fetch gallery awards for a specific gallery
 */
export const useGalleryAwards = (
  galleryId: string,
  options: { enabled?: boolean; pageSize?: number } = {}
) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<GalleryAwardsResponse>({
    queryKey: ['gallery-awards', galleryId],
    queryFn: ({ pageParam = 1 }) => {
      return galleryService.getGalleryAwards(galleryId, pageParam as number, pageSize);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(galleryId),
  });
};

/**
 * Hook to create a gallery award
 */
export const useCreateGalleryAward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { gallery_id: string; award_type: string }) => {
      await galleryService.createGalleryAward(payload);
      return payload.gallery_id;
    },
    onSuccess: (galleryId) => {
      queryClient.invalidateQueries({ queryKey: ['gallery-awards', galleryId] });
    },
  });
};

/**
 * Hook to delete a gallery award
 */
export const useDeleteGalleryAward = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { awardId: number; galleryId: string }) => {
      const { awardId } = input;
      await galleryService.deleteGalleryAward(awardId);
      return input;
    },
    onSuccess: ({ galleryId }) => {
      queryClient.invalidateQueries({ queryKey: ['gallery-awards', galleryId] });
    },
  });
};

