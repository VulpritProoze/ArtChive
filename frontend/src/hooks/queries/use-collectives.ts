import { useInfiniteQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';
import type { Collective } from '@types';

export interface PaginatedCollectivesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Collective[];
}

/**
 * Hook to fetch paginated collectives list
 * @param pageSize - Number of collectives per page (default: 10)
 */
export const useCollectives = (pageSize: number = 10) => {
  return useInfiniteQuery<PaginatedCollectivesResponse>({
    queryKey: ['collectives', pageSize],
    queryFn: ({ pageParam = 1 }) => {
      return collectiveService.getCollectives(pageParam as number, pageSize);
    },
    getNextPageParam: (lastPage, pages) => {
      // Calculate if there's a next page
      const totalPages = Math.ceil(lastPage.count / pageSize);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache collectives for 5 minutes
  });
};

