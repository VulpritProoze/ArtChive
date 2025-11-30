import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '@services/post.service';
import { toast } from '@utils/toast.util';
import { handleApiError, formatErrorForToast } from '@utils';
import { usePostUI } from '@context/post-ui-context';
import type { Comment } from '@types';

// Helper to update comment in infinite query cache
const updateCommentInCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  updater: (comments: Comment[]) => Comment[]
) => {
  queryClient.setQueriesData<{ pages: Array<{ results: Comment[] }> }>(
    { queryKey: ['comments', postId] },
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

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { closeCommentForm } = usePostUI();

  return useMutation({
    mutationFn: (data: { text: string; post_id: string }) => {
      return postService.createComment(data);
    },
    onMutate: async (variables) => {
      // Set loading state for skeleton
      queryClient.setQueryData(['comment-creating', variables.post_id], true);
    },
    onSuccess: async (newComment) => {
      const postId = newComment.post_id;
      
      // Close form FIRST to stop loading state
      closeCommentForm();
      
      toast.success('Comment added', 'Your comment has been posted.');

      // Then invalidate to refetch
      await queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (error) => {
      // Don't close form on error - user might want to retry
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to add comment', formatErrorForToast(message));
    },
    onSettled: (_data, _error, variables) => {
      if (variables) {
        // Clear loading state
        queryClient.setQueryData(['comment-creating', variables.post_id], false);
      }
    }
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { closeCommentForm } = usePostUI();

  return useMutation({
    mutationFn: async (input: { commentId: string; text: string; postId: string }) => {
      const { commentId, text } = input;
      const updatedComment = await postService.updateComment(commentId, text);
      return { ...input, updatedComment };
    },
    onMutate: async ({ commentId }) => {
      // Set loading state for skeleton loader on comment text
      queryClient.setQueryData(['comment-updating', commentId], true);
    },
    onSuccess: async ({ postId, commentId }) => {
      // Close form FIRST (expected behavior)
      closeCommentForm();
      
      // Show toast immediately after form closes
      toast.success('Comment updated', 'Your comment has been updated.');
      
      // Keep loading state active while refetching
      // Refetch fresh data (no fake updates) and wait for completion
      await queryClient.refetchQueries({ queryKey: ['comments', postId] });

      // Clear loading state after refetch completes
      queryClient.setQueryData(['comment-updating', commentId], false);
    },
    onError: (error, { commentId }) => {
      // Clear loading state on error
      queryClient.setQueryData(['comment-updating', commentId], false);
      // Don't close form on error - user might want to retry
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update comment', formatErrorForToast(message));
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; postId: string }) => {
      const { commentId } = input;
      await postService.deleteComment(commentId);
      return input;
    },
    onSuccess: ({ postId, commentId }) => {
      // 1. Update cache (Remove)
      updateCommentInCache(queryClient, postId, (comments) => 
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

export const useCreateReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text: string; replies_to: string; post_id: string }) => {
      const newReply = await postService.createReply(data);
      return { newReply, commentId: data.replies_to, postId: data.post_id };
    },
    onSuccess: async ({ commentId, postId }) => {
      // Show toast immediately after reply is created (before refetch)
      toast.success('Reply added', 'Your reply has been posted.');

      // Set loading state right before starting refetch (skeleton appears when refetch starts)
      queryClient.setQueryData(['reply-creating', commentId], true);

      // Refetch replies in background (don't await - let it happen asynchronously)
      // This allows toast and form closing to happen immediately
      queryClient.refetchQueries({ queryKey: ['replies', commentId] }).then(() => {
        // Clear loading state after refetch completes
        queryClient.setQueryData(['reply-creating', commentId], false);
      });
      // Also invalidate posts comments to update reply count on the parent comment
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
    onError: (error, { replies_to }) => {
      // Clear loading state on error (in case it was set)
      queryClient.setQueryData(['reply-creating', replies_to], false);
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to add reply', formatErrorForToast(message));
    },
  });
};

export const useUpdateReply = () => {
  const queryClient = useQueryClient();
  const { closeCommentForm } = usePostUI();

  return useMutation({
    mutationFn: async (input: { replyId: string; text: string; postId: string; parentCommentId: string }) => {
      const { replyId, text } = input;
      const updatedReply = await postService.updateReply(replyId, text);
      return { ...input, updatedReply };
    },
    onMutate: async ({ replyId }) => {
      // Set loading state for skeleton loader on reply text
      queryClient.setQueryData(['reply-updating', replyId], true);
    },
    onSuccess: async ({ replyId, parentCommentId }) => {
      // Close form FIRST (expected behavior)
      closeCommentForm();
      
      // Show toast immediately after form closes
      toast.success('Reply updated', 'Your reply has been updated.');
      
      // Keep loading state active while refetching
      // Refetch fresh data (no fake updates) and wait for completion
      await queryClient.refetchQueries({ queryKey: ['replies', parentCommentId] });

      // Clear loading state after refetch completes
      queryClient.setQueryData(['reply-updating', replyId], false);
    },
    onError: (error, { replyId }) => {
      // Clear loading state on error
      queryClient.setQueryData(['reply-updating', replyId], false);
      // Don't close form on error - user might want to retry
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to update reply', formatErrorForToast(message));
    },
  });
};
