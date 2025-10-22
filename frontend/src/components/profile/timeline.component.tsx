// frontend/src/components/profile/timeline.component.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { usePostContext } from "@context/post-context";
import {
  PostFormModal,
  CommentFormModal,
  PostViewModal,
} from "@components/common/posts-feature/modal";
import { PostLoadingIndicator } from "@components/common";
import { PostCard } from "@components/common/posts-feature";
import { MainLayout } from "@components/common/layout";
import { formatArtistTypesToString } from '@utils';

const Timeline: React.FC = () => {
  const { user } = useAuth(); // This now has your actual user data!
  const {
    showCommentForm,
    setPosts,
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
  const [activeTab, setActiveTab] = useState<"timeline" | "works" | "avatar" | "collectives">("timeline");

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
              isFetching = false;
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

  useEffect(() => {
    setPosts([])
  }, [])

  const tabs = [
    { id: "timeline", label: "Timeline", icon: "📝" },
    { id: "works", label: "Works", icon: "🎨" },
    { id: "avatar", label: "Avatar", icon: "👤" },
    { id: "collectives", label: "Collectives", icon: "👥" },
  ];

  return (
    <MainLayout showRightSidebar={false}>
      {/* Modals */}
      {activePost && <PostViewModal />}
      {showPostForm && <PostFormModal user_id={user?.id} />}
      {showCommentForm && <CommentFormModal />}

      {/* Profile Header Card - NOW DYNAMIC! */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 shadow-lg border border-base-300">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
            {/* Avatar - NOW SHOWS YOUR ACTUAL PROFILE PICTURE */}
            <div className="relative group">
              <div className="avatar">
                <div className="w-32 h-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-4 shadow-xl group-hover:ring-secondary transition-all duration-300">
                  <img
                    src={user?.profile_picture || "/static_img/default-pic-min.jpg"}
                    alt="profile avatar"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 w-4 h-4 bg-success rounded-full border-2 border-base-100"></div>
            </div>

            {/* Profile Info - NOW SHOWS YOUR ACTUAL DATA */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-3xl font-bold text-base-content mb-1">
                    {user?.fullname || user?.username || "User"}
                  </h2>
                  <p className="text-base-content/60 font-medium">
                    @{user?.username || "username"}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center lg:justify-end gap-2">
                  <Link
                    to="/profile/me"
                    className="btn btn-sm btn-outline gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </Link>
                  <button className="btn btn-sm btn-outline gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                  <button
                    className="btn btn-sm btn-primary gap-2"
                    onClick={() => setShowPostForm(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Post
                  </button>
                </div>
              </div>

              {/* Bio/Artist Types - NOW SHOWS YOUR ACTUAL ARTIST TYPES */}
              <p className="text-base-content/70 text-sm lg:text-base mb-4 max-w-2xl">
                {formatArtistTypesToString(user?.artist_types || [])}
                {user?.artist_types && user.artist_types.length > 0 && " artist"}
              </p>

              {/* Stats - PLACEHOLDER FOR NOW (you can add real stats later) */}
              <div className="flex justify-center lg:justify-start gap-6 lg:gap-8">
                <button className="hover:scale-105 transition-transform">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-base-content">{posts.length}</h4>
                    <p className="text-base-content/60 text-sm">Posts</p>
                  </div>
                </button>
                <button className="hover:scale-105 transition-transform">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-base-content">0</h4>
                    <p className="text-base-content/60 text-sm">Followers</p>
                  </div>
                </button>
                <button className="hover:scale-105 transition-transform">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-base-content">0</h4>
                    <p className="text-base-content/60 text-sm">Following</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6">
        <div className="bg-base-200/50 rounded-xl p-2">
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${activeTab === tab.id
                    ? "bg-primary text-primary-content shadow-md scale-[1.02]"
                    : "hover:bg-base-300 text-base-content"
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="mb-12">
        {activeTab === "timeline" && (
          <>
            {loading && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="loading loading-spinner loading-lg text-primary"></div>
                <p className="mt-4 text-base-content/70 font-medium">
                  Loading posts...
                </p>
              </div>
            )}

            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
              {posts.map((postItem) => (
                <PostCard key={postItem.id} postItem={postItem} />
              ))}
            </div>

            {posts.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="text-8xl mb-4">📝</div>
                <h3 className="text-2xl font-bold text-base-content mb-2">
                  No Posts Yet
                </h3>
                <p className="text-base-content/60 text-center max-w-md mb-6">
                  Start sharing your amazing artwork with the community!
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
          </>
        )}

        {activeTab === "works" && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">🎨</div>
            <p>Works gallery coming soon...</p>
          </div>
        )}

        {activeTab === "avatar" && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">👤</div>
            <p>Avatar customization coming soon...</p>
          </div>
        )}

        {activeTab === "collectives" && (
          <div className="text-center py-16 text-base-content/60">
            <div className="text-6xl mb-4">👥</div>
            <p>Collectives list coming soon...</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Timeline;