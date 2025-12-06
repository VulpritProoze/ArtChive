import { useQuery } from '@tanstack/react-query';
import { avatarService } from '@services/avatar.service';

/**
 * Hook to get the user's primary avatar
 * Returns the primary avatar or null if none exists
 */
export function usePrimaryAvatar(enabled = true) {
  const { data: avatars, isLoading } = useQuery({
    queryKey: ['avatars', 'primary'],
    queryFn: () => avatarService.list(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (avatars) => avatars?.find(avatar => avatar.is_primary) || null,
  });

  return {
    avatar: avatars,
    isLoading,
  };
}

/**
 * Hook to get a specific user's primary avatar by user ID
 * Note: This would require a backend endpoint that fetches avatars by user ID
 * For now, it returns null as we only have endpoints for current user
 */
export function useUserPrimaryAvatar(_userId: number, _enabled = true) {
  // TODO: Implement when backend supports fetching other users' avatars
  return {
    avatar: null,
    isLoading: false,
  };
}

