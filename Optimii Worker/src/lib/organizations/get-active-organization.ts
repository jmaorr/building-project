"use server";

import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { createDb, type D1Database } from "@/lib/db";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { ensureUserHasOrg } from "@/lib/actions/users";

export interface ActiveOrganization {
  id: string;
  name: string;
  accentColor?: string | null;
  logoUrl?: string | null;
  role?: "owner" | "admin" | "member";
}

const DEFAULT_ACCENT = "#5e6ad2";

/**
 * Get the active organization for the current user
 * Looks up the user's organization membership in D1
 * Requires the user to be authenticated and have an org (created via ensureUserHasOrg)
 */
export async function getActiveOrganization(): Promise<ActiveOrganization> {
  // 1. Ensure user has an org (creates if needed)
  const userWithOrg = await ensureUserHasOrg();
  if (!userWithOrg) {
    throw new Error("Not authenticated or could not create organization");
  }

  // 2. Get database connection
  const d1 = await getD1Database() as D1Database | null;
  if (!d1) {
    throw new Error("Database not available");
  }

  const db = createDb(d1);

  // 3. Get the user's membership to determine role
  const membership = await db
    .select({
      orgId: organizationMembers.orgId,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userWithOrg.user.id))
    .get();

  if (!membership) {
    throw new Error("User organization membership not found");
  }

  // 4. Get organization details
  const organization = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, membership.orgId))
    .get();

  if (!organization) {
    throw new Error("Organization not found");
  }

  return {
    id: organization.id,
    name: organization.name,
    accentColor: organization.accentColor || DEFAULT_ACCENT,
    logoUrl: organization.logoUrl,
    role: membership.role as "owner" | "admin" | "member",
  };
}

/**
 * Get active organization without throwing errors
 * Returns null if not authenticated or org cannot be resolved
 * Useful for optional org context (e.g., public pages)
 */
export async function getActiveOrganizationSafe(): Promise<ActiveOrganization | null> {
  try {
    // Check authentication first - return null immediately if not authenticated
    const { userId } = await auth();
    if (!userId) {
      return null;
    }
    
    return await getActiveOrganization();
  } catch (error) {
    console.error("getActiveOrganizationSafe error:", error);
    return null;
  }
}

/**
 * Get all organizations the current user belongs to
 * Useful for org switching UI
 */
export async function getUserOrganizations(): Promise<ActiveOrganization[]> {
  const userWithOrg = await ensureUserHasOrg();
  if (!userWithOrg) {
    return [];
  }

  const d1 = await getD1Database() as D1Database | null;
  if (!d1) {
    return [];
  }

  const db = createDb(d1);

  // Get all memberships for this user
  const memberships = await db
    .select({
      orgId: organizationMembers.orgId,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userWithOrg.user.id))
    .all();

  // Get organization details for each membership
  const orgs: ActiveOrganization[] = [];
  for (const membership of memberships) {
    const organization = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership.orgId))
      .get();

    if (organization) {
      orgs.push({
        id: organization.id,
        name: organization.name,
        accentColor: organization.accentColor || DEFAULT_ACCENT,
        logoUrl: organization.logoUrl,
        role: membership.role as "owner" | "admin" | "member",
      });
    }
  }

  // Sort: owner orgs first, then admin, then member
  const roleOrder = { owner: 0, admin: 1, member: 2 };
  orgs.sort((a, b) => {
    const aOrder = roleOrder[a.role || "member"];
    const bOrder = roleOrder[b.role || "member"];
    return aOrder - bOrder;
  });

  return orgs;
}
