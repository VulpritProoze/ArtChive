// components/Header.tsx
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import useToggleTheme from "@src/utils/use-theme";
import Hamburger from "hamburger-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const navItems = [
  { name: "Explore", href: "/explore" },
  { name: "Community", href: "/community" },
  { name: "Login", href: "/login" },
];

export default function Header() {
  const { isDarkMode, toggleDarkMode, setTheme } = useToggleTheme();
  const [isOpen, setOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 10);
  });

  // Close menu when clicking on a link
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const getBackgroundColor = () => {
    if (!isScrolled) return "transparent";
    return isDarkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.7)";
  };

  return (
    <motion.header
      className="navbar fixed z-50 top-0 left-0 px-6 md:px-16"
      initial={false}
      animate={{
        height: isScrolled ? "70px" : "90px",
        backdropFilter: isScrolled ? "blur(10px)" : "blur(0px)",
        backgroundColor: getBackgroundColor(),
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

      {/* Right Side - Buttons & Hamburger */}
      <div className="navbar-end z-10">
        <div className="flex flex-row items-center gap-4">
          {/* Dark mode toggle */}
          <motion.button
            className="btn btn-ghost btn-circle"
            onClick={toggleDarkMode}
            aria-label={
              isDarkMode ? "Switch to light mode" : "Switch to dark mode"
            }
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative w-5 h-5">
              <AnimatePresence mode="wait">
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -30, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 30, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <MoonIcon />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: 30, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -30, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute"
                  >
                    <SunIcon />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.button>

          {/* Theme selector dropdown */}
          <motion.div
            className="dropdown dropdown-end"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div tabIndex={0} role="button" className="btn btn-ghost m-1">
              Theme
              <ChevronDown className="w-4 h-4 ml-1" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-300 rounded-box w-52"
            >
              <li>
                <button onClick={() => setTheme("cupcake")}>
                  <span className="badge badge-primary badge-xs mr-2"></span>
                  Cupcake
                </button>
              </li>
              <li>
                <button onClick={() => setTheme("synthwave")}>
                  <span className="badge badge-secondary badge-xs mr-2"></span>
                  Synthwave
                </button>
              </li>
              <li>
                <button onClick={() => setTheme("halloween")}>
                  <span className="badge badge-accent badge-xs mr-2"></span>
                  Halloween
                </button>
              </li>
            </ul>
          </motion.div>

          {/* Hamburger */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Hamburger size={20} toggled={isOpen} toggle={setOpen} />
          </motion.div>
        </div>
      </div>

      {/* Full Page Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 bg-base-100 flex flex-col h-screen justify-center items-center">
            <nav className="text-center space-y-8">
              {navItems.map((item, index) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className="block hover:text-primary text-2xl font-medium"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  onClick={() => setOpen(false)}
                >
                  {item.name}
                </motion.a>
              ))}
              <motion.button
                className="btn btn-secondary mt-6 text-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={() => setOpen(false)}
              >
                Sign Up
              </motion.button>
            </nav>
          </div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
