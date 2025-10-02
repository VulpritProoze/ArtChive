import { useEffect, useRef } from "react";
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
import { getCommentsForPost } from "@utils";
import type { Channel } from "@types";
import { CommentsRenderer, PostLoadingIndicator } from "../common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faBookmark,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import HeartButton from "@components/common/posts-feature/heart-button";
import PostHeader from "@components/common/posts-feature/post-header";
import { CommonHeader } from "@components/common";
import { LoadingSpinner } from "@components/loading-spinner";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const {
    comments,
    loadingComments,
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
  const { toggleComments } = usePost();
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
    const channelWithCollectiveId = {
      ...channel,
      collective_id: collectiveData?.collective_id || channel.collective_id,
    };
    setSelectedChannel(channelWithCollectiveId);
    setPostForm((prev) => ({ ...prev, channel_id: channel.channel_id }));
    await fetchPosts(1, false, channel.channel_id);
    setExpandedPost(null); // Reset expanded post when changing channels
  };

  return (
    <div className="container max-w-full w-full">
      {/* Header */}
      <CommonHeader user={user} />

      <div className="mx-8 mt-4">
        {collectiveData && (
          <>
            {/* Collective Header */}
            <div className="bg-base-200 p-6 rounded-lg mb-6">
              <h1 className="text-3xl font-bold mb-2">
                {collectiveData.title}
              </h1>
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
                    className={`card shadow-md w-64`}
                  >
                    <div className={`card-body`}>
                      <h3 className="card-title">{channel.title}</h3>
                      <div className="card-actions justify-end">
                        <button
                          className={`btn btn-sm ${
                            selectedChannel?.channel_id === channel.channel_id
                              ? "bg-primary text-primary-content"
                              : "bg-base-100"
                            }`}
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
                          <video
                            controls
                            className="w-full h-full object-contain"
                          >
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
                              onClick={() => toggleComments(postItem.post_id)}
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
                        {postItem.post_type &&
                          postItem.post_type !== "default" && (
                            <div className="mb-2">
                              <p className="text-sm text-base-content">
                                <span className="font-semibold">
                                  chenoborg_art
                                </span>{" "}
                                {postItem.description}
                              </p>
                            </div>
                          )}

                        {/* View Comments */}
                        {getCommentsForPost(postItem.post_id, comments).length >
                          0 && (
                          <button
                            className="text-sm text-base-content/70 mb-2 hover:text-base-content transition-colors"
                            onClick={() => toggleComments(postItem.post_id)}
                          >
                            View all{" "}
                            {
                              getCommentsForPost(postItem.post_id, comments)
                                .length
                            }{" "}
                            comments
                          </button>
                        )}

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

                      {/* Comments Section */}
                      {expandedPost === postItem.post_id && (
                        <div className="border-t border-base-300">
                          <CommentsRenderer postId={postItem.post_id} />
                        </div>
                      )}
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
    </div>
  );
};

export default CollectiveHome;
