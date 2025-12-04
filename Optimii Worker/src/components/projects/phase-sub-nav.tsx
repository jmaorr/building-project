"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Layers,
  FolderOpen,
  Receipt,
  Activity,
} from "lucide-react";

interface PhaseSubNavProps {
  projectId: string;
  phaseSlug: string;
  className?: string;
}

const subNavItems = [
  { slug: "", label: "Stages", icon: Layers },
  { slug: "files", label: "Files", icon: FolderOpen },
  { slug: "payments", label: "Payments", icon: Receipt },
  { slug: "activity", label: "Activity", icon: Activity },
];

export function PhaseSubNav({ projectId, phaseSlug, className }: PhaseSubNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}/${phaseSlug}`;

  return (
    <div className={cn("border-b border-border bg-muted/30", className)}>
      <nav className="flex items-center gap-1 px-4 lg:px-6 overflow-x-auto scrollbar-none py-1">
        {subNavItems.map((item) => {
          const href = item.slug ? `${basePath}/${item.slug}` : basePath;
          // For the main stages page, also match /stages/* routes
          const isActive = item.slug === "" 
            ? (pathname === basePath || pathname.startsWith(`${basePath}/stages`))
            : pathname.startsWith(href);
          const Icon = item.icon;

          return (
            <Link
              key={item.slug || "stages"}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                "min-h-[36px]",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
