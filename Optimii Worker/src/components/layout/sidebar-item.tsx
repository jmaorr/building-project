"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarItemProps {
  /** Icon component */
  icon?: React.ReactNode;
  /** Label text (shown when expanded) */
  label?: string;
  /** Badge to display next to label */
  badge?: string;
  /** Whether the sidebar is collapsed */
  collapsed: boolean;
  /** Whether this item is active */
  active?: boolean;
  /** Tooltip text (shown when collapsed) */
  tooltip?: string;
  /** Optional href for link items */
  href?: string;
  /** Optional onClick handler for button items */
  onClick?: () => void;
  /** Custom content to render instead of icon + label */
  children?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function SidebarItem({
  icon,
  label,
  badge,
  collapsed,
  active = false,
  tooltip,
  href,
  onClick,
  children,
  className,
}: SidebarItemProps) {
  const baseClasses = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
    collapsed && "justify-center px-2",
    className
  );

  // If custom children provided, render them
  if (children) {
    const content = (
      <div className={cn(
        baseClasses,
        collapsed && "py-0"
      )}>
        {children}
      </div>
    );

    if (collapsed && tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  }

  // Render as link if href provided
  if (href) {
    const linkContent = (
      <Link href={href} className={baseClasses}>
        {icon && <span className="shrink-0">{icon}</span>}
        {!collapsed && (
          <>
            {label && <span className="flex-1">{label}</span>}
            {badge && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                {badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed && tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {tooltip}
            {badge && (
              <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                {badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  }

  // Render as button
  const buttonContent = (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : undefined}
      className={cn(
        "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        !collapsed && "justify-start px-3 gap-3",
        className
      )}
      onClick={onClick}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {!collapsed && (
        <>
          {label && <span className="flex-1 text-left text-sm">{label}</span>}
          {badge && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
              {badge}
            </span>
          )}
        </>
      )}
    </Button>
  );

  if (collapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
}

