import { useEffect, useRef, useState } from "react";
import { usePostContext } from "@context/post-context";
import { useCollectivePostContext } from "@context/collective-post-context";
import useCollective from "@hooks/use-collective";
import { useParams, useNavigate } from "react-router-dom";
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
import { MainLayout } from "@components/common/layout";
import { PostCard, PostLoadingIndicator } from "@components/common/posts-feature";
import { LoadingSpinner } from "../loading-spinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUserShield, faCheck, faBars, faTimes, faUsers, faUserCog } from "@fortawesome/free-solid-svg-icons";

const CollectiveHome = () => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const {
    showCommentForm,
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
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);
  const [showChannelsDropdown, setShowChannelsDropdown] = useState(true);
  const [showMediaDropdown, setShowMediaDropdown] = useState(false);
  const [showJoinedDropdown, setShowJoinedDropdown] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const joinedButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCollectiveData(collectiveId);
  }, [collectiveId]);

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

  const handleChannelClick = async (channel: Channel) => {
    const channelWithCollectiveId = {
      ...channel,
      collective_id: collectiveData?.collective_id || channel.collective_id,
    };
    setSelectedChannel(channelWithCollectiveId);
    setPostForm((prev) => ({ ...prev, channel_id: channel.channel_id }));
    await fetchPosts(1, false, channel.channel_id);
    setExpandedPost(null);
  };

  if (!collectiveData) {
    return (
      <MainLayout showSidebar={false} showRightSidebar={false}>
        <LoadingSpinner text={"Loading collective..."}></LoadingSpinner>
      </MainLayout>
    );
  }

  return (
    <>
      {/* Modals */}
      {editingChannel && <ChannelEditModal />}
      {showCreateChannelModal && <ChannelCreateModal />}
      {activePost && <PostViewModal />}
      {showPostForm && <PostFormModal channel_id={selectedChannel?.channel_id} />}
      {showCommentForm && <CommentFormModal channel_id={selectedChannel?.channel_id} />}

      <MainLayout showSidebar={false} showRightSidebar={false}>
        {/* Mobile Menu Button - Fixed at top */}
        <button
          className="fixed top-20 left-4 z-50 lg:hidden btn btn-circle btn-primary shadow-lg"
          onClick={() => setShowMobileSidebar(true)}
          aria-label="Open sidebar menu"
        >
          <FontAwesomeIcon icon={faBars} className="text-xl" />
        </button>

        {/* Mobile Sidebar Backdrop */}
        {showMobileSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        <div className="flex gap-6">
          {/* LEFT SIDEBAR - Custom for Collective */}
          {/* Desktop Sidebar */}
          <aside className="w-60 flex-shrink-0 hidden lg:block">
            <div className="bg-base-200/50 rounded-xl p-3 sticky top-20">
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

              {/* EVENTS Section */}
              <div className="mb-4">
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
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>📅</span>
                      <span>Community Exhibition</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>🎙️</span>
                      <span>Live Critique Session</span>
                    </button>
                  </div>
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
                    {collectiveData.channels.map((channel) => (
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
                          <span className="badge badge-sm">88</span>
                        )}
                      </button>
                    ))}
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
              <div>
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
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>🎤</span>
                      <span>voice-chat</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>📹</span>
                      <span>live-streams</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Mobile Sidebar - Slide-in drawer */}
          <aside
            className={`fixed top-0 left-0 h-full w-72 bg-base-200 z-50 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${
              showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="p-4">
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

              {/* EVENTS Section */}
              <div className="mb-4">
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
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>📅</span>
                      <span>Community Exhibition</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>🎙️</span>
                      <span>Live Critique Session</span>
                    </button>
                  </div>
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
                    {collectiveData.channels.map((channel) => (
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
                    ))}
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
              <div>
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
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>🎤</span>
                      <span>voice-chat</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded">
                      <span>📹</span>
                      <span>live-streams</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="flex-1 min-w-0">
            {/* Hero Image */}
            <div className="w-full h-64 bg-gradient-to-r from-orange-400 via-yellow-300 to-blue-300 rounded-xl mb-6 overflow-hidden">
              <img
                src={collectiveData.banner_image || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5"}
                alt={collectiveData.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Collective Info Section */}
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
                    className="px-3 py-1 bg-base-200 text-sm rounded-full"
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
                        src={member.profile_picture}
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
                <button className="btn btn-primary">
                  <span className="mr-2">+</span>
                  Invite
                </button>
                <button className="btn btn-outline">
                  <span className="mr-2">📤</span>
                  Share
                </button>
                {isMemberOfACollective(collectiveData.collective_id) ? (
                  <div
                    className="relative"
                    ref={joinedButtonRef}
                    onMouseEnter={() => setShowJoinedDropdown(true)}
                    onMouseLeave={() => setShowJoinedDropdown(false)}
                  >
                    <button className="btn btn-success">
                      <FontAwesomeIcon icon={faCheck} className="mr-2" />
                      Joined
                    </button>

                    {/* Dropdown Menu */}
                    {showJoinedDropdown && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-base-100 rounded-lg shadow-xl border border-base-300 z-50 overflow-hidden">
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-error hover:text-error-content transition-colors flex items-center gap-3 group"
                          onClick={() => {
                            handleLeaveCollective(collectiveData.collective_id);
                            setShowJoinedDropdown(false);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faRightFromBracket}
                            className="w-4 h-4 text-error group-hover:text-error-content"
                          />
                          <div>
                            <div className="font-semibold">Leave Collective</div>
                            <div className="text-xs opacity-70">You can rejoin anytime</div>
                          </div>
                        </button>

                        <div className="border-t border-base-300"></div>

                        <button
                          className="w-full px-4 py-3 text-left hover:bg-base-200 transition-colors flex items-center gap-3"
                          onClick={() => {
                            handleBecomeAdmin(collectiveData.collective_id);
                            setShowJoinedDropdown(false);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={faUserShield}
                            className="w-4 h-4 text-primary"
                          />
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

              {/* Post Input */}
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
            </div>

            {/* Posts Feed */}
            {selectedChannel && (
              <div className="space-y-6">
                {loading && posts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="loading loading-spinner loading-lg"></div>
                    <p className="mt-2 text-base-content/70">Loading posts...</p>
                  </div>
                )}

                {posts.map((postItem) => (
                  <PostCard key={postItem.post_id} postItem={postItem} />
                ))}

                {posts.length === 0 && !loading && (
                  <div className="text-center py-12 bg-base-200/50 rounded-xl">
                    <p className="text-base-content/70">
                      No posts yet in this channel. Be the first to post!
                    </p>
                  </div>
                )}

                <PostLoadingIndicator observerTarget={observerTarget} />
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR */}
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
                          className="btn btn-sm btn-info w-full"
                          onClick={() => setEditingChannel(selectedChannel)}
                        >
                          Update Channel
                        </button>
                        <button
                          className="btn btn-sm btn-error w-full"
                          onClick={() => {
                            if (window.confirm(`Delete channel "${selectedChannel.title}"?`)) {
                              handleDeleteChannel(selectedChannel.channel_id);
                            }
                          }}
                        >
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
                  className="btn btn-error w-full"
                  onClick={() => handleLeaveCollective(collectiveData.collective_id)}
                >
                  Leave Collective
                </button>
              )}
            </div>
          </aside>
        </div>
      </MainLayout>
    </>
  );
};

export default CollectiveHome;