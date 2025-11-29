import { useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@lib/api';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import type { Post } from '@types';
import type { PostMetaMap, PostMeta } from '@hooks/queries/use-post-meta';

interface PostMutationContext {
  postId?: string;
}

const invalidatePosts = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['posts'] });
};

// NEW: Invalidate only a single post's meta (not entire bulk query)
// Kept for compatibility, but we prefer direct cache updates now
const invalidatePostMeta = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string
) => {
  queryClient.invalidateQueries({
    queryKey: ['posts-meta'],
    predicate: (query) => {
      const postIds = query.queryKey[1] as string[] | undefined;
      return postIds?.includes(postId) ?? false;
    },
  });
};

// Helper to update a specific post's meta in the bulk cache
const updatePostMetaInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (meta: PostMeta) => PostMeta
) => {
  queryClient.setQueriesData<PostMetaMap>(
    { queryKey: ['posts-meta'] },
    (oldData) => {
      // If we don't have data for this chunk, we can't update it.
      // That's fine, the component will fetch it eventually.
      if (!oldData) return oldData;
      
      // If the post is not in this chunk, return oldData as is.
      if (!oldData[postId]) return oldData;

      return {
        ...oldData,
        [postId]: updater(oldData[postId]),
      };
    }
  );
};

// Optimistically update post in all post list caches without refetching
const updatePostInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (post: Post) => Post
) => {
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
    onMutate: () => {
      // Set loading state for skeleton loader
      queryClient.setQueryData(['post-creating'], true);
    },
    onSuccess: () => {
      // Clear loading state
      queryClient.setQueryData(['post-creating'], false);
      invalidatePosts(queryClient);
      toast.success('Post created', 'Your post has been successfully created!');
    },
    onError: (error) => {
      // Clear loading state on error
      queryClient.setQueryData(['post-creating'], false);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to create post', formatErrorForToast(message));
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
      toast.success('Post updated', 'Your post has been successfully updated!');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update post', formatErrorForToast(message));
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
      toast.success('Post deleted', 'Your post has been successfully deleted!');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to delete post', formatErrorForToast(message));
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
    onSuccess: async ({ postId }) => {
      // 1. "Fake" update (Client-side update)
      updatePostMetaInCache(queryClient, postId, (meta) => ({
        ...meta,
        hearts_count: meta.hearts_count + 1,
        is_hearted: true,
      }));

      // 2. Refetch specific count endpoint to get authoritative data
      try {
        const { data } = await post.get<{ hearts_count: number; is_hearted_by_user: boolean }>(
          `${postId}/hearts/count/`
        );
        
        // 3. Update cache with authoritative data
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          hearts_count: data.hearts_count,
          is_hearted: data.is_hearted_by_user,
        }));
      } catch (error) {
        console.error('Failed to refetch heart count', error);
        // Revert optimistic update on error
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          hearts_count: Math.max(0, meta.hearts_count - 1),
          is_hearted: false,
        }));
      }

      // Note: No need to invalidate posts-meta - we update cache directly above
      // This prevents unnecessary bulk refetches that would happen on every heart/unheart

      // Show toast after refetch/update
      toast.success('Post hearted', 'You have hearted this post!');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to heart post', formatErrorForToast(message));
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
    onSuccess: async ({ postId }) => {
      // 1. "Fake" update
      updatePostMetaInCache(queryClient, postId, (meta) => ({
        ...meta,
        hearts_count: Math.max(0, meta.hearts_count - 1),
        is_hearted: false,
      }));

      // 2. Refetch specific count endpoint to get authoritative data
      try {
        const { data } = await post.get<{ hearts_count: number; is_hearted_by_user: boolean }>(
          `${postId}/hearts/count/`
        );
        
        // 3. Update cache with authoritative data
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          hearts_count: data.hearts_count,
          is_hearted: data.is_hearted_by_user,
        }));
      } catch (error) {
        console.error('Failed to refetch heart count', error);
        // Revert optimistic update on error
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          hearts_count: meta.hearts_count + 1,
          is_hearted: true,
        }));
      }

      // Note: No need to invalidate posts-meta - we update cache directly above
      // This prevents unnecessary bulk refetches that would happen on every heart/unheart

      // Show toast after refetch
      toast.success('Post unhearted', 'You have unhearted this post.');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to unheart post', formatErrorForToast(message));
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
    onSuccess: async ({ postId }) => {
      // 1. "Fake" update
      updatePostMetaInCache(queryClient, postId, (meta) => ({
        ...meta,
        praise_count: meta.praise_count + 1,
        is_praised: true,
      }));

      // 2. Refetch specific count endpoint to get authoritative data
      try {
        const { data } = await post.get<{ praise_count: number; is_praised_by_user: boolean }>(
          `${postId}/praises/count/`
        );
        
        // 3. Update cache with authoritative data
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          praise_count: data.praise_count,
          is_praised: data.is_praised_by_user,
        }));
      } catch (error) {
        console.error('Failed to refetch praise count', error);
        // Revert optimistic update on error
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          praise_count: Math.max(0, meta.praise_count - 1),
          is_praised: false,
        }));
      }

      // Note: No need to invalidate posts-meta - we update cache directly above
      // This prevents unnecessary bulk refetches that would happen on every praise/unpraise

      // Show toast after refetch
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
    onSuccess: async ({ postId, trophyType }) => {
      // 1. "Fake" update
      updatePostMetaInCache(queryClient, postId, (meta) => ({
        ...meta,
        trophy_count: meta.trophy_count + 1,
        user_trophies: [...meta.user_trophies, trophyType],
        trophy_breakdown: {
          ...meta.trophy_breakdown,
          [trophyType]: (meta.trophy_breakdown[trophyType] || 0) + 1,
        },
      }));

      // 2. Refetch specific count endpoint to get authoritative data
      try {
        const { data } = await post.get<{ 
          total_trophy_count: number; 
          user_awarded_trophies: string[];
          trophy_counts: Record<string, number>;
        }>(
          `${postId}/trophies/count/`
        );
        
        // 3. Update cache with authoritative data
        updatePostMetaInCache(queryClient, postId, (meta) => ({
          ...meta,
          trophy_count: data.total_trophy_count,
          user_trophies: data.user_awarded_trophies,
          trophy_breakdown: data.trophy_counts,
        }));
      } catch (error) {
        console.error('Failed to refetch trophy count', error);
        // Note: Trophy updates are less critical, so we don't revert on error
        // The next bulk meta fetch will correct any inconsistencies
      }

      // Note: No need to invalidate posts-meta - we update cache directly above
      // This prevents unnecessary bulk refetches that would happen on every trophy award

      // Show toast after refetch
      toast.success('Trophy awarded', `You have successfully awarded a ${trophyType} trophy!`);
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to award trophy', formatErrorForToast(message));
    },
  });
};
