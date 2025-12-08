"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonWrapperProps {
  /** Whether content is currently loading */
  isLoading: boolean;
  /** Content to display when loaded */
  children: React.ReactNode;
  /** Skeleton component to show during loading */
  skeleton?: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Delay between child element animations (in ms) */
  staggerDelay?: number;
  /** Animation duration (in ms) */
  duration?: number;
}

/**
 * Universal skeleton wrapper with blur reveal animation
 * 
 * @example
 * ```tsx
 * <SkeletonWrapper 
 *   isLoading={isLoading} 
 *   skeleton={<CardSkeleton />}
 * >
 *   <YourContent />
 * </SkeletonWrapper>
 * ```
 */
export function SkeletonWrapper({
  isLoading,
  children,
  skeleton,
  className,
  staggerDelay = 100,
  duration = 1000,
}: SkeletonWrapperProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Blur overlay during loading */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg transition-opacity ease-out"
          style={{ transitionDuration: `${duration}ms` }}
        />
      )}

      {/* Skeleton placeholder */}
      {isLoading && skeleton && (
        <div className="relative z-20">{skeleton}</div>
      )}

      {/* Content with blur reveal */}
      <div
        className={cn(
          "transition-all ease-out",
          isLoading && skeleton
            ? "opacity-0 pointer-events-none"
            : isLoading
            ? "opacity-0 blur-sm translate-y-2 pointer-events-none"
            : "opacity-100 blur-0 translate-y-0 pointer-events-auto"
        )}
        style={{
          transitionDuration: `${duration}ms`,
        }}
      >
        {React.Children.map(React.Children.toArray(children), (child, index) => {
          if (React.isValidElement(child)) {
            const props = child.props as { className?: string; style?: React.CSSProperties };
            return React.cloneElement(child, {
              className: cn(
                "transition-all duration-1000 ease-out",
                isLoading
                  ? "opacity-0 blur-sm translate-y-2"
                  : "opacity-100 blur-0 translate-y-0",
                props.className
              ),
              style: {
                ...props.style,
                transitionDelay: isLoading ? "0ms" : `${index * staggerDelay}ms`,
              },
            } as React.HTMLAttributes<HTMLElement>);
          }
          return child;
        })}
      </div>
    </div>
  );
}

