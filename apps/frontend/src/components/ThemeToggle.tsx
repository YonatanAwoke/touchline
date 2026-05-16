import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-border bg-secondary transition-colors hover:bg-secondary/80 ${className}`}
    >
      <span
        className={`absolute left-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-md transition-transform duration-300 ease-out ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon size={14} className="text-primary" />
        ) : (
          <Sun size={14} className="text-primary" />
        )}
      </span>
      <Sun size={14} className={`absolute left-2 transition-opacity ${isDark ? "opacity-30" : "opacity-0"} text-muted-foreground`} />
      <Moon size={14} className={`absolute right-2 transition-opacity ${isDark ? "opacity-0" : "opacity-30"} text-muted-foreground`} />
    </button>
  );
};

export default ThemeToggle;
