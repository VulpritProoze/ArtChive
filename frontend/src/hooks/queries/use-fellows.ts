import { useQuery } from '@tanstack/react-query';
import { userService } from '@services/user.service';
import { useUserId } from '@context/auth-context';
import type { UserFellow, FriendRequestCount, FellowSearchParams } from '@types';

/**
 * Hook to fetch pending friend request counts
 * Note: Updates are handled via WebSocket realtime updates, so polling is not needed
 */
export const useFriendRequestCount = () => {
  const userId = useUserId();
  return useQuery<FriendRequestCount>({
    queryKey: ['friend-request-count', userId],
    queryFn: () => userService.getFriendRequestCount(),
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds
    // Removed refetchInterval - updates are handled via WebSocket realtime updates
  });
};

/**
 * Hook to fetch all pending friend requests (received + sent)
 */
export const usePendingFriendRequests = () => {
  const userId = useUserId();
  return useQuery<UserFellow[]>({
    queryKey: ['pending-friend-requests', userId],
    queryFn: () => userService.getPendingFriendRequests(),
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to fetch all accepted fellows (friends)
 */
export const useFellows = () => {
  const userId = useUserId();
  return useQuery<UserFellow[]>({
    queryKey: ['fellows', userId],
    queryFn: () => userService.getFellows(),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to search within user's fellows
 */
export const useSearchFellows = (params: FellowSearchParams) => {
  const userId = useUserId();
  const { q, filter_by = 'username' } = params;
  
  return useQuery<UserFellow[]>({
    queryKey: ['search-fellows', userId, q, filter_by],
    queryFn: () => userService.searchFellows(params),
    enabled: Boolean(userId && q && q.trim().length > 0), // Only search if query is provided
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to check friend request status between current user and another user (lightweight)
 */
export const useCheckFriendRequestStatus = (userId: number | undefined) => {
  return useQuery<{
    has_pending_sent: boolean;
    has_pending_received: boolean;
    is_friends: boolean;
    request_id: number | null;
    relationship_id: number | null;
  }>({
    queryKey: ['friend-request-status', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userService.checkFriendRequestStatus(userId);
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds
  });
};

