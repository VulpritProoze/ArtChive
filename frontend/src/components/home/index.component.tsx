// artchive/frontend/src/home/index.component.tsx
import React, { useEffect, useRef } from "react";
import {
  CommentFormModal,
  PostFormModal,
  PostViewModal,
  CritiqueFormModal,
} from "@components/common/posts-feature/modal";
import { PostLoadingIndicator } from "@components/common";
import { usePostContext } from "@context/post-context";
import { PostCard } from "@components/common/posts-feature";
import { MainLayout } from "@components/common/layout/MainLayout";
import { Link } from "react-router-dom";

const Index: React.FC = () => {
  const {
    showCommentForm,
    posts,
    pagination,
    showPostForm,
    setShowPostForm,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    fetchPosts,
    activePost,
    showCritiqueForm,
  } = usePostContext();

  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scrolling behavior
  useEffect(() => {
    let isFetching = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          pagination.hasNext &&
          !loadingMore &&
          !loading &&
          !isFetching
        ) {
          isFetching = true;
          fetchPosts(pagination.currentPage + 1, true).finally(() => {
            isFetching = false;
          });
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect();
    };
  }, [
    pagination.hasNext,
    loadingMore,
    loading,
    fetchPosts,
    pagination.currentPage,
  ]);

  useEffect(() => {
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  return (
    <MainLayout>
      {/* Modals */}
      {activePost && <PostViewModal />}
      {showPostForm && <PostFormModal />}
      {showCommentForm && <CommentFormModal />}
      {showCritiqueForm && <CritiqueFormModal />}

      <span className="text-xs text-muted">kwaa lng ni later. temporary para maka navigate ani nga page</span>
      <Link to='/drips' className="btn btn-secondary">Drips</Link>

      {/* Page Content */}
      <div className="mb-12">
        {/* Header Section with Create Post Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-base-200/50 rounded-xl p-4">
          <div>
            <h2 className="text-3xl font-bold text-base-content bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
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
        {loading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="loading loading-spinner loading-lg text-primary"></div>
            <p className="mt-4 text-base-content/70 font-medium">
              Loading amazing artworks...
            </p>
          </div>
        )}

        {/* Posts Grid */}
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          {posts.map((postItem) => (
            <PostCard key={postItem.id} postItem={postItem} />
          ))}
        </div>

        {/* Empty State */}
        {posts.length === 0 && !loading && (
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

        <PostLoadingIndicator observerTarget={observerTarget} />
      </div>
    </MainLayout>
  );
};

export default Index;