"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { BrandProvider } from "./brand-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ProvidersProps {
  children: React.ReactNode;
  /** Initial brand configuration */
  initialBrand?: {
    accentColor?: string;
    logoUrl?: string;
    orgName?: string;
  };
}

/**
 * Root providers wrapper - combines all context providers
 */
export function Providers({ children, initialBrand }: ProvidersProps) {
  return (
    <ThemeProvider>
      <BrandProvider initialBrand={initialBrand}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      </BrandProvider>
    </ThemeProvider>
  );
}

export { ThemeProvider } from "./theme-provider";
export { BrandProvider, useBrand, useBrandConfig } from "./brand-provider";





