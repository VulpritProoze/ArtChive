import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { collectiveService, type CollectiveListItem } from '@services/collective.service';
import { useUserId } from '@context/auth-context';

export interface PaginatedCollectivesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CollectiveListItem[];
}

/**
 * Hook to fetch paginated collectives list
 * Personalized - shows collectives based on user's membership status and preferences
 * @param pageSize - Number of collectives per page (default: 10)
 */
export const useCollectives = (pageSize: number = 10) => {
  const userId = useUserId();
  return useInfiniteQuery<PaginatedCollectivesResponse>({
    queryKey: ['collectives', userId, pageSize],
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

/**
 * Hook to fetch active member counts for multiple collectives
 * User-specific - active members are based on current user's view
 * @param collectiveIds - Array of collective IDs to get active member counts for
 * @param enabled - Whether the query should run (default: true)
 */
export const useBulkActiveMembersCount = (
  collectiveIds: string[],
  enabled: boolean = true
) => {
  const userId = useUserId();
  return useQuery<Record<string, number>>({
    queryKey: ['bulk-active-members-count', userId, collectiveIds],
    queryFn: () => collectiveService.getBulkActiveMembersCount(collectiveIds),
    enabled: enabled && collectiveIds.length > 0 && Boolean(userId),
    staleTime: 60 * 1000, // 1 minute - cache active counts for 1 minute
  });
};

