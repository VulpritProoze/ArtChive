import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useToggleTheme from "@hooks/use-theme";
import { faMoon, faPalette, faSun, faBars, faTimes, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface SidebarMenuItem {
  label: string;
  icon: IconDefinition;
  action: () => void;
}

interface GalleryLayoutProps {
  children: React.ReactNode;
  sidebarMenuItems?: SidebarMenuItem[];
}

export const GalleryLayout: React.FC<GalleryLayoutProps> = ({ children, sidebarMenuItems = [] }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useToggleTheme();

  const defaultSettingsItems: SidebarMenuItem[] = [
    { 
      label: "Back to Gallery", 
      icon: faArrowLeft, 
      action: () => { 
        setIsSidebarOpen(false);
        navigate('/gallery');
      } 
    },
  ];

  const settingsItems = [...defaultSettingsItems, ...sidebarMenuItems];

  return (
    <div className="min-h-screen bg-base-400">
      {/* Small Header */}
      <header className="relative z-50 bg-base-100/80 backdrop-blur-lg border-b border-base-300 shadow-sm">
        <div className="container max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link
              to="/home"
              className="flex items-center gap-2 group transition-transform hover:scale-105"
            >
              <img 
                src="/logo/ArtChive_logo.png" 
                alt="Artchive" 
                className="h-6 w-6 object-contain"
              />
              <span className="text-sm font-bold text-primary">ArtChive</span>
            </Link>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="btn btn-ghost btn-sm p-2"
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-xs bg-base-100 shadow-2xl z-60 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <h2 className="text-xl font-bold">Menu</h2>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close menu"
            >
              <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {settingsItems.map((item, index) => (
                <button
                  key={index}
                  className="flex hover:cursor-pointer items-center gap-4 w-full p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
                  onClick={() => {
                    item.action();
                    setIsSidebarOpen(false);
                  }}
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full p-8 lg:p-12 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

