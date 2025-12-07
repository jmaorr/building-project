"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { BrandProvider } from "./brand-provider";
import { OrganizationProvider } from "./organization-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root providers wrapper - combines all context providers
 * Organization data is loaded client-side after authentication
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <OrganizationProvider>
        <BrandProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
        </BrandProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}

export { ThemeProvider } from "./theme-provider";
export { BrandProvider, useBrand, useBrandConfig } from "./brand-provider";
export { OrganizationProvider, useOrganization } from "./organization-provider";
