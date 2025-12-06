import { useEffect, useRef, useState } from "react";
import { useCollectivePostContext } from "@context/collective-post-context";
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
import type { Channel } from "@types";
import { CollectiveLayout } from "@components/common/layout/CollectiveLayout";
import { PostCard, InfiniteScrolling } from "@components/common/posts-feature";
import { CollectiveSearch } from "@components/collective/collective-search.component";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import {
  SkeletonPostCard,
  SkeletonCollectiveInfo,
  SkeletonHeroImage,
} from "@components/common/skeleton";
import {
  faRightFromBracket,
  faUserShield,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { usePosts } from "@hooks/queries/use-posts";
import { usePostUI } from "@context/post-ui-context";
import { useCollectiveData } from "@hooks/queries/use-collective-data";
import { usePostsMeta } from "@hooks/queries/use-post-meta";
import { useMemo } from "react";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const { showCommentForm, showPostForm, setShowPostForm } = usePostUI();
  const { user, isMemberOfACollective } = useAuth();
  
  // Use React Query hook for collective data (prevents infinite loop)
  const {
    data: collectiveData,
    isLoading: loadingCollective,
  } = useCollectiveData(collectiveId);

  const {
    selectedChannel,
    setSelectedChannel,
    showCreateChannelModal,
    setShowCreateChannelModal,
    setEditingChannel,
    handleDeleteChannel,
    editingChannel,
  } = useCollectivePostContext();
  const { handleBecomeAdmin, handleLeaveCollective } = useCollective();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [showJoinedDropdown, setShowJoinedDropdown] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const [isApplyingAsAdmin, setIsApplyingAsAdmin] = useState(false);
  const [isLeavingCollective, setIsLeavingCollective] = useState(false);
  const joinedButtonRef = useRef<HTMLDivElement>(null);
  const hasAutoSelectedChannel = useRef(false);

  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: arePostsLoading,
    isError: isPostsError,
    error: postsError,
  } = usePosts({
    channelId: selectedChannel?.channel_id,
    enabled: Boolean(selectedChannel?.channel_id && selectedChannel?.channel_type === 'Post Channel'),
  });

  const postIds = useMemo(() => {
    if (!postsData) return [];
    return postsData.pages.flatMap(page =>
      page.results.map(p => p.post_id)
    );
  }, [postsData]);

  const {
    data: metaData,
    isLoading: metaLoading
  } = usePostsMeta(postIds, postIds.length > 0);

  const enrichedPosts = useMemo(() => {
    if (!postsData) return [];
    return postsData.pages.flatMap(page =>
      page.results.map(post => ({
        ...post,
        ...(metaData?.[post.post_id] || {
          hearts_count: 0,
          praise_count: 0,
          trophy_count: 0,
          comment_count: 0,
          user_trophies: [],
          trophy_breakdown: {},
          is_hearted: false,
          is_praised: false,
        }),
        trophy_counts_by_type: metaData?.[post.post_id]?.trophy_breakdown || {},
        user_awarded_trophies: metaData?.[post.post_id]?.user_trophies || [],
        // Map is_hearted/is_praised from meta to Post interface fields
        // Always default to false if meta data is not available
        is_hearted_by_user: metaData?.[post.post_id]?.is_hearted ?? false,
        is_praised_by_user: metaData?.[post.post_id]?.is_praised ?? false,
      }))
    );
  }, [postsData, metaData]);

  const showCountsLoading = metaLoading && !metaData;
  const posts = enrichedPosts;
  const totalPosts = postsData?.pages[0]?.count || 0;

  // Show error toast when posts fail to load
  useEffect(() => {
    if (isPostsError && postsError) {
      const message = handleApiError(postsError, {}, true, true);
      toast.error('Failed to load posts', formatErrorForToast(message));
    }
  }, [isPostsError, postsError]);

  // Reset UI state when collective changes (data fetching handled by React Query)
  useEffect(() => {
    setHeroImageError(false); // Reset error state when collective changes
    hasAutoSelectedChannel.current = false; // Reset when collective changes
  }, [collectiveId]);

  // Auto-select "General" channel or first channel when collective data loads
  useEffect(() => {
    if (
      collectiveData &&
      collectiveData.channels &&
      collectiveData.channels.length > 0 &&
      !hasAutoSelectedChannel.current
    ) {
      // Check if current selectedChannel belongs to this collective
      const currentChannelBelongsToCollective = selectedChannel &&
        collectiveData.channels.some(
          (ch) => ch.channel_id === selectedChannel.channel_id
        );

      // Only auto-select if no channel is selected or selected channel doesn't belong to this collective
      if (!currentChannelBelongsToCollective) {
        // Try to find "General" Post Channel first (prioritize Post Channels)
        const generalPostChannel = collectiveData.channels.find(
          (ch) => ch.title.toLowerCase() === 'general' && ch.channel_type === 'Post Channel'
        );

        // If no "General" Post Channel, try any "General" channel
        const generalChannel = generalPostChannel || collectiveData.channels.find(
          (ch) => ch.title.toLowerCase() === 'general'
        );

        const channelToSelect = generalChannel || collectiveData.channels[0];

        if (channelToSelect) {
          hasAutoSelectedChannel.current = true;
          const channelWithCollectiveId = {
            ...channelToSelect,
            collective_id: collectiveData.collective_id,
          };
          setSelectedChannel(channelWithCollectiveId);
        }
      } else {
        // Channel already selected and belongs to this collective, mark as auto-selected
        hasAutoSelectedChannel.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectiveData?.collective_id, collectiveData?.channels?.length, selectedChannel?.channel_id]);

  // Handle click outside for joined dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (joinedButtonRef.current && !joinedButtonRef.current.contains(event.target as Node)) {
        setShowJoinedDropdown(false);
      }
    };

    if (showJoinedDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showJoinedDropdown]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) {
      return;
    }

    let isFetching = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !arePostsLoading &&
          !isFetching &&
          selectedChannel &&
          selectedChannel.channel_type === 'Post Channel'
        ) {
          isFetching = true;
          fetchNextPage().finally(() => {
            isFetching = false;
          });
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, arePostsLoading, fetchNextPage, selectedChannel]);

  const handleChannelClick = (channel: Channel) => {
    const channelWithCollectiveId = {
      ...channel,
      collective_id: collectiveData?.collective_id || channel.collective_id,
    };
    setSelectedChannel(channelWithCollectiveId);
  };

  return (
    <>
      {/* Modals */}
      {editingChannel && <ChannelEditModal />}
      {showCreateChannelModal && <ChannelCreateModal />}
      {showPostForm && <PostFormModal channel_id={selectedChannel?.channel_id} />}
      {showCommentForm && <CommentFormModal />}

      <CollectiveLayout
        showSidebar={true}
        showRightSidebar={false}
        collectiveData={collectiveData}
        loadingCollective={loadingCollective}
        selectedChannel={selectedChannel || undefined}
        onChannelClick={handleChannelClick}
        onShowCreateChannelModal={() => setShowCreateChannelModal(true)}
        onSetEditingChannel={setEditingChannel}
        onDeleteChannel={handleDeleteChannel}
      >
        {/* Hero Image */}
        {collectiveData ? (
              <div className="w-full h-64 bg-gradient-to-r from-orange-400 via-yellow-300 to-blue-300 rounded-xl mb-6 overflow-hidden">
                {!heroImageError && (
                  <img
                    src={collectiveData.picture}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => {
                      setHeroImageError(true);
                    }}
                  />
                )}
              </div>
            ) : (
              <SkeletonHeroImage className="mb-6" />
            )}
            {/* Collective Info Section */}
            {collectiveData ? (
              <div className="bg-base-100 rounded-xl p-6 mb-6 shadow-md">
                <h1 className="text-3xl font-bold mb-3">{collectiveData.title}</h1>

                <div className="flex items-center gap-4 mb-4 text-sm text-base-content/70">
                  <span className="flex items-center gap-1">
                    🔒 Private Group
                  </span>
                  <span className="flex items-center gap-1">
                    👥 {collectiveData.member_count || 0} members
                  </span>
                </div>

                {/* Artist Types */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {collectiveData.artist_types.map((type, index) => (
                    <span
                      key={index}
                      className="bg-base-200 px-3 py-1 text-sm rounded-full"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                {/* Member Avatars */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {collectiveData.members.slice(0, 10).map((member) => (
                      <div key={member.id} className="w-10 h-10 rounded-full border-2 border-base-100 overflow-hidden">
                        <img
                          src={member.profile_picture || undefined}
                          alt={member.username}
                          className="w-full h-full object-cover"
                          title={`@${member.username}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-6">
                  <div title="Coming soon...">
                    <button className="btn btn-primary" disabled>
                      <span className="mr-2">+</span>
                      Invite
                    </button>
                  </div>
                  <div title="Coming soon...">
                    <button className="btn btn-outline" disabled>
                      <span className="mr-2">📤</span>
                      Share
                    </button>
                  </div>
                  {isMemberOfACollective(collectiveData.collective_id) ? (
                    <div
                      className="relative"
                      ref={joinedButtonRef}
                    >
                      <button
                        className="btn btn-success"
                        onClick={() => setShowJoinedDropdown(!showJoinedDropdown)}
                      >
                        <FontAwesomeIcon icon={faCheck} className="mr-2" />
                        Joined
                      </button>

                      {/* Dropdown Menu */}
                      {showJoinedDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 overflow-hidden">
                          <button
                            className="w-full px-4 py-3 text-left hover:bg-error hover:text-error-content transition-colors flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              setIsLeavingCollective(true);
                              try {
                                await handleLeaveCollective(collectiveData.collective_id);
                                setShowJoinedDropdown(false);
                              } finally {
                                setIsLeavingCollective(false);
                              }
                            }}
                            disabled={isLeavingCollective}
                          >
                            {isLeavingCollective ? (
                              <span className="loading loading-spinner loading-sm text-error"></span>
                            ) : (
                              <FontAwesomeIcon
                                icon={faRightFromBracket}
                                className="w-4 h-4 text-error group-hover:text-error-content"
                              />
                            )}
                            <div>
                              <div className="font-semibold">
                                {isLeavingCollective ? "Leaving..." : "Leave Collective"}
                              </div>
                              <div className="text-xs opacity-70">You can rejoin anytime</div>
                            </div>
                          </button>

                          <div className="border-t border-base-300"></div>

                          <button
                            className="w-full px-4 py-3 text-left hover:bg-base-200 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              setIsApplyingAsAdmin(true);
                              try {
                                await handleBecomeAdmin(collectiveData.collective_id);
                                setShowJoinedDropdown(false);
                              } finally {
                                setIsApplyingAsAdmin(false);
                              }
                            }}
                            disabled={isApplyingAsAdmin}
                          >
                            {isApplyingAsAdmin ? (
                              <span className="loading loading-spinner loading-sm text-primary"></span>
                            ) : (
                              <FontAwesomeIcon
                                icon={faUserShield}
                                className="w-4 h-4 text-primary"
                              />
                            )}
                            <div>
                              <div className="font-semibold">Apply to Join as Admin</div>
                              <div className="text-xs opacity-70">Request admin privileges</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button className="btn btn-outline">
                      Join
                    </button>
                  )}
                </div>

                {/* Post Input - Only show for Post Channel */}
                {selectedChannel?.channel_type === 'Post Channel' && (
                  <div className="flex items-center gap-3 p-4 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300 transition-colors" onClick={() => setShowPostForm(true)}>
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img src={user?.profile_picture || "https://via.placeholder.com/40"} alt="You" />
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Write something..."
                      className="flex-1 bg-transparent outline-none pointer-events-none"
                      readOnly
                    />
                    <div className="flex gap-2 text-base-content/50">
                      <button title="Anonymous" className="hover:text-base-content">👤</button>
                      <button title="Poll" className="hover:text-base-content">📊</button>
                      <button title="Feeling/Activity" className="hover:text-base-content">😊</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <SkeletonCollectiveInfo className="mb-6" />
            )}

            {/* Posts Feed - Only show for Post Channel */}
            {selectedChannel && selectedChannel.channel_type === 'Post Channel' && (
              <div className="space-y-6">
                {/* Search Button */}
                <div className="flex justify-end mb-4">
                  <CollectiveSearch
                    collectiveId={collectiveData?.collective_id || ''}
                    selectedChannel={selectedChannel}
                  />
                </div>

                {arePostsLoading && posts.length === 0 && (
                  <SkeletonPostCard
                    count={3}
                    containerClassName="flex flex-col gap-6"
                  />
                )}

                {posts.map((postItem) => (
                  <PostCard
                    key={postItem.post_id}
                    postItem={{ ...postItem, novel_post: postItem.novel_post || [] }}
                    countsLoading={showCountsLoading}
                  />
                ))}

                {posts.length === 0 && !arePostsLoading && (
                  <div className="text-center py-12 bg-base-200/50 rounded-xl">
                    <p className="text-base-content/70">
                      No posts yet in this channel. Be the first to post!
                    </p>
                  </div>
                )}

                <InfiniteScrolling
                  observerTarget={observerTarget}
                  isFetchingMore={isFetchingNextPage}
                  hasNextPage={hasNextPage}
                  totalCount={totalPosts}
                  itemCount={posts.length}
                />
              </div>
            )}

            {/* Placeholder for Media and Event Channels */}
            {selectedChannel && (selectedChannel.channel_type === 'Media Channel' || selectedChannel.channel_type === 'Event Channel') && (
              <div className="flex flex-col items-center justify-center py-20 px-6 bg-base-200/50 rounded-xl">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4 opacity-50">
                    {selectedChannel.channel_type === 'Media Channel' ? '🎬' : '📅'}
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-base-content">
                    Coming Soon
                  </h3>
                  <p className="text-base-content/70 text-lg leading-relaxed">
                    This section is currently under development. We're working hard to bring you an amazing experience. Stay tuned!
                  </p>
                </div>
              </div>
            )}
      </CollectiveLayout>
    </>
  );
};

export default CollectiveHome;