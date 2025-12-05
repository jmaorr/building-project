"use server";

import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { createDb, type D1Database } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";

export interface ActiveOrganization {
  id: string;
  name: string;
  accentColor?: string | null;
  logoUrl?: string | null;
}

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "org-1";
const DEFAULT_ORG_NAME = process.env.NEXT_PUBLIC_DEFAULT_ORG_NAME || "Optimii";
const DEFAULT_ACCENT = "#5e6ad2";

/**
 * Resolve the active organization for the current user/session.
 * Falls back to defaults when Clerk org context or D1 are unavailable.
 */
export async function getActiveOrganization(): Promise<ActiveOrganization> {
  const { orgId: clerkOrgId } = await auth();
  const resolvedOrgId = clerkOrgId || DEFAULT_ORG_ID;

  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      return {
        id: resolvedOrgId,
        name: DEFAULT_ORG_NAME,
        accentColor: DEFAULT_ACCENT,
        logoUrl: null,
      };
    }

    const db = createDb(d1);
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, resolvedOrgId))
      .get();

    if (!organization) {
      return {
        id: resolvedOrgId,
        name: DEFAULT_ORG_NAME,
        accentColor: DEFAULT_ACCENT,
        logoUrl: null,
      };
    }

    return {
      id: organization.id,
      name: organization.name,
      accentColor: organization.accentColor || DEFAULT_ACCENT,
      logoUrl: organization.logoUrl,
    };
  } catch (error) {
    console.error("Failed to resolve active organization", error);
    return {
      id: resolvedOrgId,
      name: DEFAULT_ORG_NAME,
      accentColor: DEFAULT_ACCENT,
      logoUrl: null,
    };
  }
}
