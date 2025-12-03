import { useQuery } from '@tanstack/react-query';
import { userService, type LeaderboardEntry, type LeaderboardResponse, type ReputationHistoryEntry } from '@services/user.service';

/**
 * Hook to fetch user reputation
 */
export const useUserReputation = (userId?: number) => {
  return useQuery({
    queryKey: ['user-reputation', userId],
    queryFn: () => userService.getUserReputation(userId!),
    enabled: !!userId,
  });
};

/**
 * Hook to fetch user reputation history
 */
export const useUserReputationHistory = (
  userId?: number,
  params?: { limit?: number; offset?: number }
) => {
  return useQuery({
    queryKey: ['user-reputation-history', userId, params],
    queryFn: () => userService.getUserReputationHistory(userId!, params),
    enabled: !!userId,
  });
};

/**
 * Hook to fetch reputation leaderboard
 */
export const useReputationLeaderboard = (params?: { limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['reputation-leaderboard', params],
    queryFn: () => userService.getReputationLeaderboard(params),
  });
};

/**
 * Hook to fetch current user's leaderboard position
 */
export const useMyLeaderboardPosition = () => {
  return useQuery({
    queryKey: ['my-leaderboard-position'],
    queryFn: () => userService.getMyLeaderboardPosition(),
  });
};

