"use client";

import { ContentWrapper } from "@/components/ui/content-wrapper";

/**
 * Template component that wraps all dashboard pages with blur reveal animation
 * This ensures consistent loading animations across all pages
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContentWrapper cascade staggerDelay={100} duration={1000}>
      {children}
    </ContentWrapper>
  );
}

