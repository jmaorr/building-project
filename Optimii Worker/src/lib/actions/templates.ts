"use server";

import type { 
  ProjectTemplate, 
  NewProjectTemplate, 
  TemplatePhase, 
  NewTemplatePhase,
  TemplateModule,
  NewTemplateModule,
  Organization 
} from "@/lib/db/schema";
import { defaultModuleTypes } from "@/lib/db/seed";

// =============================================================================
// MOCK DATA STORE (Replace with D1 database operations in production)
// =============================================================================

// System templates (New Build, Renovation)
let mockSystemTemplates: ProjectTemplate[] = [
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
let mockTemplateModules: TemplateModule[] = [
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
let mockOrgTemplates: ProjectTemplate[] = [];

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
  phases: (TemplatePhase & { modules: (TemplateModule & { moduleType: typeof defaultModuleTypes[number] })[] })[];
} | null> {
  const template = [...mockSystemTemplates, ...mockOrgTemplates].find(t => t.id === id);
  if (!template) return null;

  const phases = mockTemplatePhases
    .filter(p => p.templateId === id)
    .sort((a, b) => a.order - b.order)
    .map(phase => ({
      ...phase,
      modules: mockTemplateModules
        .filter(m => m.templatePhaseId === phase.id)
        .sort((a, b) => a.order - b.order)
        .map(module => ({
          ...module,
          moduleType: defaultModuleTypes.find(mt => mt.code === module.moduleTypeId) || defaultModuleTypes[0],
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
          const module: TemplateModule = {
            id: `tm-${Date.now()}-${moduleData.order}`,
            templatePhaseId: phase.id,
            moduleTypeId: moduleData.moduleTypeId,
            customName: moduleData.customName || null,
            order: moduleData.order,
            isEnabled: true,
            createdAt: new Date(),
          };
          mockTemplateModules.push(module);
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
      modules: phase.modules.map(module => ({
        moduleTypeId: module.moduleTypeId,
        customName: module.customName || undefined,
        order: module.order,
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
  mockTemplateModules = mockTemplateModules.filter(m => !phaseIds.includes(m.templatePhaseId));

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
  mockTemplateModules = mockTemplateModules.filter(m => m.templatePhaseId !== id);

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
): Promise<TemplateModule | null> {
  const phase = mockTemplatePhases.find(p => p.id === templatePhaseId);
  if (!phase) return null;

  const existingModules = mockTemplateModules.filter(m => m.templatePhaseId === templatePhaseId);
  const maxOrder = Math.max(...existingModules.map(m => m.order), -1);

  const module: TemplateModule = {
    id: `tm-${Date.now()}`,
    templatePhaseId,
    moduleTypeId: data.moduleTypeId,
    customName: data.customName || null,
    order: data.order ?? maxOrder + 1,
    isEnabled: true,
    createdAt: new Date(),
  };

  mockTemplateModules.push(module);
  return module;
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
): Promise<TemplateModule | null> {
  const module = mockTemplateModules.find(m => m.id === id);
  if (!module) return null;

  if (data.customName !== undefined) module.customName = data.customName || null;
  if (data.order !== undefined) module.order = data.order;
  if (data.isEnabled !== undefined) module.isEnabled = data.isEnabled;

  return module;
}

/**
 * Delete a template module
 */
export async function deleteTemplateModule(id: string): Promise<boolean> {
  const module = mockTemplateModules.find(m => m.id === id);
  if (!module) return false;

  mockTemplateModules = mockTemplateModules.filter(m => m.id !== id);
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
    const module = mockTemplateModules.find(m => m.id === id);
    if (module && module.templatePhaseId === templatePhaseId) {
      module.order = index;
    }
  });
}

// =============================================================================
// HELPER: Get all available module types
// =============================================================================

export async function getModuleTypes(): Promise<typeof defaultModuleTypes> {
  return [...defaultModuleTypes];
}

