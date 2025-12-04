"use server";

import type {
  Contact,
  NewContact,
  ContactRole,
  ProjectContact,
  PermissionLevel,
  UserType
} from "@/lib/db/schema";
import { defaultContactRoles } from "@/lib/db/seed";

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "org-1";

// =============================================================================
// MOCK DATA STORE (Replace with D1 database operations in production)
// =============================================================================

let mockContacts: Contact[] = [
  {
    id: "contact-1",
    orgId: "org-1",
    userId: "user-1",
    name: "John Smith",
    email: "john@optimii.com",
    phone: "0412 345 678",
    company: "Optimii Pty Ltd",
    role: "owner",
    avatarUrl: null,
    notes: "Project owner",
    isInvited: true,
    invitedAt: new Date("2024-01-01"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "contact-2",
    orgId: "org-1",
    userId: null,
    name: "Sarah Builder",
    email: "sarah@premiumbuilders.com.au",
    phone: "0423 456 789",
    company: "Premium Builders",
    role: "builder",
    avatarUrl: null,
    notes: "Licensed builder - QBCC #12345",
    isInvited: false,
    invitedAt: null,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  },
  {
    id: "contact-3",
    orgId: "org-1",
    userId: null,
    name: "Michael Architect",
    email: "michael@designstudio.com.au",
    phone: "0434 567 890",
    company: "Design Studio Architecture",
    role: "architect",
    avatarUrl: null,
    notes: "Registered architect - ARB #67890",
    isInvited: false,
    invitedAt: null,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-05"),
  },
  {
    id: "contact-4",
    orgId: "org-1",
    userId: null,
    name: "Lisa Certifier",
    email: "lisa@certifyright.com.au",
    phone: "0445 678 901",
    company: "CertifyRight Building Certifiers",
    role: "certifier",
    avatarUrl: null,
    notes: "Building certifier",
    isInvited: false,
    invitedAt: null,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-10"),
  },
  {
    id: "contact-5",
    orgId: "org-1",
    userId: null,
    name: "David Engineer",
    email: "david@structuraleng.com.au",
    phone: "0456 789 012",
    company: "Structural Engineering Solutions",
    role: null,
    avatarUrl: null,
    notes: "Structural engineer - RPE #11111",
    isInvited: false,
    invitedAt: null,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
];

let mockContactRoles: ContactRole[] = defaultContactRoles.map((role, idx) => ({
  id: `role-${idx + 1}`,
  orgId: null, // System roles
  name: role.name,
  description: role.description,
  isSystem: role.isSystem,
  createdAt: new Date("2024-01-01"),
}));

let mockProjectContacts: ProjectContact[] = [
  // Riverside Renovation team
  { id: "pc-1", projectId: "proj-1", contactId: "contact-1", roleId: "role-1", isPrimary: true, permission: "admin", createdAt: new Date() },
  { id: "pc-2", projectId: "proj-1", contactId: "contact-2", roleId: "role-2", isPrimary: true, permission: "editor", createdAt: new Date() },
  { id: "pc-3", projectId: "proj-1", contactId: "contact-3", roleId: "role-3", isPrimary: true, permission: "viewer", createdAt: new Date() },
  // Oak Street Build team
  { id: "pc-4", projectId: "proj-2", contactId: "contact-1", roleId: "role-1", isPrimary: true, permission: "admin", createdAt: new Date() },
  { id: "pc-5", projectId: "proj-2", contactId: "contact-2", roleId: "role-2", isPrimary: true, permission: "editor", createdAt: new Date() },
  { id: "pc-6", projectId: "proj-2", contactId: "contact-4", roleId: "role-4", isPrimary: true, permission: "viewer", createdAt: new Date() },
  // Harbor View Extension team
  { id: "pc-7", projectId: "proj-3", contactId: "contact-1", roleId: "role-1", isPrimary: true, permission: "admin", createdAt: new Date() },
  { id: "pc-8", projectId: "proj-3", contactId: "contact-5", roleId: "role-5", isPrimary: true, permission: "viewer", createdAt: new Date() },
];

// =============================================================================
// CONTACT ACTIONS
// =============================================================================

export async function getContacts(filters?: {
  search?: string;
  orgId?: string;
}): Promise<Contact[]> {
  let filtered = [...mockContacts];

  const orgFilter = filters?.orgId || DEFAULT_ORG_ID;
  if (orgFilter) {
    filtered = filtered.filter(c => c.orgId === orgFilter);
  }
  
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.company?.toLowerCase().includes(search)
    );
  }
  
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getContact(id: string): Promise<Contact | null> {
  return mockContacts.find(c => c.id === id) || null;
}

/**
 * Get contact by email - used for merging on sign-up
 */
export async function getContactByEmail(email: string): Promise<Contact | null> {
  return mockContacts.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Get all contacts with a specific email across all organizations
 * Used for linking contacts when a user signs up
 */
export async function getContactsByEmail(email: string): Promise<Contact[]> {
  return mockContacts.filter(c => c.email?.toLowerCase() === email.toLowerCase());
}

export async function createContact(data: Omit<NewContact, "id" | "createdAt" | "updatedAt">): Promise<Contact> {
  const contact: Contact = {
    id: `contact-${Date.now()}`,
    orgId: data.orgId || DEFAULT_ORG_ID,
    userId: data.userId || null,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
    role: data.role || null,
    avatarUrl: data.avatarUrl || null,
    notes: data.notes || null,
    isInvited: data.isInvited || false,
    invitedAt: data.invitedAt || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  mockContacts.push(contact);
  return contact;
}

export async function updateContact(id: string, data: Partial<NewContact>): Promise<Contact | null> {
  const index = mockContacts.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  mockContacts[index] = {
    ...mockContacts[index],
    ...data,
    updatedAt: new Date(),
  };
  
  return mockContacts[index];
}

export async function deleteContact(id: string): Promise<boolean> {
  const index = mockContacts.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  mockContacts.splice(index, 1);
  // Also remove from project associations
  mockProjectContacts = mockProjectContacts.filter(pc => pc.contactId !== id);
  
  return true;
}

// =============================================================================
// CONTACT INVITE ACTIONS
// =============================================================================

/**
 * Invite a contact to join the platform
 * This sends an invitation email and marks the contact as invited
 */
export async function inviteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
  const contact = mockContacts.find(c => c.id === contactId);
  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  if (!contact.email) {
    return { success: false, error: "Contact has no email address" };
  }

  if (contact.isInvited) {
    return { success: false, error: "Contact has already been invited" };
  }

  // TODO: Send invitation email via Clerk or email service
  // For now, just mark as invited
  contact.isInvited = true;
  contact.invitedAt = new Date();
  contact.updatedAt = new Date();

  console.log(`Invited contact ${contact.id} (${contact.email})`);

  return { success: true };
}

/**
 * Re-send invitation to a contact
 */
export async function resendInvite(contactId: string): Promise<{ success: boolean; error?: string }> {
  const contact = mockContacts.find(c => c.id === contactId);
  if (!contact) {
    return { success: false, error: "Contact not found" };
  }

  if (!contact.email) {
    return { success: false, error: "Contact has no email address" };
  }

  // TODO: Re-send invitation email
  contact.invitedAt = new Date();
  contact.updatedAt = new Date();

  console.log(`Re-sent invitation to contact ${contact.id} (${contact.email})`);

  return { success: true };
}

/**
 * Link a user to a contact (after they sign up)
 */
export async function linkUserToContact(contactId: string, userId: string): Promise<Contact | null> {
  const contact = mockContacts.find(c => c.id === contactId);
  if (!contact) return null;

  contact.userId = userId;
  contact.updatedAt = new Date();

  return contact;
}

// =============================================================================
// CONTACT ROLE ACTIONS
// =============================================================================

export async function getContactRoles(orgId?: string): Promise<ContactRole[]> {
  // Return system roles plus org-specific roles
  const resolvedOrg = orgId || DEFAULT_ORG_ID;
  return mockContactRoles.filter(r => r.orgId === null || r.orgId === resolvedOrg);
}

export async function createContactRole(data: {
  orgId: string;
  name: string;
  description?: string;
}): Promise<ContactRole> {
  const role: ContactRole = {
    id: `role-${Date.now()}`,
    orgId: data.orgId,
    name: data.name,
    description: data.description || null,
    isSystem: false,
    createdAt: new Date(),
  };
  
  mockContactRoles.push(role);
  return role;
}

// =============================================================================
// PROJECT CONTACT ACTIONS
// =============================================================================

export async function getProjectContacts(projectId: string): Promise<(ProjectContact & { contact: Contact; role: ContactRole | null })[]> {
  const projectContacts = mockProjectContacts.filter(pc => pc.projectId === projectId);
  
  return projectContacts.map(pc => ({
    ...pc,
    contact: mockContacts.find(c => c.id === pc.contactId)!,
    role: pc.roleId ? mockContactRoles.find(r => r.id === pc.roleId) || null : null,
  })).filter(pc => pc.contact);
}

/**
 * Add a contact to a project with optional invite
 */
export async function addContactToProject(data: {
  projectId: string;
  contactId: string;
  roleId?: string;
  isPrimary?: boolean;
  permission?: PermissionLevel;
  sendInvite?: boolean;
}): Promise<{ projectContact: ProjectContact; invited: boolean }> {
  // Check if already exists
  const existing = mockProjectContacts.find(
    pc => pc.projectId === data.projectId && pc.contactId === data.contactId
  );
  
  if (existing) {
    // Update existing
    if (data.roleId) existing.roleId = data.roleId;
    existing.isPrimary = data.isPrimary ?? existing.isPrimary;
    existing.permission = data.permission ?? existing.permission;
    return { projectContact: existing, invited: false };
  }
  
  const projectContact: ProjectContact = {
    id: `pc-${Date.now()}`,
    projectId: data.projectId,
    contactId: data.contactId,
    roleId: data.roleId || null,
    isPrimary: data.isPrimary ?? false,
    permission: data.permission ?? "viewer",
    createdAt: new Date(),
  };
  
  mockProjectContacts.push(projectContact);

  // Optionally send invite
  let invited = false;
  if (data.sendInvite) {
    const result = await inviteContact(data.contactId);
    invited = result.success;
  }
  
  return { projectContact, invited };
}

/**
 * Create a new contact and add to project in one operation
 */
export async function createAndAddContactToProject(data: {
  projectId: string;
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: UserType;
  permission?: PermissionLevel;
  sendInvite?: boolean;
}): Promise<{ contact: Contact; projectContact: ProjectContact; invited: boolean }> {
  // Create the contact
  const contact = await createContact({
    orgId: data.orgId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    role: data.role,
  });

  // Add to project
  const { projectContact, invited } = await addContactToProject({
    projectId: data.projectId,
    contactId: contact.id,
    permission: data.permission ?? "viewer",
    sendInvite: data.sendInvite && !!data.email,
  });

  return { contact, projectContact, invited };
}

export async function removeContactFromProject(projectId: string, contactId: string): Promise<boolean> {
  const index = mockProjectContacts.findIndex(
    pc => pc.projectId === projectId && pc.contactId === contactId
  );
  
  if (index === -1) return false;
  
  mockProjectContacts.splice(index, 1);
  return true;
}

export async function updateProjectContact(
  projectId: string,
  contactId: string,
  data: Partial<Pick<ProjectContact, "roleId" | "isPrimary" | "permission">>
): Promise<ProjectContact | null> {
  const pc = mockProjectContacts.find(
    pc => pc.projectId === projectId && pc.contactId === contactId
  );
  
  if (!pc) return null;
  
  Object.assign(pc, data);
  return pc;
}

// =============================================================================
// CONTACT PROJECTS
// =============================================================================

export async function getContactProjects(contactId: string): Promise<{ 
  projectId: string; 
  role: ContactRole | null;
  permission: PermissionLevel;
}[]> {
  return mockProjectContacts
    .filter(pc => pc.contactId === contactId)
    .map(pc => ({
      projectId: pc.projectId,
      role: pc.roleId ? mockContactRoles.find(r => r.id === pc.roleId) || null : null,
      permission: pc.permission,
    }));
}

/**
 * Get all project access for a user by their linked contacts
 */
export async function getProjectAccessForUser(userId: string): Promise<{
  projectId: string;
  permission: PermissionLevel;
  contact: Contact;
}[]> {
  // Find all contacts linked to this user
  const userContacts = mockContacts.filter(c => c.userId === userId);
  
  const access: { projectId: string; permission: PermissionLevel; contact: Contact }[] = [];
  
  for (const contact of userContacts) {
    const projectAccess = mockProjectContacts.filter(pc => pc.contactId === contact.id);
    for (const pa of projectAccess) {
      access.push({
        projectId: pa.projectId,
        permission: pa.permission,
        contact,
      });
    }
  }
  
  return access;
}
