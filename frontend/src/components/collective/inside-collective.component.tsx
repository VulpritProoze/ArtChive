import { useEffect, useRef, useState } from "react";
import { useCollectivePostContext } from "@context/collective-post-context";
import useCollective from "@hooks/use-collective";
import { useParams, useNavigate } from "react-router-dom";
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
import { CollectiveLayout } from "@components/common/layout";
import { PostCard, InfiniteScrolling } from "@components/common/posts-feature";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";
import { 
  SkeletonPostCard,
  SkeletonCollectiveSidebar,
  SkeletonCollectiveInfo,
  SkeletonHeroImage,
} from "@components/common/skeleton";
import {
  faRightFromBracket,
  faUserShield,
  faCheck,
  faBars,
  faTimes,
  faUsers,
  faUserCog,
  faInfoCircle,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { usePosts } from "@hooks/queries/use-posts";
import { usePostUI } from "@context/post-ui-context";
import { useCollectiveData } from "@hooks/queries/use-collective-data";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const { showCommentForm, showPostForm, setShowPostForm } = usePostUI();
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
  const { user, isAdminOfACollective, isMemberOfACollective } = useAuth();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);
  const [showChannelsDropdown, setShowChannelsDropdown] = useState(true);
  const [showMediaDropdown, setShowMediaDropdown] = useState(false);
  const [showJoinedDropdown, setShowJoinedDropdown] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const [isApplyingAsAdmin, setIsApplyingAsAdmin] = useState(false);
  const [isLeavingCollective, setIsLeavingCollective] = useState(false);
  const joinedButtonRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);
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

  const posts = postsData?.pages.flatMap((page) => page.results) || [];
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

      <CollectiveLayout showSidebar={false} showRightSidebar={false}>
        {/* Mobile Menu Bar - Sticky below header */}
        <div className="sticky top-16 z-40 lg:hidden bg-base-100/80 backdrop-blur-sm border-b border-base-300 -mx-4 px-4">
          <div className="flex items-center justify-between gap-2 my-2">
            <button
              className="btn btn-ghost btn-sm gap-2"
              onClick={() => setShowMobileSidebar(true)}
              aria-label="Open sidebar menu"
            >
              <FontAwesomeIcon icon={faBars} className="text-lg" />
              <span className="font-semibold">Menu</span>
            </button>
            {collectiveData && (
              <button
                className="btn btn-ghost btn-sm gap-2"
                onClick={() => setShowRightSidebar(true)}
                aria-label="Open right sidebar"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="text-lg" />
                <span className="font-semibold">Info</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sidebar Backdrop */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Mobile Right Sidebar Backdrop */}
        {showRightSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setShowRightSidebar(false)}
          />
        )}

        <div className="flex gap-6">
          {/* LEFT SIDEBAR - Custom for Collective */}
          {/* Desktop Sidebar */}
          <aside className="w-60 flex-shrink-0 hidden lg:block">
            {loadingCollective ? (
              <SkeletonCollectiveSidebar />
            ) : collectiveData ? (
              <div className="bg-base-200/50 rounded-xl p-3 sticky top-20">
                {/* Back to Collectives Button */}
                <button
                  onClick={() => navigate('/collective')}
                  className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm hover:bg-base-300 rounded transition-colors"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                  <span>Back to Collectives</span>
                </button>

                {/* Collective Name Dropdown */}
                <button className="w-full flex items-center justify-between p-3 hover:bg-base-300 rounded-lg mb-2 font-bold text-lg">
                  <span>{collectiveData.title}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Navigation Links */}
                <div className="mb-4 space-y-1">
                  <button
                    onClick={() => navigate(`/collective/${collectiveId}/members`)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded transition-colors"
                  >
                    <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                    <span>Members</span>
                  </button>
                  {isAdminOfACollective(collectiveData.collective_id) && (
                    <button
                      onClick={() => navigate(`/collective/${collectiveId}/admin`)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded transition-colors"
                    >
                      <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                </div>

                {/* POST CHANNELS Section */}
                <div className="mb-4">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                    onClick={() => setShowChannelsDropdown(!showChannelsDropdown)}
                  >
                    <span>POST CHANNELS</span>
                    <svg className={`w-4 h-4 transition-transform ${showChannelsDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showChannelsDropdown && (
                    <div className="mt-1 space-y-1">
                      {collectiveData.channels.filter(ch => ch.channel_type === 'Post Channel').length > 0 ? (
                        collectiveData.channels
                          .filter(ch => ch.channel_type === 'Post Channel')
                          .map((channel) => (
                            <button
                              key={channel.channel_id}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                selectedChannel?.channel_id === channel.channel_id
                                  ? 'bg-primary text-primary-content'
                                  : 'hover:bg-base-300'
                              }`}
                              onClick={() => handleChannelClick(channel)}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base-content/50">#</span>
                                {channel.title}
                              </span>
                              {selectedChannel?.channel_id === channel.channel_id && (
                                <span className="badge badge-sm">{channel.posts_count ?? '?'}</span>
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-base-content/50">
                          No channels
                        </div>
                      )}
                      {isAdminOfACollective(collectiveData.collective_id) && (
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded text-base-content/70"
                          onClick={() => setShowCreateChannelModal(true)}
                        >
                          <span>+</span>
                          <span>Create Channel</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* MEDIA CHANNELS Section */}
                <div className="mb-4">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                    onClick={() => setShowMediaDropdown(!showMediaDropdown)}
                  >
                    <span>MEDIA CHANNELS</span>
                    <svg className={`w-4 h-4 transition-transform ${showMediaDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showMediaDropdown && (
                    <div className="mt-1 space-y-1">
                      {collectiveData.channels.filter(ch => ch.channel_type === 'Media Channel').length > 0 ? (
                        collectiveData.channels
                          .filter(ch => ch.channel_type === 'Media Channel')
                          .map((channel) => (
                            <button
                              key={channel.channel_id}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                selectedChannel?.channel_id === channel.channel_id
                                  ? 'bg-primary text-primary-content'
                                  : 'hover:bg-base-300'
                              }`}
                              onClick={() => handleChannelClick(channel)}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base-content/50">#</span>
                                {channel.title}
                              </span>
                              {selectedChannel?.channel_id === channel.channel_id && (
                                <span className="badge badge-sm">{channel.posts_count ?? '?'}</span>
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-base-content/50">
                          No channels
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* EVENTS Section */}
                <div>
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                    onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                  >
                    <span>EVENTS</span>
                    <svg className={`w-4 h-4 transition-transform ${showEventsDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showEventsDropdown && (
                    <div className="mt-1 space-y-1">
                      {collectiveData.channels.filter(ch => ch.channel_type === 'Event Channel').length > 0 ? (
                        collectiveData.channels
                          .filter(ch => ch.channel_type === 'Event Channel')
                          .map((channel) => (
                            <button
                              key={channel.channel_id}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                selectedChannel?.channel_id === channel.channel_id
                                  ? 'bg-primary text-primary-content'
                                  : 'hover:bg-base-300'
                              }`}
                              onClick={() => handleChannelClick(channel)}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-base-content/50">#</span>
                                {channel.title}
                              </span>
                              {selectedChannel?.channel_id === channel.channel_id && (
                                <span className="badge badge-sm">{channel.posts_count ?? '?'}</span>
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-base-content/50">
                          No channels
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <SkeletonCollectiveSidebar className="sticky top-20" />
            )}
          </aside>

          {/* Mobile Sidebar - Slide-in drawer */}
          <aside
            className={`fixed z-70 top-0 left-0 h-full w-72 bg-base-200 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="p-4">
              {loadingCollective ? (
                <SkeletonCollectiveSidebar />
              ) : collectiveData ? (
                <>
                  {/* Close button */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">{collectiveData.title}</h2>
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => setShowMobileSidebar(false)}
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                  </div>

                  {/* Back to Collectives Button */}
                  <button
                    onClick={() => {
                      navigate('/collective');
                      setShowMobileSidebar(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-4 text-sm hover:bg-base-300 rounded transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                    <span>Back to Collectives</span>
                  </button>

                  {/* Navigation Links */}
                  <div className="mb-4 space-y-1">
                    <button
                      onClick={() => {
                        navigate(`/collective/${collectiveId}/members`);
                        setShowMobileSidebar(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded transition-colors"
                    >
                      <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
                      <span>Members</span>
                    </button>
                    {isAdminOfACollective(collectiveData.collective_id) && (
                      <button
                        onClick={() => {
                          navigate(`/collective/${collectiveId}/admin`);
                          setShowMobileSidebar(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded transition-colors"
                      >
                        <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                  </div>

                  {/* POST CHANNELS Section */}
                  <div className="mb-4">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                      onClick={() => setShowChannelsDropdown(!showChannelsDropdown)}
                    >
                      <span>POST CHANNELS</span>
                      <svg className={`w-4 h-4 transition-transform ${showChannelsDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showChannelsDropdown && (
                      <div className="mt-1 space-y-1">
                        {collectiveData.channels.filter(ch => ch.channel_type === 'Post Channel').length > 0 ? (
                          collectiveData.channels
                            .filter(ch => ch.channel_type === 'Post Channel')
                            .map((channel) => (
                              <button
                                key={channel.channel_id}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                  selectedChannel?.channel_id === channel.channel_id
                                    ? 'bg-primary text-primary-content'
                                    : 'hover:bg-base-300'
                                }`}
                                onClick={() => {
                                  handleChannelClick(channel);
                                  setShowMobileSidebar(false);
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-base-content/50">#</span>
                                  {channel.title}
                                </span>
                                {selectedChannel?.channel_id === channel.channel_id && (
                                  <span className="badge badge-sm">{channel.posts_count ?? '?'}</span>
                                )}
                              </button>
                            ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-base-content/50">
                            No channels
                          </div>
                        )}
                        {isAdminOfACollective(collectiveData.collective_id) && (
                          <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded text-base-content/70"
                            onClick={() => {
                              setShowCreateChannelModal(true);
                              setShowMobileSidebar(false);
                            }}
                          >
                            <span>+</span>
                            <span>Create Channel</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* MEDIA CHANNELS Section */}
                  <div className="mb-4">
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                      onClick={() => setShowMediaDropdown(!showMediaDropdown)}
                    >
                      <span>MEDIA CHANNELS</span>
                      <svg className={`w-4 h-4 transition-transform ${showMediaDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showMediaDropdown && (
                      <div className="mt-1 space-y-1">
                        {collectiveData.channels.filter(ch => ch.channel_type === 'Media Channel').length > 0 ? (
                          collectiveData.channels
                            .filter(ch => ch.channel_type === 'Media Channel')
                            .map((channel) => (
                              <button
                                key={channel.channel_id}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                  selectedChannel?.channel_id === channel.channel_id
                                    ? 'bg-primary text-primary-content'
                                    : 'hover:bg-base-300'
                                }`}
                                onClick={() => {
                                  handleChannelClick(channel);
                                  setShowMobileSidebar(false);
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-base-content/50">#</span>
                                  {channel.title}
                                </span>
                                {selectedChannel?.channel_id === channel.channel_id && (
                                  <span className="badge badge-sm">{channel.posts_count ?? '?'}</span>
                                )}
                              </button>
                            ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-base-content/50">
                            No channels
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* EVENTS Section */}
                  <div>
                    <button
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content"
                      onClick={() => setShowEventsDropdown(!showEventsDropdown)}
                    >
                      <span>EVENTS</span>
                      <svg className={`w-4 h-4 transition-transform ${showEventsDropdown ? 'rotate-0' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showEventsDropdown && (
                      <div className="mt-1 space-y-1">
                        {collectiveData.channels.filter(ch => ch.channel_type === 'Event Channel').length > 0 ? (
                          collectiveData.channels
                            .filter(ch => ch.channel_type === 'Event Channel')
                            .map((channel) => (
                              <button
                                key={channel.channel_id}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                                  selectedChannel?.channel_id === channel.channel_id
                                    ? 'bg-primary text-primary-content'
                                    : 'hover:bg-base-300'
                                }`}
                                onClick={() => {
                                  handleChannelClick(channel);
                                  setShowMobileSidebar(false);
                                }}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-base-content/50">#</span>
                                  {channel.title}
                                </span>
                                {selectedChannel?.channel_id === channel.channel_id && (
                                  <span className="badge badge-sm">88</span>
                                )}
                              </button>
                            ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-base-content/50">
                            No channels
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <SkeletonCollectiveSidebar />
              )}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0">
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
                      className="bg-primary text-primary-content px-3 py-1 bg-base-200 text-sm rounded-full"
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
                {arePostsLoading && posts.length === 0 && (
                  <SkeletonPostCard
                    count={3}
                    containerClassName="flex flex-col gap-6"
                  />
                )}

                {posts.map((postItem) => (
                  <PostCard key={postItem.post_id} postItem={{ ...postItem, novel_post: postItem.novel_post || [] }} />
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
          </main>

          {/* RIGHT SIDEBAR */}
          {collectiveData && (
            <>
              {/* Desktop Right Sidebar */}
              <aside className="w-80 flex-shrink-0 hidden xl:block">
                <div className="sticky top-20 space-y-6">
                  {/* About Section */}
                  <div className="bg-base-200/50 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-3">About</h3>
                    <p className="text-sm text-base-content/80">
                      {collectiveData.description}
                    </p>
                  </div>

                  {/* Rules Section */}
                  <div className="bg-base-200/50 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-3">Rules</h3>
                    <ol className="space-y-2 text-sm">
                      {collectiveData.rules.map((rule, index) => (
                        <li key={index} className="text-base-content/80">
                          {index + 1}. {rule}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Details Section */}
                  <div className="bg-base-200/50 rounded-xl p-4">
                    <h3 className="text-lg font-bold mb-3">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-base-content/80">
                        <span>🔒</span>
                        <span>Private Group</span>
                      </div>
                      <div className="flex items-center gap-2 text-base-content/80">
                        <span>👁️</span>
                        <span>Visible to Members Only</span>
                      </div>
                      <div className="flex items-center gap-2 text-base-content/80">
                        <span>📅</span>
                        <span>Created: {new Date(collectiveData.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  {isAdminOfACollective(collectiveData.collective_id) && (
                    <div className="bg-base-200/50 rounded-xl p-4">
                      <h3 className="text-lg font-bold mb-3">Admin Actions</h3>
                      <div className="space-y-2">
                        {selectedChannel && (
                          <>
                            <button
                              className="btn btn-sm btn-info w-full justify-start gap-2"
                              onClick={() => setEditingChannel(selectedChannel)}
                            >
                              <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                              Update Channel
                            </button>
                            <button
                              className="btn btn-sm btn-error w-full justify-start gap-2"
                              onClick={() => {
                                if (window.confirm(`Delete channel "${selectedChannel.title}"?`) && collectiveData) {
                                  handleDeleteChannel(collectiveData.collective_id, selectedChannel.channel_id);
                                }
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                              Delete Channel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Leave Collective */}
                  {isMemberOfACollective(collectiveData.collective_id) && (
                    <button
                      className="btn btn-error w-full gap-2"
                      onClick={async () => {
                        setIsLeavingCollective(true);
                        try {
                          await handleLeaveCollective(collectiveData.collective_id);
                        } finally {
                          setIsLeavingCollective(false);
                        }
                      }}
                      disabled={isLeavingCollective}
                    >
                      {isLeavingCollective ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
                      )}
                      {isLeavingCollective ? "Leaving..." : "Leave Collective"}
                    </button>
                  )}
                </div>
              </aside>

              {/* Mobile Right Sidebar - Slide-in drawer */}
              <aside
                ref={rightSidebarRef}
                className={`fixed z-70 top-0 right-0 h-full w-80 bg-base-200 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${
                  showRightSidebar ? 'translate-x-0' : 'translate-x-full'
                }`}
              >
                <div className="p-4">
                  {/* Close button */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">{collectiveData ? collectiveData.title : "Collective Info" }</h2>
                    <button
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() => setShowRightSidebar(false)}
                    >
                      <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* About Section */}
                    <div className="bg-base-100 rounded-xl p-4">
                      <h3 className="text-lg font-bold mb-3">About</h3>
                      <p className="text-sm text-base-content/80">
                        {collectiveData.description}
                      </p>
                    </div>

                    {/* Rules Section */}
                    <div className="bg-base-100 rounded-xl p-4">
                      <h3 className="text-lg font-bold mb-3">Rules</h3>
                      <ol className="space-y-2 text-sm">
                        {collectiveData.rules.map((rule, index) => (
                          <li key={index} className="text-base-content/80">
                            {index + 1}. {rule}
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Details Section */}
                    <div className="bg-base-100 rounded-xl p-4">
                      <h3 className="text-lg font-bold mb-3">Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-base-content/80">
                          <span>🔒</span>
                          <span>Private Group</span>
                        </div>
                        <div className="flex items-center gap-2 text-base-content/80">
                          <span>👁️</span>
                          <span>Visible to Members Only</span>
                        </div>
                        <div className="flex items-center gap-2 text-base-content/80">
                          <span>📅</span>
                          <span>Created: {new Date(collectiveData.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdminOfACollective(collectiveData.collective_id) && (
                      <div className="bg-base-100 rounded-xl p-4">
                        <h3 className="text-lg font-bold mb-3">Admin Actions</h3>
                        <div className="space-y-2">
                          {selectedChannel && (
                            <>
                              <button
                                className="btn btn-sm btn-info w-full justify-start gap-2"
                                onClick={() => {
                                  setEditingChannel(selectedChannel);
                                  setShowRightSidebar(false);
                                }}
                              >
                                <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                                Update Channel
                              </button>
                              <button
                                className="btn btn-sm btn-error w-full justify-start gap-2"
                                onClick={() => {
                                  if (window.confirm(`Delete channel "${selectedChannel.title}"?`) && collectiveData) {
                                    handleDeleteChannel(collectiveData.collective_id, selectedChannel.channel_id);
                                    setShowRightSidebar(false);
                                  }
                                }}
                              >
                                <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                                Delete Channel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Leave Collective */}
                    {isMemberOfACollective(collectiveData.collective_id) && (
                      <button
                        className="btn btn-error w-full gap-2"
                        onClick={async () => {
                          setIsLeavingCollective(true);
                          try {
                            await handleLeaveCollective(collectiveData.collective_id);
                            setShowRightSidebar(false);
                          } finally {
                            setIsLeavingCollective(false);
                          }
                        }}
                        disabled={isLeavingCollective}
                      >
                        {isLeavingCollective ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
                        )}
                        {isLeavingCollective ? "Leaving..." : "Leave Collective"}
                      </button>
                    )}
                  </div>
                </div>
              </aside>
            </>
          )}
        </div>
      </CollectiveLayout>
    </>
  );
};

export default CollectiveHome;