import { useQuery } from '@tanstack/react-query';
import { userService } from '@services/user.service';
import type { UserFellow } from '@types';

/**
 * Hook to fetch active (online) fellows for the current user
 * Automatically refetches when presence updates are received via WebSocket
 */
export const useActiveFellows = () => {
  return useQuery<UserFellow[]>({
    queryKey: ['active-fellows'],
    queryFn: () => userService.getActiveFellows(),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

