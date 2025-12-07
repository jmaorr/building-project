"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";

export interface ActiveOrganization {
  id: string;
  name: string;
  accentColor?: string | null;
  logoUrl?: string | null;
  role?: "owner" | "admin" | "member";
}

interface OrganizationContextValue {
  organization: ActiveOrganization | null;
  isLoading: boolean;
  isHydrated: boolean;
  refreshOrganization: () => Promise<void>;
}

const DEFAULT_VALUE: OrganizationContextValue = {
  organization: null,
  isLoading: true,
  isHydrated: false,
  refreshOrganization: async () => undefined,
};

const OrganizationContext = React.createContext<OrganizationContextValue>(DEFAULT_VALUE);

interface OrganizationProviderProps {
  children: React.ReactNode;
}

/**
 * Client provider that loads organization data from the server
 * Only loads after user is authenticated
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const [organization, setOrganization] = React.useState<ActiveOrganization | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isHydrated, setIsHydrated] = React.useState(false);

  const loadOrganization = React.useCallback(async () => {
    if (!userId || !authLoaded) {
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch organization data from server
      const response = await fetch("/api/organization");
      if (!response.ok) {
        throw new Error("Failed to fetch organization");
      }
      
      const data = await response.json();
      setOrganization(data.organization);
      setIsHydrated(true);
    } catch (error) {
      console.error("Error loading organization:", error);
      setOrganization(null);
      setIsHydrated(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, authLoaded]);

  // Load organization when auth is ready
  React.useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const value = React.useMemo(
    () => ({
      organization,
      isLoading,
      isHydrated,
      refreshOrganization: loadOrganization,
    }),
    [organization, isLoading, isHydrated, loadOrganization]
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
