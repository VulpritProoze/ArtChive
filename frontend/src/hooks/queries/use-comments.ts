import { useInfiniteQuery } from '@tanstack/react-query';
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
      const response = await post.get(`/posts/${postId}/comments/`, {
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
