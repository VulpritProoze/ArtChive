// components/Header.tsx
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import useToggleTheme from "@hooks/use-theme";
import { getCssVariableValue } from "@utils/get-css-var"
import { oklchToRgba } from "@utils/oklch-to-rgba";
import {
  motion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";

export default function Header() {
  const { isDarkMode, toggleDarkMode } = useToggleTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const [bgColor, setBgColor] = useState("transparent");

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 10);
  });

  // Update background color when theme changes or scroll state changes
  useEffect(() => {
    const updateColor = () => {
      if (!isScrolled) {
        setBgColor("transparent");
      } else {
        // Use setTimeout to ensure theme has been applied
        setTimeout(() => {
          setBgColor(oklchToRgba(getCssVariableValue("--color-base-200"), 0.7));
        }, 50); // Small delay to ensure theme is applied
      }
    };

    updateColor();
  }, [isDarkMode, isScrolled]);

  return (
    <motion.header
      className="navbar fixed z-50 top-0 left-0 px-6 md:px-16"
      initial={false}
      animate={{
        height: isScrolled ? "70px" : "90px",
        backdropFilter: isScrolled ? "blur(10px)" : "blur(0px)",
        backgroundColor: bgColor,
        boxShadow: isScrolled ? "0 4px 30px rgba(0, 0, 0, 0.1)" : "none",
      }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
      {/* Left Side - Logo */}
      <motion.div
        className="navbar-start z-10"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <div className="flex flex-row gap-2 items-center">
          <motion.img
            className="w-8"
            src="favicon/favicon.ico"
            alt="icon"
            whileHover={{ rotate: 15 }}
            transition={{ type: "spring", stiffness: 300 }}
          />
          <article className="prose prose-headings:text-primary">
            <h2 className="font-medium m-0">ArtChive</h2>
          </article>
        </div>
      </motion.div>

      {/* Right Side - Buttons */}
      <div className="navbar-end z-10">
        <div className="flex flex-row items-center gap-4">
          {/* Theme toggle button with icon */}
          <motion.button
            className="btn btn-ghost btn-circle"
            onClick={toggleDarkMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </motion.button>

          {/* Login/Signup Buttons */}
          <div className="flex items-center gap-2">
            <motion.a
              href="/login"
              className="btn btn-ghost"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login
            </motion.a>
            <motion.a
              href="/register"
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Sign Up
            </motion.a>
          </div>
        </div>
      </div>
    </motion.header>
  );
}