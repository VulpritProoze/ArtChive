import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { avatarService, Avatar, CreateAvatarData, UpdateAvatarData, DuplicateAvatarData } from '@services/avatar.service';
import { toast } from '@utils/toast.util';

// Query Keys
export const avatarKeys = {
  all: ['avatars'] as const,
  lists: () => [...avatarKeys.all, 'list'] as const,
  list: () => [...avatarKeys.lists()] as const,
  details: () => [...avatarKeys.all, 'detail'] as const,
  detail: (id: string) => [...avatarKeys.details(), id] as const,
};

/**
 * Hook to fetch all avatars for the current user
 */
export function useAvatars() {
  return useQuery({
    queryKey: avatarKeys.list(),
    queryFn: () => avatarService.list(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single avatar by ID
 */
export function useAvatar(avatarId: string, enabled = true) {
  return useQuery({
    queryKey: avatarKeys.detail(avatarId),
    queryFn: () => avatarService.get(avatarId),
    enabled: enabled && !!avatarId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a new avatar
 */
export function useCreateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAvatarData) => avatarService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      toast.success('Avatar created', 'Your new avatar has been created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

/**
 * Hook to update an avatar
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ avatarId, data }: { avatarId: string; data: UpdateAvatarData }) =>
      avatarService.update(avatarId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      queryClient.invalidateQueries({ queryKey: avatarKeys.detail(variables.avatarId) });
      toast.success('Avatar updated', 'Your avatar has been updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

/**
 * Hook to delete an avatar
 */
export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avatarId: string) => avatarService.delete(avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      toast.success('Avatar deleted', 'Your avatar has been deleted');
    },
    onError: (error: any) => {
      toast.error('Failed to delete avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

/**
 * Hook to set an avatar as primary
 */
export function useSetPrimaryAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avatarId: string) => avatarService.setPrimary(avatarId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      toast.success('Primary avatar set', 'This avatar is now your primary avatar');
    },
    onError: (error: any) => {
      toast.error('Failed to set primary avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

/**
 * Hook to duplicate an avatar
 */
export function useDuplicateAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ avatarId, data }: { avatarId: string; data?: DuplicateAvatarData }) =>
      avatarService.duplicate(avatarId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      toast.success('Avatar duplicated', 'A copy of your avatar has been created');
    },
    onError: (error: any) => {
      toast.error('Failed to duplicate avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

/**
 * Hook to render an avatar (generate images from canvas)
 */
export function useRenderAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (avatarId: string) => avatarService.render(avatarId),
    onSuccess: (_, avatarId) => {
      queryClient.invalidateQueries({ queryKey: avatarKeys.detail(avatarId) });
      queryClient.invalidateQueries({ queryKey: avatarKeys.list() });
      toast.success('Rendering queued', 'Your avatar is being rendered');
    },
    onError: (error: any) => {
      toast.error('Failed to render avatar', error.response?.data?.message || 'An error occurred');
    },
  });
}

