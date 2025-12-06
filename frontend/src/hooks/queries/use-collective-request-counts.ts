import { useQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';
import { useUserId } from '@context/auth-context';

export interface CollectiveRequestCounts {
  join_requests_count: number;
  admin_requests_count: number;
  total_pending_requests: number;
}

/**
 * Hook to fetch counts of pending join requests and admin requests for a collective
 * User-specific - only admins can see request counts
 * @param collectiveId - The collective ID
 * @param enabled - Whether the query should run (default: true)
 */
export const useCollectiveRequestCounts = (
  collectiveId: string | undefined,
  enabled: boolean = true
) => {
  const userId = useUserId();
  return useQuery<CollectiveRequestCounts>({
    queryKey: ['collective-request-counts', collectiveId, userId],
    queryFn: () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getCollectiveRequestCounts(collectiveId);
    },
    enabled: Boolean(collectiveId) && enabled && Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds - counts can change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute to keep counts updated
  });
};

