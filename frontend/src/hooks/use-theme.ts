// hooks/use-theme.ts
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function useToggleTheme() {
  const { theme, setTheme, systemTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDarkMode = currentTheme === "dark";

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? "light" : "dark");
  };

  const setDarkMode = (isDark: boolean) => {
    setTheme(isDark ? "dark" : "light");
  };

  return {
    isDarkMode: mounted && isDarkMode,
    setDarkMode,
    toggleDarkMode,
    theme: mounted ? currentTheme : undefined,
    currentTheme: mounted ? currentTheme : undefined,
    themes,
    setTheme
  }
}
