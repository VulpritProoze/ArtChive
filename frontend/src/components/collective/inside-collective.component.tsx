import { useEffect, useRef, useState } from "react";
import { usePostContext } from "@context/post-context";
import { useCollectivePostContext } from "@context/collective-post-context";
import usePost from "@hooks/use-post";
import useCollective from "@hooks/use-collective";
import { useParams } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import {
  PostFormModal,
  CommentFormModal,
} from "@components/common/posts-feature/modal";
import {
  ChannelCreateModal,
  ChannelEditModal,
} from "@components/common/collective-feature/modal";
import { getCommentsForPost, formatArtistTypesToString } from "@utils";
import type { Channel } from "@types";
import { CommentsRenderer, PostLoadingIndicator } from "../common";
import HeartButton from "@components/common/posts-feature/heart-button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots
} from "@fortawesome/free-solid-svg-icons";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
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
    setPostForm,
    loading,
    setExpandedPost,
    loadingMore,
    fetchPosts,
    deletePost,

    // Hearting
    heartPost,
    unheartPost,
    loadingHearts,
  } = usePostContext();
  const {
    collectiveData,
    fetchCollectiveData,
    selectedChannel,
    setSelectedChannel,
    showCreateChannelModal,
    setShowCreateChannelModal,
    setEditingChannel,
    handleDeleteChannel,
    editingChannel,
  } = useCollectivePostContext();
  const { setupEditPost, toggleComments } = usePost();
  const { handleBecomeAdmin, handleLeaveCollective } = useCollective();
  const { user, isAdminOfACollective, isMemberOfACollective } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Fetch collective data and initial posts
  useEffect(() => {
    fetchCollectiveData(collectiveId);
  }, [collectiveId]);

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
          !isFetching &&
          selectedChannel
        ) {
          isFetching = true;
          fetchPosts(
            pagination.currentPage + 1,
            true,
            selectedChannel.channel_id
          ).finally(() => {
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
    selectedChannel,
  ]);

  // Handle channel selection
  const handleChannelClick = async (channel: Channel) => {
    setSelectedChannel(channel);
    setPostForm((prev) => ({ ...prev, channel_id: channel.channel_id }));
    await fetchPosts(1, false, channel.channel_id);
    setExpandedPost(null); // Reset expanded post when changing channels
  };

  return (
    <div className="container mx-auto p-4">
      {collectiveData && (
        <>
          {/* Collective Header */}
          <div className="bg-base-200 p-6 rounded-lg mb-6">
            <h1 className="text-3xl font-bold mb-2">{collectiveData.title}</h1>
            <p>{collectiveData.collective_id}</p>
            <p className="text-lg mb-4">{collectiveData.description}</p>

            <div className="py-2">
              {isAdminOfACollective(collectiveData.collective_id) ? (
                <div className="hover:cursor-not-allowed">
                  <button className="btn btn-primary w-full" disabled>
                    Already admin
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary w-full"
                  onClick={async () => {
                    await handleBecomeAdmin(collectiveData.collective_id);
                  }}
                >
                  Become Admin
                </button>
              )}
            </div>

            <div className="pb-2">
              {isMemberOfACollective(collectiveData.collective_id) ? (
                <button
                  className="btn btn-error w-full"
                  onClick={() =>
                    handleLeaveCollective(collectiveData.collective_id)
                  }
                >
                  Leave Collective
                </button>
              ) : (
                <div className="hover:cursor-not-allowed">
                  <button className="btn btn-error w-full" disabled>
                    Already left this collective
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {collectiveData.artist_types.map((type, index) => (
                <span key={index} className="badge badge-primary">
                  {type}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span>
                Created:{" "}
                {new Date(collectiveData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Rules Section */}
          <div className="bg-base-100 p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-semibold mb-4">Community Rules</h2>
            <ul className="list-disc pl-5">
              {collectiveData.rules.map((rule, index) => (
                <li key={index} className="mb-2">
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Channels Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-4">Channels</h2>
            {isAdminOfACollective(collectiveData.collective_id) && (
              <button
                className="btn btn-sm btn-primary mb-2"
                onClick={() => setShowCreateChannelModal(true)}
              >
                + Create Channel
              </button>
            )}
            <div className="flex flex-wrap gap-4">
              {collectiveData.channels.map((channel) => (
                <div
                  key={channel.channel_id}
                  className={`card shadow-md w-64 ${
                    selectedChannel?.channel_id === channel.channel_id
                      ? "bg-primary text-primary-content"
                      : "bg-base-100"
                  }`}
                >
                  <div className="card-body">
                    <h3 className="card-title">{channel.title}</h3>
                    <div className="card-actions justify-end">
                      <button
                        className="btn btn-sm"
                        onClick={() => handleChannelClick(channel)}
                      >
                        {selectedChannel?.channel_id === channel.channel_id
                          ? "Viewing"
                          : "View"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {editingChannel && <ChannelEditModal />}

          {showCreateChannelModal && <ChannelCreateModal />}

          {/* Post Form Modal */}
          {showPostForm && (
            <PostFormModal channel_id={selectedChannel.channel_id} />
          )}

          {showCommentForm && (
            <CommentFormModal channel_id={selectedChannel.channel_id} />
          )}

          {/* Posts Section */}
          {selectedChannel && (
            <div className="bg-base-100 p-6 rounded-lg shadow-md mb-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">
                  Posts in {selectedChannel.title}
                </h2>
                <p>{selectedChannel.description}</p>
              </div>

              {/* Channel actions */}
              <div className="flex flex-row gap-1 mb-2">
                {isAdminOfACollective(selectedChannel.collective_id) && (
                  <>
                    <button
                      className="btn btn-info"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChannel(selectedChannel);
                      }}
                      title="Edit channel"
                    >
                      Update Channel
                    </button>
                    <button
                      className="btn btn-error"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            `Delete channel "${selectedChannel.title}"? This cannot be undone.`
                          )
                        ) {
                          handleDeleteChannel(selectedChannel.channel_id);
                        }
                      }}
                      title="Delete channel"
                    >
                      Delete Channel
                    </button>
                  </>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => setShowPostForm(true)}
                  disabled={!user}
                >
                  Create Post
                </button>
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
                      <div className="flex items-start justify-between mb-3">
                        {/* Left side: Avatar + Info */}
                        <div className="flex items-center gap-3">
                          <img
                            src={postItem.author_picture}
                            alt="avatar"
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <h4 className="font-semibold text-sm">
                              {postItem.author_fullname}
                            </h4>
                            <p className="text-xs text-gray-500">
                              @{postItem.author_username}
                            </p>
                            <p className="text-xs text-blue-600">
                              {formatArtistTypesToString(
                                postItem.author_artist_types
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right side: Options button */}
                        <button className="btn btn-ghost btn-sm">⋮</button>
                      </div>

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
                        <video
                          controls
                          className="rounded-lg w-full max-h-96 mb-3"
                        >
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
                                +{postItem.novel_post.length - 1} more
                                chapters...
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
                                {commentPagination[postItem.post_id]
                                  ?.totalCount ||
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
                  No posts found in this channel. Be the first to create one!
                </div>
              )}

              <PostLoadingIndicator observerTarget={observerTarget} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CollectiveHome;
