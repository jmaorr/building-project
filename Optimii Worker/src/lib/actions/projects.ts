"use server";

import { eq, and, asc, desc, or, like, inArray, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { 
  stages as stagesTable, 
  projects, 
  phases, 
  organizations, 
  projectTemplates, 
  projectShares,
  organizationMembers,
  users,
  orgInvites,
  files,
  notes,
  approvals,
  generateId 
} from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { getDb } from "@/lib/db/get-db";
import type { Project, NewProject, Phase, NewPhase, PhaseModule, Stage, PermissionLevel } from "@/lib/db/schema";
import { defaultProjectTemplate, defaultStageTypes } from "@/lib/db/seed";
import { getStageTemplatesForPhase } from "@/lib/db/stage-templates";
import { getStageApprovalStatus } from "@/lib/actions/approvals";
import { getActiveOrganizationSafe } from "@/lib/organizations/get-active-organization";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { sendProjectShareEmail } from "@/lib/email/send-invite";

// =============================================================================
// PROJECT ACTIONS
// =============================================================================

export interface ProjectWithAccess extends Project {
  accessType: "owned" | "shared";
  permission?: PermissionLevel;
}

/**
 * Get all projects the current user has access to
 * This includes:
 * 1. Projects owned by orgs the user is a member of
 * 2. Projects shared with orgs the user is a member of (accepted shares only)
 */
export async function getProjects(filters?: {
  status?: Project["status"];
  search?: string;
  includeShared?: boolean; // Default true - include shared projects
}): Promise<ProjectWithAccess[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available, returning empty array");
      return [];
    }

    const user = await getCurrentUser();
    if (!user) {
      return [];
    }

    const db = createDb(d1 as D1Database);

    // Get all orgs the user is a member of
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .all();

    if (memberships.length === 0) {
      return [];
    }

    const userOrgIds = memberships.map(m => m.orgId);
    const allProjects: ProjectWithAccess[] = [];

    // 1. Get projects owned by user's orgs
    for (const orgId of userOrgIds) {
      const conditions = [eq(projects.orgId, orgId)];
      
      if (filters?.status) {
        conditions.push(eq(projects.status, filters.status));
      }
      if (filters?.search) {
        const search = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(projects.name, search),
            like(projects.address, search),
            like(projects.description, search)
          )!
        );
      }

      const ownedProjects = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .all();

      // Add with access type
      for (const project of ownedProjects) {
        const membership = memberships.find(m => m.orgId === project.orgId);
        const permission = membership?.role === "owner" || membership?.role === "admin" 
          ? "admin" as PermissionLevel
          : "editor" as PermissionLevel;
        
        allProjects.push({
          ...project,
          accessType: "owned",
          permission,
        });
      }
    }

    // 2. Get projects shared with user's orgs (accepted shares only)
    if (filters?.includeShared !== false) {
      for (const orgId of userOrgIds) {
        const shares = await db
          .select()
          .from(projectShares)
          .where(
            and(
              eq(projectShares.orgId, orgId),
              isNotNull(projectShares.acceptedAt)
            )
          )
          .all();

        for (const share of shares) {
          // Get the project details
          const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, share.projectId))
            .get();

          if (!project) continue;

          // Apply filters
          if (filters?.status && project.status !== filters.status) continue;
          if (filters?.search) {
            const search = filters.search.toLowerCase();
            const matchesSearch = 
              project.name?.toLowerCase().includes(search) ||
              project.address?.toLowerCase().includes(search) ||
              project.description?.toLowerCase().includes(search);
            if (!matchesSearch) continue;
          }

          // Don't add duplicates (in case project is shared with multiple of user's orgs)
          if (!allProjects.some(p => p.id === project.id)) {
            allProjects.push({
              ...project,
              accessType: "shared",
              permission: share.permission as PermissionLevel,
            });
          }
        }
      }
    }

    // Sort by createdAt desc
    allProjects.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    return allProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

/**
 * Get projects for a specific organization (legacy support)
 */
export async function getOrgProjects(orgId: string, filters?: {
  status?: Project["status"];
  search?: string;
}): Promise<Project[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) return [];

    const db = createDb(d1 as D1Database);

    const conditions = [eq(projects.orgId, orgId)];
    if (filters?.status) {
      conditions.push(eq(projects.status, filters.status));
    }
    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(projects.name, search),
          like(projects.address, search),
          like(projects.description, search)
        )!
      );
    }

    return await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt));
  } catch (error) {
    console.error("Error fetching org projects:", error);
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available");
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const result = await db.select().from(projects).where(eq(projects.id, id)).get();
    return result || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export async function createProject(data: Omit<NewProject, "id" | "createdAt" | "updatedAt">): Promise<Project> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      throw new Error("D1 database not available");
    }
    
    const db = createDb(d1 as D1Database);
    const now = new Date();
    const projectId = generateId();
    
    // Get org ID from data or active organization
    let resolvedOrg = data.orgId;
    if (!resolvedOrg) {
      const activeOrg = await getActiveOrganizationSafe();
      if (!activeOrg) {
        throw new Error("No active organization. Please sign in and try again.");
      }
      resolvedOrg = activeOrg.id;
    }
    
    // Verify organization exists
    const org = await db.select().from(organizations).where(eq(organizations.id, resolvedOrg)).get();
    if (!org) {
      throw new Error(`Organization ${resolvedOrg} does not exist. Please create it first.`);
    }
    
    // Verify template exists if provided
    let templateId = data.templateId || null;
    if (templateId) {
      const template = await db.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).get();
      if (!template) {
        console.warn(`Template ${templateId} does not exist, setting templateId to null`);
        templateId = null; // Set to null if template doesn't exist
      }
    }
    
    console.log("Creating project:", { projectId, orgId: resolvedOrg, name: data.name, templateId });
    
    const newProject: NewProject = {
      id: projectId,
      orgId: resolvedOrg,
      templateId,
      name: data.name,
      description: data.description || null,
      address: data.address || null,
      status: data.status || "draft",
      startDate: data.startDate || null,
      targetCompletion: data.targetCompletion || null,
      actualCompletion: data.actualCompletion || null,
      budget: data.budget || null,
      contractValue: data.contractValue || null,
      lotSize: data.lotSize || null,
      buildingType: data.buildingType || null,
      councilArea: data.councilArea || null,
      permitNumber: data.permitNumber || null,
      coverImageUrl: data.coverImageUrl || null,
      createdBy: data.createdBy || null,
      createdAt: now,
      updatedAt: now,
    };
    
    // Insert project
    try {
      console.log("Inserting project with data:", {
        id: projectId,
        orgId: newProject.orgId,
        templateId: newProject.templateId,
        name: newProject.name,
        status: newProject.status,
      });
      
      await db.insert(projects).values(newProject);
      console.log("Project inserted successfully:", projectId);
    } catch (insertError: unknown) {
      console.error("=== PROJECT INSERT ERROR ===");
      console.error("Failed to insert project:", insertError);
      if (insertError instanceof Error) {
        console.error("Error name:", insertError.name);
        console.error("Error message:", insertError.message);
        console.error("Error stack:", insertError.stack);
        console.error("Error cause:", insertError.cause);
      }
      
      // Check for common errors
      const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
      if (errorMsg.includes("FOREIGN KEY") || errorMsg.includes("constraint failed")) {
        if (templateId && errorMsg.includes("template")) {
          throw new Error(`Template ${templateId} does not exist in the database. Please select a valid template or create the template first.`);
        }
        if (errorMsg.includes("org")) {
          throw new Error(`Organization ${resolvedOrg} does not exist. Please create it first.`);
        }
        throw new Error(`Foreign key constraint failed: ${errorMsg}`);
      }
      if (errorMsg.includes("NOT NULL")) {
        throw new Error(`Required field is missing: ${errorMsg}`);
      }
      
      throw new Error(`Failed to insert project: ${errorMsg}`);
    }
    
    // Create default phases from template
    try {
      const defaultPhases = createDefaultPhasesForProject(projectId);
      if (defaultPhases.length > 0) {
        const phasesToInsert = defaultPhases.map(phase => ({
          ...phase,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }));
        await db.insert(phases).values(phasesToInsert);
        console.log(`Created ${phasesToInsert.length} default phases`);
      }
    } catch (phaseError) {
      console.error("Failed to create default phases:", phaseError);
      // Don't fail the whole operation if phases fail - project is still created
    }
    
    // Fetch and return the created project
    const result = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (!result) {
      throw new Error("Project was created but could not be retrieved");
    }
    
    console.log("Project created successfully:", result.id);
    return result;
  } catch (error) {
    console.error("Error in createProject:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to create project: ${String(error)}`);
  }
}

export async function updateProject(id: string, data: Partial<NewProject>): Promise<Project | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const result = await db.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning()
      .get();
    
    return result || null;
  } catch (error) {
    console.error("Error updating project:", error);
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return false;
    }
    
    const db = createDb(d1 as D1Database);
    // Cascade delete will handle phases and stages
    const result = await db.delete(projects).where(eq(projects.id, id)).returning().get();
    return !!result;
  } catch (error) {
    console.error("Error deleting project:", error);
    return false;
  }
}

// =============================================================================
// PHASE ACTIONS
// =============================================================================

export async function getProjectPhases(projectId: string): Promise<Phase[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available, returning empty array");
      return [];
    }
    
    const db = createDb(d1 as D1Database);
    const results = await db.select()
      .from(phases)
      .where(eq(phases.projectId, projectId))
      .orderBy(asc(phases.order));
    
    return results;
  } catch (error) {
    console.error("Error fetching phases:", error);
    return [];
  }
}

export async function getPhase(id: string): Promise<Phase | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available");
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const result = await db.select().from(phases).where(eq(phases.id, id)).get();
    return result || null;
  } catch (error) {
    console.error("Error fetching phase:", error);
    return null;
  }
}

export async function createPhase(data: {
  projectId: string;
  name: string;
  description?: string;
  order?: number;
}): Promise<Phase> {
  const d1 = await getD1Database();
  if (!d1) {
    throw new Error("D1 database not available");
  }
  
  const db = createDb(d1 as D1Database);
  const now = new Date();
  
  // Get max order for this project
  const existingPhases = await db.select()
    .from(phases)
    .where(eq(phases.projectId, data.projectId));
  const maxOrder = existingPhases.length > 0
    ? Math.max(...existingPhases.map(p => p.order))
    : -1;
  
  const phaseId = generateId();
  const newPhase: NewPhase = {
    id: phaseId,
    projectId: data.projectId,
    templatePhaseId: null,
    name: data.name,
    description: data.description || null,
    order: data.order ?? maxOrder + 1,
    status: "not_started",
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.insert(phases).values(newPhase);
  
  const result = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
  if (!result) {
    throw new Error("Failed to create phase");
  }
  
  return result;
}

export async function updatePhase(id: string, data: Partial<NewPhase>): Promise<Phase | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const result = await db.update(phases)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(phases.id, id))
      .returning()
      .get();
    
    return result || null;
  } catch (error) {
    console.error("Error updating phase:", error);
    return null;
  }
}

export async function deletePhase(id: string): Promise<boolean> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return false;
    }
    
    const db = createDb(d1 as D1Database);
    // Cascade delete will handle stages
    const result = await db.delete(phases).where(eq(phases.id, id)).returning().get();
    return !!result;
  } catch (error) {
    console.error("Error deleting phase:", error);
    return false;
  }
}

export async function reorderPhases(projectId: string, phaseIds: string[]): Promise<void> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return;
    }
    
    const db = createDb(d1 as D1Database);
    await db.transaction(async (tx) => {
      for (let i = 0; i < phaseIds.length; i++) {
        await tx.update(phases)
          .set({ order: i, updatedAt: new Date() })
          .where(and(
            eq(phases.id, phaseIds[i]),
            eq(phases.projectId, projectId)
          ));
      }
    });
  } catch (error) {
    console.error("Error reordering phases:", error);
  }
}

// =============================================================================
// STAGE ACTIONS - Using D1 Database
// =============================================================================

/**
 * Get stages for a phase from D1, or create default stages if none exist
 */
export async function getPhaseStages(phaseId: string): Promise<(Stage & { moduleType: typeof defaultStageTypes[number] })[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 not available, using fallback stages");
      return getFallbackStages(phaseId);
    }
    
    const db = createDb(d1 as D1Database);
    const dbStages = await db.select()
      .from(stagesTable)
      .where(and(
        eq(stagesTable.phaseId, phaseId),
        eq(stagesTable.isEnabled, true)
      ))
      .orderBy(asc(stagesTable.order));
    
    // If no stages in D1, create default stages from template
    if (dbStages.length === 0) {
      const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
      if (phase) {
        const defaultStages = await createDefaultStagesForPhase(phaseId, phase.name);
        return defaultStages.map(s => ({
          ...s,
          moduleType: defaultStageTypes.find(mt => mt.code === s.moduleTypeId) || defaultStageTypes[0],
        }));
      }
    }
    
    return dbStages.map(s => ({
      ...s,
      moduleType: defaultStageTypes.find(mt => mt.code === s.moduleTypeId) || defaultStageTypes[0],
    }));
  } catch (error) {
    console.error("Error fetching stages:", error);
    return getFallbackStages(phaseId);
  }
}

/**
 * Fallback to generate stages from templates (used when D1 unavailable)
 * Returns empty array since we no longer use mock data
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getFallbackStages(_phaseId: string): (Stage & { moduleType: typeof defaultStageTypes[number] })[] {
  // Return empty array - database should always be available
  return [];
}

/**
 * Create default stages for a phase in D1
 */
async function createDefaultStagesForPhase(phaseId: string, phaseName: string): Promise<Stage[]> {
  const templates = getStageTemplatesForPhase(phaseName);
  if (templates.length === 0) {
    // Use default template stages
    const templatePhase = defaultProjectTemplate.phases.find(p => p.name === phaseName);
    if (!templatePhase) return [];
    
    const stages: Stage[] = [];
    for (const templateStage of templatePhase.stages) {
      const stage = await createStage(phaseId, {
        name: templateStage.name,
        moduleTypeId: templateStage.moduleCode,
        allowsRounds: templateStage.allowsRounds,
        requiresApproval: templateStage.requiresApproval,
      });
      stages.push(stage);
    }
    return stages;
  }
  
  const stages: Stage[] = [];
  for (const template of templates) {
    const stage = await createStage(phaseId, {
      name: template.name,
      moduleTypeId: template.moduleTypeCode,
      description: template.description,
      allowsRounds: template.allowsRounds,
      requiresApproval: template.requiresApproval,
    });
    stages.push(stage);
  }
  return stages;
}

/**
 * Get a single stage by ID from D1
 */
export async function getStage(id: string): Promise<(Stage & { moduleType: typeof defaultStageTypes[number] }) | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const results = await db.select()
      .from(stagesTable)
      .where(eq(stagesTable.id, id));
    
    if (results.length === 0) return null;
    
    const stage = results[0];
    return {
      ...stage,
      moduleType: defaultStageTypes.find(mt => mt.code === stage.moduleTypeId) || defaultStageTypes[0],
    };
  } catch (error) {
    console.error("Error fetching stage:", error);
    return null;
  }
}

/**
 * Create a new stage in D1
 */
export async function createStage(phaseId: string, config: {
  name: string;
  moduleTypeId: string;
  description?: string;
  allowsRounds?: boolean;
  requiresApproval?: boolean;
  approvalContactId?: string;
}): Promise<Stage> {
  const d1 = await getD1Database();
  if (!d1) {
    throw new Error("D1 database not available");
  }
  
  const db = createDb(d1 as D1Database);
  const now = new Date();
  
  // Get max order for this phase
  const existingStages = await db.select()
    .from(stagesTable)
    .where(eq(stagesTable.phaseId, phaseId));
  const maxOrder = existingStages.length > 0 
    ? Math.max(...existingStages.map(s => s.order)) 
    : -1;
  
  const newStage = {
    phaseId,
    moduleTypeId: config.moduleTypeId,
    templateModuleId: null,
    name: config.name,
    description: config.description || null,
    customName: null,
    order: maxOrder + 1,
    isEnabled: true,
    status: "not_started" as const,
    allowsRounds: config.allowsRounds || false,
    currentRound: 1,
    requiresApproval: config.requiresApproval || false,
    approvalContactId: config.approvalContactId || null,
    createdAt: now,
    updatedAt: now,
  };
  
  const result = await db.insert(stagesTable).values(newStage).returning();
  
  if (result.length === 0) {
    throw new Error("Failed to create stage");
  }
  
  return result[0];
}

/**
 * Update a stage in D1
 */
export async function updateStage(id: string, data: Partial<Stage>): Promise<Stage | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return null;
    }
    
    const db = createDb(d1 as D1Database);
    const now = new Date();
    
    const result = await db.update(stagesTable)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(stagesTable.id, id))
      .returning();
    
    if (result.length === 0) return null;
    
    // Revalidate relevant paths
    revalidatePath("/projects");
    
    return result[0];
  } catch (error) {
    console.error("Error updating stage:", error);
    return null;
  }
}

/**
 * Delete a stage
 * Note: Cascade deletes will handle related files, notes, approvals, etc.
 */
export async function deleteStage(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return { success: false, error: "Database not available" };
    }
    
    const db = createDb(d1 as D1Database);
    
    // Get the stage to verify it exists and get phaseId for redirect
    const stage = await db.select()
      .from(stagesTable)
      .where(eq(stagesTable.id, id))
      .get();
    
    if (!stage) {
      return { success: false, error: "Stage not found" };
    }
    
    // Delete the stage (cascade will handle related records)
    await db.delete(stagesTable)
      .where(eq(stagesTable.id, id))
      .run();
    
    revalidatePath(`/projects`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting stage:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to delete stage: ${errorMessage}` };
  }
}

/**
 * Update stage status with approval logic
 * - If trying to complete a stage that requires approval, check if approved
 * - If not approved, set to "awaiting_approval" instead
 */
export async function updateStageStatus(
  id: string, 
  status: Stage["status"],
  options?: { skipApprovalCheck?: boolean }
): Promise<{ stage: Stage | null; requiresApproval?: boolean; approvalTriggered?: boolean }> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return { stage: null };
    }
    
    const db = createDb(d1 as D1Database);
    
    // Get the current stage
    const stageResults = await db.select()
      .from(stagesTable)
      .where(eq(stagesTable.id, id));
    
    if (stageResults.length === 0) {
      return { stage: null };
    }
    
    const currentStage = stageResults[0];
    
    // If trying to set to "completed" and stage requires approval
    if (status === "completed" && currentStage.requiresApproval && !options?.skipApprovalCheck) {
      // Check if there's an approved approval for this stage
      const approvalStatus = await getStageApprovalStatus(id, currentStage.currentRound);
      
      if (approvalStatus.status !== "approved") {
        // Not approved - set to awaiting_approval instead
        const result = await db.update(stagesTable)
          .set({
            status: "awaiting_approval",
            updatedAt: new Date(),
          })
          .where(eq(stagesTable.id, id))
          .returning();
        
        return { 
          stage: result[0] || null, 
          requiresApproval: true,
          approvalTriggered: approvalStatus.status === "none" // Needs new approval request
        };
      }
    }
    
    // Normal status update
    const result = await db.update(stagesTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(stagesTable.id, id))
      .returning();
    
    return { stage: result[0] || null };
  } catch (error) {
    console.error("Error updating stage status:", error);
    return { stage: null };
  }
}

/**
 * Track round creation in progress to prevent duplicates
 * Using a WeakMap to avoid potential build issues with module-level Sets
 */
const roundCreationInProgress = new Set<string>();

/**
 * Start a new round for a stage
 * Prevents duplicate creation with a simple lock mechanism
 */
export async function startNewRound(stageId: string): Promise<Stage | null> {
  // Prevent duplicate round creation
  if (roundCreationInProgress.has(stageId)) {
    console.warn(`Round creation already in progress for stage ${stageId}`);
    return null;
  }

  try {
    roundCreationInProgress.add(stageId);
    
    const stage = await getStage(stageId);
    if (!stage || !stage.allowsRounds) {
      roundCreationInProgress.delete(stageId);
      return null;
    }
    
    const result = await updateStage(stageId, { currentRound: stage.currentRound + 1 });
    roundCreationInProgress.delete(stageId);
    return result;
  } catch (error) {
    console.error("Error starting new round:", error);
    roundCreationInProgress.delete(stageId);
    return null;
  }
}

/**
 * Delete a round (and all associated files/comments)
 * Cannot delete round 1 or the current round if it's the only one
 */
export async function deleteRound(stageId: string, roundNumber: number): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const stage = await getStage(stageId);
    
    if (!stage || !stage.allowsRounds) {
      return { success: false, error: "Stage not found or rounds not enabled" };
    }

    // Cannot delete round 1
    if (roundNumber === 1) {
      return { success: false, error: "Cannot delete Round 1" };
    }

    // Cannot delete if it's the current round and there's only one round
    if (roundNumber === stage.currentRound && stage.currentRound === 1) {
      return { success: false, error: "Cannot delete the only round" };
    }

    // Validate round number is within range
    if (roundNumber > stage.currentRound) {
      return { success: false, error: `Round ${roundNumber} does not exist` };
    }

    // Delete files for this round (handle gracefully if table doesn't exist or has no rows)
    try {
      const filesToDelete = await db.select().from(files).where(
        and(
          eq(files.stageId, stageId),
          eq(files.roundNumber, roundNumber)
        )
      ).all();
      
      if (filesToDelete.length > 0) {
        await db.delete(files).where(
          and(
            eq(files.stageId, stageId),
            eq(files.roundNumber, roundNumber)
          )
        ).run();
      }
    } catch (error) {
      console.warn("Error deleting files for round (may not exist):", error);
      // Continue even if files deletion fails
    }

    // Delete comments for this round (handle gracefully)
    try {
      const notesToDelete = await db.select().from(notes).where(
        and(
          eq(notes.stageId, stageId),
          eq(notes.roundNumber, roundNumber)
        )
      ).all();
      
      if (notesToDelete.length > 0) {
        await db.delete(notes).where(
          and(
            eq(notes.stageId, stageId),
            eq(notes.roundNumber, roundNumber)
          )
        ).run();
      }
    } catch (error) {
      console.warn("Error deleting notes for round (may not exist):", error);
      // Continue even if notes deletion fails
    }

    // Delete approvals for this round (handle gracefully)
    try {
      const approvalsToDelete = await db.select().from(approvals).where(
        and(
          eq(approvals.stageId, stageId),
          eq(approvals.roundNumber, roundNumber)
        )
      ).all();
      
      if (approvalsToDelete.length > 0) {
        await db.delete(approvals).where(
          and(
            eq(approvals.stageId, stageId),
            eq(approvals.roundNumber, roundNumber)
          )
        ).run();
      }
    } catch (error) {
      console.warn("Error deleting approvals for round (may not exist):", error);
      // Continue even if approvals deletion fails
    }

    // Renumber rounds after the deleted one (e.g., if deleting round 2, round 3 becomes round 2)
    for (let i = roundNumber + 1; i <= stage.currentRound; i++) {
      const newRoundNumber = i - 1;
      
      // Update files
      try {
        const filesToUpdate = await db.select().from(files).where(
          and(
            eq(files.stageId, stageId),
            eq(files.roundNumber, i)
          )
        ).all();
        
        if (filesToUpdate.length > 0) {
          await db.update(files)
            .set({ roundNumber: newRoundNumber })
            .where(
              and(
                eq(files.stageId, stageId),
                eq(files.roundNumber, i)
              )
            )
            .run();
        }
      } catch (error) {
        console.warn(`Error renumbering files from round ${i} to ${newRoundNumber}:`, error);
      }

      // Update comments
      try {
        const notesToUpdate = await db.select().from(notes).where(
          and(
            eq(notes.stageId, stageId),
            eq(notes.roundNumber, i)
          )
        ).all();
        
        if (notesToUpdate.length > 0) {
          await db.update(notes)
            .set({ roundNumber: newRoundNumber })
            .where(
              and(
                eq(notes.stageId, stageId),
                eq(notes.roundNumber, i)
              )
            )
            .run();
        }
      } catch (error) {
        console.warn(`Error renumbering notes from round ${i} to ${newRoundNumber}:`, error);
      }

      // Update approvals
      try {
        const approvalsToUpdate = await db.select().from(approvals).where(
          and(
            eq(approvals.stageId, stageId),
            eq(approvals.roundNumber, i)
          )
        ).all();
        
        if (approvalsToUpdate.length > 0) {
          await db.update(approvals)
            .set({ roundNumber: newRoundNumber })
            .where(
              and(
                eq(approvals.stageId, stageId),
                eq(approvals.roundNumber, i)
              )
            )
            .run();
        }
      } catch (error) {
        console.warn(`Error renumbering approvals from round ${i} to ${newRoundNumber}:`, error);
      }
    }

    // Update stage's currentRound (decrement by 1)
    const newCurrentRound = stage.currentRound - 1;
    await updateStage(stageId, { currentRound: newCurrentRound });

    return { success: true };
  } catch (error) {
    console.error("Error deleting round:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to delete round: ${errorMessage}` };
  }
}

/**
 * Check if a round has files or comments
 */
export async function roundHasContent(stageId: string, roundNumber: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const [fileCount, commentCount] = await Promise.all([
      db.select().from(files).where(
        and(
          eq(files.stageId, stageId),
          eq(files.roundNumber, roundNumber)
        )
      ).all(),
      db.select().from(notes).where(
        and(
          eq(notes.stageId, stageId),
          eq(notes.roundNumber, roundNumber)
        )
      ).all(),
    ]);

    return fileCount.length > 0 || commentCount.length > 0;
  } catch (error) {
    console.error("Error checking round content:", error);
    return false;
  }
}

/**
 * Reorder stages within a phase
 */
export async function reorderStages(phaseId: string, stageIds: string[]): Promise<void> {
  try {
    const d1 = await getD1Database();
    if (!d1) return;
    
    const db = createDb(d1 as D1Database);
    const now = new Date();
    
    for (let i = 0; i < stageIds.length; i++) {
      await db.update(stagesTable)
        .set({ order: i, updatedAt: now })
        .where(and(
          eq(stagesTable.id, stageIds[i]),
          eq(stagesTable.phaseId, phaseId)
        ));
    }
  } catch (error) {
    console.error("Error reordering stages:", error);
  }
}

// Keep phase module functions as aliases for backward compatibility
export async function getPhaseModules(phaseId: string): Promise<(PhaseModule & { moduleType: typeof defaultStageTypes[number] })[]> {
  return getPhaseStages(phaseId);
}

export async function updatePhaseModule(id: string, data: Partial<PhaseModule>): Promise<PhaseModule | null> {
  return updateStage(id, data);
}

export async function reorderPhaseModules(phaseId: string, moduleIds: string[]): Promise<void> {
  return reorderStages(phaseId, moduleIds);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createDefaultPhasesForProject(projectId: string): NewPhase[] {
  return defaultProjectTemplate.phases.map((templatePhase) => ({
    id: generateId(),
    projectId,
    templatePhaseId: null,
    name: templatePhase.name,
    description: templatePhase.description,
    order: templatePhase.order,
    status: "not_started" as const,
    startDate: null,
    endDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// =============================================================================
// PROJECT STATS
// =============================================================================

export async function getProjectStats(projectId: string): Promise<{
  totalPhases: number;
  completedPhases: number;
  totalTasks: number;
  completedTasks: number;
  totalBudget: number;
  spentBudget: number;
}> {
  const phases = await getProjectPhases(projectId);
  const project = await getProject(projectId);
  
  return {
    totalPhases: phases.length,
    completedPhases: phases.filter(p => p.status === "completed").length,
    totalTasks: 0,
    completedTasks: 0,
    totalBudget: project?.budget || 0,
    spentBudget: 0,
  };
}

// =============================================================================
// PROJECT SHARING
// =============================================================================

/**
 * Get pending project shares for the current user's organizations
 */
export async function getPendingShares(): Promise<Array<{ 
  id: string; 
  projectId: string; 
  projectName: string; 
  permission: string; 
  invitedAt: Date;
  invitedBy?: string;
}>> {
  try {
    const d1 = await getD1Database();
    if (!d1) return [];

    const user = await getCurrentUser();
    if (!user) return [];

    const db = createDb(d1 as D1Database);

    // Get user's org memberships
    const memberships = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .all();

    const results: Array<{ 
      id: string; 
      projectId: string; 
      projectName: string; 
      permission: string; 
      invitedAt: Date;
      invitedBy?: string;
    }> = [];

    for (const membership of memberships) {
      // Get pending shares (acceptedAt is null)
      const shares = await db
        .select()
        .from(projectShares)
        .where(
          and(
            eq(projectShares.orgId, membership.orgId),
            eq(projectShares.acceptedAt, null as unknown as Date)
          )
        )
        .all();

      for (const share of shares) {
        const project = await db
          .select()
          .from(projects)
          .where(eq(projects.id, share.projectId))
          .get();

        if (project) {
          results.push({
            id: share.id,
            projectId: share.projectId,
            projectName: project.name,
            permission: share.permission,
            invitedAt: share.invitedAt,
            invitedBy: share.invitedBy || undefined,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting pending shares:", error);
    return [];
  }
}

/**
 * Accept a project share for one of the user's organizations
 */
export async function acceptProjectShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = await getD1Database();
    if (!d1) return { success: false, error: "Database not available" };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const db = createDb(d1 as D1Database);

    // Get the share
    const share = await db
      .select()
      .from(projectShares)
      .where(eq(projectShares.id, shareId))
      .get();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    if (share.acceptedAt) {
      return { success: false, error: "Share already accepted" };
    }

    // Verify user is a member of the org being shared with
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, share.orgId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .get();

    if (!membership) {
      return { success: false, error: "You are not a member of the organization this project is shared with" };
    }

    // Accept the share
    await db
      .update(projectShares)
      .set({ acceptedAt: new Date() })
      .where(eq(projectShares.id, shareId))
      .run();

    return { success: true };
  } catch (error) {
    console.error("Error accepting project share:", error);
    return { success: false, error: "Failed to accept share" };
  }
}

/**
 * Get all shares for a project (for project admins to see who has access)
 */
export async function getProjectShares(projectId: string): Promise<Array<{ 
  id: string; 
  orgId: string; 
  orgName: string; 
  permission: string; 
  accepted: boolean; 
  invitedAt: Date;
}>> {
  try {
    const d1 = await getD1Database();
    if (!d1) return [];

    const db = createDb(d1 as D1Database);

    const shares = await db
      .select()
      .from(projectShares)
      .where(eq(projectShares.projectId, projectId))
      .all();

    const results = [];

    for (const share of shares) {
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, share.orgId))
        .get();

      results.push({
        id: share.id,
        orgId: share.orgId,
        orgName: org?.name || "Unknown Organization",
        permission: share.permission,
        accepted: !!share.acceptedAt,
        invitedAt: share.invitedAt,
      });
    }

    return results;
  } catch (error) {
    console.error("Error getting project shares:", error);
    return [];
  }
}

/**
 * Share a project with another organization
 */
export async function shareProjectWithOrg(data: { 
  projectId: string; 
  orgId: string; 
  permission: PermissionLevel;
}): Promise<{ success: boolean; error?: string; shareId?: string }> {
  try {
    const d1 = await getD1Database();
    if (!d1) return { success: false, error: "Database not available" };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const db = createDb(d1 as D1Database);

    // Verify user has admin access to the project
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .get();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Check user is admin/owner of the project's org
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, project.orgId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .get();

    if (!membership || membership.role === "member") {
      return { success: false, error: "Only admins can share projects" };
    }

    // Check if share already exists
    const existingShare = await db
      .select()
      .from(projectShares)
      .where(
        and(
          eq(projectShares.projectId, data.projectId),
          eq(projectShares.orgId, data.orgId)
        )
      )
      .get();

    if (existingShare) {
      return { success: false, error: "Project is already shared with this organization" };
    }

    // Create the share
    const shareId = generateId();
    await db.insert(projectShares).values({
      id: shareId,
      projectId: data.projectId,
      orgId: data.orgId,
      permission: data.permission,
      invitedBy: user.id,
      invitedAt: new Date(),
      acceptedAt: null,
    }).run();

    return { success: true, shareId };
  } catch (error) {
    console.error("Error sharing project:", error);
    return { success: false, error: "Failed to share project" };
  }
}

/**
 * Share a project via email (creates org invite + project share if needed)
 * If the email belongs to an existing user, shares with their org
 * If not, creates a pending invite that will be processed when they sign up
 */
export async function shareProjectWithEmail(data: {
  projectId: string;
  email: string;
  permission: PermissionLevel;
}): Promise<{ success: boolean; error?: string; pending?: boolean }> {
  try {
    const d1 = await getD1Database();
    if (!d1) return { success: false, error: "Database not available" };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Not authenticated" };

    const db = createDb(d1 as D1Database);
    const email = data.email.toLowerCase();

    // Check if user exists with this email
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      // User exists - find their primary org and share with it
      const userMembership = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, existingUser.id))
        .get();

      if (userMembership) {
        // Share with user's org
        const result = await shareProjectWithOrg({
          projectId: data.projectId,
          orgId: userMembership.orgId,
          permission: data.permission,
        });

        // Auto-accept since we're sharing directly with their org
        if (result.success && result.shareId) {
          await db
            .update(projectShares)
            .set({ acceptedAt: new Date() })
            .where(eq(projectShares.id, result.shareId))
            .run();
        }

        return result;
      }
    }

    // User doesn't exist or has no org - create a pending invite record
    // This will be processed when they sign up
    // For now, we'll store this as an org invite with project share info
    
    // Get the project to know which org is sharing
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .get();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // User doesn't exist - send them an invite email
    // When they sign up, the webhook will create their org and we can process pending shares
    const inviterName = currentUser.firstName && currentUser.lastName 
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : currentUser.email;

    try {
      await sendProjectShareEmail({
        to: email,
        inviterName,
        projectName: project.name,
        permission: data.permission,
      });
      console.log(`Sent project share invite to ${email} for project ${project.name}`);
    } catch (emailError) {
      console.error("Failed to send project share email:", emailError);
      // Don't fail entirely if email fails
    }

    return { success: true, pending: true };
  } catch (error) {
    console.error("Error sharing project with email:", error);
    return { success: false, error: "Failed to share project" };
  }
}

/**
 * Remove a project share
 */
export async function removeProjectShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = await getD1Database();
    if (!d1) return { success: false, error: "Database not available" };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const db = createDb(d1 as D1Database);

    // Get the share
    const share = await db
      .select()
      .from(projectShares)
      .where(eq(projectShares.id, shareId))
      .get();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    // Get the project to verify permissions
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, share.projectId))
      .get();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Check user is admin/owner of the project's org
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.orgId, project.orgId),
          eq(organizationMembers.userId, user.id)
        )
      )
      .get();

    if (!membership || membership.role === "member") {
      return { success: false, error: "Only admins can remove shares" };
    }

    // Delete the share
    await db
      .delete(projectShares)
      .where(eq(projectShares.id, shareId))
      .run();

    return { success: true };
  } catch (error) {
    console.error("Error removing project share:", error);
    return { success: false, error: "Failed to remove share" };
  }
}
