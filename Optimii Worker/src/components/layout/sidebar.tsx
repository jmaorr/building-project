"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FolderKanban,
  Users,
  Settings,
  HelpCircle,
  Search,
  ChevronLeft,
  Building2,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBrandConfig } from "@/components/providers/brand-provider";
import { ThemeToggleSidebar } from "@/components/theme-toggle-sidebar";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { SidebarItem } from "./sidebar-item";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Contacts", href: "/contacts", icon: Users },
];

const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help", href: "/help", icon: HelpCircle },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const brand = useBrandConfig();

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 group",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="relative flex h-14 items-center border-b border-sidebar-border">
        {collapsed ? (
          <>
            {/* When collapsed: Show icon centered, expand button overlays on hover */}
            <Link
              href="/"
              className="flex items-center justify-center w-full h-full relative"
            >
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.orgName}
                  className="h-8 w-8 rounded"
                />
              ) : (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded"
                  style={{ backgroundColor: brand.accentColor }}
                >
                  <Building2 className="h-4 w-4 text-white" />
                </div>
              )}
            </Link>
            {/* Expand button appears on hover, overlaying the icon */}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute inset-0 w-full h-full bg-sidebar-accent/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sidebar-foreground hover:text-sidebar-foreground z-10"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            )}
          </>
        ) : (
          <>
            {/* When expanded: Show icon, name, and collapse button */}
            <div className="flex items-center justify-between px-3 gap-2 w-full">
              <Link
                href="/"
                className="flex items-center gap-2 transition-opacity min-w-0 flex-1"
              >
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={brand.orgName}
                    className="h-8 w-8 rounded shrink-0"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded shrink-0"
                    style={{ backgroundColor: brand.accentColor }}
                  >
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="font-semibold text-sidebar-foreground truncate min-w-0">
                  {brand.orgName}
                </span>
              </Link>
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0"
                  onClick={onToggleCollapse}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Search trigger */}
      <div className="p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed ? "px-2" : "px-3"
          )}
        >
          <Search className="h-4 w-4" />
          {!collapsed && (
            <>
              <span className="ml-2 flex-1 text-left text-sm">Search...</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/60">
                ⌘K
              </kbd>
            </>
          )}
        </Button>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {mainNav.map((item) => (
          <SidebarItem
            key={item.href}
            icon={<item.icon className="h-4 w-4" />}
            label={item.title}
            badge={item.badge}
            href={item.href}
            active={pathname === item.href}
            collapsed={collapsed}
            tooltip={item.title}
          />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Secondary navigation and User actions */}
      <nav className="p-3 space-y-1">
        {secondaryNav.map((item) => (
          <SidebarItem
            key={item.href}
            icon={<item.icon className="h-4 w-4" />}
            label={item.title}
            badge={item.badge}
            href={item.href}
            active={pathname === item.href}
            collapsed={collapsed}
            tooltip={item.title}
          />
        ))}
        
        {/* User actions: Notifications, Theme, Account */}
        <SidebarItem
          icon={<Bell className="h-4 w-4" />}
          label="Notifications"
          collapsed={collapsed}
          tooltip="Notifications"
        />

        {/* Theme Toggle */}
        {collapsed ? (
          <SidebarItem
            collapsed={collapsed}
            tooltip="Theme"
            children={<ThemeToggleSidebar />}
          />
        ) : (
          <ThemeToggleSidebar asMenuItem />
        )}

        {/* User Account */}
        <SidebarItem
          collapsed={collapsed}
          tooltip="Account"
          children={
            <>
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/sign-in"
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: collapsed ? "1.25rem" : "1rem",
                        height: collapsed ? "1.25rem" : "1rem",
                        minWidth: collapsed ? "1.25rem" : "1rem",
                      },
                      userButtonPopoverCard: "shadow-lg",
                    },
                  }}
                />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="icon" className={collapsed ? "h-5 w-5" : "h-4 w-4"} aria-label="Sign in">
                    <span className={collapsed ? "text-[10px]" : "text-[10px]"}>SI</span>
                  </Button>
                </SignInButton>
              </SignedOut>
              {!collapsed && <span className="text-sm flex-1">Account</span>}
            </>
          }
        />
      </nav>
    </aside>
  );
}






