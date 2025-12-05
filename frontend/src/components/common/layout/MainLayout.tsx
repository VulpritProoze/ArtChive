// artchive/frontend/src/common/layout/MainLayout.tsx
import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { LogoutButton } from "@components/account/logout";
import useToggleTheme from "@hooks/use-theme";
import NotificationDropdown from "@components/notifications/notification-dropdown.component";
import PendingFriendRequestsButton from "@components/fellows/pending-requests-button.component";
import { useTopPosts } from "@hooks/queries/use-posts";
import { useFellows } from "@hooks/queries/use-fellows";
import { useRealtime } from "@context/realtime-context";
import { UserStatsDisplay } from "@components/reputation/user-stats-display.component";
import { SearchDropdown } from "@components/common/search/search-dropdown.component";
// DEBUG ONLY: Uncomment to use API-based active fellows instead of WebSocket
// import { useActiveFellows } from "@hooks/queries/use-active-fellows";
import {
  Home,
  Images as GalleryIcon,
  Users,
  User,
  Search,
  MessageCircle,
  Settings,
  Bell,
  Coins,
  Lock,
  HelpCircle,
  LogOut,
  Palette,
  Sun,
  Moon,
  TrendingUp,
  Radio,
  X,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showRightSidebar?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showSidebar = true,
  showRightSidebar = true,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileRightSidebarOpen, setIsMobileRightSidebarOpen] = useState(false);
  const [isDesktopRightSidebarCollapsed, setIsDesktopRightSidebarCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode } = useToggleTheme();
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Note: Dropdown stays open when query is cleared to show search history
  
  // Fetch top 5 image posts
  const { data: topPostsData, isLoading: isLoadingTopPosts } = useTopPosts(5, 'image');
  const topPosts = topPostsData?.results || [];
  
  // Get active fellows from WebSocket realtime context
  const { isFellowActive } = useRealtime();
  
  // Fetch all fellows and filter to show only active ones
  const { data: allFellows = [], isLoading: isLoadingFellows } = useFellows();
  
  // DEBUG ONLY: Uncomment to use API-based active fellows instead of WebSocket
  // const { data: activeFellowsFromAPI = [], isLoading: isLoadingActiveFellowsFromAPI } = useActiveFellows();
  // const activeFellows = activeFellowsFromAPI;
  // const isLoadingActiveFellows = isLoadingActiveFellowsFromAPI;
  
  // Filter fellows to show only those who are active (WebSocket-based)
  const activeFellows = allFellows.filter(fellow => {
    const fellowUserId = fellow.user === user?.id ? fellow.fellow_user : fellow.user;
    return isFellowActive(fellowUserId);
  });
  
  const isLoadingActiveFellows = isLoadingFellows;

  useEffect(() => {
    if (!showRightSidebar) {
      setIsDesktopRightSidebarCollapsed(false);
    }
  }, [showRightSidebar]);

  // Force expand right sidebar when screen width is >= 1025px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1025 && showRightSidebar) {
        setIsDesktopRightSidebarCollapsed(false);
      }
    };

    // Check on mount
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showRightSidebar]);

  const isActive = (path: string) => location.pathname === path;

  // Carousel navigation handlers
  const nextPost = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (topPosts.length > 0) {
      setCarouselIndex((prev) => (prev + 1) % topPosts.length);
    }
  };

  const prevPost = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (topPosts.length > 0) {
      setCarouselIndex((prev) => (prev - 1 + topPosts.length) % topPosts.length);
    }
  };


  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/gallery", label: "Gallery", icon: GalleryIcon },
    { path: "/collective", label: "Collective", icon: Users },
    { path: "/avatar", label: "Avatar", icon: Palette },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const mainContentCols = (() => {
    const classes: string[] = [];

    if (showSidebar) {
      classes.push("md:col-start-4 md:col-end-13");
    } else {
      classes.push("md:col-span-12");
    }

    if (showSidebar && showRightSidebar) {
      classes.push(
        isDesktopRightSidebarCollapsed
          ? "lg:col-start-4 lg:col-end-13"
          : "lg:col-start-3 lg:col-end-10"
      );
    } else if (showSidebar && !showRightSidebar) {
      classes.push("lg:col-start-4 lg:col-end-13");
    } else if (!showSidebar && showRightSidebar) {
      classes.push(
        isDesktopRightSidebarCollapsed
          ? "lg:col-start-1 lg:col-end-13"
          : "lg:col-start-1 lg:col-end-10"
      );
    } else {
      classes.push("lg:col-span-12");
    }

    return classes.join(" ");
  })();

  const settingsItems = [
    // {
    //   label: "Account",
    //   icon: User,
    //   action: () => {
    //     setIsSettingsOpen(false);
    //     // Navigate to account settings
    //   }
    // },
    {
      label: "Notifications",
      icon: Bell,
      action: () => {
        setIsSettingsOpen(false);
        navigate('/notifications');
      }
    },
    {
      label: "Privacy",
      icon: Lock,
      action: () => {
        setIsSettingsOpen(false);
        // Navigate to privacy settings
      }
    },
    {
      label: "Help",
      icon: HelpCircle,
      action: () => {
        setIsSettingsOpen(false);
        // Navigate to help center
      }
    },
    {
      label: "Drips",
      icon: Coins,
      action: () => {
        setIsSettingsOpen(false);
        // Navigate to Drips page
        navigate('/drips')
      }
    },
    {
      label: "Reputation",
      icon: ArrowUpDown,
      action: () => {
        setIsSettingsOpen(false);
        // Navigate to Reputation page
        navigate('/reputation')
      }
    },
  ];

  return (
    <div className="min-h-screen bg-base-100 pb-20 lg:pb-0">
      {/* Enhanced Header/Navbar */}
      <header className="sticky top-0 z-50 bg-base-100/95 backdrop-blur-xl border-b border-base-300 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center gap-3">

              {/* Logo */}
              <Link
                to="/home"
                className="flex items-center gap-2 group transition-transform hover:scale-105"
              >
                <img
                  src="/logo/ArtChive_logo.png"
                  alt="ArtChive Logo"
                  className="w-10 h-10 object-contain"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  ArtChive
                </span>
              </Link>
            </div>

            {/* Search Bar - Desktop */}
            <div className={`hidden md:flex flex-1 mx-8 transition-all duration-300 ${
              isSearchDropdownOpen ? 'max-w-2xl' : 'max-w-xl'
            }`}>
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search artists, artworks, collectives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    setIsSearchDropdownOpen(true);
                  }}
                  onBlur={() => {
                    // Delay closing to allow clicks on dropdown items
                    setTimeout(() => setIsSearchDropdownOpen(false), 200);
                  }}
                  className="w-full px-4 py-2.5 pl-11 bg-base-200/50 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-base-200 transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex-shrink-0 text-base-content/50" />
                <SearchDropdown
                  query={debouncedSearchQuery}
                  isOpen={isSearchDropdownOpen}
                  onClose={() => setIsSearchDropdownOpen(false)}
                  onQuerySelect={(selectedQuery) => setSearchQuery(selectedQuery)}
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Profile Section - Hidden on small screens, collapsed when search dropdown is open */}
              {user && (
                <div className={`hidden sm:flex items-center gap-3 transition-all duration-300 ${
                  isSearchDropdownOpen 
                    ? 'opacity-0 pointer-events-none w-0 overflow-hidden' 
                    : 'opacity-100 pointer-events-auto'
                }`}>
                  <Link
                    to={user.username ? `/profile/@${user.username}` : "/profile"}
                    className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-xl transition-colors"
                  >
                    <img
                      src={user.profile_picture}
                      alt={user.fullname || user.username}
                      className="w-10 h-10 rounded-full border-2 border-base-300 hover:border-primary transition-colors"
                    />
                    <div className="flex flex-col gap-0.5">
                      {user.fullname && (
                        <h5 className="text-xs font-semibold text-base-content truncate max-w-[120px]">
                          {user.fullname}
                        </h5>
                      )}
                      <p className="text-xs text-primary truncate max-w-[120px]">@{user.username}</p>
                      <UserStatsDisplay
                        brushdrips={parseInt(user.brushdrips_count) || 0}
                        reputation={user.reputation}
                        showBrushdrips={true}
                      />
                    </div>
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Right Sidebar Toggle - Visible below 1025px, hidden at 1025px and above */}
                {showRightSidebar && (
                  <button
                    className="flex max-[1024px]:flex min-[1025px]:hidden btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                    onClick={() => setIsMobileRightSidebarOpen(true)}
                    title="Open sidebar"
                  >
                    <PanelRightOpen className="w-5 h-5 flex-shrink-0" />
                  </button>
                )}

                <button
                  className="btn btn-ghost btn-circle btn-sm hover:bg-base-200 relative"
                  title="Messages (coming soon)"
                  disabled
                >
                  <MessageCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
                </button>

                {/* Mobile: Navigate directly, Desktop: Show dropdown */}
                <div className="md:hidden">
                  <PendingFriendRequestsButton isMobile={true} />
                </div>
                <div className="hidden md:block">
                  <PendingFriendRequestsButton />
                </div>

                {/* Mobile: Navigate directly, Desktop: Show dropdown */}
                <div className="md:hidden">
                  <button
                    className="btn btn-ghost btn-circle btn-sm hover:bg-base-200 relative"
                    title="Notifications"
                    onClick={() => navigate('/notifications')}
                  >
                    <Bell className="w-5 h-5 flex-shrink-0" />
                  </button>
                </div>
                <div className="hidden md:block">
                  <NotificationDropdown />
                </div>

                       <button
                  className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                  title="Settings"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative">
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchDropdownOpen(true);
              }}
              onBlur={() => {
                // Delay closing to allow clicks on dropdown items
                setTimeout(() => setIsSearchDropdownOpen(false), 200);
              }}
              className="w-full px-4 py-2 pl-10 bg-base-200/50 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex-shrink-0 text-base-content/50" />
            <SearchDropdown
              query={debouncedSearchQuery}
              isOpen={isSearchDropdownOpen}
              onClose={() => setIsSearchDropdownOpen(false)}
              onQuerySelect={(selectedQuery) => setSearchQuery(selectedQuery)}
            />
          </div>
        </div>
      </header>

      {/* Settings Sidebar Overlay */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Settings Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-base-100 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 flex-shrink-0" />
              <h2 className="text-xl font-bold">Settings</h2>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setIsSettingsOpen(false)}
            >
              <X className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* User Profile Section - Shows on small screens only */}
            {user && (
              <div className="sm:hidden mb-6 pb-6 border-b border-base-300">
                <Link
                  to={user.username ? `/profile/@${user.username}` : "/profile"}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors"
                  onClick={() => setIsSettingsOpen(false)}
                >
                  <img
                    src={user.profile_picture}
                    alt={user.fullname || user.username}
                    className="w-12 h-12 rounded-full border-2 border-base-300"
                  />
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    {user.fullname && (
                      <h5 className="text-sm font-semibold text-base-content truncate">
                        {user.fullname}
                      </h5>
                    )}
                    <p className="text-xs text-primary truncate">@{user.username}</p>
                    <div className="mt-0.5">
                      <UserStatsDisplay
                        brushdrips={parseInt(user.brushdrips_count) || 0}
                        reputation={user.reputation}
                        showBrushdrips={true}
                      />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <div className="space-y-2">
              {settingsItems.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={index}
                    className="flex hover:cursor-pointer items-center gap-4 w-full p-3 rounded-lg hover:bg-base-200 transition-colors text-left group"
                    onClick={item.action}
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle */}
            <div className="mt-6 pt-4 border-t border-base-300">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-base-200 transition-colors">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Appearance</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={toggleDarkMode}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5 flex-shrink-0 text-yellow-400" />
                  ) : (
                    <Moon className="w-5 h-5 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="mt-4">
              <LogoutButton
                className="w-full justify-start p-3 rounded-lg transition-colors hover:bg-error/10 hover:text-error"
                icon={<LogOut className="w-5 h-5 flex-shrink-0 mr-3" />}
              />
            </div>
          </div>
        </div>
      </div>


      {/* Mobile Right Sidebar Overlay */}
      {isMobileRightSidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileRightSidebarOpen(false)}
        />
      )}

      {/* Mobile Right Sidebar Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-base-100 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center gap-2">
              <PanelRightOpen className="w-5 h-5 flex-shrink-0" />
              <h2 className="text-xl font-bold">Discover</h2>
            </div>
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => setIsMobileRightSidebarOpen(false)}
            >
              <X className="w-5 h-5 flex-shrink-0" />
            </button>
          </div>

          {/* Right Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-6">
              {/* Popular This Week */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 flex-shrink-0 text-primary" />
                  Popular This Week
                </h3>
                {isLoadingTopPosts ? (
                  <div className="rounded-lg overflow-hidden shadow-md">
                    <div className="w-full h-64 skeleton"></div>
                  </div>
                ) : topPosts.length > 0 ? (
                  <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow aspect-[4/3] w-full">
                    <Link to={`/post/${topPosts[carouselIndex]?.post_id}`} className="block w-full h-full">
                      {topPosts[carouselIndex]?.image_url ? (
                        <img
                          src={topPosts[carouselIndex].image_url}
                          alt={topPosts[carouselIndex].description || 'Popular post'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-base-300 flex items-center justify-center">
                          <p className="text-base-content/50 text-sm">No image</p>
                        </div>
                      )}
                    </Link>
                    {topPosts.length > 1 && (
                      <>
                        <button
                          onClick={prevPost}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute left-2 top-1/2 -translate-y-[35%] z-10 btn btn-sm btn-circle bg-base-100/90 hover:bg-base-100 border border-base-300 shadow-md scale-100 hover:scale-105 transition-transform"
                          type="button"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextPost}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute right-2 top-1/2 -translate-y-[35%] z-10 btn btn-sm btn-circle bg-base-100/90 hover:bg-base-100 border border-base-300 shadow-md scale-100 hover:scale-105 transition-transform"
                          type="button"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                          {topPosts.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCarouselIndex(index);
                              }}
                              className={`h-2 rounded-full transition-all ${
                                index === carouselIndex ? 'bg-primary w-6' : 'bg-base-content/30 w-2'
                              }`}
                              type="button"
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden shadow-md aspect-[4/3] w-full">
                    <div className="w-full h-full bg-base-300 flex items-center justify-center">
                      <p className="text-base-content/50 text-sm">No popular posts available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Advertisement */}
              <div className="bg-gradient-to-br from-base-200/50 to-base-300/50 rounded-xl p-6 text-center border-2 border-dashed border-base-content/20">
                <p className="text-base-content/50 font-medium text-sm">
                  Advertisement Space
                </p>
              </div>

              {/* Active Fellows */}
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                  <Radio className="w-5 h-5 flex-shrink-0 text-success" />
                  Active Fellows
                </h3>
                {isLoadingActiveFellows ? (
                  <div className="flex flex-col gap-3">
                    <div className="skeleton h-16 rounded-lg"></div>
                    <div className="skeleton h-16 rounded-lg"></div>
                  </div>
                ) : activeFellows.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {activeFellows.slice(0, 5).map((fellow) => {
                      // Determine which user is the fellow (not the current user)
                      const fellowUser = fellow.user === user?.id ? fellow.fellow_user_info : fellow.user_info;
                      
                      return (
                        <li key={fellow.id}>
                          <Link
                            to={fellowUser.username ? `/profile/@${fellowUser.username}` : `/profile`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group"
                          >
                            <div className="avatar">
                              <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                                <img
                                  src={fellowUser.profile_picture || '/static/images/default-pic-min.jpg'}
                                  alt={fellowUser.fullname || fellowUser.username}
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-base-content truncate">
                                {fellowUser.fullname || fellowUser.username}
                              </p>
                              <p className="text-xs text-base-content/60 truncate">
                                {fellowUser.artist_types && fellowUser.artist_types.length > 0
                                  ? fellowUser.artist_types.join(', ')
                                  : 'Artist'}
                              </p>
                            </div>
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-base-content/50 text-center py-4">
                    No active fellows at the moment
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex flex-col md:grid md:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR - Columns 1-3 (shows on md and above) */}
          {showSidebar && (
            <aside
              className={`hidden md:flex flex-col gap-4 pr-4 sticky top-20 self-start h-[calc(100vh-5rem)] overflow-y-auto ${
                showRightSidebar && !isDesktopRightSidebarCollapsed
                  ? "md:col-start-1 md:col-end-4 lg:col-start-1 lg:col-end-3"
                  : "md:col-start-1 md:col-end-4 lg:col-start-1 lg:col-end-4"
              }`}
            >
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                        isActive(item.path)
                          ? "bg-primary text-primary-content shadow-lg scale-[1.02]"
                          : "hover:bg-base-300 text-base-content hover:scale-[1.01]"
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${!isActive(item.path) && 'group-hover:scale-110 transition-transform'}`} />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              {/* Vertical line on the right edge of left sidebar */}
              <div className="absolute top-0 right-0 bottom-0 w-px bg-base-300"></div>
            </aside>
          )}

          {/* MAIN CONTENT - Responsive columns based on visible sidebars */}
          <main className={mainContentCols}>
            {children}
          </main>

          {/* RIGHT SIDEBAR - Columns 11-13 (shows only on lg and above) */}
          {showRightSidebar && (
            <aside
              className={`hidden lg:flex flex-col pl-4 transition-all duration-300 sticky top-20 self-start h-[calc(100vh-5rem)] ${
                isDesktopRightSidebarCollapsed
                  ? "lg:col-start-13 lg:col-end-13 opacity-0 pointer-events-none scale-95"
                  : "lg:col-start-10 lg:col-end-13"
              }`}
            >
              {/* Vertical line on the left edge of right sidebar */}
              <div className="absolute top-0 left-0 bottom-0 w-px bg-base-300"></div>
              {/* Scrollable content container */}
              <div className="flex flex-col gap-6 overflow-y-auto overflow-x-hidden pr-2 h-full">
                {/* Popular This Week */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 flex-shrink-0 text-primary" />
                    Popular This Week
                  </h3>
                  {isLoadingTopPosts ? (
                    <div className="rounded-lg overflow-hidden shadow-md">
                      <div className="w-full h-64 skeleton"></div>
                    </div>
                  ) : topPosts.length > 0 ? (
                    <div className="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow aspect-[4/3] w-full">
                      <Link to={`/post/${topPosts[carouselIndex]?.post_id}`} className="block w-full h-full">
                        {topPosts[carouselIndex]?.image_url ? (
                          <img
                            src={topPosts[carouselIndex].image_url}
                            alt={topPosts[carouselIndex].description || 'Popular post'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-base-300 flex items-center justify-center">
                            <p className="text-base-content/50 text-sm">No image</p>
                          </div>
                        )}
                      </Link>
                      {topPosts.length > 1 && (
                        <>
                          <button
                            onClick={prevPost}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 btn btn-sm btn-circle bg-base-100/90 hover:bg-base-100 border border-base-300 shadow-md scale-100 hover:scale-105 transition-transform"
                            type="button"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={nextPost}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 btn btn-sm btn-circle bg-base-100/90 hover:bg-base-100 border border-base-300 shadow-md scale-100 hover:scale-105 transition-transform"
                            type="button"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                            {topPosts.map((_, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCarouselIndex(index);
                                }}
                                className={`h-2 rounded-full transition-all ${
                                  index === carouselIndex ? 'bg-primary w-6' : 'bg-base-content/30 w-2'
                                }`}
                                type="button"
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden shadow-md aspect-[4/3] w-full">
                      <div className="w-full h-full bg-base-300 flex items-center justify-center">
                        <p className="text-base-content/50 text-sm">No popular posts available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advertisement */}
                <div className="bg-gradient-to-br from-base-200/50 to-base-300/50 rounded-xl p-6 text-center border-2 border-dashed border-base-content/20">
                  <p className="text-base-content/50 font-medium text-sm">
                    Advertisement Space
                  </p>
                </div>

                {/* Active Fellows */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-base-content flex items-center gap-2">
                    <Radio className="w-5 h-5 flex-shrink-0 text-success" />
                    Active Fellows
                  </h3>
                  {isLoadingActiveFellows ? (
                    <div className="flex flex-col gap-3">
                      <div className="skeleton h-16 rounded-lg"></div>
                      <div className="skeleton h-16 rounded-lg"></div>
                    </div>
                  ) : activeFellows.length > 0 ? (
                    <ul className="flex flex-col gap-3">
                      {activeFellows.slice(0, 5).map((fellow) => {
                        // Determine which user is the fellow (not the current user)
                        const fellowUser = fellow.user === user?.id ? fellow.fellow_user_info : fellow.user_info;
                        
                        return (
                          <li key={fellow.id}>
                            <Link
                              to={fellowUser.username ? `/profile/@${fellowUser.username}` : `/profile`}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group"
                            >
                              <div className="avatar">
                                <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                                  <img
                                    src={fellowUser.profile_picture || '/static/images/default-pic-min.jpg'}
                                    alt={fellowUser.fullname || fellowUser.username}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-base-content truncate">
                                  {fellowUser.fullname || fellowUser.username}
                                </p>
                                <p className="text-xs text-base-content/60 truncate">
                                  {fellowUser.artist_types && fellowUser.artist_types.length > 0
                                    ? fellowUser.artist_types.join(', ')
                                    : 'Artist'}
                                </p>
                              </div>
                              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-base-content/50 text-center py-4">
                      No active fellows at the moment
                    </p>
                  )}
                </div>
              </div>
              </aside>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100/95 backdrop-blur-xl border-t border-base-300 shadow-lg z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? "text-primary scale-110"
                    : "text-base-content/60 hover:text-base-content"
                }`}
              >
                <IconComponent className="w-6 h-6 flex-shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
