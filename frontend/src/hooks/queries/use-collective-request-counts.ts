import { useQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';

export interface CollectiveRequestCounts {
  join_requests_count: number;
  admin_requests_count: number;
  total_pending_requests: number;
}

/**
 * Hook to fetch counts of pending join requests and admin requests for a collective
 * @param collectiveId - The collective ID
 * @param enabled - Whether the query should run (default: true)
 */
export const useCollectiveRequestCounts = (
  collectiveId: string | undefined,
  enabled: boolean = true
) => {
  return useQuery<CollectiveRequestCounts>({
    queryKey: ['collective-request-counts', collectiveId],
    queryFn: () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getCollectiveRequestCounts(collectiveId);
    },
    enabled: Boolean(collectiveId) && enabled,
    staleTime: 30 * 1000, // 30 seconds - counts can change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute to keep counts updated
  });
};

