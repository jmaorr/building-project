"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ContentWrapperProps {
  /** Content to wrap */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Delay between child element animations (in ms) */
  staggerDelay?: number;
  /** Animation duration (in ms) */
  duration?: number;
  /** Whether to enable cascade animation */
  cascade?: boolean;
}

/**
 * Universal content wrapper with blur reveal and cascade animation
 * Wrap your content with this to get automatic blur reveal animation
 * 
 * @example
 * ```tsx
 * <ContentWrapper cascade staggerDelay={100}>
 *   <YourContent />
 * </ContentWrapper>
 * ```
 */
export function ContentWrapper({
  children,
  className,
  staggerDelay = 100,
  duration = 1000,
  cascade = true,
}: ContentWrapperProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  if (!cascade) {
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
        {children}
      </div>
    );
  }

  // Cascade animation for child elements
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {React.Children.map(childrenArray, (child, index) => {
        if (React.isValidElement(child)) {
          const props = child.props as { className?: string; style?: React.CSSProperties };
          return React.cloneElement(child, {
            className: cn(
              "transition-all ease-out",
              isVisible
                ? "opacity-100 blur-0 translate-y-0"
                : "opacity-0 blur-sm translate-y-2",
              props.className
            ),
            style: {
              ...props.style,
              transitionDuration: `${duration}ms`,
              transitionDelay: isVisible ? `${index * staggerDelay}ms` : "0ms",
            },
          } as React.HTMLAttributes<HTMLElement>);
        }
        return child;
      })}
    </div>
  );
}

