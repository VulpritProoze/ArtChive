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
    mutationFn: (payload: CreateFriendRequestPayload): Promise<UserFellow> => {
      return userService.createFriendRequest(payload);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['fellows'] });
      toast.success('Friend request sent');
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
    mutationFn: (requestId: number): Promise<UserFellow> => {
      return userService.acceptFriendRequest(requestId);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['fellows'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-request'] });
      toast.success('Friend request accepted');
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
    mutationFn: (requestId: number): Promise<void> => {
      return userService.rejectFriendRequest(requestId);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['friend-request-count'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-request'] });
      toast.success('Friend request rejected');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to reject friend request', formatErrorForToast(message));
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

