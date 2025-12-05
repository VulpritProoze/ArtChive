import React, { useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { MainLayout } from "./MainLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightFromBracket,
  faUserShield,
  faBars,
  faTimes,
  faUsers,
  faUserCog,
  faInfoCircle,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { SkeletonCollectiveSidebar } from "@components/common/skeleton";
import type { Channel } from "@types";
import { useAuth } from "@context/auth-context";
import { useCollectiveRequestCounts } from "@hooks/queries/use-collective-request-counts";
import useCollective from "@hooks/use-collective";

interface CollectiveLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showRightSidebar?: boolean; // Controls MainLayout's right sidebar
  showCollectiveRightSidebar?: boolean; // Controls CollectiveLayout's right sidebar
  skipMainLayout?: boolean;
  // Collective data
  collectiveData?: {
    collective_id: string;
    title: string;
    description: string;
    rules: string[];
    created_at: string;
    channels: Channel[];
  };
  loadingCollective?: boolean;
  // Channel management
  selectedChannel?: Channel;
  onChannelClick?: (channel: Channel) => void;
  onShowCreateChannelModal?: () => void;
  onSetEditingChannel?: (channel: Channel) => void;
  onDeleteChannel?: (collectiveId: string, channelId: string) => void;
}

export const CollectiveLayout: React.FC<CollectiveLayoutProps> = ({
  children,
  showSidebar = false,
  showRightSidebar = false, // MainLayout's right sidebar
  showCollectiveRightSidebar = true, // CollectiveLayout's right sidebar
  skipMainLayout = false,
  collectiveData,
  loadingCollective = false,
  selectedChannel,
  onChannelClick,
  onShowCreateChannelModal,
  onSetEditingChannel,
  onDeleteChannel,
}) => {
  const { collectiveId } = useParams<{ collectiveId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdminOfACollective, isMemberOfACollective } = useAuth();
  const { handleLeaveCollective } = useCollective();

  // Check if current route matches sidebar links
  const isMembersPage = location.pathname.includes('/members');
  const isAdminPage = location.pathname.includes('/admin');
  
  // Fetch request counts for admin badge
  const { data: requestCounts } = useCollectiveRequestCounts(
    collectiveId,
    isAdminOfACollective(collectiveData?.collective_id || '')
  );

  // Sidebar state - collapsed by default
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(true);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showRightSidebarState, setShowRightSidebarState] = useState(false);
  const [showChannelsDropdown, setShowChannelsDropdown] = useState(true);
  const [showMediaDropdown, setShowMediaDropdown] = useState(false);
  const [showEventsDropdown, setShowEventsDropdown] = useState(false);
  const [isLeavingCollective, setIsLeavingCollective] = useState(false);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  const handleChannelClick = (channel: Channel) => {
    if (onChannelClick) {
      const channelWithCollectiveId = {
        ...channel,
        collective_id: collectiveData?.collective_id || channel.collective_id,
      };
      onChannelClick(channelWithCollectiveId);
    }
  };

  const handleDeleteChannelClick = (channel: Channel) => {
    if (window.confirm(`Delete channel "${channel.title}"?`) && collectiveData && onDeleteChannel) {
      onDeleteChannel(collectiveData.collective_id, channel.channel_id);
    }
  };

  const handleLeaveClick = async () => {
    if (window.confirm('Are you sure you want to leave this collective? You can rejoin anytime.') && collectiveData) {
      setIsLeavingCollective(true);
      try {
        await handleLeaveCollective(collectiveData.collective_id);
        setShowRightSidebarState(false);
      } finally {
        setIsLeavingCollective(false);
      }
    }
  };

  const renderLeftSidebar = (isMobile = false) => {
    if (loadingCollective) {
      return <SkeletonCollectiveSidebar className={isMobile ? "" : "sticky top-20"} />;
    }

    if (!collectiveData) {
      return <SkeletonCollectiveSidebar className={isMobile ? "" : "sticky top-20"} />;
    }

    return (
      <div className={isMobile ? "p-4" : "bg-base-200/50 rounded-xl p-3 sticky top-20"}>
        {isMobile && (
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
          </>
        )}

        {/* Back to Collectives Button */}
        <button
          onClick={() => {
            navigate('/collective');
            if (isMobile) setShowMobileSidebar(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 mb-2 text-sm hover:bg-base-300 rounded transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          <span>Back to Collectives</span>
        </button>

        {/* Collective Name Dropdown */}
        {!isMobile && (
          <button className="w-full flex items-center justify-between p-3 hover:bg-base-300 rounded-lg mb-2 font-bold text-lg">
            <span>{collectiveData.title}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Navigation Links */}
        <div className="mb-4 space-y-1">
          <button
            onClick={() => {
              navigate(`/collective/${collectiveId}/members`);
              if (isMobile) setShowMobileSidebar(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
              isMembersPage
                ? 'bg-primary text-primary-content'
                : 'hover:bg-base-300'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} className="w-4 h-4" />
            <span>Members</span>
          </button>
          {isAdminOfACollective(collectiveData.collective_id) && (
            <button
              onClick={() => {
                navigate(`/collective/${collectiveId}/admin`);
                if (isMobile) setShowMobileSidebar(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                isAdminPage
                  ? 'bg-primary text-primary-content'
                  : 'hover:bg-base-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                <span>Admin Panel</span>
              </div>
              {requestCounts && requestCounts.total_pending_requests > 0 && (
                <span className="badge badge-error badge-sm">
                  {requestCounts.total_pending_requests}
                </span>
              )}
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${selectedChannel?.channel_id === channel.channel_id
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                        }`}
                      onClick={() => {
                        handleChannelClick(channel);
                        if (isMobile) setShowMobileSidebar(false);
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
              {isAdminOfACollective(collectiveData.collective_id) && onShowCreateChannelModal && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-base-300 rounded text-base-content/70"
                  onClick={() => {
                    onShowCreateChannelModal();
                    if (isMobile) setShowMobileSidebar(false);
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${selectedChannel?.channel_id === channel.channel_id
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                        }`}
                      onClick={() => {
                        handleChannelClick(channel);
                        if (isMobile) setShowMobileSidebar(false);
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
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${selectedChannel?.channel_id === channel.channel_id
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                        }`}
                      onClick={() => {
                        handleChannelClick(channel);
                        if (isMobile) setShowMobileSidebar(false);
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
      </div>
    );
  };

  const renderRightSidebar = (isMobile = false) => {
    if (!collectiveData) return null;

    return (
      <div className={isMobile ? "p-4" : "sticky top-20 space-y-6"}>
        {isMobile && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{collectiveData.title}</h2>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setShowRightSidebarState(false)}
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        )}

        <div className={isMobile ? "space-y-6" : ""}>
          {/* About Section */}
          <div className={`${isMobile ? "bg-base-100" : "bg-base-200/50"} rounded-xl p-4`}>
            <h3 className="text-lg font-bold mb-3">About</h3>
            <p className="text-sm text-base-content/80">
              {collectiveData.description}
            </p>
          </div>

          {/* Rules Section */}
          <div className={`${isMobile ? "bg-base-100" : "bg-base-200/50"} rounded-xl p-4`}>
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
          <div className={`${isMobile ? "bg-base-100" : "bg-base-200/50"} rounded-xl p-4`}>
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
            <div className={`${isMobile ? "bg-base-100" : "bg-base-200/50"} rounded-xl p-4 border border-primary/20`}>
              <div className="flex items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faUserShield} className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold">Admin Actions</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigate(`/collective/${collectiveId}/admin`);
                    if (isMobile) setShowRightSidebarState(false);
                  }}
                  className="btn btn-sm btn-primary w-full justify-start gap-2"
                >
                  <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                  <span>Admin Panel</span>
                  {requestCounts && requestCounts.total_pending_requests > 0 && (
                    <span className="badge badge-error badge-sm ml-auto">
                      {requestCounts.total_pending_requests}
                    </span>
                  )}
                </button>
                {selectedChannel && (
                  <div className="pt-2 border-t border-base-300">
                    <p className="text-xs text-base-content/60 mb-2 font-semibold">
                      Channel: {selectedChannel.title}
                    </p>
                    <div className="space-y-2">
                      {onSetEditingChannel && (
                        <button
                          className="btn btn-sm w-full justify-start gap-2"
                          onClick={() => {
                            onSetEditingChannel(selectedChannel);
                            if (isMobile) setShowRightSidebarState(false);
                          }}
                        >
                          <FontAwesomeIcon icon={faUserCog} className="w-4 h-4" />
                          Update Channel
                        </button>
                      )}
                      {onDeleteChannel && (
                        <button
                          className="btn btn-sm btn-error w-full justify-start gap-2"
                          onClick={() => {
                            handleDeleteChannelClick(selectedChannel);
                            if (isMobile) setShowRightSidebarState(false);
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                          Delete Channel
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {!selectedChannel && (
                  <p className="text-xs text-base-content/50 italic">
                    Select a channel to manage it
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Leave Collective */}
          {isMemberOfACollective(collectiveData.collective_id) && (
            <div className="bg-error/10 rounded-xl p-4 border border-error/30">
              <button
                className="btn btn-error w-full gap-2"
                onClick={handleLeaveClick}
                disabled={isLeavingCollective}
              >
                {isLeavingCollective ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
                )}
                {isLeavingCollective ? "Leaving..." : "Leave Collective"}
              </button>
              <p className="text-xs text-base-content/60 mt-2 text-center">
                You can rejoin anytime
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const content = (
    <>
      {/* Menu Bar - Sticky below header */}
      {collectiveData && (
        <div className="sticky top-16 z-40 bg-base-100/80 backdrop-blur-sm border-b border-base-300 -mx-4 px-4">
          <div className="flex items-center justify-between gap-2 my-2">
            {showSidebar && (
              <button
                className="btn btn-ghost btn-sm gap-2 lg:hidden"
                onClick={() => setShowMobileSidebar(true)}
                aria-label="Open sidebar menu"
              >
                <FontAwesomeIcon icon={faBars} className="text-lg" />
                <span className="font-semibold">Menu</span>
              </button>
            )}
            {showSidebar && (
              <button
                className="btn btn-ghost btn-sm gap-2 hidden lg:flex"
                onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                aria-label={isLeftSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <FontAwesomeIcon icon={faBars} className="text-lg" />
                <span className="font-semibold">Menu</span>
              </button>
            )}
            {showCollectiveRightSidebar && (
              <button
                className="btn btn-ghost btn-sm gap-2 lg:hidden"
                onClick={() => setShowRightSidebarState(true)}
                aria-label="Open right sidebar"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="text-lg" />
                <span className="font-semibold">Info</span>
              </button>
            )}
            {showCollectiveRightSidebar && (
              <button
                className="btn btn-ghost btn-sm gap-2 hidden lg:flex"
                onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                aria-label={isRightSidebarCollapsed ? "Expand right sidebar" : "Collapse right sidebar"}
              >
                <FontAwesomeIcon icon={faInfoCircle} className="text-lg" />
                <span className="font-semibold">Info</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Mobile Right Sidebar Backdrop */}
      {showCollectiveRightSidebar && showRightSidebarState && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setShowRightSidebarState(false)}
        />
      )}

      <div className="flex gap-6">
        {/* LEFT SIDEBAR - Desktop */}
        {showSidebar && collectiveData && (
          <>
            {!isLeftSidebarCollapsed && (
              <aside className="w-60 flex-shrink-0 hidden lg:block">
                {renderLeftSidebar(false)}
              </aside>
            )}
          </>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* RIGHT SIDEBAR - Desktop */}
        {showCollectiveRightSidebar && collectiveData && (
          <>
            {!isRightSidebarCollapsed && (
              <aside className="w-80 flex-shrink-0 hidden xl:block">
                {renderRightSidebar(false)}
              </aside>
            )}
          </>
        )}

        {/* Mobile Left Sidebar - Slide-in drawer */}
        {collectiveData && (
          <aside
            className={`fixed z-70 top-0 left-0 h-full w-72 bg-base-200 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
              }`}
          >
            {renderLeftSidebar(true)}
          </aside>
        )}

        {/* Mobile Right Sidebar - Slide-in drawer */}
        {showCollectiveRightSidebar && collectiveData && (
          <aside
            ref={rightSidebarRef}
            className={`fixed z-70 top-0 right-0 h-full w-80 bg-base-200 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${showRightSidebarState ? 'translate-x-0' : 'translate-x-full'
              }`}
          >
            {renderRightSidebar(true)}
          </aside>
        )}
      </div>
    </>
  );

  if (skipMainLayout) {
    return <>{content}</>;
  }

  return (
    <MainLayout showSidebar={showSidebar} showRightSidebar={showRightSidebar}>
      {content}
    </MainLayout>
  );
};
