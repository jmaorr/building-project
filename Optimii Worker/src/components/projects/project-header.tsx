"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project, Phase } from "@/lib/db/schema";

interface ProjectHeaderProps {
  project: Project;
  phases: Phase[];
}

// Map phase names to slugs
const phaseSlugs: Record<string, string> = {
  Design: "design",
  Build: "build",
  Certification: "certification",
};

export function ProjectHeader({ project, phases }: ProjectHeaderProps) {
  const pathname = usePathname();

  // Get current tab from URL
  const getCurrentTab = () => {
    if (
      pathname === `/projects/${project.id}` ||
      pathname === `/projects/${project.id}/`
    ) {
      return "overview";
    }
    const match = pathname.match(/\/projects\/[^/]+\/([^/]+)/);
    if (match) {
      return match[1];
    }
    return "overview";
  };

  const currentTab = getCurrentTab();

  return (
    <div className="sticky top-0 z-20 bg-background border-b border-border">
      {/* Top section: Breadcrumb + Title + Actions */}
      <div className="px-4 lg:px-6 pt-4 pb-3">
        {/* Breadcrumb - compact on mobile */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors hidden sm:inline"
          >
            Projects
          </Link>
          <ChevronRight className="h-3 w-3 hidden sm:inline" />
          <span className="text-foreground font-medium truncate">
            {project.name}
          </span>
        </nav>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">
                {project.description}
              </p>
            )}
          </div>

          {/* Actions - responsive */}
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={project.status} className="hidden sm:flex" />

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/contacts`}>
                  <Users className="mr-2 h-4 w-4" />
                  Contacts
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>

            {/* Mobile menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href={`/projects/${project.id}/contacts`}
                    className="flex items-center"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Contacts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={`/projects/${project.id}/settings`}
                    className="flex items-center"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <StatusBadge status={project.status} />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Phase tabs - horizontal scroll on mobile */}
      <div className="px-4 lg:px-6">
        <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mb-px">
          {/* Overview Tab */}
          <TabLink
            href={`/projects/${project.id}`}
            isActive={currentTab === "overview"}
          >
            Overview
          </TabLink>

          {/* Phase Tabs */}
          {phases.map((phase) => {
            const slug = phaseSlugs[phase.name] || phase.id;
            const href = `/projects/${project.id}/${slug}`;
            const isActive = currentTab === slug;

            return (
              <TabLink key={phase.id} href={href} isActive={isActive}>
                {phase.name}
              </TabLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

interface TabLinkProps {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}

function TabLink({ href, isActive, children }: TabLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
        "min-w-[44px] flex items-center justify-center", // Touch target
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {/* Active indicator */}
      {isActive && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand rounded-full" />
      )}
    </Link>
  );
}

