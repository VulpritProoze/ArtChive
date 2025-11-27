import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collective } from '@lib/api';
import type { Collective } from '@types';

export const useCollectiveData = (collectiveId: string | undefined) => {
  return useQuery<Collective>({
    queryKey: ['collective-data', collectiveId],
    queryFn: async () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      const response = await collective.get(`${collectiveId}/`);
      return response.data;
    },
    enabled: Boolean(collectiveId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

// Mutation hook for invalidating collective data
export const useInvalidateCollectiveData = () => {
  const queryClient = useQueryClient();
  
  return (collectiveId: string) => {
    queryClient.invalidateQueries({ queryKey: ['collective-data', collectiveId] });
  };
};

