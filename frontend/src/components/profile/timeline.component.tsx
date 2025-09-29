import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { usePostContext } from "@context/post-context";
import usePost from "@hooks/use-post";
import {
  PostFormModal,
  CommentFormModal,
} from "@components/common/posts-feature/modal";
import { PostLoadingIndicator, CommentsRenderer } from "@components/common";
import { getCommentsForPost } from "@utils";
import HeartButton from "@components/common/posts-feature/heart-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots
} from "@fortawesome/free-solid-svg-icons";
import { CommonHeader } from '@components/common'
import PostHeader from "@components/common/posts-feature/post-header";

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const {
    comments,
    loadingComments,
    commentPagination,
    showCommentForm,

    // Posts
    posts,
    pagination,
    expandedPost,
    showPostForm,
    setShowPostForm,
    loading,
    loadingMore,
    fetchPosts,
    deletePost,

    // Hearting
    heartPost,
    unheartPost,
    loadingHearts,
  } = usePostContext();

  const { setupEditPost, toggleComments } = usePost();

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

      {/* Post Form Modal */}
      {showPostForm && <PostFormModal user_id={user?.id} />}

      {/* Comment Form Modal */}
      {showCommentForm && <CommentFormModal />}

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

        <div className="flex flex-col items-center">
          {posts.map((postItem) => (
            <div
              key={postItem.post_id}
              className="rounded-2xl p-6 w-full max-w-2xl"
            >
              <div className="card-body">
                {/* Post Header */}
                <PostHeader postItem={postItem} />

                {/* Post Content */}
                <p className="mb-3">{postItem.description}</p>

                {/* Media */}
                {postItem.post_type === "image" && postItem.image_url && (
                  <img
                    src={postItem.image_url}
                    alt={postItem.description}
                    className="rounded-lg w-full max-h-96 object-cover mb-3"
                  />
                )}

                {postItem.post_type === "video" && postItem.video_url && (
                  <video controls className="rounded-lg w-full max-h-96 mb-3">
                    <source src={postItem.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}

                {postItem.post_type === "novel" &&
                  postItem.novel_post?.length > 0 && (
                    <div className="bg-base-200 p-3 rounded-lg mb-3">
                      <p className="font-semibold">
                        Chapters: {postItem.novel_post.length}
                      </p>
                      {postItem.novel_post
                        .slice(0, 1)
                        .map((novelPost, index) => (
                          <div key={index} className="mt-2">
                            <p className="text-sm font-medium">
                              Chapter {novelPost.chapter}
                            </p>
                            <p className="text-sm">
                              {novelPost.content?.substring(0, 120)}...
                            </p>
                          </div>
                        ))}
                      {postItem.novel_post.length > 1 && (
                        <p className="text-sm text-gray-500 mt-2">
                          +{postItem.novel_post.length - 1} more chapters...
                        </p>
                      )}
                    </div>
                  )}

                {/* Post Actions - Add Heart Button */}
                <div className="flex items-center justify-between mt-4 border-t border-base-300 pt-3">
                  <div className="flex items-center gap-2">
                    <HeartButton
                      postId={postItem.post_id}
                      heartsCount={postItem.hearts_count || 0}
                      isHearted={postItem.is_hearted_by_user || false}
                      onHeart={heartPost}
                      onUnheart={unheartPost}
                      isLoading={loadingHearts[postItem.post_id]}
                      size="sm"
                    />

                    {/* Comments Toggle Button */}
                    <button
                      className="btn btn-sm btn-ghost gap-2"
                      onClick={() => toggleComments(postItem.post_id)}
                      disabled={loadingComments[postItem.post_id]}
                    >
                      <FontAwesomeIcon icon={faCommentDots} />
                      {loadingComments[postItem.post_id] ? (
                        <div className="loading loading-spinner loading-xs"></div>
                      ) : (
                        <span>
                          {commentPagination[postItem.post_id]?.totalCount ||
                            getCommentsForPost(postItem.post_id, comments)
                              .length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Edit/Delete Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setupEditPost(postItem)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-error"
                      onClick={() => deletePost(postItem.post_id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Comments Section */}
                {expandedPost === postItem.post_id && (
                  <CommentsRenderer postId={postItem.post_id} />
                )}
              </div>
            </div>
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
