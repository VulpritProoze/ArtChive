import { useInfiniteQuery } from '@tanstack/react-query';
import { post } from '@lib/api';
import type { PostTrophy, PostPraise, PostHeart } from '@types';

interface TrophiesResponse {
  results: PostTrophy[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface PraisesResponse {
  results: PostPraise[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface HeartsResponse {
  results: PostHeart[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const usePostTrophies = (postId: string | undefined, enabled = true) => {
  return useInfiniteQuery<TrophiesResponse>({
    queryKey: ['post-trophies', postId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      const response = await post.get(`/${postId}/trophies/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
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
    queryFn: async ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      const response = await post.get(`/${postId}/praises/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
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
    queryFn: async ({ pageParam = 1 }) => {
      if (!postId) throw new Error('Post ID is required');
      const response = await post.get(`/${postId}/hearts/`, {
        params: { page: pageParam, page_size: 20 },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && Boolean(postId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

