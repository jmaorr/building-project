

import type { PermissionLevel } from "@/lib/db/schema";
import { getProjectAccessForUser } from "@/lib/actions/contacts";
import { getCurrentUser } from "./get-current-user";

// =============================================================================
// PERMISSION UTILITIES
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
 * Check if a permission level is at least the required level
 */
export function hasPermission(
  userPermission: PermissionLevel,
  requiredPermission: PermissionLevel
): boolean {
  return PERMISSION_LEVELS[userPermission] >= PERMISSION_LEVELS[requiredPermission];
}

/**
 * Get the effective permission level for a user on a project
 * Considers both project-level and phase-level permissions
 */
export async function getEffectivePermission(
  userId: string,
  projectId: string
): Promise<PermissionLevel | null> {
  // Get all project access for this user
  const access = await getProjectAccessForUser(userId);

  // Find access for this specific project
  const projectAccess = access.filter(a => a.projectId === projectId);

  if (projectAccess.length === 0) {
    return null; // No access to this project
  }

  // Get the highest permission level across all contacts linked to this user
  // for this project
  let highestPermission: PermissionLevel = "viewer";

  for (const pa of projectAccess) {
    if (PERMISSION_LEVELS[pa.permission] > PERMISSION_LEVELS[highestPermission]) {
      highestPermission = pa.permission;
    }
  }

  // TODO: If phaseId is provided, check for phase-level permission overrides
  // For now, we just use the project-level permission

  return highestPermission;
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
 * (checks for phase-level permission overrides)
 */
export async function canEditPhase(
  projectId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  phaseId: string
): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  if (!permission) return false;

  return hasPermission(permission, "editor");
}

/**
 * Check if the current user can manage stages (add, edit, delete stages)
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
 * Check if the current user can manage project settings and permissions
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
 * Check if the current user can view a project
 * (any permission level allows viewing)
 */
export async function canViewProject(projectId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const permission = await getEffectivePermission(user.id, projectId);
  return permission !== null;
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
// PERMISSION CHECK HELPERS (for use in components)
// =============================================================================

/**
 * Permission check results with helpful messages
 */
export interface PermissionCheck {
  allowed: boolean;
  permission: PermissionLevel | null;
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

  const permission = await getEffectivePermission(user.id, projectId);

  if (!permission) {
    return {
      allowed: false,
      permission: null,
      message: "You don't have access to this project"
    };
  }

  if (!hasPermission(permission, "editor")) {
    return {
      allowed: false,
      permission,
      message: "You need Editor or Admin access to make changes"
    };
  }

  return { allowed: true, permission };
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

  const permission = await getEffectivePermission(user.id, projectId);

  if (!permission) {
    return {
      allowed: false,
      permission: null,
      message: "You don't have access to this project"
    };
  }

  if (!hasPermission(permission, "admin")) {
    return {
      allowed: false,
      permission,
      message: "You need Admin access for this action"
    };
  }

  return { allowed: true, permission };
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
  admin: "Can customize stages, tabs, and manage permissions",
  editor: "Can add and edit content within stages",
  viewer: "Can view but not edit anything",
};

export function getPermissionLabel(permission: PermissionLevel): string {
  return PERMISSION_LABELS[permission];
}

export function getPermissionDescription(permission: PermissionLevel): string {
  return PERMISSION_DESCRIPTIONS[permission];
}

