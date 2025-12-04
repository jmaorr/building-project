"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { BrandProvider } from "./brand-provider";
import { OrganizationProvider } from "./organization-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ActiveOrganization } from "@/lib/organizations/get-active-organization";

interface ProvidersProps {
  children: React.ReactNode;
  /** Initial brand configuration */
  initialBrand?: {
    accentColor?: string;
    logoUrl?: string;
    orgName?: string;
  };
  organization?: Partial<ActiveOrganization>;
}

/**
 * Root providers wrapper - combines all context providers
 */
export function Providers({ children, initialBrand, organization }: ProvidersProps) {
  const brandFromOrg = React.useMemo(() => {
    if (!organization) return initialBrand;
    return {
      accentColor: organization.accentColor || initialBrand?.accentColor,
      logoUrl: organization.logoUrl || initialBrand?.logoUrl,
      orgName: organization.name || initialBrand?.orgName,
    };
  }, [initialBrand, organization]);

  return (
    <ThemeProvider>
      <OrganizationProvider organization={organization}>
        <BrandProvider initialBrand={brandFromOrg}>
          <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        </BrandProvider>
      </OrganizationProvider>
    </ThemeProvider>
  );
}

export { ThemeProvider } from "./theme-provider";
export { BrandProvider, useBrand, useBrandConfig } from "./brand-provider";
export { OrganizationProvider, useOrganization } from "./organization-provider";
