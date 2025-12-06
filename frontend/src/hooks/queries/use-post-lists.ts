import { useInfiniteQuery } from '@tanstack/react-query';
import { postService, type TrophiesResponse, type PraisesResponse, type HeartsResponse } from '@services/post.service';

export type { TrophiesResponse, PraisesResponse, HeartsResponse };

export const usePostTrophies = (postId: string | undefined, enabled = true) => {
  return useInfiniteQuery<TrophiesResponse>({
    queryKey: ['post-trophies', postId],
    queryFn: ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      return postService.getPostTrophies(postId, pageParam as number, 20);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePostPraises = (postId: string | undefined, enabled = true) => {
  return useInfiniteQuery<PraisesResponse>({
    queryKey: ['post-praises', postId],
    queryFn: ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      return postService.getPostPraises(postId, pageParam as number, 20);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePostHearts = (postId: string | undefined, enabled = true) => {
  return useInfiniteQuery<HeartsResponse>({
    queryKey: ['post-hearts', postId],
    queryFn: ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      return postService.getPostHearts(postId, pageParam as number, 20);
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

