"use client";

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useRouter } from "next/navigation";

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that sets up global keyboard shortcuts
 */
export function KeyboardShortcutsProvider({
  children,
}: KeyboardShortcutsProviderProps) {
  const router = useRouter();

  useKeyboardShortcuts({
    onNewProject: () => router.push("/projects/new"),
  });

  return <>{children}</>;
}

