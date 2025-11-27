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
import { usePostUI } from "@context/post-ui-context";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";

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

  const posts = useMemo(
    () => data?.pages.flatMap((page) => page.results || []) ?? [],
    [data]
  );
  const totalCount = data?.pages?.[0]?.count ?? posts.length;

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

  const isInitialLoading = isLoading && posts.length === 0;

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
          {posts.map((postItem) => (
            <PostCard key={postItem.post_id} postItem={{ ...postItem, novel_post: postItem.novel_post || [] }} />
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && !isInitialLoading && !isError && (
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
          itemCount={posts.length}
        />
      </div>
    </MainLayout>
  );
};

export default Index;