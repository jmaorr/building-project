"use server";

import { eq, and, asc, desc, or, like } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { stages as stagesTable, projects, phases, organizations, projectTemplates, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Project, NewProject, Phase, NewPhase, PhaseModule, Stage, NewStage } from "@/lib/db/schema";
import { defaultProjectTemplate, defaultModuleTypes } from "@/lib/db/seed";
import { getStageTemplatesForPhase } from "@/lib/db/stage-templates";
import { getStageApprovalStatus } from "@/lib/actions/approvals";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "org-1";

// =============================================================================
// PROJECT ACTIONS
// =============================================================================

export async function getProjects(filters?: {
  status?: Project["status"];
  search?: string;
  orgId?: string;
}): Promise<Project[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available, returning empty array");
      return [];
    }

    const orgId =
      filters?.orgId || (await getActiveOrganization())?.id || DEFAULT_ORG_ID;

    const db = createDb(d1);

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
    
    const baseQuery = db.select().from(projects);
    const results = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(projects.createdAt))
      : await baseQuery.orderBy(desc(projects.createdAt));
    
    return results;
  } catch (error) {
    console.error("Error fetching projects:", error);
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
    const d1 = await getD1Database();
    if (!d1) {
      throw new Error("D1 database not available");
    }
    
    const db = createDb(d1);
    const now = new Date();
    const projectId = generateId();
    const resolvedOrg = data.orgId || (await getActiveOrganization()).id || DEFAULT_ORG_ID;
    
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
    } catch (insertError: any) {
      console.error("=== PROJECT INSERT ERROR ===");
      console.error("Failed to insert project:", insertError);
      if (insertError instanceof Error) {
        console.error("Error name:", insertError.name);
        console.error("Error message:", insertError.message);
        console.error("Error stack:", insertError.stack);
        console.error("Error cause:", insertError.cause);
      }
      
      // Check for common errors
      const errorMsg = insertError?.message || String(insertError);
      if (errorMsg.includes("FOREIGN KEY") || errorMsg.includes("constraint failed")) {
        if (templateId && errorMsg.includes("template")) {
          throw new Error(`Template ${templateId} does not exist in the database. Please select a valid template or create the template first.`);
        }
        if (errorMsg.includes("org")) {
          throw new Error(`Organization ${orgId} does not exist. Please create it first.`);
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
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return false;
    }
    
    const db = createDb(d1);
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
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 database not available");
      return null;
    }
    
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
  const d1 = await getD1Database();
  if (!d1) {
    throw new Error("D1 database not available");
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
    const d1 = await getD1Database();
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }
    
    const db = createDb(d1);
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
    
    const db = createDb(d1);
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
 * Get stages for a phase from D1, or create default stages if none exist
 */
export async function getPhaseStages(phaseId: string): Promise<(Stage & { moduleType: typeof defaultModuleTypes[number] })[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      console.warn("D1 not available, using fallback stages");
      return getFallbackStages(phaseId);
    }
    
    const db = createDb(d1);
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
          moduleType: defaultModuleTypes.find(mt => mt.code === s.moduleTypeId) || defaultModuleTypes[0],
        }));
      }
    }
    
    return dbStages.map(s => ({
      ...s,
      moduleType: defaultModuleTypes.find(mt => mt.code === s.moduleTypeId) || defaultModuleTypes[0],
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
function getFallbackStages(phaseId: string): (Stage & { moduleType: typeof defaultModuleTypes[number] })[] {
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
    for (const [idx, templateStage] of templatePhase.stages.entries()) {
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
export async function getStage(id: string): Promise<(Stage & { moduleType: typeof defaultModuleTypes[number] }) | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return null;
    }
    
    const db = createDb(d1);
    const results = await db.select()
      .from(stagesTable)
      .where(eq(stagesTable.id, id));
    
    if (results.length === 0) return null;
    
    const stage = results[0];
    return {
      ...stage,
      moduleType: defaultModuleTypes.find(mt => mt.code === stage.moduleTypeId) || defaultModuleTypes[0],
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
  
  const db = createDb(d1);
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
    
    const db = createDb(d1);
    
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
    const d1 = await getD1Database();
    if (!d1) return;
    
    const db = createDb(d1);
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
export async function getPhaseModules(phaseId: string): Promise<(PhaseModule & { moduleType: typeof defaultModuleTypes[number] })[]> {
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
