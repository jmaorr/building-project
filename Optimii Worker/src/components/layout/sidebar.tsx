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
        "flex h-full flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 transition-opacity",
            collapsed && "justify-center"
          )}
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
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground truncate">
              {brand.orgName}
            </span>
          )}
        </Link>
        {onToggleCollapse && !collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
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
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Secondary navigation */}
      <nav className="p-3 space-y-1">
        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      <Separator className="bg-sidebar-border" />

      {/* User actions: Notifications, Theme, Account */}
      <div className="p-3 space-y-1">
        {/* Notifications */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Notifications</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3"
          >
            <Bell className="h-4 w-4" />
            <span className="ml-2 flex-1 text-left text-sm">Notifications</span>
          </Button>
        )}

        {/* Theme Toggle */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ThemeToggleSidebar />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Theme</TooltipContent>
          </Tooltip>
        ) : (
          <ThemeToggleSidebar asMenuItem />
        )}

        {/* User Account */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SignedIn>
                  <UserButton
                    afterSignOutUrl="/sign-in"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8",
                        userButtonPopoverCard: "shadow-lg",
                      },
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <span className="text-xs">SI</span>
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Account</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <SignedIn>
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                    userButtonPopoverCard: "shadow-lg",
                  },
                }}
              />
              <span className="text-sm font-medium text-sidebar-foreground/70">Account</span>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                  <span className="text-sm">Sign in</span>
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        )}
      </div>
    </aside>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}

function NavLink({ item, active, collapsed }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.badge && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.title}
          {item.badge && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}





