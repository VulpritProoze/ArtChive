import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';

/**
 * Hook for searching posts within a collective
 */
export const useCollectiveSearchPosts = (
  collectiveId: string | undefined,
  query: string,
  filters?: {
    channel_id?: string;
    post_type?: string;
    page_size?: number;
  },
  options: { enabled?: boolean } = {}
) => {
  return useInfiniteQuery({
    queryKey: ['collective-search-posts', collectiveId, query, filters],
    queryFn: ({ pageParam = 1 }) => {
      if (!collectiveId) throw new Error('Collective ID is required');
      return collectiveService.searchCollectivePosts(collectiveId, query, {
        ...filters,
        page: pageParam as number,
        page_size: filters?.page_size || 10,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.next) {
        const url = new URL(lastPage.next);
        const page = url.searchParams.get('page');
        return page ? parseInt(page, 10) : undefined;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: (options.enabled !== false) && Boolean(collectiveId) && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for searching members within a collective
 */
export const useCollectiveSearchMembers = (
  collectiveId: string | undefined,
  query: string,
  role?: string,
  options: { enabled?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['collective-search-members', collectiveId, query, role],
    queryFn: () => {
      if (!collectiveId) throw new Error('Collective ID is required');
      return collectiveService.searchCollectiveMembers(collectiveId, query, role);
    },
    enabled: (options.enabled !== false) && Boolean(collectiveId) && query.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

