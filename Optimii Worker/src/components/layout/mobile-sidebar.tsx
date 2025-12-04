"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, FolderKanban, Users, Settings, HelpCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandConfig } from "@/components/providers/brand-provider";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
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

interface MobileSidebarProps {
  className?: string;
}

export function MobileSidebar({ className }: MobileSidebarProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const brand = useBrandConfig();

  // Close menu on navigation
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Menu trigger */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-9 w-9", className)}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border",
          "transform transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
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
            <span className="font-semibold text-sidebar-foreground">
              {brand.orgName}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>

          <div className="my-4 h-px bg-sidebar-border" />

          <div className="space-y-1">
            {secondaryNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onClick={() => setOpen(false)}
              />
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}

function NavLink({ item, active, onClick }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
        "min-h-[44px]", // Touch target
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.title}</span>
    </Link>
  );
}
