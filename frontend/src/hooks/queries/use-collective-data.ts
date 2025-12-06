import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { collectiveService } from '@services/collective.service';
import { useUserId } from '@context/auth-context';
import type { Collective, Member } from '@types';

export type { Collective, Member };

export interface AdminRequest {
  request_id: string;
  requester: number;
  requester_username: string;
  requester_first_name: string;
  requester_middle_name: string;
  requester_last_name: string;
  requester_profile_picture: string | null;
  message: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface JoinRequest {
  request_id: string;
  requester: number;
  requester_username: string;
  requester_first_name: string;
  requester_middle_name: string;
  requester_last_name: string;
  requester_profile_picture: string | null;
  message: string;
  rules_accepted: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

/**
 * Hook to fetch detailed collective data by ID
 * GET /api/collective/<collective_id>/
 * Returns collective with channels, members, and metadata
 * Personalized - includes user-specific data like membership status and permissions
 */
export const useCollectiveData = (collectiveId: string | undefined, options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {};
  const userId = useUserId();
  
  return useQuery<Collective>({
    queryKey: ['collective-data', collectiveId, userId],
    queryFn: () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getCollective(collectiveId) as Promise<Collective>;
    },
    enabled: Boolean(collectiveId) && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
};

/**
 * Hook to fetch collective members list
 * GET /api/collective/<collective_id>/members/
 * Personalized - different users may see different members based on permissions
 */
export const useCollectiveMembers = (collectiveId: string | undefined, options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {};
  const userId = useUserId();
  
  return useQuery<Member[]>({
    queryKey: ['collective-members', collectiveId, userId],
    queryFn: async () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      const response = await collectiveService.getCollectiveMembers(collectiveId);
      return response;
    },
    enabled: Boolean(collectiveId) && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - members can change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch paginated posts for a collective channel
 * GET /api/collective/channel/<channel_id>/posts/?page=<page>&page_size=<pageSize>
 * Personalized - user sees different posts based on membership and permissions
 */
export const useCollectiveChannelPosts = (
  channelId: string | undefined,
  pageSize: number = 5,
  options?: { enabled?: boolean }
) => {
  const { enabled = true } = options || {};
  const userId = useUserId();
  
  return useInfiniteQuery({
    queryKey: ['collective-channel-posts', channelId, userId, pageSize],
    queryFn: ({ pageParam = 1 }) => {
      if (!channelId) {
        throw new Error('Channel ID is required');
      }
      return collectiveService.getChannelPosts(channelId, pageParam as number, pageSize);
    },
    getNextPageParam: (lastPage, pages) => {
      // Calculate if there's a next page
      const totalPages = Math.ceil((lastPage.count || 0) / pageSize);
      const currentPage = pages.length;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: Boolean(channelId) && enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - posts change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch admin requests for a collective
 * GET /api/collective/<collective_id>/admin/requests/?status=pending
 * User-specific - only admins can see admin requests
 */
export const useAdminRequests = (
  collectiveId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { enabled = true } = options || {};
  const userId = useUserId();
  
  return useQuery<AdminRequest[]>({
    queryKey: ['collective-admin-requests', collectiveId, userId],
    queryFn: async () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getAdminRequests(collectiveId, 'pending');
    },
    enabled: Boolean(collectiveId) && enabled && Boolean(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch join requests for a collective
 * GET /api/collective/<collective_id>/join/requests/?status=pending
 * User-specific - only admins can see join requests
 */
export const useJoinRequests = (
  collectiveId: string | undefined,
  options?: { enabled?: boolean }
) => {
  const { enabled = true } = options || {};
  const userId = useUserId();
  
  return useQuery<JoinRequest[]>({
    queryKey: ['collective-join-requests', collectiveId, userId],
    queryFn: async () => {
      if (!collectiveId) {
        throw new Error('Collective ID is required');
      }
      return collectiveService.getJoinRequests(collectiveId, 'pending');
    },
    enabled: Boolean(collectiveId) && enabled && Boolean(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Mutation for processing admin requests (approve/reject)
 */
export const useProcessAdminRequest = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject'; collectiveId?: string }) => {
      return collectiveService.processAdminRequest(requestId, action);
    },
    onSuccess: (_, variables) => {
      // Invalidate admin requests with user ID
      if (variables.collectiveId && userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-admin-requests', variables.collectiveId, userId] });
        // Also invalidate members if approved (adds admin)
        if (variables.action === 'approve') {
          queryClient.invalidateQueries({ queryKey: ['collective-members', variables.collectiveId, userId] });
        }
      } else if (userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-admin-requests'] });
      }
      // Also invalidate request counts (user-specific)
      if (variables.collectiveId && userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-request-counts', variables.collectiveId, userId] });
      }
    },
  });
};

/**
 * Mutation for processing join requests (approve/reject)
 */
export const useProcessJoinRequest = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject'; collectiveId?: string }) => {
      return collectiveService.processJoinRequest(requestId, action);
    },
    onSuccess: (_, variables) => {
      // Invalidate join requests with user ID
      if (variables.collectiveId && userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-join-requests', variables.collectiveId, userId] });
        // Also invalidate members if approved (adds a member)
        if (variables.action === 'approve') {
          queryClient.invalidateQueries({ queryKey: ['collective-members', variables.collectiveId, userId] });
          queryClient.invalidateQueries({ queryKey: ['collective-data', variables.collectiveId, userId] });
        }
      } else if (userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-join-requests'] });
        if (variables.action === 'approve') {
          queryClient.invalidateQueries({ queryKey: ['collective-members'] });
        }
      }
      // Invalidate request counts (user-specific)
      if (variables.collectiveId && userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-request-counts', variables.collectiveId, userId] });
      }
    },
  });
};

/**
 * Mutation for kicking a member from a collective
 */
export const useKickMember = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: async ({ collectiveId, memberId }: { collectiveId: string; memberId: number }) => {
      return collectiveService.kickMember(collectiveId, memberId);
    },
    onSuccess: (_, variables) => {
      // Invalidate members for the specific collective with user ID
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-members', variables.collectiveId, userId] });
        // Also invalidate collective data (member count changes)
        queryClient.invalidateQueries({ queryKey: ['collective-data', variables.collectiveId, userId] });
      }
    },
  });
};

/**
 * Mutation for promoting a member to admin
 */
export const usePromoteMember = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: async ({ collectiveId, memberId }: { collectiveId: string; memberId: number }) => {
      return collectiveService.changeMemberRole(collectiveId, memberId);
    },
    onSuccess: (_, variables) => {
      // Invalidate members for the specific collective with user ID
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-members', variables.collectiveId, userId] });
      }
    },
  });
};

/**
 * Mutation for demoting an admin to member
 */
export const useDemoteMember = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return useMutation({
    mutationFn: async ({ collectiveId, memberId }: { collectiveId: string; memberId: number }) => {
      return collectiveService.demoteMember(collectiveId, memberId);
    },
    onSuccess: (_, variables) => {
      // Invalidate members for the specific collective with user ID
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['collective-members', variables.collectiveId, userId] });
      }
    },
  });
};

/**
 * Hook to fetch collectives for a specific user by user ID
 * GET /api/collective/user/<user_id>/collectives/
 */
export const useUserCollectives = (
  userId: number | undefined,
  options?: { enabled?: boolean }
) => {
  const { enabled = true } = options || {};
  
  return useQuery<{
    collective_id: string;
    title: string;
    picture: string;
    description: string;
    member_count: number;
    collective_role: string;
    created_at: string;
  }[]>({
    queryKey: ['user-collectives', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      return collectiveService.getUserCollectives(userId);
    },
    enabled: Boolean(userId) && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook for invalidating collective data cache
 */
export const useInvalidateCollectiveData = () => {
  const queryClient = useQueryClient();
  const userId = useUserId();
  
  return (collectiveId?: string) => {
    if (collectiveId && userId) {
      // Invalidate specific collective with user ID
      queryClient.invalidateQueries({ queryKey: ['collective-data', collectiveId, userId] });
      queryClient.invalidateQueries({ queryKey: ['collective-members', collectiveId, userId] });
      queryClient.invalidateQueries({ queryKey: ['collective-admin-requests', collectiveId, userId] });
      queryClient.invalidateQueries({ queryKey: ['collective-join-requests', collectiveId, userId] });
    } else if (userId) {
      // Invalidate all collective queries for current user
      queryClient.invalidateQueries({ queryKey: ['collective-data'] });
      queryClient.invalidateQueries({ queryKey: ['collective-members'] });
      queryClient.invalidateQueries({ queryKey: ['collective-admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['collective-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['collectives', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-collectives'] });
    }
  };
};

