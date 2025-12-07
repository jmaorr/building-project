"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import {
  projectTemplates,
  templatePhases,
  templateStages,
  generateId,
  type ProjectTemplate,
  type TemplatePhase,
  type TemplateStage
} from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { defaultStageTypes } from "@/lib/db/seed";

// =============================================================================
// MOCK DATA STORE (Replace with D1 database operations in production)
// =============================================================================

// System templates (New Build, Renovation)
const mockSystemTemplates: ProjectTemplate[] = [
  {
    id: "template-new-build",
    orgId: null,
    name: "New Build",
    description: "Comprehensive template for new residential construction projects. Includes all standard design, construction, and certification phases.",
    isDefault: true,
    isSystem: true,
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "template-renovation",
    orgId: null,
    name: "Renovation",
    description: "Streamlined template for renovation and extension projects. Simplified stages focused on existing structure modifications.",
    isDefault: false,
    isSystem: true,
    createdAt: new Date("2024-01-01"),
  },
];

// Template phases for system templates
let mockTemplatePhases: TemplatePhase[] = [
  // New Build phases
  { id: "tp-nb-design", templateId: "template-new-build", name: "Design", description: "Planning, design, and pre-construction phase", order: 0, createdAt: new Date() },
  { id: "tp-nb-build", templateId: "template-new-build", name: "Build", description: "Construction and building phase", order: 1, createdAt: new Date() },
  { id: "tp-nb-cert", templateId: "template-new-build", name: "Certification", description: "Final inspections and certification phase", order: 2, createdAt: new Date() },
  // Renovation phases
  { id: "tp-reno-design", templateId: "template-renovation", name: "Design", description: "Planning and design for renovation", order: 0, createdAt: new Date() },
  { id: "tp-reno-build", templateId: "template-renovation", name: "Build", description: "Renovation construction phase", order: 1, createdAt: new Date() },
  { id: "tp-reno-cert", templateId: "template-renovation", name: "Certification", description: "Final approvals for renovation", order: 2, createdAt: new Date() },
];

// Template modules (stages) for each phase
let mockTemplateStages: TemplateStage[] = [
  // New Build - Design Phase
  { id: "tm-nb-d-1", templatePhaseId: "tp-nb-design", moduleTypeId: "files", customName: "Site Survey", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-d-2", templatePhaseId: "tp-nb-design", moduleTypeId: "files", customName: "Draft Designs", order: 1, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-d-3", templatePhaseId: "tp-nb-design", moduleTypeId: "files", customName: "Final Designs", order: 2, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-d-4", templatePhaseId: "tp-nb-design", moduleTypeId: "approvals", customName: "Design Approval", order: 3, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-d-5", templatePhaseId: "tp-nb-design", moduleTypeId: "files", customName: "Engineering Documents", order: 4, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-d-6", templatePhaseId: "tp-nb-design", moduleTypeId: "approvals", customName: "Council Approval", order: 5, isEnabled: true, createdAt: new Date() },

  // New Build - Build Phase
  { id: "tm-nb-b-1", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Foundation", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-2", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Frame & Structure", order: 1, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-3", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Roofing", order: 2, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-4", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Electrical & Plumbing", order: 3, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-5", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Internal Finishes", order: 4, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-6", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "External Finishes", order: 5, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-b-7", templatePhaseId: "tp-nb-build", moduleTypeId: "files", customName: "Landscaping", order: 6, isEnabled: true, createdAt: new Date() },

  // New Build - Certification Phase
  { id: "tm-nb-c-1", templatePhaseId: "tp-nb-cert", moduleTypeId: "approvals", customName: "Pre-Handover Inspection", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-c-2", templatePhaseId: "tp-nb-cert", moduleTypeId: "files", customName: "Defects & Rectification", order: 1, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-c-3", templatePhaseId: "tp-nb-cert", moduleTypeId: "approvals", customName: "Final Inspection", order: 2, isEnabled: true, createdAt: new Date() },
  { id: "tm-nb-c-4", templatePhaseId: "tp-nb-cert", moduleTypeId: "files", customName: "Occupancy Certificate", order: 3, isEnabled: true, createdAt: new Date() },

  // Renovation - Design Phase (simplified)
  { id: "tm-reno-d-1", templatePhaseId: "tp-reno-design", moduleTypeId: "files", customName: "Existing Conditions", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-reno-d-2", templatePhaseId: "tp-reno-design", moduleTypeId: "files", customName: "Renovation Plans", order: 1, isEnabled: true, createdAt: new Date() },
  { id: "tm-reno-d-3", templatePhaseId: "tp-reno-design", moduleTypeId: "approvals", customName: "Design Approval", order: 2, isEnabled: true, createdAt: new Date() },

  // Renovation - Build Phase (simplified)
  { id: "tm-reno-b-1", templatePhaseId: "tp-reno-build", moduleTypeId: "files", customName: "Demolition", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-reno-b-2", templatePhaseId: "tp-reno-build", moduleTypeId: "files", customName: "Structural Works", order: 1, isEnabled: true, createdAt: new Date() },
  { id: "tm-reno-b-3", templatePhaseId: "tp-reno-build", moduleTypeId: "files", customName: "Finishing Works", order: 2, isEnabled: true, createdAt: new Date() },

  // Renovation - Certification Phase (simplified)
  { id: "tm-reno-c-1", templatePhaseId: "tp-reno-cert", moduleTypeId: "approvals", customName: "Final Inspection", order: 0, isEnabled: true, createdAt: new Date() },
  { id: "tm-reno-c-2", templatePhaseId: "tp-reno-cert", moduleTypeId: "files", customName: "Completion Certificate", order: 1, isEnabled: true, createdAt: new Date() },
];

// Organization-level templates (created by users)
const mockOrgTemplates: ProjectTemplate[] = [];

// =============================================================================
// TEMPLATE ACTIONS
// =============================================================================

/**
 * Get all system templates (global defaults)
 */
export async function getSystemTemplates(): Promise<ProjectTemplate[]> {
  return mockSystemTemplates.filter(t => t.isSystem);
}

/**
 * Get all templates for an organization (includes system templates)
 */
export async function getOrgTemplates(orgId: string): Promise<ProjectTemplate[]> {
  const systemTemplates = mockSystemTemplates.filter(t => t.isSystem);
  const orgTemplates = mockOrgTemplates.filter(t => t.orgId === orgId);
  return [...systemTemplates, ...orgTemplates];
}

/**
 * Get a single template by ID with its phases and modules
 */
export async function getTemplate(id: string): Promise<{
  template: ProjectTemplate;
  phases: (TemplatePhase & { modules: (TemplateStage & { moduleType: typeof defaultStageTypes[number] })[] })[];
} | null> {
  const template = [...mockSystemTemplates, ...mockOrgTemplates].find(t => t.id === id);
  if (!template) return null;

  const phases = mockTemplatePhases
    .filter(p => p.templateId === id)
    .sort((a, b) => a.order - b.order)
    .map(phase => ({
      ...phase,
      modules: mockTemplateStages
        .filter(m => m.templatePhaseId === phase.id)
        .sort((a, b) => a.order - b.order)
        .map(templateModule => ({
          ...templateModule,
          moduleType: defaultStageTypes.find(mt => mt.code === templateModule.moduleTypeId) || defaultStageTypes[0],
        })),
    }));

  return { template, phases };
}

/**
 * Create a new template for an organization
 */
export async function createTemplate(
  orgId: string,
  data: {
    name: string;
    description?: string;
    phases?: {
      name: string;
      description?: string;
      order: number;
      modules?: {
        moduleTypeId: string;
        customName?: string;
        order: number;
      }[];
    }[];
  }
): Promise<ProjectTemplate> {
  const template: ProjectTemplate = {
    id: `template-${Date.now()}`,
    orgId,
    name: data.name,
    description: data.description || null,
    isDefault: false,
    isSystem: false,
    createdAt: new Date(),
  };

  mockOrgTemplates.push(template);

  // Create phases if provided
  if (data.phases) {
    for (const phaseData of data.phases) {
      const phase: TemplatePhase = {
        id: `tp-${Date.now()}-${phaseData.order}`,
        templateId: template.id,
        name: phaseData.name,
        description: phaseData.description || null,
        order: phaseData.order,
        createdAt: new Date(),
      };
      mockTemplatePhases.push(phase);

      // Create modules for each phase
      if (phaseData.modules) {
        for (const moduleData of phaseData.modules) {
          const templateModule: TemplateStage = {
            id: `tm-${Date.now()}-${moduleData.order}`,
            templatePhaseId: phase.id,
            moduleTypeId: moduleData.moduleTypeId,
            customName: moduleData.customName || null,
            order: moduleData.order,
            isEnabled: true,
            createdAt: new Date(),
          };
          mockTemplateStages.push(templateModule);
        }
      }
    }
  }

  return template;
}

/**
 * Update an existing template
 */
export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    description: string;
  }>
): Promise<ProjectTemplate | null> {
  // Check both system and org templates
  let template = mockOrgTemplates.find(t => t.id === id);
  if (!template) {
    template = mockSystemTemplates.find(t => t.id === id);
  }
  if (!template) return null;

  if (data.name) template.name = data.name;
  if (data.description !== undefined) template.description = data.description || null;

  return template;
}

/**
 * Duplicate a template (system or org) to an organization
 */
export async function duplicateTemplate(
  templateId: string,
  targetOrgId: string,
  newName?: string
): Promise<ProjectTemplate | null> {
  const source = await getTemplate(templateId);
  if (!source) return null;

  const newTemplate = await createTemplate(targetOrgId, {
    name: newName || `${source.template.name} (Copy)`,
    description: source.template.description || undefined,
    phases: source.phases.map(phase => ({
      name: phase.name,
      description: phase.description || undefined,
      order: phase.order,
      modules: phase.modules.map(templateModule => ({
        moduleTypeId: templateModule.moduleTypeId,
        customName: templateModule.customName || undefined,
        order: templateModule.order,
      })),
    })),
  });

  return newTemplate;
}

/**
 * Delete an organization template (cannot delete system templates)
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const index = mockOrgTemplates.findIndex(t => t.id === id);
  if (index === -1) return false;

  // Remove template
  mockOrgTemplates.splice(index, 1);

  // Remove associated phases and modules
  const phaseIds = mockTemplatePhases.filter(p => p.templateId === id).map(p => p.id);
  mockTemplatePhases = mockTemplatePhases.filter(p => p.templateId !== id);
  mockTemplateStages = mockTemplateStages.filter(m => !phaseIds.includes(m.templatePhaseId));

  return true;
}

/**
 * Set the default template for an organization
 */
export async function setDefaultTemplate(
  orgId: string,
  templateId: string
): Promise<boolean> {
  // Verify template exists and is accessible to the org
  const allTemplates = await getOrgTemplates(orgId);
  const template = allTemplates.find(t => t.id === templateId);
  if (!template) return false;

  // In a real implementation, this would update the organization record
  // For now, we'll just return true as we'd need to modify the org mock data
  return true;
}

// =============================================================================
// TEMPLATE PHASE ACTIONS
// =============================================================================

/**
 * Add a phase to a template
 */
export async function addTemplatePhase(
  templateId: string,
  data: {
    name: string;
    description?: string;
    order?: number;
  }
): Promise<TemplatePhase | null> {
  // Check both system and org templates
  const template = [...mockSystemTemplates, ...mockOrgTemplates].find(t => t.id === templateId);
  if (!template) return null;

  const existingPhases = mockTemplatePhases.filter(p => p.templateId === templateId);
  const maxOrder = Math.max(...existingPhases.map(p => p.order), -1);

  const phase: TemplatePhase = {
    id: `tp-${Date.now()}`,
    templateId,
    name: data.name,
    description: data.description || null,
    order: data.order ?? maxOrder + 1,
    createdAt: new Date(),
  };

  mockTemplatePhases.push(phase);
  return phase;
}

/**
 * Update a template phase
 */
export async function updateTemplatePhase(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    order: number;
  }>
): Promise<TemplatePhase | null> {
  const phase = mockTemplatePhases.find(p => p.id === id);
  if (!phase) return null;

  if (data.name) phase.name = data.name;
  if (data.description !== undefined) phase.description = data.description || null;
  if (data.order !== undefined) phase.order = data.order;

  return phase;
}

/**
 * Delete a template phase
 */
export async function deleteTemplatePhase(id: string): Promise<boolean> {
  const phase = mockTemplatePhases.find(p => p.id === id);
  if (!phase) return false;

  // Remove phase and its modules
  mockTemplatePhases = mockTemplatePhases.filter(p => p.id !== id);
  mockTemplateStages = mockTemplateStages.filter(m => m.templatePhaseId !== id);

  return true;
}

// =============================================================================
// TEMPLATE MODULE ACTIONS
// =============================================================================

/**
 * Add a module (stage) to a template phase
 */
export async function addTemplateModule(
  templatePhaseId: string,
  data: {
    moduleTypeId: string;
    customName?: string;
    order?: number;
  }
): Promise<TemplateStage | null> {
  const phase = mockTemplatePhases.find(p => p.id === templatePhaseId);
  if (!phase) return null;

  const existingModules = mockTemplateStages.filter(m => m.templatePhaseId === templatePhaseId);
  const maxOrder = Math.max(...existingModules.map(m => m.order), -1);

  const templateModule: TemplateStage = {
    id: `tm-${Date.now()}`,
    templatePhaseId,
    moduleTypeId: data.moduleTypeId,
    customName: data.customName || null,
    order: data.order ?? maxOrder + 1,
    isEnabled: true,
    createdAt: new Date(),
  };

  mockTemplateStages.push(templateModule);
  return templateModule;
}

/**
 * Update a template module
 */
export async function updateTemplateModule(
  id: string,
  data: Partial<{
    customName: string;
    order: number;
    isEnabled: boolean;
  }>
): Promise<TemplateStage | null> {
  const templateModule = mockTemplateStages.find(m => m.id === id);
  if (!templateModule) return null;

  if (data.customName !== undefined) templateModule.customName = data.customName || null;
  if (data.order !== undefined) templateModule.order = data.order;
  if (data.isEnabled !== undefined) templateModule.isEnabled = data.isEnabled;

  return templateModule;
}

/**
 * Delete a template module
 */
export async function deleteTemplateModule(id: string): Promise<boolean> {
  const templateModule = mockTemplateStages.find(m => m.id === id);
  if (!templateModule) return false;

  mockTemplateStages = mockTemplateStages.filter(m => m.id !== id);
  return true;
}

/**
 * Reorder template modules within a phase
 */
export async function reorderTemplateModules(
  templatePhaseId: string,
  moduleIds: string[]
): Promise<void> {
  moduleIds.forEach((id, index) => {
    const templateModule = mockTemplateStages.find(m => m.id === id);
    if (templateModule && templateModule.templatePhaseId === templatePhaseId) {
      templateModule.order = index;
    }
  });
}

// =============================================================================
// HELPER: Get all available module types
// =============================================================================

/**
 * Revert a template to its system default state
 */
export async function revertTemplate(templateId: string): Promise<boolean> {
  try {
    const d1 = await getD1Database() as D1Database | null;
    if (!d1) return false;

    const db = createDb(d1);

    // 1. Get the current template
    const template = await db.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).get();
    if (!template || !template.orgId) return false; // Can only revert org templates

    // 2. Find the corresponding system template (by name for now, or could add systemTemplateId to schema)
    const systemTemplates = await getSystemTemplates();
    const systemTemplate = systemTemplates.find(t => t.name === template.name);

    if (!systemTemplate) return false;

    // 3. Get full system template details
    const fullSystemTemplate = await getTemplate(systemTemplate.id);
    if (!fullSystemTemplate) return false;

    const now = new Date();

    await db.transaction(async (tx) => {
      // 4. Delete existing phases (cascade deletes modules)
      await tx.delete(templatePhases).where(eq(templatePhases.templateId, templateId));

      // 5. Re-copy phases and modules
      for (const phase of fullSystemTemplate.phases) {
        const newPhaseId = generateId();
        await tx.insert(templatePhases).values({
          id: newPhaseId,
          templateId: templateId,
          name: phase.name,
          description: phase.description,
          order: phase.order,
          createdAt: now,
        });

        for (const templateModule of phase.modules) {
          await tx.insert(templateStages).values({
            id: generateId(),
            templatePhaseId: newPhaseId,
            moduleTypeId: templateModule.moduleTypeId,
            customName: templateModule.customName,
            order: templateModule.order,
            isEnabled: templateModule.isEnabled,
            createdAt: now,
          });
        }
      }

      // 6. Reset template details
      await tx.update(projectTemplates)
        .set({
          description: systemTemplate.description,
        })
        .where(eq(projectTemplates.id, templateId));
    });

    revalidatePath("/settings/templates");
    return true;
  } catch (error) {
    console.error("Failed to revert template:", error);
    return false;
  }
}

export async function getModuleTypes(): Promise<typeof defaultStageTypes> {
  return [...defaultStageTypes];
}

