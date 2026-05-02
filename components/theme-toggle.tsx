"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-pressed={isLight}
      className={`theme-toggle ${className}`}
      data-cursor-hover="true"
      onClick={toggle}
      type="button"
    >
      <span className="theme-toggle__track">
        <span className={`theme-toggle__icon ${!isLight ? "is-active" : ""}`}>
          <Moon size={12} />
        </span>
        <span className={`theme-toggle__icon ${isLight ? "is-active" : ""}`}>
          <Sun size={12} />
        </span>
      </span>
      <span className="theme-toggle__thumb" />
    </button>
  );
}
