import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { galleryService, type Gallery } from '@services/gallery.service';
import type { PaginatedGalleryListResponse } from '@types';

/**
 * Hook to fetch a single gallery by ID
 */
export const useGallery = (galleryId: string, options: { enabled?: boolean; usePublic?: boolean } = {}) => {
  const { enabled = true, usePublic = false } = options;

  return useQuery<Gallery>({
    queryKey: ['gallery', galleryId, usePublic ? 'public' : 'private'],
    queryFn: () => usePublic ? galleryService.getPublicGallery(galleryId) : galleryService.getGallery(galleryId),
    enabled: enabled && Boolean(galleryId),
  });
};

/**
 * Hook to fetch paginated gallery list (for browse other galleries) with optional search
 */
export const useGalleryList = (pageSize: number = 5, searchQuery?: string) => {
  return useInfiniteQuery<PaginatedGalleryListResponse>({
    queryKey: ['gallery-list', pageSize, searchQuery],
    queryFn: ({ pageParam = 1 }) => {
      return galleryService.listGalleries(pageParam as number, pageSize, searchQuery);
    },
    getNextPageParam: (lastPage, pages) => {
      // Calculate if there's a next page
      const totalPages = Math.ceil(lastPage.count / pageSize);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache galleries for 5 minutes
    enabled: !searchQuery || searchQuery.length >= 2 || searchQuery.length === 0, // Enable if no search or valid search
  });
};

/**
 * Hook to fetch top galleries (cached, ranked)
 */
export const useTopGalleries = (limit: number = 25) => {
  return useQuery({
    queryKey: ['top-galleries', limit],
    queryFn: () => galleryService.getTopGalleries(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes - cache for 5 minutes
  });
};


