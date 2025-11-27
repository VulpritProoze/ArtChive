import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@lib/api';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import type { Post } from '@types';

interface PostMutationContext {
  postId?: string;
}

const invalidatePosts = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['posts'] });
};

// Optimistically update post in all post list caches without refetching
const updatePostInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: Post) => Post
) => {
  // Update all post list queries (home feed, collective posts, user posts)
  queryClient.setQueriesData<{ pages: Array<{ results: Post[] }> }>(
    { queryKey: ['posts'] },
    (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          results: page.results.map((p) => (p.post_id === postId ? updater(p) : p)),
        })),
      };
    }
  );
};

const invalidatePostDetail = (
  queryClient: ReturnType<typeof useQueryClient>,
  context?: PostMutationContext,
) => {
  if (context?.postId) {
    queryClient.invalidateQueries({ queryKey: ['comments', context.postId] });
    queryClient.invalidateQueries({ queryKey: ['critiques', context.postId] });
  }
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { formData: FormData }) => {
      await post.post('/create/', input.formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      invalidatePosts(queryClient);
    },
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string; formData: FormData }) => {
      await post.put(`/update/${input.postId}/`, input.formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return { postId: input.postId };
    },
    onSuccess: ({ postId }) => {
      invalidatePosts(queryClient);
      invalidatePostDetail(queryClient, { postId });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string }) => {
      await post.delete(`/delete/${input.postId}/`, { data: { confirm: true } });
      return { postId: input.postId };
    },
    onSuccess: ({ postId }) => {
      invalidatePosts(queryClient);
      invalidatePostDetail(queryClient, { postId });
    },
  });
};

export const useHeartPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string }) => {
      await post.post('heart/react/', { post_id: input.postId });
      return input;
    },
    onSuccess: ({ postId }) => {
      invalidatePosts(queryClient);
      invalidatePostDetail(queryClient, { postId });
    },
  });
};

export const useUnheartPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string }) => {
      await post.delete(`${input.postId}/unheart/`);
      return input;
    },
    onSuccess: ({ postId }) => {
      invalidatePosts(queryClient);
      invalidatePostDetail(queryClient, { postId });
    },
  });
};

export const usePraisePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string }) => {
      await post.post('praise/create/', { post_id: input.postId });
      return input;
    },
    onSuccess: ({ postId }) => {
      // Optimistically update post in cache without refetching
      updatePostInCache(queryClient, postId, (p) => ({
        ...p,
        praise_count: (p.praise_count || 0) + 1,
        is_praised_by_user: true,
      }));
      
      // Only invalidate post detail if it exists (manual fetch, so this won't do anything but safe)
      invalidatePostDetail(queryClient, { postId });
      queryClient.invalidateQueries({ queryKey: ['praise-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-praises', postId] });
      
      toast.success('Post praised', 'You have successfully praised this post!');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to praise post', formatErrorForToast(message));
    },
  });
};

export const useAwardTrophy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { postId: string; trophyType: string }) => {
      await post.post('trophy/create/', {
        post_id: input.postId,
        trophy_type: input.trophyType,
      });
      return input;
    },
    onSuccess: ({ postId, trophyType }) => {
      // Optimistically update post in cache without refetching
      updatePostInCache(queryClient, postId, (p) => {
        const currentCounts = p.trophy_counts_by_type || {};
        const currentUserTrophies = p.user_awarded_trophies || [];
        return {
          ...p,
          trophy_counts_by_type: {
            ...currentCounts,
            [trophyType]: (currentCounts[trophyType] || 0) + 1,
          },
          user_awarded_trophies: currentUserTrophies.includes(trophyType)
            ? currentUserTrophies
            : [...currentUserTrophies, trophyType],
          total_trophy_count: (p.total_trophy_count || 0) + 1,
        };
      });
      
      // Only invalidate post detail if it exists (manual fetch, so this won't do anything but safe)
      invalidatePostDetail(queryClient, { postId });
      queryClient.invalidateQueries({ queryKey: ['trophy-status', postId] });
      queryClient.invalidateQueries({ queryKey: ['post-trophies', postId] });
      
      toast.success('Trophy awarded', `You have successfully awarded a ${trophyType} trophy!`);
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to award trophy', formatErrorForToast(message));
    },
  });
};


