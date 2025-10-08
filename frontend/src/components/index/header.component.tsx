// components/Header.tsx - OPTIMIZED & RESPONSIVE
import { useState, useEffect } from "react";
import { Moon, Sun, Menu, X } from "lucide-react";
import useToggleTheme from "@hooks/use-theme";

export default function Header() {
  const { isDarkMode, toggleDarkMode } = useToggleTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simple scroll listener (no framer-motion)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`navbar fixed z-50 top-0 left-0 w-full transition-all duration-300 ${
          isScrolled
            ? "h-16 bg-base-200/80 backdrop-blur-lg shadow-lg"
            : "h-20 bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between w-full">
            {/* Left Side - Logo */}
            <a
              href="/"
              className="flex items-center hover:scale-105 transition-transform"
            >
              <img
                className="h-12 md:h-14 w-auto"
                src="/logo/mainLogo.png"
                alt="ArtChive Logo"
              />
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3">
              {/* Theme toggle button */}
              <button
                className="btn btn-ghost btn-circle"
                onClick={toggleDarkMode}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Login/Signup Buttons */}
              <a
                href="/login"
                className="btn btn-ghost hover:scale-105 transition-transform"
              >
                Login
              </a>
              <a
                href="/register"
                className="btn btn-primary hover:scale-105 transition-transform"
              >
                Sign Up
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {/* Theme toggle for mobile */}
              <button
                className="btn btn-ghost btn-circle btn-sm"
                onClick={toggleDarkMode}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                className="btn btn-ghost btn-circle"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-base-200 shadow-lg md:hidden transition-all duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            <a
              href="/login"
              className="btn btn-ghost w-full"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Login
            </a>
            <a
              href="/register"
              className="btn btn-primary w-full"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </>
  );
}