import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@services/user.service';
import type { UserFellow, CreateFriendRequestPayload } from '@types';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';

/**
 * Hook to create a friend request
 */
export const useCreateFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, userId }: { payload: CreateFriendRequestPayload; userId: number }): Promise<UserFellow> => {
      return userService.createFriendRequest(payload);
    },
    onSuccess: async (_, variables) => {
      try {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['friend-request-status'], refetchType: 'active' });
        
        // Wait for friend-request-status to refetch before showing toast
        await queryClient.refetchQueries({ queryKey: ['friend-request-status', variables.userId], exact: true });
        
        toast.success('Friend request sent');
      } catch (error) {
        // Log error but don't prevent mutation from succeeding
        console.error('Error refetching queries after create:', error);
        toast.success('Friend request sent');
      }
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to send friend request', formatErrorForToast(message));
    },
  });
};

/**
 * Hook to accept a friend request
 */
export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }): Promise<UserFellow> => {
      return userService.acceptFriendRequest(requestId);
    },
    onSuccess: async (_, variables) => {
      try {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['friend-request-count'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['fellows'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['pending-friend-request'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['friend-request-status'], refetchType: 'active' });
        
        // Wait for the friend-request-status query to refetch before showing toast
        await queryClient.refetchQueries({ 
          queryKey: ['friend-request-status', variables.userId],
          exact: true 
        });
        
        toast.success('Friend request accepted');
      } catch (error) {
        // Log error but don't prevent mutation from succeeding
        console.error('Error invalidating queries after accept:', error);
        toast.success('Friend request accepted');
      }
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to accept friend request', formatErrorForToast(message));
    },
  });
};

/**
 * Hook to reject a friend request
 */
export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }): Promise<void> => {
      return userService.rejectFriendRequest(requestId);
    },
    onSuccess: async (_, variables) => {
      try {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['pending-friend-request'], refetchType: 'active' });
        queryClient.invalidateQueries({ queryKey: ['friend-request-status'], refetchType: 'active' });
        
        // Wait for the friend-request-status query to refetch before showing toast
        await queryClient.refetchQueries({ 
          queryKey: ['friend-request-status', variables.userId],
          exact: true 
        });
        
        toast.success('Friend request rejected');
      } catch (error) {
        // Log error but don't prevent mutation from succeeding
        console.error('Error invalidating queries after reject:', error);
        toast.success('Friend request rejected');
      }
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to reject friend request', formatErrorForToast(message));
    },
  });
};

/**
 * Hook to cancel a friend request (requester cancels their own sent request)
 */
export const useCancelFriendRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, userId }: { requestId: number; userId: number }): Promise<void> => {
      return userService.cancelFriendRequest(requestId);
    },
    onSuccess: async (_, variables) => {
      try {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['friend-request-status'], refetchType: 'active' });
        
        // Wait for the friend-request-status query to refetch before showing toast
        await queryClient.refetchQueries({ 
          queryKey: ['friend-request-status', variables.userId],
          exact: true 
        });
        
        toast.success('Friend request cancelled');
      } catch (error) {
        // Log error but don't prevent mutation from succeeding
        console.error('Error invalidating queries after cancel:', error);
        toast.success('Friend request cancelled');
      }
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to cancel friend request', formatErrorForToast(message));
    },
  });
};

/**
 * Hook to unfriend a user
 */
export const useUnfriend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationshipId: number): Promise<void> => {
      return userService.unfriend(relationshipId);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['fellows'] });
      queryClient.invalidateQueries({ queryKey: ['search-fellows'] });
      queryClient.invalidateQueries({ queryKey: ['friend-request-status'] });
      toast.success('Unfriended successfully');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to unfriend', formatErrorForToast(message));
    },
  });
};

/**
 * Hook to block a user (placeholder - disabled)
 */
export const useBlockUser = () => {
  return useMutation({
    mutationFn: (relationshipId: number): Promise<void> => {
      return userService.blockUser(relationshipId);
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Block feature is not yet implemented', formatErrorForToast(message));
    },
  });
};

