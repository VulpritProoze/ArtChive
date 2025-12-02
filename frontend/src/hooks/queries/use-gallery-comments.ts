import { useInfiniteQuery } from '@tanstack/react-query';
import { galleryService } from '@services/gallery.service';
import type { Comment } from '@types';

interface CommentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  total_comments?: number;
  results: Comment[];
}

interface UseGalleryCommentsOptions {
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

export const useGalleryComments = (galleryId: string, options: UseGalleryCommentsOptions = {}) => {
  const { enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<CommentsResponse>({
    queryKey: ['gallery-comments', galleryId],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await galleryService.getGalleryComments(galleryId, pageParam as number, pageSize);
      return {
        ...data,
        results: normalizeComments(data.results || []),
      };
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(galleryId),
  });
};

export const useGalleryCommentReplies = (commentId: string, enabled = false) => {
  return useInfiniteQuery({
    queryKey: ['gallery-comment-replies', commentId],
    queryFn: async ({ pageParam = 1 }) => {
      const data = await galleryService.getGalleryCommentReplies(commentId, pageParam, 10);
      return {
        ...data,
        results: normalizeComments(data.results || []),
        comment_id: commentId, // Include parent comment ID in response
      };
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(commentId),
    staleTime: Infinity,
  });
};

