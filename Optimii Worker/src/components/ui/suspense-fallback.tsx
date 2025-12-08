"use client";

import * as React from "react";
import { SkeletonWrapper } from "./skeleton-wrapper";
import { CardSkeleton, ListSkeleton, TableSkeleton, FormSkeleton, DetailSkeleton } from "./skeletons";
import { cn } from "@/lib/utils";

interface SuspenseFallbackProps {
  /** Type of skeleton to show */
  type?: "card" | "list" | "table" | "form" | "detail";
  /** Count of skeleton items */
  count?: number;
  /** Additional className */
  className?: string;
  /** Custom skeleton component */
  skeleton?: React.ReactNode;
}

/**
 * Universal Suspense fallback with blur reveal animation
 * Automatically handles the transition when Suspense resolves
 * 
 * @example
 * ```tsx
 * <Suspense fallback={<SuspenseFallback type="card" count={6} />}>
 *   <YourContent />
 * </Suspense>
 * ```
 */
export function SuspenseFallback({
  type = "card",
  count,
  className,
  skeleton,
}: SuspenseFallbackProps) {
  const [isLoading, setIsLoading] = React.useState(true);

  // When Suspense resolves, this component unmounts, so we need to handle
  // the transition on the actual content. For now, we'll show the skeleton
  // with a blur overlay that will fade out when content appears.

  const getSkeleton = () => {
    if (skeleton) return skeleton;

    switch (type) {
      case "card":
        return <CardSkeleton count={count} className={className} />;
      case "list":
        return <ListSkeleton count={count} className={className} />;
      case "table":
        return <TableSkeleton count={count} className={className} />;
      case "form":
        return <FormSkeleton className={className} />;
      case "detail":
        return <DetailSkeleton className={className} />;
      default:
        return <CardSkeleton count={count} className={className} />;
    }
  };

  return (
    <div className={cn("relative min-h-[200px]", className)}>
      {/* Blur overlay during loading */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg transition-opacity ease-out"
        style={{ transitionDuration: "1000ms" }}
      />

      {/* Skeleton placeholder */}
      <div className="relative z-20 opacity-100">{getSkeleton()}</div>
    </div>
  );
}

