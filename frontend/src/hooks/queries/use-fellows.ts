import { useQuery } from '@tanstack/react-query';
import { userService } from '@services/user.service';
import type { UserFellow, FriendRequestCount, FellowSearchParams } from '@types';

/**
 * Hook to fetch pending friend request counts
 */
export const useFriendRequestCount = () => {
  return useQuery<FriendRequestCount>({
    queryKey: ['friend-request-count'],
    queryFn: () => userService.getFriendRequestCount(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

/**
 * Hook to fetch all pending friend requests (received + sent)
 */
export const usePendingFriendRequests = () => {
  return useQuery<UserFellow[]>({
    queryKey: ['pending-friend-requests'],
    queryFn: () => userService.getPendingFriendRequests(),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to fetch all accepted fellows (friends)
 */
export const useFellows = () => {
  return useQuery<UserFellow[]>({
    queryKey: ['fellows'],
    queryFn: () => userService.getFellows(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to search within user's fellows
 */
export const useSearchFellows = (params: FellowSearchParams) => {
  const { q, filter_by = 'username' } = params;
  
  return useQuery<UserFellow[]>({
    queryKey: ['search-fellows', q, filter_by],
    queryFn: () => userService.searchFellows(params),
    enabled: Boolean(q && q.trim().length > 0), // Only search if query is provided
    staleTime: 30 * 1000, // 30 seconds
  });
};

