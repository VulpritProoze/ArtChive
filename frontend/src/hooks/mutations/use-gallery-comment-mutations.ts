import { useMutation, useQueryClient } from '@tanstack/react-query';
import { galleryService } from '@services/gallery.service';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import type { Comment } from '@types';

// Helper to update comment in infinite query cache
const updateGalleryCommentInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  galleryId: string,
  updater: (comments: Comment[]) => Comment[]
) => {
  queryClient.setQueriesData<{ pages: Array<{ results: Comment[] }> }>(
    { queryKey: ['gallery-comments', galleryId] },
    (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          results: updater(page.results),
        })),
      };
    }
  );
};

export const useCreateGalleryComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; gallery: string }) => {
      return galleryService.createGalleryComment(data);
    },
    onMutate: async (variables) => {
      // Set loading state for skeleton
      queryClient.setQueryData(['gallery-comment-creating', variables.gallery], true);
    },
    onSuccess: async (newComment) => {
      const galleryId = (newComment as any).gallery || (newComment as any).gallery_id;
      
      toast.success('Comment added', 'Your comment has been posted.');

      // Invalidate to refetch
      await queryClient.invalidateQueries({ queryKey: ['gallery-comments', galleryId] });
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to add comment', formatErrorForToast(message));
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        // Clear loading state
        queryClient.setQueryData(['gallery-comment-creating', variables.gallery], false);
      }
    }
  });
};

export const useUpdateGalleryComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; text: string; galleryId: string }) => {
      const { commentId, text } = input;
      const updatedComment = await galleryService.updateGalleryComment(commentId, text);
      return { ...input, updatedComment };
    },
    onMutate: async ({ commentId }) => {
      // Set loading state for skeleton loader on comment text
      queryClient.setQueryData(['gallery-comment-updating', commentId], true);
    },
    onSuccess: async ({ galleryId, commentId }) => {
      // Show toast immediately
      toast.success('Comment updated', 'Your comment has been updated.');
      
      // Keep loading state active while refetching
      // Refetch fresh data and wait for completion
      await queryClient.refetchQueries({ queryKey: ['gallery-comments', galleryId] });

      // Clear loading state after refetch completes
      queryClient.setQueryData(['gallery-comment-updating', commentId], false);
    },
    onError: (error, { commentId }) => {
      // Clear loading state on error
      queryClient.setQueryData(['gallery-comment-updating', commentId], false);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update comment', formatErrorForToast(message));
    },
  });
};

export const useDeleteGalleryComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; galleryId: string }) => {
      const { commentId } = input;
      await galleryService.deleteGalleryComment(commentId);
      return input;
    },
    onSuccess: ({ galleryId, commentId }) => {
      // Update cache (Remove)
      updateGalleryCommentInCache(queryClient, galleryId, (comments) => 
        comments.filter(c => c.comment_id !== commentId)
      );

      toast.success('Comment deleted', 'Your comment has been deleted.');
    },
    onError: (error) => {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to delete comment', formatErrorForToast(message));
    },
  });
};

export const useCreateGalleryCommentReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text: string; replies_to: string; gallery: string }) => {
      const newReply = await galleryService.createGalleryCommentReply(data);
      return { newReply, commentId: data.replies_to, galleryId: data.gallery };
    },
    onSuccess: async ({ commentId, galleryId }) => {
      // Show toast immediately after reply is created
      toast.success('Reply added', 'Your reply has been posted.');

      // Set loading state right before starting refetch
      queryClient.setQueryData(['gallery-reply-creating', commentId], true);

      // Refetch replies in background
      queryClient.refetchQueries({ queryKey: ['gallery-comment-replies', commentId] }).then(() => {
        // Clear loading state after refetch completes
        queryClient.setQueryData(['gallery-reply-creating', commentId], false);
      });
      // Also invalidate gallery comments to update reply count on the parent comment
      queryClient.invalidateQueries({ queryKey: ['gallery-comments', galleryId] });
    },
    onError: (error, { replies_to }) => {
      // Clear loading state on error
      queryClient.setQueryData(['gallery-reply-creating', replies_to], false);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to add reply', formatErrorForToast(message));
    },
  });
};

export const useUpdateGalleryCommentReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { replyId: string; text: string; galleryId: string; parentCommentId: string }) => {
      const { replyId, text } = input;
      const updatedReply = await galleryService.updateGalleryComment(replyId, text);
      return { ...input, updatedReply };
    },
    onMutate: async ({ replyId }) => {
      // Set loading state for skeleton loader on reply text
      queryClient.setQueryData(['gallery-reply-updating', replyId], true);
    },
    onSuccess: async ({ replyId, parentCommentId }) => {
      // Show toast immediately
      toast.success('Reply updated', 'Your reply has been updated.');
      
      // Keep loading state active while refetching
      // Refetch fresh data and wait for completion
      await queryClient.refetchQueries({ queryKey: ['gallery-comment-replies', parentCommentId] });

      // Clear loading state after refetch completes
      queryClient.setQueryData(['gallery-reply-updating', replyId], false);
    },
    onError: (error, { replyId }) => {
      // Clear loading state on error
      queryClient.setQueryData(['gallery-reply-updating', replyId], false);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update reply', formatErrorForToast(message));
    },
  });
};

