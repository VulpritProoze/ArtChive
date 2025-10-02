import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LogoutButton } from "@components/account/logout";
import {
  CommentFormModal,
  PostFormModal,
  PostViewModal,
} from "@components/common/posts-feature/modal";
import { useAuth } from "@context/auth-context";
import { PostLoadingIndicator } from "@components/common";
import { usePostContext } from "@context/post-context";
import { PostCard } from "@components/common/posts-feature";
import { CommonHeader } from "@components/common";

const Index: React.FC = () => {
  const {
    showCommentForm,

    // Posts
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
  } = usePostContext();

  const { user } = useAuth()
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
            isFetching = false; // Reset flag after fetch completes
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
    fetchPosts(1)
  }, [fetchPosts]);

  return (
    /*container div */
    <div className="container max-w-full w-full">
      {/* Comments View Modal */}
      {activePost && <PostViewModal />}

      {/* Post Form Modal */}
      {showPostForm && <PostFormModal />}

      {/* Comment Form Modal */}
      {showCommentForm && <CommentFormModal />}

      {/* Header */}
      <CommonHeader user={user} />

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 px-4 lg:px-12 py-6">
        {/* LEFT SIDEBAR */}
        <aside className="lg:col-span-2 hidden lg:flex flex-col gap-4">
          <nav className="flex flex-col gap-2">
            <Link
              to="/home"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Home
            </Link>
            <Link
              to="/gallery"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Gallery
            </Link>
            <Link
              to="/collective"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Collective
            </Link>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 text-base-content transition-colors"
            >
              Profile
            </Link>
            <button
              className="mt-2 px-3 py-2 rounded-lg bg-primary text-primary-content font-medium hover:bg-primary/80 hover:scale-105 active:scale-95 transition-all duration-200 shadow hover:shadow-md"
              onClick={() => setShowPostForm(true)}
            >
              Create Post
            </button>
          </nav>

          <LogoutButton />
        </aside>

        {/* FEED / POSTS */}
        <main className="lg:col-span-7">
          {/* Posts Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-base-content">Posts</h2>
            </div>

            {loading && posts.length === 0 && (
              <div className="text-center py-8">
                <div className="loading loading-spinner loading-lg"></div>
                <p className="mt-2 text-base-content">Loading posts...</p>
              </div>
            )}

            <div className="flex flex-col gap-8 max-w-2xl mx-auto">
              {posts.map((postItem) => (
                <PostCard postItem={postItem} />
              ))}
            </div>

            {posts.length === 0 && !loading && (
              <div className="text-center py-8 text-base-content/70">
                No posts found. Be the first to create one!
              </div>
            )}

            <PostLoadingIndicator observerTarget={observerTarget} />
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="lg:col-span-3 hidden lg:flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-bold mb-2 text-base-content">
              Popular This Week
            </h3>
            <div className="rounded-lg overflow-hidden shadow-sm">
              <img
                src="/images/popular-art.jpg"
                alt="Popular Artwork"
                className="w-full object-cover"
              />
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-4 text-center text-base-content/70">
            Advertisement
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2 text-base-content">
              Active Fellows
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3">
                <img
                  src="https://randomuser.me/api/portraits/women/1.jpg"
                  className="w-8 h-8 rounded-full"
                />
                <p className="text-sm text-base-content">Lisa Wong</p>
              </li>
              <li className="flex items-center gap-3">
                <img
                  src="https://randomuser.me/api/portraits/men/2.jpg"
                  className="w-8 h-8 rounded-full"
                />
                <p className="text-sm text-base-content">Michael Brown</p>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Index;