/**
 * Seed data for Optimii
 * 
 * This file contains the default data that should be seeded into the database
 * on first setup, including:
 * - System module types
 * - Default contact roles
 * - Default project template with phases and modules
 */

// =============================================================================
// STAGE TYPES: System-defined stage types
// =============================================================================

export const defaultStageTypes = [
  {
    code: "files",
    defaultName: "Documents",
    description: "Upload and organize project files and documents",
    icon: "FileText",
  },
  {
    code: "tasks",
    defaultName: "Checklist",
    description: "Track to-do items, milestones, and action items",
    icon: "CheckSquare",
  },
  {
    code: "costs",
    defaultName: "Budget",
    description: "Track budget items, quotes, and expenses",
    icon: "DollarSign",
  },
  {
    code: "payments",
    defaultName: "Invoices",
    description: "Track invoices and payment status",
    icon: "Receipt",
  },
  {
    code: "notes",
    defaultName: "Notes",
    description: "Discussion threads and comments",
    icon: "MessageSquare",
  },
  {
    code: "timeline",
    defaultName: "Schedule",
    description: "Key dates, deadlines, and milestones",
    icon: "Calendar",
  },
  {
    code: "approvals",
    defaultName: "Approvals",
    description: "Sign-offs, certifications, and approvals",
    icon: "ClipboardCheck",
  },
] as const;

export type StageTypeCode = typeof defaultStageTypes[number]["code"];

// =============================================================================
// CONTACT ROLES: Standard roles for building projects
// =============================================================================

export const defaultContactRoles = [
  {
    name: "Owner",
    description: "Property owner or client",
    isSystem: true,
  },
  {
    name: "Builder",
    description: "Licensed builder or construction company",
    isSystem: true,
  },
  {
    name: "Architect",
    description: "Architectural designer",
    isSystem: true,
  },
  {
    name: "Certifier",
    description: "Building certifier or inspector",
    isSystem: true,
  },
  {
    name: "Engineer",
    description: "Structural or civil engineer",
    isSystem: true,
  },
  {
    name: "Interior Designer",
    description: "Interior design professional",
    isSystem: true,
  },
  {
    name: "Landscaper",
    description: "Landscape designer or contractor",
    isSystem: true,
  },
  {
    name: "Electrician",
    description: "Licensed electrician",
    isSystem: true,
  },
  {
    name: "Plumber",
    description: "Licensed plumber",
    isSystem: true,
  },
  {
    name: "Project Manager",
    description: "Overall project coordinator",
    isSystem: true,
  },
  {
    name: "Contractor",
    description: "General contractor or subcontractor",
    isSystem: true,
  },
  {
    name: "Supplier",
    description: "Materials or equipment supplier",
    isSystem: true,
  },
] as const;

// =============================================================================
// SYSTEM PROJECT TEMPLATES
// =============================================================================

/**
 * New Build Template
 * Comprehensive template for new residential construction projects.
 * Includes all standard design, construction, and certification phases.
 */
export const newBuildTemplate = {
  id: "template-new-build",
  name: "New Build",
  description: "Comprehensive template for new residential construction projects. Includes all standard design, construction, and certification phases.",
  isDefault: true,
  isSystem: true,
  phases: [
    {
      name: "Design",
      description: "Planning, design, and pre-construction phase",
      order: 0,
      stages: [
        { moduleCode: "files", name: "Site Survey", order: 0, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "Draft Designs", order: 1, allowsRounds: true, requiresApproval: false },
        { moduleCode: "files", name: "Final Designs", order: 2, allowsRounds: true, requiresApproval: true },
        { moduleCode: "approvals", name: "Design Approval", order: 3, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Engineering Documents", order: 4, allowsRounds: true, requiresApproval: true },
        { moduleCode: "approvals", name: "Council Approval", order: 5, allowsRounds: false, requiresApproval: true },
      ],
    },
    {
      name: "Build",
      description: "Construction and building phase",
      order: 1,
      stages: [
        { moduleCode: "files", name: "Foundation", order: 0, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Frame & Structure", order: 1, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Roofing", order: 2, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "Electrical & Plumbing", order: 3, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Internal Finishes", order: 4, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "External Finishes", order: 5, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "Landscaping", order: 6, allowsRounds: false, requiresApproval: false },
      ],
    },
    {
      name: "Certification",
      description: "Final inspections and certification phase",
      order: 2,
      stages: [
        { moduleCode: "approvals", name: "Pre-Handover Inspection", order: 0, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Defects & Rectification", order: 1, allowsRounds: true, requiresApproval: false },
        { moduleCode: "approvals", name: "Final Inspection", order: 2, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Occupancy Certificate", order: 3, allowsRounds: false, requiresApproval: true },
      ],
    },
  ],
} as const;

/**
 * Renovation Template
 * Streamlined template for renovation and extension projects.
 * Simplified stages focused on existing structure modifications.
 */
export const renovationTemplate = {
  id: "template-renovation",
  name: "Renovation",
  description: "Streamlined template for renovation and extension projects. Simplified stages focused on existing structure modifications.",
  isDefault: false,
  isSystem: true,
  phases: [
    {
      name: "Design",
      description: "Planning and design for renovation",
      order: 0,
      stages: [
        { moduleCode: "files", name: "Existing Conditions", order: 0, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "Renovation Plans", order: 1, allowsRounds: true, requiresApproval: true },
        { moduleCode: "approvals", name: "Design Approval", order: 2, allowsRounds: false, requiresApproval: true },
      ],
    },
    {
      name: "Build",
      description: "Renovation construction phase",
      order: 1,
      stages: [
        { moduleCode: "files", name: "Demolition", order: 0, allowsRounds: false, requiresApproval: false },
        { moduleCode: "files", name: "Structural Works", order: 1, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Finishing Works", order: 2, allowsRounds: false, requiresApproval: false },
      ],
    },
    {
      name: "Certification",
      description: "Final approvals for renovation",
      order: 2,
      stages: [
        { moduleCode: "approvals", name: "Final Inspection", order: 0, allowsRounds: false, requiresApproval: true },
        { moduleCode: "files", name: "Completion Certificate", order: 1, allowsRounds: false, requiresApproval: true },
      ],
    },
  ],
} as const;

/**
 * All system templates
 */
export const systemTemplates = [newBuildTemplate, renovationTemplate] as const;

/**
 * Default project template (kept for backward compatibility)
 * Now uses the New Build template as the default
 */
export const defaultProjectTemplate = newBuildTemplate;

// =============================================================================
// HELPER: Get stage type by code
// =============================================================================

export function getStageTypeByCode(code: StageTypeCode) {
  return defaultStageTypes.find((m) => m.code === code);
}

// =============================================================================
// HELPER: Get all stage codes
// =============================================================================

export function getAllStageCodes(): StageTypeCode[] {
  return defaultStageTypes.map((m) => m.code);
}


