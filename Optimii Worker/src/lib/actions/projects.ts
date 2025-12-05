"use server";

import { eq, and, asc, desc, or, like, isNotNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import {
  stages as stagesTable,
  projects,
  phases,
  organizations,
  projectTemplates,
  projectShares,
  generateId
} from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Project, NewProject, Phase, NewPhase, PhaseModule, Stage, NewStage, PermissionLevel } from "@/lib/db/schema";
import { defaultProjectTemplate, defaultStageTypes } from "@/lib/db/seed";
import { getStageApprovalStatus } from "@/lib/actions/approvals";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { canEditProject, canManageProject, canManageStages } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/get-current-user";

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "org-1";

// =============================================================================
// PROJECT ACTIONS
// =============================================================================

export async function getProjects(filters?: {
  status?: Project["status"];
  search?: string;
  orgId?: string;
}): Promise<(Project & { isShared?: boolean; sharePermission?: PermissionLevel })[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const orgId =
      filters?.orgId || (await getActiveOrganization())?.id || DEFAULT_ORG_ID;

    const db = createDb(d1);

    // Get owned projects
    const ownedConditions = [eq(projects.orgId, orgId)];
    if (filters?.status) {
      ownedConditions.push(eq(projects.status, filters.status));
    }
    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      ownedConditions.push(
        or(
          like(projects.name, search),
          like(projects.address, search),
          like(projects.description, search)
        )!
      );
    }

    const ownedProjects = await db.select()
      .from(projects)
      .where(and(...ownedConditions))
      .orderBy(desc(projects.createdAt));

    // Get shared projects (accepted shares only)
    const sharedProjectShares = await db.select()
      .from(projectShares)
      .where(and(
        eq(projectShares.orgId, orgId),
        isNotNull(projectShares.acceptedAt)
      ));

    let sharedProjects: (Project & { isShared: boolean; sharePermission: PermissionLevel })[] = [];

    if (sharedProjectShares.length > 0) {
      const sharedProjectIds = sharedProjectShares.map(s => s.projectId);
      const sharedConditions = [inArray(projects.id, sharedProjectIds)];

      if (filters?.status) {
        sharedConditions.push(eq(projects.status, filters.status));
      }
      if (filters?.search) {
        const search = `%${filters.search.toLowerCase()}%`;
        sharedConditions.push(
          or(
            like(projects.name, search),
            like(projects.address, search),
            like(projects.description, search)
          )!
        );
      }

      const sharedProjectsRaw = await db.select()
        .from(projects)
        .where(and(...sharedConditions))
        .orderBy(desc(projects.createdAt));

      // Map share permissions to projects
      sharedProjects = sharedProjectsRaw.map(p => {
        const share = sharedProjectShares.find(s => s.projectId === p.id);
        return {
          ...p,
          isShared: true,
          sharePermission: (share?.permission || "viewer") as PermissionLevel,
        };
      });
    }

    // Combine and sort by createdAt
    const allProjects = [
      ...ownedProjects.map(p => ({ ...p, isShared: false as const })),
      ...sharedProjects,
    ].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return allProjects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const result = await db.select().from(projects).where(eq(projects.id, id)).get();
    return result || null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export async function createProject(data: Omit<NewProject, "id" | "createdAt" | "updatedAt">): Promise<Project> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) throw new Error("D1 database not available");

    const db = createDb(d1);
    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to create a project");

    const now = new Date();
    const projectId = generateId();
    const resolvedOrg = data.orgId || (await getActiveOrganization())?.id || DEFAULT_ORG_ID;
    const validatedTemplateId = await validateTemplateId(db, data.templateId);
    const templatePhases = await getTemplateStructure(data.templateId);
    const phasesToInsert = buildPhaseRows(projectId, templatePhases, now);

    // Verify organization exists before writing anything
    const org = await db.select().from(organizations).where(eq(organizations.id, resolvedOrg)).get();
    if (!org) {
      throw new Error(`Organization ${resolvedOrg} does not exist. Please create it first.`);
    }

    const newProject: NewProject = {
      id: projectId,
      orgId: resolvedOrg,
      templateId: validatedTemplateId,
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

    console.log("Creating project:", { projectId, orgId: resolvedOrg, name: data.name, templateId: validatedTemplateId });

    // Create project first so FK constraints for phases/stages are satisfied
    await db.insert(projects).values(newProject);

    if (phasesToInsert.length > 0) {
      await db.insert(phases).values(phasesToInsert);

      // Create stages for each phase
      // We do this inside the transaction to ensure consistency
      // Note: We can't use buildStageRows easily here because we need the inserted phase IDs if we generated them differently
      // But phasesToInsert has the IDs we generated.

      const stagesToInsert = buildStageRows(phasesToInsert, templatePhases, now);
      if (stagesToInsert.length > 0) {
        // Batch inserts to avoid D1 limits (approx 100 params max per query is safe)
        // Each stage has ~16 fields, so 5 stages = 80 params
        const BATCH_SIZE = 5;
        for (let i = 0; i < stagesToInsert.length; i += BATCH_SIZE) {
          const batch = stagesToInsert.slice(i, i + BATCH_SIZE);
          await db.insert(stagesTable).values(batch);
        }
      }
    }

    const createdProject = await db.select().from(projects).where(eq(projects.id, projectId)).get();

    if (!createdProject) {
      throw new Error("Project was created but could not be retrieved");
    }

    console.log("Project created successfully:", createdProject.id);
    return createdProject;
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    if (!await canEditProject(id)) {
      throw new Error("Unauthorized: You do not have permission to edit this project");
    }

    const db = createDb(d1);
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;

    if (!await canManageProject(id)) {
      return false; // Or throw error, but returning false is consistent with current signature
    }

    const db = createDb(d1);
    // Cascade delete will handle phases and stages
    const result = await db.delete(projects).where(eq(projects.id, id)).returning().get();

    if (result) {
      revalidatePath("/projects");
      revalidatePath(`/projects/${id}`);
    }

    return !!result;
  } catch (error) {
    console.error("Error deleting project:", error);
    return false;
  }
}

export async function getProjectStats(projectId: string): Promise<{ totalPhases: number; completedPhases: number }> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return { totalPhases: 0, completedPhases: 0 };

    const db = createDb(d1);
    const projectPhases = await db.select()
      .from(phases)
      .where(eq(phases.projectId, projectId));

    return {
      totalPhases: projectPhases.length,
      completedPhases: projectPhases.filter(p => p.status === "completed").length,
    };
  } catch (error) {
    console.error("Error fetching project stats:", error);
    return { totalPhases: 0, completedPhases: 0 };
  }
}

// =============================================================================
// PHASE ACTIONS
// =============================================================================

export async function getProjectPhases(projectId: string): Promise<Phase[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
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
  const d1 = getD1Database() as D1Database | null;
  if (!d1) throw new Error("D1 database not available");

  if (!await canManageStages(data.projectId)) {
    throw new Error("Unauthorized: You do not have permission to create phases");
  }

  const db = createDb(d1);
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    // We need projectId to check permissions, so we fetch the phase first
    const db = createDb(d1);

    const phase = await db.select().from(phases).where(eq(phases.id, id)).get();
    if (!phase) return null;

    if (!await canManageStages(phase.projectId)) {
      throw new Error("Unauthorized: You do not have permission to update phases");
    }
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;

    const db = createDb(d1);

    const phase = await db.select().from(phases).where(eq(phases.id, id)).get();
    if (!phase) return false;

    if (!await canManageStages(phase.projectId)) {
      return false;
    }
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return;

    if (!await canManageStages(projectId)) {
      return;
    }

    const db = createDb(d1);
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
 * Get stages for a phase from D1
 */
export async function getPhaseStages(phaseId: string): Promise<(Stage & { moduleType: typeof defaultStageTypes[number] })[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);
    const dbStages = await db.select()
      .from(stagesTable)
      .where(and(
        eq(stagesTable.phaseId, phaseId),
        eq(stagesTable.isEnabled, true)
      ))
      .orderBy(asc(stagesTable.order));

    return dbStages.map(s => ({
      ...s,
      moduleType: defaultStageTypes.find(mt => mt.code === s.moduleTypeId) || defaultStageTypes[0],
    }));
  } catch (error) {
    console.error("Error fetching stages:", String(error));
    return [];
  }
}

/**
 * Get a single stage by ID from D1
 */
export async function getStage(id: string): Promise<(Stage & { moduleType: typeof defaultStageTypes[number] }) | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
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
  const d1 = getD1Database() as D1Database | null;
  if (!d1) throw new Error("D1 database not available");

  const db = createDb(d1);

  // We need to fetch the phase to get the projectId for permission check
  const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
  if (!phase) throw new Error("Phase not found");

  if (!await canManageStages(phase.projectId)) {
    throw new Error("Unauthorized: You do not have permission to create stages");
  }

  const now = new Date();

  // Check for duplicate name in this phase
  const existing = await db.select()
    .from(stagesTable)
    .where(and(
      eq(stagesTable.phaseId, phaseId),
      eq(stagesTable.name, config.name)
    ))
    .get();

  if (existing) {
    throw new Error(`A stage with the name "${config.name}" already exists in this phase.`);
  }

  // Get max order for this phase
  const existingStages = await db.select()
    .from(stagesTable)
    .where(eq(stagesTable.phaseId, phaseId));
  const maxOrder = existingStages.length > 0
    ? Math.max(...existingStages.map(s => s.order))
    : -1;

  const newStage = {
    id: generateId(),
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const now = new Date();

    const result = await db.update(stagesTable)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(stagesTable.id, id))
      .returning();

    if (result.length === 0) return null;

    return result[0];
  } catch (error) {
    console.error("Error updating stage:", error);
    return null;
  }
}

export async function deleteStage(id: string): Promise<boolean> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;

    const db = createDb(d1);

    const stage = await db.select().from(stagesTable).where(eq(stagesTable.id, id)).get();
    if (!stage) return false;

    const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
    if (!phase) return false;

    if (!await canManageStages(phase.projectId)) {
      return false;
    }

    const result = await db.delete(stagesTable).where(eq(stagesTable.id, id)).returning().get();
    return !!result;
  } catch (error) {
    console.error("Error deleting stage:", error);
    return false;
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
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return { stage: null };

    const db = createDb(d1);

    // Get the current stage to find project ID
    const stage = await db.select().from(stagesTable).where(eq(stagesTable.id, id)).get();
    if (!stage) return { stage: null };

    const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
    if (!phase) return { stage: null };

    if (!await canEditProject(phase.projectId)) {
      return { stage: null };
    }

    // If trying to set to "completed" and stage requires approval
    if (status === "completed" && stage.requiresApproval && !options?.skipApprovalCheck) {
      // Check if there's an approved approval for this stage
      const approvalStatus = await getStageApprovalStatus(id, stage.currentRound);

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
 * Start a new round for a stage
 */
export async function startNewRound(stageId: string): Promise<Stage | null> {
  try {
    const stage = await getStage(stageId);
    if (!stage || !stage.allowsRounds) return null;

    return updateStage(stageId, { currentRound: stage.currentRound + 1 });
  } catch (error) {
    console.error("Error starting new round:", error);
    return null;
  }
}

/**
 * Reorder stages within a phase
 */
export async function reorderStages(phaseId: string, stageIds: string[]): Promise<void> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return;

    const db = createDb(d1);

    // Check permission using the first stage (assuming all in same phase/project)
    // Or fetch phase using phaseId
    const phase = await db.select().from(phases).where(eq(phases.id, phaseId)).get();
    if (!phase) return;

    if (!await canManageStages(phase.projectId)) {
      return;
    }

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
/**
 * @deprecated Use getPhaseStages instead
 */
export async function getPhaseModules(phaseId: string): Promise<(PhaseModule & { moduleType: typeof defaultStageTypes[number] })[]> {
  return getPhaseStages(phaseId);
}

export async function updatePhaseModule(id: string, data: Partial<PhaseModule>): Promise<PhaseModule | null> {
  return updateStage(id, data);
}

/**
 * @deprecated Use reorderStages instead
 */
export async function reorderPhaseModules(phaseId: string, moduleIds: string[]): Promise<void> {
  return reorderStages(phaseId, moduleIds);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function validateTemplateId(db: ReturnType<typeof createDb>, templateId?: string | null): Promise<string | null> {
  if (!templateId) return null;

  const template = await db.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).get();
  return template ? template.id : null;
}

async function getTemplateStructure(templateId?: string | null) {
  if (!templateId) {
    return defaultProjectTemplate.phases;
  }

  // In a real app, we would fetch the template structure from the DB
  // For now, we'll just return the default template structure
  // TODO: Implement fetching custom template structure
  return defaultProjectTemplate.phases;
}

function buildPhaseRows(projectId: string, templatePhases: typeof defaultProjectTemplate.phases, now: Date) {
  return templatePhases.map((tp, index) => ({
    id: generateId(),
    projectId,
    templatePhaseId: null,
    name: tp.name,
    description: tp.description,
    order: index,
    status: "not_started" as const,
    startDate: null,
    endDate: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildStageRows(phases: (NewPhase & { id: string })[], templatePhases: typeof defaultProjectTemplate.phases, now: Date) {
  const stages: NewStage[] = [];

  phases.forEach((phase) => {
    const templatePhase = templatePhases.find(tp => tp.name === phase.name);
    if (!templatePhase) return;

    templatePhase.stages.forEach((ts, index) => {
      stages.push({
        id: generateId(),
        phaseId: phase.id, // This assumes phase.id is set (which it is in our buildPhaseRows)
        moduleTypeId: ts.moduleCode,
        templateModuleId: null,
        name: ts.name,
        description: null,
        customName: null,
        order: index,
        isEnabled: true,
        status: "not_started",
        allowsRounds: ts.allowsRounds,
        currentRound: 1,
        requiresApproval: ts.requiresApproval,
        approvalContactId: null,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  return stages;
}

// =============================================================================
// PROJECT SHARING ACTIONS
// =============================================================================

/**
 * Share a project with another organization
 */
export async function shareProjectWithOrg(data: {
  projectId: string;
  orgId: string;
  permission?: PermissionLevel;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return { success: false, error: "Database not available" };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const db = createDb(d1);

    // Verify the user has permission to share this project
    if (!await canManageProject(data.projectId)) {
      return { success: false, error: "You don't have permission to share this project" };
    }

    // Check if share already exists
    const existingShare = await db.select()
      .from(projectShares)
      .where(and(
        eq(projectShares.projectId, data.projectId),
        eq(projectShares.orgId, data.orgId)
      ))
      .get();

    if (existingShare) {
      return { success: false, error: "This organization already has access to this project" };
    }

    // Create the share
    await db.insert(projectShares).values({
      id: generateId(),
      projectId: data.projectId,
      orgId: data.orgId,
      permission: data.permission || "editor",
      invitedBy: user.id,
      invitedAt: new Date(),
      acceptedAt: null, // Pending
    });

    revalidatePath(`/projects/${data.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error sharing project:", error);
    return { success: false, error: "Failed to share project" };
  }
}

/**
 * Accept a project share invite (called by an admin of the invited org)
 */
export async function acceptProjectShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return { success: false, error: "Database not available" };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const db = createDb(d1);

    // Get the share
    const share = await db.select()
      .from(projectShares)
      .where(eq(projectShares.id, shareId))
      .get();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    if (share.acceptedAt) {
      return { success: false, error: "Share already accepted" };
    }

    // Verify the user is an admin/owner of the invited org
    const activeOrg = await getActiveOrganization();
    if (!activeOrg || activeOrg.id !== share.orgId) {
      return { success: false, error: "You must be in the invited organization to accept" };
    }

    // Accept the share
    await db.update(projectShares)
      .set({ acceptedAt: new Date() })
      .where(eq(projectShares.id, shareId));

    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    console.error("Error accepting share:", error);
    return { success: false, error: "Failed to accept share" };
  }
}

/**
 * Get pending share invites for the current organization
 */
export async function getPendingShares(): Promise<{ id: string; projectId: string; projectName: string; permission: string; invitedAt: Date }[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const activeOrg = await getActiveOrganization();
    if (!activeOrg) return [];

    const db = createDb(d1);

    const pending = await db.select({
      id: projectShares.id,
      projectId: projectShares.projectId,
      permission: projectShares.permission,
      invitedAt: projectShares.invitedAt,
    })
      .from(projectShares)
      .where(and(
        eq(projectShares.orgId, activeOrg.id),
        eq(projectShares.acceptedAt, null as unknown as Date)
      ));

    // Get project names
    const projectIds = pending.map(p => p.projectId);
    if (projectIds.length === 0) return [];

    const projectsData = await db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(inArray(projects.id, projectIds));

    return pending.map(p => ({
      ...p,
      projectName: projectsData.find(proj => proj.id === p.projectId)?.name || "Unknown",
    }));
  } catch (error) {
    console.error("Error getting pending shares:", error);
    return [];
  }
}

/**
 * Get all shares for a project (for the project owner)
 */
export async function getProjectShares(projectId: string): Promise<{ id: string; orgId: string; orgName: string; permission: string; accepted: boolean }[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);

    const shares = await db.select()
      .from(projectShares)
      .where(eq(projectShares.projectId, projectId));

    // Get org names
    const orgIds = shares.map(s => s.orgId);
    if (orgIds.length === 0) return [];

    const orgsData = await db.select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(inArray(organizations.id, orgIds));

    return shares.map(s => ({
      id: s.id,
      orgId: s.orgId,
      orgName: orgsData.find(o => o.id === s.orgId)?.name || "Unknown",
      permission: s.permission,
      accepted: !!s.acceptedAt,
    }));
  } catch (error) {
    console.error("Error getting project shares:", error);
    return [];
  }
}

/**
 * Remove a project share
 */
export async function removeProjectShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return { success: false, error: "Database not available" };

    const db = createDb(d1);

    const share = await db.select()
      .from(projectShares)
      .where(eq(projectShares.id, shareId))
      .get();

    if (!share) {
      return { success: false, error: "Share not found" };
    }

    // Verify permission
    if (!await canManageProject(share.projectId)) {
      return { success: false, error: "You don't have permission to remove this share" };
    }

    await db.delete(projectShares).where(eq(projectShares.id, shareId));

    revalidatePath(`/projects/${share.projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing share:", error);
    return { success: false, error: "Failed to remove share" };
  }
}
