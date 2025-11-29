import { useQuery } from '@tanstack/react-query';
import { core } from '@lib/api';

export interface UserSummary {
  id: number;
  username: string;
  fullname: string;
  profile_picture: string | null;
  artist_types: string[];
  brushdrips_count: number;
}

export const useUserSummary = (userId: number | undefined, enabled: boolean = true) => {
  return useQuery<UserSummary>({
    queryKey: ['user-summary', userId],
    queryFn: async () => {
      const response = await core.get(`user/${userId}/summary/`);
      return response.data;
    },
    enabled: enabled && Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

