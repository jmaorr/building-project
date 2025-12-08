"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingWrapperProps {
  /** Skeleton component to show during loading */
  skeleton: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Delay between child element animations (in ms) */
  staggerDelay?: number;
  /** Animation duration (in ms) */
  duration?: number;
}

/**
 * Universal loading wrapper with blur reveal animation for Suspense fallbacks
 * Automatically handles the blur reveal transition when content loads
 * 
 * @example
 * ```tsx
 * <Suspense fallback={<LoadingWrapper skeleton={<CardSkeleton />} />}>
 *   <YourContent />
 * </Suspense>
 * ```
 */
export function LoadingWrapper({
  skeleton,
  className,
  staggerDelay = 100,
  duration = 1000,
}: LoadingWrapperProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [showContent, setShowContent] = React.useState(false);

  // This component is used as a Suspense fallback, so when Suspense resolves,
  // this component will unmount. We need to handle the transition differently.
  // Instead, we'll use CSS to handle the blur reveal on the actual content.
  
  return (
    <div className={cn("relative", className)}>
      {/* Blur overlay */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg transition-opacity ease-out"
        style={{ transitionDuration: `${duration}ms` }}
      />

      {/* Skeleton placeholder */}
      <div className="relative z-20">{skeleton}</div>
    </div>
  );
}

/**
 * Higher-order component that wraps content with blur reveal animation
 * Use this to wrap your actual content so it animates in smoothly
 */
export function withBlurReveal<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    staggerDelay?: number;
    duration?: number;
  }
) {
  const { staggerDelay = 100, duration = 1000 } = options || {};

  return function BlurRevealWrapper(props: P) {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);

      return () => clearTimeout(timer);
    }, []);

    return (
      <div
        className={cn(
          "transition-all ease-out",
          isVisible
            ? "opacity-100 blur-0 translate-y-0"
            : "opacity-0 blur-sm translate-y-2"
        )}
        style={{
          transitionDuration: `${duration}ms`,
        }}
      >
        <Component {...props} />
      </div>
    );
  };
}

