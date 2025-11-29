import { useQuery } from '@tanstack/react-query';
import { userService, type UserSummary } from '@services/user.service';

export type { UserSummary };

export const useUserSummary = (userId: number | undefined, enabled: boolean = true) => {
  return useQuery<UserSummary>({
    queryKey: ['user-summary', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID is required');
      return userService.getUserSummary(userId);
    },
    enabled: enabled && Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

