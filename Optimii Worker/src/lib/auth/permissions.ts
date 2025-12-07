import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/get-db";
import { 
  projects, 
  organizationMembers, 
  projectShares, 
  projectContacts, 
  contacts 
} from "@/lib/db/schema";
import type { PermissionLevel } from "@/lib/db/schema";
import { getCurrentUser } from "./get-current-user";

// =============================================================================
// PERMISSION CONSTANTS
// =============================================================================

/**
 * Permission hierarchy: admin > editor > viewer
 */
const PERMISSION_LEVELS: Record<PermissionLevel, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Map org roles to permission levels
 * Owner and Admin get full admin access to their org's projects
 * Members get editor access
 */
const ORG_ROLE_TO_PERMISSION: Record<string, PermissionLevel> = {
  owner: "admin",
  admin: "admin",
  member: "editor",
};

// =============================================================================
// CORE PERMISSION FUNCTIONS
// =============================================================================

/**
 * Check if a permission level meets the required level
 */
export function hasPermission(
  userPermission: PermissionLevel,
  requiredPermission: PermissionLevel
): boolean {
  return PERMISSION_LEVELS[userPermission] >= PERMISSION_LEVELS[requiredPermission];
}

/**
 * Get the user's role within an organization
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<"owner" | "admin" | "member" | null> {
  const db = await getDb();
  if (!db) return null;

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.orgId, orgId)
      )
    )
    .get();

  return membership?.role as "owner" | "admin" | "member" | null;
}

/**
 * Get the effective permission level for a user on a project
 * 
 * Priority:
 * 1. Org ownership - user's org owns the project
 * 2. Org share - user's org has been shared the project
 * 3. Contact access - user has individual contact-based access
 */
export async function getProjectPermission(
  userId: string,
  projectId: string
): Promise<{ 
  permission: PermissionLevel | null; 
  source: "ownership" | "share" | "contact" | null;
  orgId?: string;
}> {
  const db = await getDb();
  if (!db) {
    return { permission: null, source: null };
  }

  // Get the project
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .get();

  if (!project) {
    return { permission: null, source: null };
  }

  // Get all org memberships for this user
  const memberships = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .all();

  // 1. Check if user's org owns the project
  for (const membership of memberships) {
    if (membership.orgId === project.orgId) {
      const permission = ORG_ROLE_TO_PERMISSION[membership.role] || "viewer";
      return { 
        permission, 
        source: "ownership",
        orgId: membership.orgId 
      };
    }
  }

  // 2. Check for org shares (accepted only)
  for (const membership of memberships) {
    const share = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, projectId),
          eq(projectShares.orgId, membership.orgId)
        )
      )
      .get();

    if (share && share.acceptedAt) {
      return { 
        permission: share.permission as PermissionLevel, 
        source: "share",
        orgId: membership.orgId 
      };
    }
  }

  // 3. Check for individual contact access
  // Find contacts linked to this user that have project access
  const userContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.userId, userId))
    .all();

  let highestContactPermission: PermissionLevel | null = null;

  for (const contact of userContacts) {
    const projectContact = await db
      .select()
      .from(projectContacts)
      .where(
        and(
          eq(projectContacts.projectId, projectId),
          eq(projectContacts.contactId, contact.id)
        )
      )
      .get();

    if (projectContact) {
      const perm = projectContact.permission as PermissionLevel;
      if (!highestContactPermission || PERMISSION_LEVELS[perm] > PERMISSION_LEVELS[highestContactPermission]) {
        highestContactPermission = perm;
      }
    }
  }

  if (highestContactPermission) {
    return { permission: highestContactPermission, source: "contact" };
  }

  return { permission: null, source: null };
}

/**
 * Get the effective permission level for the current user on a project
 * Simplified version for common use cases
 */
export async function getEffectivePermission(
  userId: string,
  projectId: string
): Promise<PermissionLevel | null> {
  const result = await getProjectPermission(userId, projectId);
  return result.permission;
}

// =============================================================================
// PERMISSION CHECK FUNCTIONS
// =============================================================================

/**
 * Check if the current user can view a project
 */
export async function canViewProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  return permission !== null;
}

/**
 * Check if the current user can edit content in a project
 * (editor or admin permission required)
 */
export async function canEditProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  if (!permission) return false;

  return hasPermission(permission, "editor");
}

/**
 * Check if the current user can edit content in a specific phase
 */
export async function canEditPhase(
  projectId: string,
  phaseId: string
): Promise<boolean> {
  // For now, phase permissions inherit from project
  // In the future, we could add phase-level overrides
  return canEditProject(projectId);
}

/**
 * Check if the current user can manage stages (add, edit, delete)
 * (admin permission required)
 */
export async function canManageStages(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  if (!permission) return false;

  return hasPermission(permission, "admin");
}

/**
 * Check if the current user can manage project settings and sharing
 * (admin permission required)
 */
export async function canManageProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  if (!permission) return false;

  return hasPermission(permission, "admin");
}

/**
 * Get user's permission level for a project (for UI display)
 */
export async function getUserProjectPermission(
  projectId: string
): Promise<PermissionLevel | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return getEffectivePermission(user.id, projectId);
}

// =============================================================================
// ORG PERMISSION CHECKS
// =============================================================================

/**
 * Check if the current user can manage organization settings
 * (owner or admin role required)
 */
export async function canManageOrg(orgId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const role = await getUserOrgRole(user.id, orgId);
  return role === "owner" || role === "admin";
}

/**
 * Check if the current user can invite team members to an organization
 * (owner or admin role required)
 */
export async function canInviteToOrg(orgId: string): Promise<boolean> {
  return canManageOrg(orgId);
}

/**
 * Check if the current user is the owner of an organization
 */
export async function isOrgOwner(orgId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const role = await getUserOrgRole(user.id, orgId);
  return role === "owner";
}

// =============================================================================
// PERMISSION CHECK HELPERS (for detailed results)
// =============================================================================

export interface PermissionCheck {
  allowed: boolean;
  permission: PermissionLevel | null;
  source?: "ownership" | "share" | "contact" | null;
  message?: string;
}

/**
 * Check edit permission with detailed result
 */
export async function checkEditPermission(projectId: string): Promise<PermissionCheck> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      allowed: false,
      permission: null,
      message: "You must be signed in to edit"
    };
  }

  const result = await getProjectPermission(user.id, projectId);

  if (!result.permission) {
    return {
      allowed: false,
      permission: null,
      source: null,
      message: "You don't have access to this project"
    };
  }

  if (!hasPermission(result.permission, "editor")) {
    return {
      allowed: false,
      permission: result.permission,
      source: result.source,
      message: "You need Editor or Admin access to make changes"
    };
  }

  return { 
    allowed: true, 
    permission: result.permission, 
    source: result.source 
  };
}

/**
 * Check admin permission with detailed result
 */
export async function checkAdminPermission(projectId: string): Promise<PermissionCheck> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      allowed: false,
      permission: null,
      message: "You must be signed in"
    };
  }

  const result = await getProjectPermission(user.id, projectId);

  if (!result.permission) {
    return {
      allowed: false,
      permission: null,
      source: null,
      message: "You don't have access to this project"
    };
  }

  if (!hasPermission(result.permission, "admin")) {
    return {
      allowed: false,
      permission: result.permission,
      source: result.source,
      message: "You need Admin access for this action"
    };
  }

  return { 
    allowed: true, 
    permission: result.permission, 
    source: result.source 
  };
}

// =============================================================================
// PERMISSION LABELS
// =============================================================================

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const PERMISSION_DESCRIPTIONS: Record<PermissionLevel, string> = {
  admin: "Can manage project settings, sharing, and all content",
  editor: "Can add and edit content within the project",
  viewer: "Can view the project but not make changes",
};

export const ORG_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const ORG_ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full control over the organization and all projects",
  admin: "Can manage team members and organization settings",
  member: "Can access and edit organization projects",
};

export function getPermissionLabel(permission: PermissionLevel): string {
  return PERMISSION_LABELS[permission];
}

export function getPermissionDescription(permission: PermissionLevel): string {
  return PERMISSION_DESCRIPTIONS[permission];
}

export function getOrgRoleLabel(role: string): string {
  return ORG_ROLE_LABELS[role] || role;
}

export function getOrgRoleDescription(role: string): string {
  return ORG_ROLE_DESCRIPTIONS[role] || "";
}
