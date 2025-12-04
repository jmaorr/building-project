"use client";

import * as React from "react";
import {
  useOrganization as useClerkOrganization,
  useOrganizationList,
} from "@clerk/nextjs";
import type { ActiveOrganization } from "@/lib/organizations/get-active-organization";

interface OrganizationContextValue extends ActiveOrganization {
  /** Indicates whether a live org context (from Clerk) has hydrated */
  isHydrated: boolean;
  /** Imperatively override the active organization (e.g., after org switch) */
  setOrganization: (organization: Partial<ActiveOrganization>) => void;
}

const DEFAULT_ORGANIZATION: OrganizationContextValue = {
  id: "org-1",
  name: "Optimii",
  accentColor: "#5e6ad2",
  logoUrl: null,
  isHydrated: false,
  setOrganization: () => undefined,
};

const OrganizationContext = React.createContext<OrganizationContextValue>(
  DEFAULT_ORGANIZATION
);

interface OrganizationProviderProps {
  children: React.ReactNode;
  organization?: Partial<ActiveOrganization>;
}

function useSafeClerkOrganization() {
  try {
    return useClerkOrganization();
  } catch {
    return { organization: null, isLoaded: false };
  }
}

function useSafeOrganizationList() {
  try {
    return useOrganizationList({ userMemberships: true });
  } catch {
    return { setActive: async () => undefined, isLoaded: false };
  }
}

function mapClerkOrganization(org: ReturnType<typeof useClerkOrganization>["organization"]):
  | ActiveOrganization
  | null {
  if (!org) return null;

  const accentColor = (org.publicMetadata?.accentColor as string | undefined) || undefined;
  const logoUrl = org.imageUrl || undefined;

  return {
    id: org.id,
    name: org.name || DEFAULT_ORGANIZATION.name,
    accentColor,
    logoUrl,
  };
}

/**
 * Client provider that hydrates active organization details from Clerk when available
 * while supporting a server-provided default organization for static rendering.
 */
export function OrganizationProvider({ children, organization }: OrganizationProviderProps) {
  const { organization: clerkOrganization, isLoaded } = useSafeClerkOrganization();
  const { isLoaded: orgListLoaded, setActive } = useSafeOrganizationList();

  const [activeOrg, setActiveOrg] = React.useState<OrganizationContextValue>({
    ...DEFAULT_ORGANIZATION,
    ...organization,
  });

  // Hydrate from Clerk when available and keep in sync with org switching.
  React.useEffect(() => {
    const mapped = mapClerkOrganization(clerkOrganization);
    if (!isLoaded || !mapped) return;

    setActiveOrg((prev) => ({
      ...prev,
      ...mapped,
      isHydrated: true,
    }));
  }, [clerkOrganization, isLoaded]);

  // When server provided org changes (navigation), update defaults.
  React.useEffect(() => {
    if (!organization) return;
    setActiveOrg((prev) => ({
      ...prev,
      ...organization,
    }));
  }, [organization]);

  const setOrganization = React.useCallback(
    (org: Partial<ActiveOrganization>) => {
      setActiveOrg((prev) => ({
        ...prev,
        ...org,
      }));

      // If Clerk is available, reflect the change in the Clerk org context too.
      if (orgListLoaded && org.id) {
        setActive(org.id).catch((error) => {
          console.error("Failed to set active organization in Clerk", error);
        });
      }
    },
    [orgListLoaded, setActive]
  );

  const value = React.useMemo(
    () => ({
      ...activeOrg,
      setOrganization,
    }),
    [activeOrg, setOrganization]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  return React.useContext(OrganizationContext);
}
