// artchive/frontend/src/common/layout/MainLayout.tsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { LogoutButton } from "@components/account/logout";
import useToggleTheme from "@hooks/use-theme";
import NotificationDropdown from "@components/notifications/notification-dropdown.component";
import PendingFriendRequestsButton from "@components/fellows/pending-requests-button.component";
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
  PanelRightOpen
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

  useEffect(() => {
    if (!showRightSidebar) {
      setIsDesktopRightSidebarCollapsed(false);
    }
  }, [showRightSidebar]);

  const isActive = (path: string) => location.pathname === path;


  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/gallery", label: "Gallery", icon: GalleryIcon },
    { path: "/collective", label: "Collective", icon: Users },
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
    {
      label: "Account",
      icon: User,
      action: () => {
        setIsSettingsOpen(false);
        // Navigate to account settings
      }
    },
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
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search artists, artworks, collectives..."
                  className="w-full px-4 py-2.5 pl-11 bg-base-200/50 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-base-200 transition-all"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 flex-shrink-0 text-base-content/50" />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Profile Section - Hidden on small screens */}
              {user && (
                <div className="hidden sm:flex items-center gap-3">
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
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <p className="text-[10px] text-base-content/70 font-medium">{user.brushdrips_count || 0} BD</p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Right Sidebar Toggle - Shows on medium screens (below lg) when right sidebar is hidden */}
                {showRightSidebar && (
                  <>
                    <button
                      className="lg:hidden btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                      onClick={() => setIsMobileRightSidebarOpen(true)}
                      title="Open sidebar"
                    >
                      <PanelRightOpen className="w-5 h-5 flex-shrink-0" />
                    </button>
                    <button
                      className="hidden lg:flex btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                      onClick={() =>
                        setIsDesktopRightSidebarCollapsed((prev) => !prev)
                      }
                      title={
                        isDesktopRightSidebarCollapsed
                          ? "Expand discover panel"
                          : "Collapse discover panel"
                      }
                      aria-pressed={isDesktopRightSidebarCollapsed}
                    >
                      <PanelRightOpen
                        className={`w-5 h-5 flex-shrink-0 transition-transform ${
                          isDesktopRightSidebarCollapsed ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </>
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
              type="text"
              placeholder="Search..."
              className="w-full px-4 py-2 pl-10 bg-base-200/50 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 flex-shrink-0 text-base-content/50" />
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <p className="text-[10px] text-base-content/70 font-medium">{user.brushdrips_count || 0} BD</p>
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
              <div className="bg-base-200/30 rounded-xl p-4 hover:shadow-lg transition-all border border-base-300/50 hover:border-primary/30">
                <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 flex-shrink-0 text-primary" />
                  Popular This Week
                </h3>
                <div className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <div className="w-full h-48 skeleton"></div>
                </div>
              </div>

              {/* Advertisement */}
              <div className="bg-gradient-to-br from-base-200/50 to-base-300/50 rounded-xl p-6 text-center border-2 border-dashed border-base-content/20">
                <p className="text-base-content/50 font-medium text-sm">
                  Advertisement Space
                </p>
              </div>

              {/* Active Fellows */}
              <div className="bg-base-200/30 rounded-xl p-4 border border-base-300/50">
                <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                  <Radio className="w-5 h-5 flex-shrink-0 text-success" />
                  Active Fellows
                </h3>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                        <img
                          src="https://randomuser.me/api/portraits/women/1.jpg"
                          alt="Lisa Wong"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-content truncate">
                        Lisa Wong
                      </p>
                      <p className="text-xs text-base-content/60 truncate">
                        Digital Artist
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  </li>
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full ring ring-secondary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                        <img
                          src="https://randomuser.me/api/portraits/men/2.jpg"
                          alt="Michael Brown"
                        />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-base-content truncate">
                        Michael Brown
                      </p>
                      <p className="text-xs text-base-content/60 truncate">
                        3D Sculptor
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  </li>
                </ul>
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
              className={`hidden md:flex flex-col gap-4 relative pr-4 ${
                showRightSidebar && !isDesktopRightSidebarCollapsed
                  ? "md:col-start-1 md:col-end-4 lg:col-start-1 lg:col-end-3"
                  : "md:col-start-1 md:col-end-4 lg:col-start-1 lg:col-end-4"
              }`}
            >
              <nav className="flex flex-col gap-1 bg-base-200/30 rounded-xl p-3 border border-base-300/50">
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
              className={`hidden lg:flex flex-col gap-6 relative pl-4 transition-all duration-300 ${
                isDesktopRightSidebarCollapsed
                  ? "lg:col-start-13 lg:col-end-13 opacity-0 pointer-events-none scale-95"
                  : "lg:col-start-10 lg:col-end-13"
              }`}
            >
              {/* Vertical line on the left edge of right sidebar */}
              <div className="absolute top-0 left-0 bottom-0 w-px bg-base-300"></div>
                {/* Popular This Week */}
                <div className="bg-base-200/30 rounded-xl p-4 hover:shadow-lg transition-all border border-base-300/50 hover:border-primary/30">
                  <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 flex-shrink-0 text-primary" />
                    Popular This Week
                  </h3>
                  <div className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    <div className="w-full h-48 skeleton"></div>
                  </div>
                </div>

                {/* Advertisement */}
                <div className="bg-gradient-to-br from-base-200/50 to-base-300/50 rounded-xl p-6 text-center border-2 border-dashed border-base-content/20">
                  <p className="text-base-content/50 font-medium text-sm">
                    Advertisement Space
                  </p>
                </div>

                {/* Active Fellows */}
                <div className="bg-base-200/30 rounded-xl p-4 border border-base-300/50">
                  <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                    <Radio className="w-5 h-5 flex-shrink-0 text-success" />
                    Active Fellows
                  </h3>
                  <ul className="flex flex-col gap-3">
                    <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group">
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                          <img
                            src="https://randomuser.me/api/portraits/women/1.jpg"
                            alt="Lisa Wong"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-content truncate">
                          Lisa Wong
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          Digital Artist
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    </li>
                    <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer group">
                      <div className="avatar">
                        <div className="w-10 h-10 rounded-full ring ring-secondary ring-offset-base-100 ring-offset-2 group-hover:ring-offset-4 transition-all">
                          <img
                            src="https://randomuser.me/api/portraits/men/2.jpg"
                            alt="Michael Brown"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-base-content truncate">
                          Michael Brown
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          3D Sculptor
                        </p>
                      </div>
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    </li>
                  </ul>
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
