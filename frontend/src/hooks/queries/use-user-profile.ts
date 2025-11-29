import { useQuery } from '@tanstack/react-query';
import { userService } from '@services/user.service';

export const useUserProfile = (username: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', username],
    queryFn: () => {
      if (!username) throw new Error('Username is required');
      return userService.getUserProfileByUsername(username);
    },
    enabled: Boolean(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

