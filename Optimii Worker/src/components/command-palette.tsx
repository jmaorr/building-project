"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  FolderKanban,
  Users,
  Settings,
  Search,
  Moon,
  Sun,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface CommandPaletteProps {
  /** Open state controlled externally */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  const isOpen = open ?? internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  // Handle keyboard shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setIsOpen(false);
      command();
    },
    [setIsOpen]
  );

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/projects"))}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/contacts"))}
          >
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/projects/new"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/contacts/new"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Theme */}
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Search className="mr-2 h-4 w-4" />
            System Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook to control the command palette from anywhere
 */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  const openPalette = React.useCallback(() => setOpen(true), []);
  const closePalette = React.useCallback(() => setOpen(false), []);

  return {
    open,
    setOpen,
    toggle,
    openPalette,
    closePalette,
  };
}





