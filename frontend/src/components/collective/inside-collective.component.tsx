import { useEffect, useRef, useState } from "react";
import { usePostContext } from "@context/post-context";
import { useCollectivePostContext } from "@context/collective-post-context";
import usePost from "@hooks/use-post";
import useCollective from "@hooks/use-collective";
import { useParams } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { PostFormModal, CommentFormModal } from "@components/common/posts-feature/modal";
import { ChannelCreateModal, ChannelEditModal } from '@components/common/collective-feature/modal'
import { getCommentsForPost } from "@utils";
import type { Channel } from "@types";
import { CommentsRenderer, PostLoadingIndicator } from "../common";

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
    editingChannel
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
                    await handleBecomeAdmin(collectiveData.collective_id)
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
            
          {editingChannel && (
            <ChannelEditModal />
          )}


          {showCreateChannelModal && (
            <ChannelCreateModal />
          )}

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
              <div className="flex flex-row gap-1">
                {isAdminOfACollective(selectedChannel.channel_id) && (
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
                        if (window.confirm(`Delete channel "${selectedChannel.title}"? This cannot be undone.`)) {
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((postItem) => (
                  <div
                    key={postItem.post_id}
                    className="card bg-base-100 shadow-xl"
                  >
                    <div className="card-body">
                      <h3 className="card-title">
                        {postItem.description?.substring(0, 30)}...
                      </h3>
                      <p>Type: {postItem.post_type}</p>
                      <p>Author: {postItem.author}</p>
                      <p>
                        Created:{" "}
                        {new Date(postItem.created_at).toLocaleDateString()}
                      </p>

                      {postItem.post_type === "image" && postItem.image_url && (
                        <div className="mt-4">
                          <img
                            src={postItem.image_url}
                            alt={postItem.description}
                            className="rounded-lg max-h-48 object-cover"
                          />
                        </div>
                      )}

                      {postItem.post_type === "video" && postItem.video_url && (
                        <div className="mt-4">
                          <video
                            controls
                            className="rounded-lg max-h-48 w-full"
                          >
                            <source src={postItem.video_url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}

                      {postItem.post_type === "novel" &&
                        postItem.novel_post &&
                        postItem.novel_post.length > 0 && (
                          <div className="mt-4">
                            <p className="font-semibold">
                              Chapters: {postItem.novel_post.length}
                            </p>
                            {postItem.novel_post
                              .slice(0, 3)
                              .map((novelPost, index) => (
                                <div
                                  key={index}
                                  className="mt-2 p-2 bg-base-200 rounded"
                                >
                                  <p className="text-sm font-medium">
                                    Chapter {novelPost.chapter}
                                  </p>
                                  <p className="text-sm mt-1">
                                    {novelPost.content?.substring(0, 80)}...
                                  </p>
                                </div>
                              ))}
                            {postItem.novel_post.length > 3 && (
                              <p className="text-sm text-gray-500 mt-2">
                                +{postItem.novel_post.length - 3} more
                                chapters...
                              </p>
                            )}
                          </div>
                        )}

                      {/* Comments Toggle Button */}
                      <div className="mt-4">
                        <button
                          className="btn btn-sm btn-outline w-full"
                          onClick={() => toggleComments(postItem.post_id)}
                          disabled={loadingComments[postItem.post_id]}
                        >
                          {loadingComments[postItem.post_id] ? (
                            <>
                              <div className="loading loading-spinner loading-xs"></div>
                              Loading...
                            </>
                          ) : (
                            <>
                              {expandedPost === postItem.post_id
                                ? "Hide"
                                : "Show"}{" "}
                              Comments (
                              {commentPagination[postItem.post_id]
                                ?.totalCount ||
                                getCommentsForPost(postItem.post_id, comments)
                                  .length}
                              )
                            </>
                          )}
                        </button>
                      </div>

                      {/* Comments Section */}
                      {expandedPost === postItem.post_id && (
                        <CommentsRenderer postId={postItem.post_id} />
                      )}

                      <div className="card-actions justify-end mt-4">
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
