import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// =============================================================================
// UTILITY: Generate unique IDs
// =============================================================================
/**
 * Generate a unique ID using UUID v4
 * Exported for use in server actions where manual ID generation is needed
 */
export const generateId = () => crypto.randomUUID();

// =============================================================================
// CORE: Users & Organizations
// =============================================================================

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(generateId),
  clerkId: text("clerk_id").unique(), // Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatarUrl: text("avatar_url"),
  userType: text("user_type", {
    enum: ["owner", "builder", "architect", "certifier"]
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(generateId),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color").default("#5e6ad2"),
  defaultTemplateId: text("default_template_id"), // Reference to projectTemplates.id
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const organizationMembers = sqliteTable("organization_members", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "member"] })
    .notNull()
    .default("member"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// ORG INVITES: Pending invitations to join an organization
// =============================================================================

export const orgInvites = sqliteTable("org_invites", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "member"] })
    .notNull()
    .default("member"),
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: integer("invited_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

// =============================================================================
// CONTACTS: People/entities involved in projects
// =============================================================================

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id), // Linked user (nullable)
  name: text("name").notNull(),
  email: text("email"), // Used as global identifier for merging on sign-up
  phone: text("phone"),
  company: text("company"),
  role: text("role", {
    enum: ["owner", "builder", "architect", "certifier"]
  }), // Contact role type (unified with user types)
  avatarUrl: text("avatar_url"),
  notes: text("notes"),
  isInvited: integer("is_invited", { mode: "boolean" }).notNull().default(false),
  invitedAt: integer("invited_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const contactRoles = sqliteTable("contact_roles", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system role
  name: text("name").notNull(),
  description: text("description"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE TYPES: System-defined module types with default names
// =============================================================================

export const moduleTypes = sqliteTable("module_types", {
  id: text("id").primaryKey().$defaultFn(generateId),
  code: text("code").notNull().unique(), // files, tasks, costs, payments, notes, timeline, approvals
  defaultName: text("default_name").notNull(),
  description: text("description"),
  icon: text("icon"), // Lucide icon name
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// TEMPLATES: Default configurations for phases and modules
// =============================================================================

export const projectTemplates = sqliteTable("project_templates", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }), // null = system template
  name: text("name").notNull(),
  description: text("description"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const templatePhases = sqliteTable("template_phases", {
  id: text("id").primaryKey().$defaultFn(generateId),
  templateId: text("template_id")
    .notNull()
    .references(() => projectTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const templateStages = sqliteTable("template_modules", {
  id: text("id").primaryKey().$defaultFn(generateId),
  templatePhaseId: text("template_phase_id")
    .notNull()
    .references(() => templatePhases.id, { onDelete: "cascade" }),
  moduleTypeId: text("module_type_id")
    .notNull()
    .references(() => moduleTypes.id),
  customName: text("custom_name"), // Override the default name
  order: integer("order").notNull().default(0),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// PROJECTS: Core project entity
// =============================================================================

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  templateId: text("template_id").references(() => projectTemplates.id),

  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  status: text("status", {
    enum: ["draft", "active", "on_hold", "completed", "archived"]
  }).notNull().default("draft"),

  // Dates
  startDate: integer("start_date", { mode: "timestamp" }),
  targetCompletion: integer("target_completion", { mode: "timestamp" }),
  actualCompletion: integer("actual_completion", { mode: "timestamp" }),

  // Financial
  budget: real("budget"),
  contractValue: real("contract_value"),

  // Property details
  lotSize: text("lot_size"),
  buildingType: text("building_type"),
  councilArea: text("council_area"),
  permitNumber: text("permit_number"),

  // Media
  coverImageUrl: text("cover_image_url"),

  // Metadata
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// PROJECT CONTACTS: Links contacts to projects with roles
// =============================================================================

export const projectContacts = sqliteTable("project_contacts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  roleId: text("role_id")
    .references(() => contactRoles.id), // Made optional - role can come from contact.role
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  permission: text("permission", {
    enum: ["admin", "editor", "viewer"]
  }).notNull().default("viewer"), // Replaced canEdit with permission levels
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// PROJECT SHARES: Share projects with other organizations
// =============================================================================

export const projectShares = sqliteTable("project_shares", {
  id: text("id").primaryKey().$defaultFn(generateId),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  permission: text("permission", {
    enum: ["admin", "editor", "viewer"]
  }).notNull().default("editor"),
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: integer("invited_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }), // null = pending invite
});

// =============================================================================
// PHASES: Project phases (Design, Build, Certification, custom)
// =============================================================================

export const phases = sqliteTable("phases", {
  id: text("id").primaryKey().$defaultFn(generateId),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  templatePhaseId: text("template_phase_id").references(() => templatePhases.id),

  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  status: text("status", {
    enum: ["not_started", "in_progress", "completed"]
  }).notNull().default("not_started"),

  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// PHASE CONTACTS: Phase-level permissions
// =============================================================================

export const phaseContacts = sqliteTable("phase_contacts", {
  id: text("id").primaryKey().$defaultFn(generateId),
  phaseId: text("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  permission: text("permission", {
    enum: ["admin", "editor", "viewer"]
  }).notNull().default("viewer"), // Replaced canView/canEdit with permission levels
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// STAGES: Named module instances with configuration (formerly phaseModules)
// =============================================================================

export const stages = sqliteTable("stages", {
  id: text("id").primaryKey().$defaultFn(generateId),
  phaseId: text("phase_id")
    .notNull()
    .references(() => phases.id, { onDelete: "cascade" }),
  moduleTypeId: text("module_type_id")
    .notNull()
    .references(() => moduleTypes.id),
  templateModuleId: text("template_module_id").references(() => templateStages.id),

  // Stage identity
  name: text("name").notNull(), // e.g., "Site Survey", "Draft Designs"
  description: text("description"),
  customName: text("custom_name"), // Override name for this instance (deprecated, use name)
  order: integer("order").notNull().default(0),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),

  // Status tracking
  status: text("status", {
    enum: ["not_started", "in_progress", "awaiting_approval", "completed", "on_hold"]
  }).notNull().default("not_started"),

  // Round configuration
  allowsRounds: integer("allows_rounds", { mode: "boolean" }).notNull().default(false),
  currentRound: integer("current_round").notNull().default(1),

  // Approval configuration
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull().default(false),
  approvalContactId: text("approval_contact_id").references(() => contacts.id),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Keep phaseModules as alias for backward compatibility during transition
export const phaseModules = stages;

// =============================================================================
// MODULE DATA: Files
// =============================================================================

export const files = sqliteTable("files", {
  id: text("id").primaryKey().$defaultFn(generateId),
  // Note: Foreign key constraints removed temporarily since stages are mock data
  // TODO: Re-add constraints when stages are stored in D1
  stageId: text("stage_id").references(() => stages.id, { onDelete: "cascade" }),
  moduleId: text("module_id"), // Keep for backward compatibility
  costId: text("cost_id").references(() => costs.id, { onDelete: "set null" }), // Link to cost for attachments (quotes, invoices, receipts)

  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type"), // MIME type
  size: integer("size"), // bytes
  category: text("category"), // user-defined category

  roundNumber: integer("round_number").notNull().default(1),

  uploadedBy: text("uploaded_by"), // Removed FK constraint - user may not exist yet
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Tasks (Checklist)
// =============================================================================

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(generateId),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  moduleId: text("module_id") // Keep for backward compatibility
    .references(() => stages.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["pending", "in_progress", "completed", "cancelled"]
  }).notNull().default("pending"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "urgent"]
  }).default("medium"),

  dueDate: integer("due_date", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  order: integer("order").notNull().default(0),

  roundNumber: integer("round_number").notNull().default(1),

  assignedTo: text("assigned_to").references(() => contacts.id),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Costs (Unified cost tracking with Quoted/Actual/Paid)
// =============================================================================

export const costs = sqliteTable("costs", {
  id: text("id").primaryKey().$defaultFn(generateId),

  // Hierarchical linking - can be project, phase, or stage level
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  phaseId: text("phase_id")
    .references(() => phases.id, { onDelete: "cascade" }),
  stageId: text("stage_id")
    .references(() => stages.id, { onDelete: "cascade" }),

  // Basic info
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // e.g., "Labor", "Materials", "Permits", "Professional Fees"

  // Amount tracking
  quotedAmount: real("quoted_amount"),    // Initial quote/estimate
  actualAmount: real("actual_amount"),    // Real cost when known
  paidAmount: real("paid_amount").default(0), // Amount paid so far

  // Payment status tracking
  paymentStatus: text("payment_status", {
    enum: ["not_started", "quoted", "approved", "partially_paid", "paid"]
  }).notNull().default("not_started"),

  // Vendor/Payee info
  vendorContactId: text("vendor_contact_id").references(() => contacts.id),
  vendorName: text("vendor_name"), // Fallback if no contact linked

  // Payment tracking
  paymentMethod: text("payment_method", {
    enum: ["external", "platform"] // external = paid outside system, platform = future in-app payments
  }),
  paidAt: integer("paid_at", { mode: "timestamp" }),

  notes: text("notes"),

  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Payments (Invoices)
// =============================================================================

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey().$defaultFn(generateId),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  moduleId: text("module_id") // Keep for backward compatibility
    .references(() => stages.id, { onDelete: "cascade" }),

  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),

  description: text("description").notNull(),
  amount: real("amount").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }),
  paidDate: integer("paid_date", { mode: "timestamp" }),
  status: text("status", {
    enum: ["draft", "pending", "paid", "overdue", "cancelled"]
  }).notNull().default("pending"),

  invoiceNumber: text("invoice_number"),
  invoiceUrl: text("invoice_url"),
  notes: text("notes"),

  roundNumber: integer("round_number").notNull().default(1),

  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Notes (Comments/Discussion)
// =============================================================================

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey().$defaultFn(generateId),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  moduleId: text("module_id") // Keep for backward compatibility
    .references(() => stages.id, { onDelete: "cascade" }),

  content: text("content").notNull(),
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),

  roundNumber: integer("round_number").notNull().default(1),
  mentions: text("mentions"), // JSON array of user/contact IDs mentioned

  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Timeline Events (Schedule)
// =============================================================================

export const timelineEvents = sqliteTable("timeline_events", {
  id: text("id").primaryKey().$defaultFn(generateId),
  stageId: text("stage_id")
    .notNull()
    .references(() => stages.id, { onDelete: "cascade" }),
  moduleId: text("module_id") // Keep for backward compatibility
    .references(() => stages.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description"),
  date: integer("date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }), // For date ranges
  type: text("type", {
    enum: ["milestone", "deadline", "event", "meeting", "inspection"]
  }).notNull().default("event"),

  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),

  roundNumber: integer("round_number").notNull().default(1),

  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// MODULE DATA: Approvals (Sign-offs)
// =============================================================================

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey().$defaultFn(generateId),
  stageId: text("stage_id").notNull(),
  moduleId: text("module_id"), // Keep for backward compatibility

  title: text("title").notNull().default("Approval Request"),
  description: text("description"), // Message from requester
  status: text("status", {
    enum: ["pending", "approved", "rejected", "revision_required"]
  }).notNull().default("pending"),

  documentUrl: text("document_url"),

  roundNumber: integer("round_number").notNull().default(1),

  // Who requested the approval
  requestedBy: text("requested_by"),
  requesterName: text("requester_name"),
  requestedAt: integer("requested_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),

  // Who should approve (assignee)
  assignedTo: text("assigned_to"),
  assigneeName: text("assignee_name"),

  // Who actually approved/rejected
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),

  notes: text("notes"), // Notes from approver
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// STATUS CONFIGURATIONS: Customizable status workflows
// =============================================================================

export const statusConfigs = sqliteTable("status_configs", {
  id: text("id").primaryKey().$defaultFn(generateId),
  orgId: text("org_id"),           // null = system default
  projectId: text("project_id"),    // null = org-level config
  entityType: text("entity_type", {
    enum: ["stage", "project", "phase"]
  }).notNull().default("stage"),

  code: text("code").notNull(),     // "in_progress", "custom_review"
  label: text("label").notNull(),   // "In Progress", "Under Review"
  color: text("color").notNull().default("gray"), // "blue", "amber", "green", etc.
  order: integer("order").notNull().default(0),

  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false), // Initial status?
  isFinal: integer("is_final", { mode: "boolean" }).notNull().default(false),     // Completion status?
  triggersApproval: integer("triggers_approval", { mode: "boolean" }).notNull().default(false), // Auto-trigger approval?
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),   // System-managed (not user editable)?

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type StatusConfig = typeof statusConfigs.$inferSelect;
export type NewStatusConfig = typeof statusConfigs.$inferInsert;

// =============================================================================
// ACTIVITY LOG: Track all changes and events
// =============================================================================

export const activityLog = sqliteTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(generateId),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  phaseId: text("phase_id")
    .references(() => phases.id, { onDelete: "cascade" }),
  stageId: text("stage_id")
    .references(() => stages.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number"),

  type: text("type", {
    enum: [
      "file_uploaded",
      "comment_added",
      "status_changed",
      "approval_requested",
      "approval_approved",
      "approval_rejected",
      "round_started",
      "stage_created",
      "stage_completed",
    ],
  }).notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  metadata: text("metadata"), // JSON string for additional data

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// =============================================================================
// RELATIONS
// =============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMembers),
  contacts: many(contacts),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invites: many(orgInvites),
  projectShares: many(projectShares),
  contacts: many(contacts),
  projects: many(projects),
  contactRoles: many(contactRoles),
  templates: many(projectTemplates),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  projectContacts: many(projectContacts),
  phaseContacts: many(phaseContacts),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  template: one(projectTemplates, {
    fields: [projects.templateId],
    references: [projectTemplates.id],
  }),
  phases: many(phases),
  projectContacts: many(projectContacts),
  projectShares: many(projectShares),
  costs: many(costs),
}));

export const phasesRelations = relations(phases, ({ one, many }) => ({
  project: one(projects, {
    fields: [phases.projectId],
    references: [projects.id],
  }),
  stages: many(stages),
  modules: many(stages), // Alias for backward compatibility
  phaseContacts: many(phaseContacts),
  costs: many(costs),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  phase: one(phases, {
    fields: [stages.phaseId],
    references: [phases.id],
  }),
  moduleType: one(moduleTypes, {
    fields: [stages.moduleTypeId],
    references: [moduleTypes.id],
  }),
  approvalContact: one(contacts, {
    fields: [stages.approvalContactId],
    references: [contacts.id],
  }),
  files: many(files),
  tasks: many(tasks),
  costs: many(costs),
  payments: many(payments),
  notes: many(notes),
  timelineEvents: many(timelineEvents),
  approvals: many(approvals),
}));

// Keep phaseModulesRelations as alias for backward compatibility
export const phaseModulesRelations = stagesRelations;

export const costsRelations = relations(costs, ({ one, many }) => ({
  project: one(projects, {
    fields: [costs.projectId],
    references: [projects.id],
  }),
  phase: one(phases, {
    fields: [costs.phaseId],
    references: [phases.id],
  }),
  stage: one(stages, {
    fields: [costs.stageId],
    references: [stages.id],
  }),
  vendor: one(contacts, {
    fields: [costs.vendorContactId],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [costs.createdBy],
    references: [users.id],
  }),
  files: many(files),
}));

export const filesRelations = relations(files, ({ one }) => ({
  stage: one(stages, {
    fields: [files.stageId],
    references: [stages.id],
  }),
  cost: one(costs, {
    fields: [files.costId],
    references: [costs.id],
  }),
}));

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ContactRole = typeof contactRoles.$inferSelect;
export type NewContactRole = typeof contactRoles.$inferInsert;

export type StageType = typeof moduleTypes.$inferSelect;
export type NewStageType = typeof moduleTypes.$inferInsert;

export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type NewProjectTemplate = typeof projectTemplates.$inferInsert;

export type TemplatePhase = typeof templatePhases.$inferSelect;
export type NewTemplatePhase = typeof templatePhases.$inferInsert;

export type TemplateStage = typeof templateStages.$inferSelect;
export type NewTemplateStage = typeof templateStages.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type ProjectContact = typeof projectContacts.$inferSelect;
export type NewProjectContact = typeof projectContacts.$inferInsert;

export type ProjectShare = typeof projectShares.$inferSelect;
export type NewProjectShare = typeof projectShares.$inferInsert;

export type OrgInvite = typeof orgInvites.$inferSelect;
export type NewOrgInvite = typeof orgInvites.$inferInsert;

export type Phase = typeof phases.$inferSelect;
export type NewPhase = typeof phases.$inferInsert;

export type PhaseContact = typeof phaseContacts.$inferSelect;
export type NewPhaseContact = typeof phaseContacts.$inferInsert;

export type Stage = typeof stages.$inferSelect;
export type NewStage = typeof stages.$inferInsert;

// Keep PhaseModule as alias for backward compatibility
export type PhaseModule = Stage;
export type NewPhaseModule = NewStage;

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Cost = typeof costs.$inferSelect;
export type NewCost = typeof costs.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;

// =============================================================================
// ENUM TYPE EXPORTS
// =============================================================================

export type UserType = "owner" | "builder" | "architect" | "certifier";
export type PermissionLevel = "admin" | "editor" | "viewer";
