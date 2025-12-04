import { useQuery } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';

/**
 * Hook to fetch pending join requests for multiple collectives (bulk)
 * @param collectiveIds - Array of collective IDs to check for pending requests
 * @param enabled - Whether the query should run
 */
export const useBulkPendingJoinRequests = (
  collectiveIds: string[],
  enabled: boolean = true
) => {
  return useQuery<Record<string, string>>({
    queryKey: ['bulk-pending-join-requests', collectiveIds],
    queryFn: () => collectiveService.getBulkPendingJoinRequests(collectiveIds),
    enabled: enabled && collectiveIds.length > 0,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
};

