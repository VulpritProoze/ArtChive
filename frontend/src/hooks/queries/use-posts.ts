import { useInfiniteQuery } from '@tanstack/react-query';
import { post, collective } from '@lib/api';
import type { PostsResponse } from '@types';

interface UsePostsOptions {
  channelId?: string;
  userId?: number;
  enabled?: boolean;
  pageSize?: number;
}

export const buildPostsKey = (channelId?: string, userId?: number) =>
  ['posts', { channelId, userId }] as const;

export const usePosts = (options: UsePostsOptions = {}) => {
  const { channelId, userId, enabled = true, pageSize = 10 } = options;

  return useInfiniteQuery<PostsResponse>({
    queryKey: buildPostsKey(channelId, userId),
    queryFn: async ({ pageParam = 1 }) => {
      let url = '/';
      let client = post;

      if (channelId) {
        url = `channel/${channelId}/posts/`;
        client = collective;
      } else if (userId) {
        url = `me/${userId}/`;
      }

      const response = await client.get(url, {
        params: { page: pageParam, page_size: pageSize },
      });

      return response.data;
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && (!!channelId || !!userId || channelId === undefined),
  });
};

