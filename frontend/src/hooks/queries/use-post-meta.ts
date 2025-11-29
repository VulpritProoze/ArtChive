import { useQuery } from '@tanstack/react-query';
import { postService } from '@services/post.service';

export interface PostMeta {
  hearts_count: number;
  praise_count: number;
  trophy_count: number;
  comment_count: number;
  is_hearted: boolean;
  is_praised: boolean;
  user_trophies: string[];
  trophy_breakdown: Record<string, number>;
}

export type PostMetaMap = Record<string, PostMeta>;

/**
 * Fetch metadata (counts, trophies) for multiple posts in a single request.
 * This is optimized to avoid the N+1 query problem and uses the bulk-meta endpoint.
 * 
 * @param postIds - Array of post IDs to fetch metadata for
 * @param enabled - Whether the query should run
 * @returns TanStack Query result with PostMetaMap
 */
export const usePostsMeta = (postIds: string[], enabled = true) => {
  // Sort post IDs for consistent cache keys (avoid duplicate queries for same set)
  const sortedIds = [...postIds].sort();
  
  return useQuery<PostMetaMap>({
    queryKey: ['posts-meta', sortedIds],
    queryFn: () => {
      if (!sortedIds.length) return Promise.resolve({});
      return postService.getBulkMeta(sortedIds);
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute (counts change more frequently than posts)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  });
};

/**
 * Fetch metadata for a single post (uses bulk endpoint with single ID).
 * Useful for post detail pages or individual post cards.
 * 
 * @param postId - Post ID to fetch metadata for
 * @param enabled - Whether the query should run
 * @returns TanStack Query result with single PostMeta
 */
export const usePostMeta = (postId: string | undefined, enabled = true) => {
  const postIds = postId ? [postId] : [];
  const { data, ...rest } = usePostsMeta(postIds, enabled);
  
  return {
    data: postId && data ? data[postId] : undefined,
    ...rest,
  };
};
