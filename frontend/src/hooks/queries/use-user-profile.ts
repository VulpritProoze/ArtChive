import { useQuery } from '@tanstack/react-query';
import { core } from '@lib/api';

export const useUserProfile = (username: string | undefined) => {
  return useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => {
      const response = await core.get(`profile/by-username/${username}/`);
      return response.data;
    },
    enabled: Boolean(username),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

