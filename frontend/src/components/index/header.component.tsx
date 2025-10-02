// components/Header.tsx
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import useToggleTheme from "@hooks/use-theme";
import { getCssVariableValue } from "@utils/get-css-var";
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
        setTimeout(() => {
          setBgColor(oklchToRgba(getCssVariableValue("--color-base-200"), 0.7));
        }, 50);
      }
    };

    updateColor();
  }, [isDarkMode, isScrolled]);

  return (
    <motion.header
      className="navbar fixed z-50 top-0 left-0 w-full"
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
        className="navbar-start flex items-center pl-4 md:pl-8 pt-1 z-10" // 👈 added pt-2 (adjust as needed)
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <motion.img
          className="h-16 w-auto"
          src="/logo/mainLogo.png"
          alt="ArtChive Logo"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        />
      </motion.div>

      {/* Right Side - Buttons */}
      <div className="navbar-end flex items-center pr-4 md:pr-8 z-10">
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
