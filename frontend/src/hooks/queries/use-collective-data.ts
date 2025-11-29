import { useQuery, useQueryClient } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';
import type { Collective } from '@services/collective.service';

export type { Collective };

export const useCollectiveData = (collectiveId: string | undefined) => {
  return useQuery<Collective>({
    queryKey: ['collective-data', collectiveId],
    queryFn: () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getCollective(collectiveId);
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

