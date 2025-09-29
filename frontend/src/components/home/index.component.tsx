import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LogoutButton } from "@components/account/logout";
import {
  CommentFormModal,
  PostFormModal,
  CommentsViewModal,
} from "@components/common/posts-feature/modal";
import usePost from "@hooks/use-post";
import { useAuth } from "@context/auth-context";
import { PostLoadingIndicator, CommentsRenderer } from "@components/common";
import { usePostContext } from "@context/post-context";
import { getCommentsForPost } from "@utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faBookmark,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import HeartButton from "@components/common/posts-feature/heart-button";
import PostHeader from "@components/common/posts-feature/post-header";
import { CommonHeader } from "@components/common";

const Index: React.FC = () => {
  const {
    comments,
    loadingComments,
    showCommentForm,
    fetchCommentsForPost,

    // Posts
    posts,
    pagination,
    expandedPost,
    showPostForm,
    setShowPostForm,
    loading,
    setLoading,
    loadingMore,
    setLoadingMore,
    fetchPosts,
    activePost,
    setActivePost,

    // Hearting
    heartPost,
    unheartPost,
    loadingHearts,
  } = usePostContext();
  const { toggleComments } = usePost();
  const { user } = useAuth();

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

  // Fetch first comments for all posts after they are loaded
  // Will modify later in backend to not do so much api calls
  // Will have to append first comments now within post request
  useEffect(() => {
    const fetchInitialComments = async () => {
      if (posts.length > 0 && !loading) {
        // Fetch first comments for each post
        const commentPromises = posts.map(async (postItem) => {
          // Only fetch if we haven't loaded comments for this post yet
          if (
            !comments[postItem.post_id] &&
            !loadingComments[postItem.post_id]
          ) {
            try {
              await fetchCommentsForPost(postItem.post_id, 1, false);
            } catch (error) {
              console.error(
                `Error fetching comments for post ${postItem.post_id}:`,
                error
              );
            }
          }
        });

        // Execute all comment fetches in parallel
        await Promise.allSettled(commentPromises);
      }
    };

    fetchInitialComments();
  }, [posts, loading, comments, loadingComments, fetchCommentsForPost]);

  useEffect(() => {
    if (activePost) {
      fetchCommentsForPost(activePost.post_id, 1, false);
    }
  }, [activePost]);

  return (
    /*container div */
    <div className="container max-w-full w-full">
      {/* Comments View Modal */}
      {activePost && <CommentsViewModal />}

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
                <div
                  key={postItem.post_id}
                  className="card bg-base-100 border border-base-300 rounded-xl shadow-sm"
                >
                  {/* Post Header - Instagram Style */}
                  <PostHeader postItem={postItem} />

                  {/* Media Content */}
                  {postItem.post_type === "image" && postItem.image_url && (
                    <div className="aspect-square bg-black flex items-center justify-center">
                      <img
                        src={postItem.image_url}
                        alt={postItem.description}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {postItem.post_type === "video" && postItem.video_url && (
                    <div className="aspect-square bg-black flex items-center justify-center">
                      <video controls className="w-full h-full object-contain">
                        <source src={postItem.video_url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {postItem.post_type === "novel" &&
                    postItem.novel_post &&
                    postItem.novel_post.length > 0 && (
                      <div className="aspect-square bg-base-200 flex items-center justify-center">
                        <div className="text-center p-8">
                          <div className="text-4xl mb-4">📖</div>
                          <h3 className="text-xl font-bold text-base-content mb-2">
                            {postItem.description?.substring(0, 50)}...
                          </h3>
                          <p className="text-base-content/70">
                            {postItem.novel_post.length} chapters
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Text-only post (default type) */}
                  {(!postItem.post_type ||
                    postItem.post_type === "default") && (
                    <div className="p-6 bg-base-100">
                      <div className="prose max-w-none">
                        <p className="text-base-content whitespace-pre-wrap">
                          {postItem.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <HeartButton
                          postId={postItem.post_id}
                          heartsCount={postItem.hearts_count || 0}
                          isHearted={postItem.is_hearted_by_user || false}
                          onHeart={heartPost}
                          onUnheart={unheartPost}
                          isLoading={loadingHearts[postItem.post_id]}
                          size="lg"
                        />

                        <button
                          className="btn btn-ghost btn-sm btn-circle"
                          onClick={() => setActivePost(postItem)}
                          disabled={loadingComments[postItem.post_id]}
                        >
                          <FontAwesomeIcon
                            icon={faCommentDots}
                            className="text-xl hover:scale-110 transition-transform"
                          />
                        </button>

                        <button className="btn btn-ghost btn-sm btn-circle">
                          <FontAwesomeIcon
                            icon={faPaperPlane}
                            className="text-xl hover:scale-110 transition-transform"
                          />
                        </button>
                      </div>

                      <button className="btn btn-ghost btn-sm btn-circle">
                        <FontAwesomeIcon
                          icon={faBookmark}
                          className="text-xl hover:scale-110 transition-transform"
                        />
                      </button>
                    </div>

                    {/* Likes Count */}
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-base-content">
                        {postItem.hearts_count || 0} likes
                      </p>
                    </div>

                    {/* Caption - Only show for non-text posts */}
                    {postItem.post_type && postItem.post_type !== "default" && (
                      <div className="mb-2">
                        <p className="text-sm text-base-content">
                          <span className="font-semibold">{postItem.author_username}</span>{" "}
                          {postItem.description}
                        </p>
                      </div>
                    )}

                    {/* Comments Preview - Show blurred first comment */}
                    <CommentsRenderer 
                      postId={postItem.post_id} 
                      isFirstComments={true} 
                    />

                    {/* Time Posted */}
                    <p className="text-xs text-base-content/50 uppercase">
                      {new Date(postItem.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>
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
