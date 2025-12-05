import { useInfiniteQuery } from '@tanstack/react-query';
import { galleryService } from '@services/gallery.service';
import type { PaginatedGalleryListResponse } from '@types';

/**
 * Hook to fetch galleries from fellows (users the current user follows)
 * Supports infinite scrolling with pagination
 */
export const useFellowsGalleries = (pageSize: number = 10) => {
  return useInfiniteQuery<PaginatedGalleryListResponse>({
    queryKey: ['fellows-galleries', pageSize],
    queryFn: ({ pageParam = 1 }) => galleryService.getFellowsGalleries(pageParam as number, pageSize),
    getNextPageParam: (lastPage, pages) => {
      // Calculate if there's a next page
      const totalPages = Math.ceil(lastPage.count / pageSize);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache for 5 minutes
  });
};


