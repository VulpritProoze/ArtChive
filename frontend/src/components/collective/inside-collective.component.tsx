import { useEffect, useRef } from "react";
import { usePostContext } from "@context/post-context";
import { useCollectivePostContext } from "@context/collective-post-context";
import useCollective from "@hooks/use-collective";
import { useParams } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import {
  PostFormModal,
  CommentFormModal,
  PostViewModal,
} from "@components/common/posts-feature/modal";
import {
  ChannelCreateModal,
  ChannelEditModal,
} from "@components/common/collective-feature/modal";
import type { Channel } from "@types";

import { PostCard, PostLoadingIndicator } from "@components/common/posts-feature";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const {
    showCommentForm,
    // Posts
    posts,
    pagination,
    showPostForm,
    setShowPostForm,
    setPostForm,
    loading,
    setExpandedPost,
    loadingMore,
    fetchPosts,
    activePost
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
    {/* Channel Edit Modal */}
    {editingChannel && <ChannelEditModal />}

    {/* Channel Create Modal */}
    {showCreateChannelModal && <ChannelCreateModal />}

    {activePost && (
      <PostViewModal />
    )}

    {/* Post Form Modal */}
    {showPostForm && (
      <PostFormModal channel_id={selectedChannel.channel_id} />
    )}

    {/* Comment Form Modal */}
    {showCommentForm && (
      <CommentFormModal channel_id={selectedChannel.channel_id} />
    )}

      {/* Header */}
      

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
                    <PostCard postItem={postItem} />
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
