import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { usePostContext } from "@context/post-context";
import {
  PostFormModal,
  CommentFormModal,
  PostViewModal,
} from "@components/common/posts-feature/modal";
import { PostLoadingIndicator } from "@components/common";
import { PostCard } from '@components/common/posts-feature'
import { CommonHeader } from "@components/common";

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const {
    showCommentForm,

    // Posts
    posts,
    pagination,
    showPostForm,
    setShowPostForm,
    loading,
    loadingMore,
    fetchPosts,
    activePost,
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
          fetchPosts(pagination.currentPage + 1, true, null, user?.id).finally(
            () => {
              isFetching = false; // Reset flag after fetch completes
            }
          );
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
    fetchPosts(1, false, null, user?.id);
  }, [fetchPosts]);

  return (
    <div className="container max-w-full w-full">
      {/* Post View Modal */}
      {activePost && <PostViewModal />}

      {/* Post Form Modal */}
      {showPostForm && <PostFormModal user_id={user?.id} />}

      {/* Comment Form Modal */}
      {showCommentForm && <CommentFormModal />}

      {/* Header */}
      <CommonHeader user={user} />

      {/* profile top */}
      <div className="flex justify-center mt-6">
        <div className="bg-base-100 shadow rounded-2xl p-6 w-full max-w-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Avatar */}
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png"
              alt="profile avatar"
              className="w-24 h-24 rounded-full object-cover"
            />

            {/* Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold">Chernobog</h3>
              <p className="text-gray-500">@chernobog_art</p>
              <p className="text-sm mt-2 text-gray-600">
                Digital artist specializing in character design and concept art.
                Currently working on a fantasy novel illustration series. Open
                for commissions!
              </p>

              {/* Stats */}
              <div className="flex justify-center sm:justify-start gap-8 mt-4">
                <div>
                  <h4 className="text-lg font-semibold">248</h4>
                  <p className="text-gray-500 text-sm">Posts</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">12.5k</h4>
                  <p className="text-gray-500 text-sm">Followers</p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold">892</h4>
                  <p className="text-gray-500 text-sm">Following</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <Link
                  to="/profile/me"
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Edit Profile
                </Link>
                <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">
                  Share Profile
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowPostForm(true)}
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="mb-12">
        {/* Tabs Section */}
        <div className="flex justify-center mt-6">
          <div className="rounded-2xl p-6 w-full max-w-2xl">
            <nav className="flex  space-x-10">
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-blue-500 text-blue-600">
                Timeline
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Works
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Avatar
              </button>
              <button className="py-2 px-1 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                Collectives
              </button>
            </nav>
          </div>
        </div>
        {loading && posts.length === 0 && (
          <div className="text-center py-8">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-2">Loading posts...</p>
          </div>
        )}

        <div className="flex flex-col gap-8 max-w-2xl mx-auto">
          {posts.map((postItem) => (
            <PostCard postItem={postItem} />
          ))}
        </div>

        {posts.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            No posts found. Create your first post!
          </div>
        )}

        <PostLoadingIndicator observerTarget={observerTarget} />
      </div>
    </div>
  );
};

export default Timeline;
