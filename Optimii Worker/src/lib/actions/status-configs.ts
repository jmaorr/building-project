"use server";

import { eq, and, isNull, asc } from "drizzle-orm";
import { createDb, type D1Database } from "@/lib/db";
import { statusConfigs } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { StatusConfig, NewStatusConfig } from "@/lib/db/schema";

// =============================================================================
// STATUS CONFIG ACTIONS
// =============================================================================

/**
 * Get all status configs for an entity type
 * Priority: project-level > org-level > system-level
 */
export async function getStatusConfigs(options: {
  entityType?: "stage" | "project" | "phase";
  projectId?: string;
  orgId?: string;
}): Promise<StatusConfig[]> {
  const { entityType = "stage", projectId, orgId } = options;
  
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      // Return default statuses if D1 not available
      return getDefaultStatuses(entityType);
    }
    
    const db = createDb(d1);
    
    // First check project-level configs
    if (projectId) {
      const projectConfigs = await db.select()
        .from(statusConfigs)
        .where(and(
          eq(statusConfigs.projectId, projectId),
          eq(statusConfigs.entityType, entityType)
        ))
        .orderBy(asc(statusConfigs.order));
      
      if (projectConfigs.length > 0) {
        return projectConfigs;
      }
    }
    
    // Then check org-level configs
    if (orgId) {
      const orgConfigs = await db.select()
        .from(statusConfigs)
        .where(and(
          eq(statusConfigs.orgId, orgId),
          isNull(statusConfigs.projectId),
          eq(statusConfigs.entityType, entityType)
        ))
        .orderBy(asc(statusConfigs.order));
      
      if (orgConfigs.length > 0) {
        return orgConfigs;
      }
    }
    
    // Fall back to system-level configs
    const systemConfigs = await db.select()
      .from(statusConfigs)
      .where(and(
        isNull(statusConfigs.orgId),
        isNull(statusConfigs.projectId),
        eq(statusConfigs.entityType, entityType)
      ))
      .orderBy(asc(statusConfigs.order));
    
    return systemConfigs;
  } catch (error) {
    console.error("Error fetching status configs:", error);
    return getDefaultStatuses(entityType);
  }
}

/**
 * Get a single status config by ID
 */
export async function getStatusConfig(id: string): Promise<StatusConfig | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;
    
    const db = createDb(d1);
    const results = await db.select()
      .from(statusConfigs)
      .where(eq(statusConfigs.id, id));
    
    return results[0] || null;
  } catch (error) {
    console.error("Error fetching status config:", error);
    return null;
  }
}

/**
 * Create a new status config
 */
export async function createStatusConfig(data: {
  orgId?: string;
  projectId?: string;
  entityType: "stage" | "project" | "phase";
  code: string;
  label: string;
  color: string;
  order?: number;
  isDefault?: boolean;
  isFinal?: boolean;
  triggersApproval?: boolean;
}): Promise<StatusConfig | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;
    
    const db = createDb(d1);
    const now = new Date();
    
    // Get the max order for this scope
    let existingConfigs;
    if (data.projectId) {
      existingConfigs = await db.select()
        .from(statusConfigs)
        .where(and(
          eq(statusConfigs.projectId, data.projectId),
          eq(statusConfigs.entityType, data.entityType)
        ));
    } else if (data.orgId) {
      existingConfigs = await db.select()
        .from(statusConfigs)
        .where(and(
          eq(statusConfigs.orgId, data.orgId),
          isNull(statusConfigs.projectId),
          eq(statusConfigs.entityType, data.entityType)
        ));
    } else {
      existingConfigs = await db.select()
        .from(statusConfigs)
        .where(and(
          isNull(statusConfigs.orgId),
          isNull(statusConfigs.projectId),
          eq(statusConfigs.entityType, data.entityType)
        ));
    }
    
    const maxOrder = existingConfigs.length > 0
      ? Math.max(...existingConfigs.map(c => c.order))
      : -1;
    
    const newConfig: NewStatusConfig = {
      orgId: data.orgId || null,
      projectId: data.projectId || null,
      entityType: data.entityType,
      code: data.code,
      label: data.label,
      color: data.color,
      order: data.order ?? maxOrder + 1,
      isDefault: data.isDefault || false,
      isFinal: data.isFinal || false,
      triggersApproval: data.triggersApproval || false,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.insert(statusConfigs).values(newConfig).returning();
    return result[0] || null;
  } catch (error) {
    console.error("Error creating status config:", error);
    return null;
  }
}

/**
 * Update a status config
 */
export async function updateStatusConfig(
  id: string,
  data: Partial<Pick<StatusConfig, "code" | "label" | "color" | "order" | "isDefault" | "isFinal" | "triggersApproval">>
): Promise<StatusConfig | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;
    
    const db = createDb(d1);
    const now = new Date();
    
    const result = await db.update(statusConfigs)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(statusConfigs.id, id))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    console.error("Error updating status config:", error);
    return null;
  }
}

/**
 * Delete a status config
 */
export async function deleteStatusConfig(id: string): Promise<boolean> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;
    
    const db = createDb(d1);
    
    // Don't allow deleting system configs
    const config = await getStatusConfig(id);
    if (config?.isSystem) {
      return false;
    }
    
    await db.delete(statusConfigs).where(eq(statusConfigs.id, id));
    return true;
  } catch (error) {
    console.error("Error deleting status config:", error);
    return false;
  }
}

/**
 * Reorder status configs
 */
export async function reorderStatusConfigs(
  ids: string[]
): Promise<void> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return;
    
    const db = createDb(d1);
    const now = new Date();
    
    for (let i = 0; i < ids.length; i++) {
      await db.update(statusConfigs)
        .set({ order: i, updatedAt: now })
        .where(eq(statusConfigs.id, ids[i]));
    }
  } catch (error) {
    console.error("Error reordering status configs:", error);
  }
}

/**
 * Copy system configs to org level for customization
 */
export async function copySystemConfigsToOrg(
  orgId: string,
  entityType: "stage" | "project" | "phase" = "stage"
): Promise<StatusConfig[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];
    
    const db = createDb(d1);
    const now = new Date();
    
    // Get system configs
    const systemConfigs = await db.select()
      .from(statusConfigs)
      .where(and(
        isNull(statusConfigs.orgId),
        isNull(statusConfigs.projectId),
        eq(statusConfigs.entityType, entityType)
      ))
      .orderBy(asc(statusConfigs.order));
    
    // Create org-level copies
    const newConfigs: NewStatusConfig[] = systemConfigs.map(config => ({
      orgId,
      projectId: null,
      entityType: config.entityType,
      code: config.code,
      label: config.label,
      color: config.color,
      order: config.order,
      isDefault: config.isDefault,
      isFinal: config.isFinal,
      triggersApproval: config.triggersApproval,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    }));
    
    const results = await db.insert(statusConfigs).values(newConfigs).returning();
    return results;
  } catch (error) {
    console.error("Error copying configs to org:", error);
    return [];
  }
}

/**
 * Reset org configs to system defaults
 */
export async function resetOrgConfigsToDefaults(
  orgId: string,
  entityType: "stage" | "project" | "phase" = "stage"
): Promise<void> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return;
    
    const db = createDb(d1);
    
    // Delete org-level configs (they will fall back to system configs)
    await db.delete(statusConfigs)
      .where(and(
        eq(statusConfigs.orgId, orgId),
        isNull(statusConfigs.projectId),
        eq(statusConfigs.entityType, entityType)
      ));
  } catch (error) {
    console.error("Error resetting configs:", error);
  }
}

// =============================================================================
// DEFAULT STATUSES (fallback)
// =============================================================================

function getDefaultStatuses(entityType: "stage" | "project" | "phase"): StatusConfig[] {
  const now = new Date();
  
  if (entityType === "stage") {
    return [
      { id: "default-not-started", orgId: null, projectId: null, entityType: "stage", code: "not_started", label: "Not Started", color: "gray", order: 0, isDefault: true, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-in-progress", orgId: null, projectId: null, entityType: "stage", code: "in_progress", label: "In Progress", color: "blue", order: 1, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-awaiting-approval", orgId: null, projectId: null, entityType: "stage", code: "awaiting_approval", label: "Awaiting Approval", color: "amber", order: 2, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-completed", orgId: null, projectId: null, entityType: "stage", code: "completed", label: "Completed", color: "green", order: 3, isDefault: false, isFinal: true, triggersApproval: true, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-on-hold", orgId: null, projectId: null, entityType: "stage", code: "on_hold", label: "On Hold", color: "amber", order: 4, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
    ];
  }
  
  if (entityType === "project") {
    return [
      { id: "default-project-draft", orgId: null, projectId: null, entityType: "project", code: "draft", label: "Draft", color: "gray", order: 0, isDefault: true, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-project-active", orgId: null, projectId: null, entityType: "project", code: "active", label: "Active", color: "green", order: 1, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-project-on-hold", orgId: null, projectId: null, entityType: "project", code: "on_hold", label: "On Hold", color: "amber", order: 2, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-project-completed", orgId: null, projectId: null, entityType: "project", code: "completed", label: "Completed", color: "blue", order: 3, isDefault: false, isFinal: true, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
      { id: "default-project-archived", orgId: null, projectId: null, entityType: "project", code: "archived", label: "Archived", color: "gray", order: 4, isDefault: false, isFinal: true, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
    ];
  }
  
  // Phase statuses
  return [
    { id: "default-phase-not-started", orgId: null, projectId: null, entityType: "phase", code: "not_started", label: "Not Started", color: "gray", order: 0, isDefault: true, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
    { id: "default-phase-in-progress", orgId: null, projectId: null, entityType: "phase", code: "in_progress", label: "In Progress", color: "blue", order: 1, isDefault: false, isFinal: false, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
    { id: "default-phase-completed", orgId: null, projectId: null, entityType: "phase", code: "completed", label: "Completed", color: "green", order: 2, isDefault: false, isFinal: true, triggersApproval: false, isSystem: true, createdAt: now, updatedAt: now },
  ];
}

