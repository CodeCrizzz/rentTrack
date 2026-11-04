"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme || theme) : "dark";
  const isDark = currentTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ||
        "group relative p-2 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors outline-none cursor-pointer"
      }
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        className={`w-5 h-5 transition-transform duration-300 group-hover:rotate-45 group-active:scale-90 text-amber-500 ${
          isDark ? "hidden" : "block"
        }`}
        strokeWidth={2}
      />
      <Moon
        className={`w-5 h-5 transition-transform duration-300 group-hover:-rotate-12 group-active:scale-90 text-zinc-300 ${
          isDark ? "block" : "hidden"
        }`}
        strokeWidth={2}
      />
    </button>
  );
}
