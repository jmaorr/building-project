"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback for new project shortcut */
  onNewProject?: () => void;
  /** Callback for search focus shortcut */
  onFocusSearch?: () => void;
  /** Callback for escape key */
  onEscape?: () => void;
}

/**
 * Hook for managing global keyboard shortcuts
 * 
 * Shortcuts:
 * - N or ⌘N: New project (when not in input)
 * - /: Focus search input (when available)
 * - Esc: Close modals/dialogs (handled by Radix UI by default)
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   onNewProject: () => router.push("/projects/new"),
 *   onFocusSearch: () => searchInputRef.current?.focus(),
 * });
 * ```
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onNewProject, onFocusSearch } = options;
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable]");

      if (isInput) return;

      // N or ⌘N: New project
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (onNewProject) {
          onNewProject();
        } else {
          router.push("/projects/new");
        }
        return;
      }

      // /: Focus search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (onFocusSearch) {
          onFocusSearch();
        } else {
          // Try to find and focus the first search input
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i]'
          );
          searchInput?.focus();
        }
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onNewProject, onFocusSearch, router]);
}

