import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { post } from '@lib/api';
import type { Comment } from '@types';

interface CommentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  total_comments?: number;
  results: Comment[];
}

interface UseCommentsOptions {
  enabled?: boolean;
  pageSize?: number;
}

const normalizeComments = (items: Comment[]) =>
  items.map((comment) => ({
    ...comment,
    is_replying: comment.is_replying ?? false,
    replies:
      comment.replies?.map((reply) => ({
        ...reply,
        is_replying: reply.is_replying ?? false,
      })) ?? [],
  }));

export const useComments = (postId: string, options: UseCommentsOptions = {}) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<CommentsResponse>({
    queryKey: ['comments', postId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/comment/${postId}/`, {
        params: { page: pageParam, page_size: pageSize },
      });

      return {
        ...response.data,
        results: normalizeComments(response.data.results || []),
      };
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
  });
};

export const useReplies = (commentId: string, enabled = false) => {
  return useInfiniteQuery({
    queryKey: ['replies', commentId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await post.get(`/comment/${commentId}/replies/`, {
        params: { page: pageParam, page_size: 10 },
      });
      return {
        ...response.data,
        results: normalizeComments(response.data.results || []),
        comment_id: commentId, // Include parent comment ID in response
      };
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(commentId),
    staleTime: Infinity,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text: string; post_id: string }) => {
      await post.post('/comment/create/', data);
      return data.post_id;
    },
    onSuccess: (postId) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; text: string; postId: string }) => {
      const { commentId, text } = input;
      await post.put(`/comment/update/${commentId}/`, { text });
      return input;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { commentId: string; postId: string }) => {
      const { commentId } = input;
      await post.delete(`/comment/delete/${commentId}/`, { data: { confirm: true } });
      return input;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
};

export const useCreateReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { text: string; replies_to: string; post_id: string }) => {
      await post.post('/comment/reply/create/', data);
      return { commentId: data.replies_to, postId: data.post_id };
    },
    onSuccess: ({ postId, commentId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies', commentId] });
    },
  });
};

export const useUpdateReply = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { replyId: string; text: string; postId: string }) => {
      const { replyId, text } = input;
      await post.put(`/comment/reply/update/${replyId}/`, { text });
      return input;
    },
    onSuccess: ({ postId, replyId }) => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['replies', replyId] });
    },
  });
};


