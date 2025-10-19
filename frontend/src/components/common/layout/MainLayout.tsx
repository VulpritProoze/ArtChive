// artchive/frontend/src/common/layout/MainLayout.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@context/auth-context";
import { LogoutButton } from "@components/account/logout";
import { formatArtistTypesToString } from '@utils';
import useToggleTheme from "@hooks/use-theme";
import { faBell, faCoins, faLock, faMoon, faPalette, faQuestionCircle, faSignOutAlt, faSun, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import NotificationDropdown from "@components/notifications/notification-dropdown.component";

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
  const { isDarkMode, toggleDarkMode } = useToggleTheme();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/home", label: "Home", icon: "🏠" },
    { path: "/gallery", label: "Gallery", icon: "🖼️" },
    { path: "/collective", label: "Collective", icon: "👥" },
    { path: "/profile", label: "Profile", icon: "👤" },
  ];

  const settingsItems = [
    { 
      label: "Account", 
      icon: faUser, 
      action: () => { 
        setIsSettingsOpen(false);
        // Navigate to account settings
      } 
    },
    {
      label: "Notifications",
      icon: faBell,
      action: () => {
        setIsSettingsOpen(false);
        navigate('/notifications');
      }
    },
    { 
      label: "Privacy", 
      icon: faLock, 
      action: () => { 
        setIsSettingsOpen(false);
        // Navigate to privacy settings
      } 
    },
    { 
      label: "Help", 
      icon: faQuestionCircle, 
      action: () => { 
        setIsSettingsOpen(false);
        // Navigate to help center
      } 
    },
    { 
      label: "Drips", 
      icon: faCoins, 
      action: () => { 
        setIsSettingsOpen(false);
        // Navigate to Drips page
        navigate('/drips')
      } 
    },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Enhanced Header/Navbar */}
      <header className="sticky top-0 z-50 bg-base-100/80 backdrop-blur-lg border-b border-base-300 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
              <span className="text-xl font-bold text-base-content">
                ArtChive
              </span>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search artists, artworks, collectives..."
                  className="w-full px-4 py-2 pl-10 bg-base-200 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* User Profile Section - Similar to common-header.tsx */}
              {user && (
                <div className="flex items-center gap-3">
                  <Link to="/profile">
                    <img
                      src={user.profile_picture}
                      alt={user.fullname}
                      className="w-10 h-10 rounded-full border border-base-300 hover:border-primary transition-colors"
                    />
                  </Link>

                  <div className="hidden md:block">
                    <Link to="/profile">
                      <h5 className="text-sm font-semibold text-base-content hover:text-primary transition-colors">
                        {user.fullname}
                      </h5>
                    </Link>
                    <p className="text-xs text-primary">@{user.username}</p>
                    <p className="text-xs text-base-content/70">
                      {formatArtistTypesToString(user.artist_types)}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost btn-circle btn-sm hover:bg-base-200" title="Messages">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </button>
                <NotificationDropdown />
                <button
                  className="btn btn-ghost btn-circle btn-sm hover:bg-base-200"
                  title="Settings"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
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
              className="w-full px-4 py-2 pl-10 bg-base-200 rounded-full border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* Settings Sidebar Overlay */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Settings Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-base-100 shadow-2xl z-60 transform transition-transform duration-300 ease-in-out ${
          isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h2 className="text-xl font-bold">Settings</h2>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {settingsItems.map((item, index) => (
                <button
                  key={index}
                  className="flex hover:cursor-pointer items-center gap-4 w-full p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
                  onClick={item.action}
                >
                  <FontAwesomeIcon icon={item.icon} className="text-lg" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* Theme Toggle */}
            <div className="mt-6 pt-4 border-t border-base-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faPalette} className="text-lg" />
                  <span className="font-medium">Appearance</span>
                </div>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={toggleDarkMode}
                >
                  {isDarkMode ? (
                    <FontAwesomeIcon icon={faSun} className="text-yellow-400" />
                  ) : (
                    <FontAwesomeIcon icon={faMoon} className="text-gray-700" />
                  )}
                </button>
              </div>
            </div>

            {/* Logout */}
            <div className="mt-4">
              <LogoutButton 
                className="w-full justify-start p-3 rounded-lg transition-colors"
                icon={<FontAwesomeIcon icon={faSignOutAlt} className="mr-3" />}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR */}
          {showSidebar && (
            <aside className="lg:col-span-2 hidden lg:flex flex-col gap-4">
              <nav className="flex flex-col gap-1 bg-base-200/50 rounded-xl p-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? "bg-primary text-primary-content shadow-md scale-[1.02]"
                        : "hover:bg-base-300 text-base-content"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>

            </aside>
          )}

          {/* MAIN CONTENT */}
          <main
            className={
              showSidebar && showRightSidebar
                ? "lg:col-span-7"
                : showSidebar || showRightSidebar
                ? "lg:col-span-9"
                : "lg:col-span-12"
            }
          >
            {children}
          </main>

          {/* RIGHT SIDEBAR */}
          {showRightSidebar && (
            <aside className="lg:col-span-3 hidden lg:flex flex-col gap-6">
              {/* Popular This Week */}
              <div className="bg-base-200/50 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                  <span>🔥</span>
                  Popular This Week
                </h3>
                <div className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow group">
                  <img
                    src="/images/popular-art.jpg"
                    alt="Popular Artwork"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Advertisement */}
              <div className="bg-gradient-to-br from-base-200 to-base-300 rounded-xl p-6 text-center border-2 border-dashed border-base-content/20">
                <p className="text-base-content/50 font-medium">
                  Advertisement Space
                </p>
              </div>

              {/* Active Fellows */}
              <div className="bg-base-200/50 rounded-xl p-4">
                <h3 className="text-lg font-bold mb-3 text-base-content flex items-center gap-2">
                  <span>✨</span>
                  Active Fellows
                </h3>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                        <img
                          src="https://randomuser.me/api/portraits/women/1.jpg"
                          alt="Lisa Wong"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-base-content">
                        Lisa Wong
                      </p>
                      <p className="text-xs text-base-content/60">
                        Digital Artist
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </li>
                  <li className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors cursor-pointer">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full ring ring-secondary ring-offset-base-100 ring-offset-2">
                        <img
                          src="https://randomuser.me/api/portraits/men/2.jpg"
                          alt="Michael Brown"
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-base-content">
                        Michael Brown
                      </p>
                      <p className="text-xs text-base-content/60">
                        3D Sculptor
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                  </li>
                </ul>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 shadow-lg z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all ${
                isActive(item.path)
                  ? "text-primary scale-110"
                  : "text-base-content/60"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};