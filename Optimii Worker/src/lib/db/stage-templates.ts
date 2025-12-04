/**
 * Stage Templates
 * 
 * Defines default stage configurations for different phases.
 * Stages are named module instances with specific configurations.
 * 
 * This file provides stage templates based on the system templates
 * defined in seed.ts.
 */

import { newBuildTemplate } from "./seed";

export interface StageTemplate {
  name: string;
  description?: string;
  moduleTypeCode: string;
  allowsRounds: boolean;
  requiresApproval: boolean;
  order: number;
}

// Generate stage templates from the New Build template (default)
function generateStageTemplatesFromTemplate(phaseName: string): StageTemplate[] {
  const phase = newBuildTemplate.phases.find(p => p.name === phaseName);
  if (!phase) return [];

  return phase.stages.map(stage => ({
    name: stage.name,
    description: undefined,
    moduleTypeCode: stage.moduleCode,
    allowsRounds: stage.allowsRounds,
    requiresApproval: stage.requiresApproval,
    order: stage.order,
  }));
}

export const designPhaseStages: StageTemplate[] = generateStageTemplatesFromTemplate("Design");
export const buildPhaseStages: StageTemplate[] = generateStageTemplatesFromTemplate("Build");
export const certificationPhaseStages: StageTemplate[] = generateStageTemplatesFromTemplate("Certification");

export function getStageTemplatesForPhase(phaseName: string): StageTemplate[] {
  switch (phaseName) {
    case "Design":
      return designPhaseStages;
    case "Build":
      return buildPhaseStages;
    case "Certification":
      return certificationPhaseStages;
    default:
      return [];
  }
}

/**
 * Get stage templates for a specific template by ID
 * This allows using different templates (e.g., Renovation vs New Build)
 */
export function getStageTemplatesForTemplatePhase(
  templateId: string | null,
  phaseName: string
): StageTemplate[] {
  // For now, just use the default New Build template
  // In the future, this will look up the template by ID
  return getStageTemplatesForPhase(phaseName);
}
