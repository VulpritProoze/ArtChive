// artchive/frontend/src/home/index.component.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  CommentFormModal,
  PostFormModal,
  CritiqueFormModal,
  TrophySelectionModal,
} from "@components/common/posts-feature/modal";
import { InfiniteScrolling } from "@components/common";
import { PostCard } from "@components/common/posts-feature";
import { MainLayout } from "@components/common/layout/MainLayout";
import { SkeletonPostCard } from "@components/common/skeleton";
import { usePosts } from "@hooks/queries/use-posts";
import { usePostsMeta } from "@hooks/queries/use-post-meta";
import { usePostUI } from "@context/post-ui-context";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { useQuery } from "@tanstack/react-query";

const Index: React.FC = () => {
  const {
    showCommentForm,
    showPostForm,
    setShowPostForm,
    showCritiqueForm,
  } = usePostUI();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePosts();

  // Track post creation state for skeleton loader
  // Use useQuery hook to subscribe to cache changes (matches working comment pattern)
  const { data: isCreatingPost = false } = useQuery({
    queryKey: ['post-creating'],
    queryFn: () => false, // Dummy function - actual value comes from setQueryData
    initialData: false,
    staleTime: Infinity, // Never refetch - this is just for state management
    gcTime: Infinity, // Keep in cache indefinitely
  });

  // Extract all post IDs from all pages
  const postIds = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page =>
      page.results.map(p => p.post_id)
    );
  }, [data]);

  // Fetch bulk meta for all visible posts
  const {
    data: metaData,
    isLoading: metaLoading
  } = usePostsMeta(postIds, postIds.length > 0);

  // Merge posts with meta
  const enrichedPosts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page =>
      page.results.map(post => ({
        ...post,
        ...(metaData?.[post.post_id] || {
          hearts_count: 0,
          praise_count: 0,
          trophy_count: 0,
          comment_count: 0,
          user_trophies: [],
          trophy_breakdown: {},
          is_hearted: false,
          is_praised: false,
        }),
        // Map trophy_breakdown to trophy_counts_by_type for PostCard compatibility
        trophy_counts_by_type: metaData?.[post.post_id]?.trophy_breakdown || {},
        user_awarded_trophies: metaData?.[post.post_id]?.user_trophies || [],
        // Map is_hearted/is_praised from meta to Post interface fields
        // Always default to false if meta data is not available
        is_hearted_by_user: metaData?.[post.post_id]?.is_hearted ?? false,
        is_praised_by_user: metaData?.[post.post_id]?.is_praised ?? false,
      }))
    );
  }, [data, metaData]);

  const totalCount = data?.pages?.[0]?.count ?? enrichedPosts.length;

  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(target);
    return () => {
      observer.unobserve(target);
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const isInitialLoading = isLoading && enrichedPosts.length === 0;
  const showCountsLoading = metaLoading && !metaData;

  // Show error toast when there's an error
  useEffect(() => {
    if (isError && error) {
      const message = handleApiError(error, {}, true, true);
      toast.error('Failed to load posts', formatErrorForToast(message));
    }
  }, [isError, error]);

  return (
    <MainLayout>
      {/* Modals */}
      {showPostForm && <PostFormModal />}
      {showCommentForm && <CommentFormModal />}
      {showCritiqueForm && <CritiqueFormModal />}
      <TrophySelectionModal />

      {/* Page Content */}
      <div className="mb-12">
        {/* Header Section with Create Post Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-base-200/50 rounded-xl p-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Feed
            </h2>
            <p className="text-sm text-base-content/60 mt-1">
              Discover amazing artworks from the community
            </p>
          </div>
          <button
            className="btn btn-primary gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            onClick={() => setShowPostForm(true)}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Post
          </button>
        </div>

        {/* Loading State */}
        {isInitialLoading && (
          <SkeletonPostCard
            count={3}
            containerClassName="flex flex-col gap-6 max-w-3xl mx-auto"
          />
        )}

        {/* Posts Grid */}
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          {/* Skeleton Loader for new post being created */}
          {isCreatingPost && <SkeletonPostCard />}
          
          {enrichedPosts.map((postItem) => (
            <PostCard
              key={postItem.post_id}
              postItem={{ ...postItem, novel_post: postItem.novel_post || [] }}
              countsLoading={showCountsLoading}
            />
          ))}
        </div>

        {/* Empty State */}
        {enrichedPosts.length === 0 && !isInitialLoading && !isError && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-8xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-base-content mb-2">
              No Posts Yet
            </h3>
            <p className="text-base-content/60 text-center max-w-md mb-6">
              Be the first to share your amazing artwork with the community!
            </p>
            <button
              className="btn btn-primary gap-2"
              onClick={() => setShowPostForm(true)}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Your First Post
            </button>
          </div>
        )}

        <InfiniteScrolling
          observerTarget={observerTarget}
          isFetchingMore={isFetchingNextPage}
          hasNextPage={!!hasNextPage}
          totalCount={totalCount}
          itemCount={enrichedPosts.length}
        />
      </div>
    </MainLayout>
  );
};

export default Index;