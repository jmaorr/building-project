"use client";

import * as React from "react";

interface BrandConfig {
  /** Primary accent color (hex format) */
  accentColor: string;
  /** Optional logo URL */
  logoUrl?: string;
  /** Optional organization name */
  orgName?: string;
}

interface BrandContextValue {
  brand: BrandConfig;
  setBrand: (brand: Partial<BrandConfig>) => void;
}

const defaultBrand: BrandConfig = {
  accentColor: "#5e6ad2", // Linear-inspired purple
  logoUrl: undefined,
  orgName: "Optimii",
};

const BrandContext = React.createContext<BrandContextValue | undefined>(
  undefined
);

interface BrandProviderProps {
  children: React.ReactNode;
  /** Initial brand configuration (e.g., from organization settings) */
  initialBrand?: Partial<BrandConfig>;
}

export function BrandProvider({ children, initialBrand }: BrandProviderProps) {
  const [brand, setBrandState] = React.useState<BrandConfig>({
    ...defaultBrand,
    ...initialBrand,
  });

  const setBrand = React.useCallback((updates: Partial<BrandConfig>) => {
    setBrandState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Inject the brand accent color as a CSS variable
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-accent", brand.accentColor);
  }, [brand.accentColor]);

  const value = React.useMemo(() => ({ brand, setBrand }), [brand, setBrand]);

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrand() {
  const context = React.useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrand must be used within a BrandProvider");
  }
  return context;
}

/**
 * Hook to get just the brand config without the setter
 */
export function useBrandConfig() {
  const { brand } = useBrand();
  return brand;
}

/**
 * Utility to check if a color is light or dark
 * Useful for determining text color on brand backgrounds
 */
export function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}



