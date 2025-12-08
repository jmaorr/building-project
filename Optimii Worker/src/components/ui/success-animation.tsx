"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  /** Size of the checkmark icon */
  size?: number;
  /** Additional className */
  className?: string;
}

/**
 * Success animation component with animated checkmark
 * 
 * @example
 * ```tsx
 * <SuccessAnimation size={24} />
 * ```
 */
export function SuccessAnimation({
  size = 20,
  className,
}: SuccessAnimationProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center animate-in zoom-in-95 fade-in-0 duration-300",
        className
      )}
    >
      <CheckCircle2
        className="text-green-600 dark:text-green-400"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}

