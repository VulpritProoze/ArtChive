import { useQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';
import { useUserId } from '@context/auth-context';

/**
 * Hook to fetch pending join requests for multiple collectives (bulk)
 * @param collectiveIds - Array of collective IDs to check for pending requests
 * @param enabled - Whether the query should run
 */
export const useBulkPendingJoinRequests = (
  collectiveIds: string[],
  enabled: boolean = true
) => {
  const userId = useUserId();
  return useQuery<Record<string, string>>({
    queryKey: ['bulk-pending-join-requests', userId, collectiveIds],
    queryFn: () => collectiveService.getBulkPendingJoinRequests(collectiveIds),
    enabled: enabled && collectiveIds.length > 0 && Boolean(userId),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

