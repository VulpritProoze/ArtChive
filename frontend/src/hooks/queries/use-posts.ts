import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { postService } from '@services/post.service';
import { collectiveService } from '@services/collective.service';

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

  return useInfiniteQuery({
    queryKey: buildPostsKey(channelId, userId),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      if (channelId) {
        return collectiveService.getChannelPosts(channelId, pageParam, pageSize);
      } else if (userId) {
        return postService.getUserPosts(userId, pageParam, pageSize);
      } else {
        return postService.getPosts(pageParam, pageSize);
      }
    },
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: enabled && (!!channelId || !!userId || channelId === undefined),
  });
};

/**
 * Hook to fetch global top posts
 * @param limit Number of posts to fetch (5, 10, 25, 50, 100)
 * @param postType Optional post type filter ('default', 'novel', 'image', 'video')
 */
export const useTopPosts = (limit: number = 25, postType?: string) => {
  return useQuery({
    queryKey: ['top-posts', limit, postType],
    queryFn: () => postService.getTopPosts(limit, postType),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

