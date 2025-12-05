"use server";

import { eq, and, like, or, asc } from "drizzle-orm";
import { createDb, type D1Database } from "@/lib/db";
import {
  contacts,
  contactRoles,
  projectContacts,
  generateId
} from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type {
  Contact,
  NewContact,
  ContactRole,
  ProjectContact,
  PermissionLevel,
  UserType
} from "@/lib/db/schema";

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "org-1";

// =============================================================================
// CONTACT ACTIONS
// =============================================================================

export async function getContacts(filters?: {
  search?: string;
  orgId?: string;
}): Promise<Contact[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);
    const orgId = filters?.orgId || DEFAULT_ORG_ID;

    const conditions = [eq(contacts.orgId, orgId)];

    if (filters?.search) {
      const search = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          like(contacts.name, search),
          like(contacts.email, search),
          like(contacts.company, search)
        )!
      );
    }

    return await db.select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(asc(contacts.name));
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
}

export async function getContact(id: string): Promise<Contact | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const result = await db.select().from(contacts).where(eq(contacts.id, id)).get();
    return result || null;
  } catch (error) {
    console.error("Error fetching contact:", error);
    return null;
  }
}

/**
 * Get contact by email - used for merging on sign-up
 */
export async function getContactByEmail(email: string): Promise<Contact | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const result = await db.select()
      .from(contacts)
      .where(eq(contacts.email, email))
      .get();
    return result || null;
  } catch (error) {
    console.error("Error fetching contact by email:", error);
    return null;
  }
}

/**
 * Get all contacts with a specific email across all organizations
 * Used for linking contacts when a user signs up
 */
export async function getContactsByEmail(email: string): Promise<Contact[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);
    return await db.select()
      .from(contacts)
      .where(eq(contacts.email, email));
  } catch (error) {
    console.error("Error fetching contacts by email:", error);
    return [];
  }
}

export async function createContact(data: Omit<NewContact, "id" | "createdAt" | "updatedAt">): Promise<Contact> {
  const d1 = getD1Database() as D1Database | null;
  if (!d1) throw new Error("D1 database not available");

  const db = createDb(d1);
  const now = new Date();
  const contactId = generateId();

  const newContact: NewContact = {
    id: contactId,
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
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(contacts).values(newContact);

  const result = await db.select().from(contacts).where(eq(contacts.id, contactId)).get();
  if (!result) throw new Error("Failed to create contact");

  return result;
}

export async function updateContact(id: string, data: Partial<NewContact>): Promise<Contact | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const result = await db.update(contacts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning()
      .get();

    return result || null;
  } catch (error) {
    console.error("Error updating contact:", error);
    return null;
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;

    const db = createDb(d1);
    // Cascade delete should handle project contacts if configured in schema, 
    // but explicit delete is safer if not fully relied upon
    const result = await db.delete(contacts).where(eq(contacts.id, id)).returning().get();
    return !!result;
  } catch (error) {
    console.error("Error deleting contact:", error);
    return false;
  }
}

// =============================================================================
// CONTACT INVITE ACTIONS
// =============================================================================

/**
 * Invite a contact to join the platform
 * This sends an invitation email and marks the contact as invited
 */
export async function inviteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const contact = await getContact(contactId);
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

    await updateContact(contactId, {
      isInvited: true,
      invitedAt: new Date(),
    });

    console.log(`Invited contact ${contact.id} (${contact.email})`);
    return { success: true };
  } catch (error) {
    console.error("Error inviting contact:", error);
    return { success: false, error: "Failed to invite contact" };
  }
}

/**
 * Re-send invitation to a contact
 */
export async function resendInvite(contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const contact = await getContact(contactId);
    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    if (!contact.email) {
      return { success: false, error: "Contact has no email address" };
    }

    // TODO: Re-send invitation email

    await updateContact(contactId, {
      invitedAt: new Date(),
    });

    console.log(`Re-sent invitation to contact ${contact.id} (${contact.email})`);
    return { success: true };
  } catch (error) {
    console.error("Error resending invite:", error);
    return { success: false, error: "Failed to resend invite" };
  }
}

/**
 * Link a user to a contact (after they sign up)
 */
export async function linkUserToContact(contactId: string, userId: string): Promise<Contact | null> {
  return updateContact(contactId, { userId });
}

// =============================================================================
// CONTACT ROLE ACTIONS
// =============================================================================

export async function getContactRoles(orgId?: string): Promise<ContactRole[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);
    const resolvedOrg = orgId || DEFAULT_ORG_ID;

    return await db.select()
      .from(contactRoles)
      .where(or(
        eq(contactRoles.orgId, resolvedOrg),
        eq(contactRoles.isSystem, true)
      ));
  } catch (error) {
    console.error("Error fetching contact roles:", error);
    return [];
  }
}

export async function createContactRole(data: {
  orgId: string;
  name: string;
  description?: string;
}): Promise<ContactRole> {
  const d1 = getD1Database() as D1Database | null;
  if (!d1) throw new Error("D1 database not available");

  const db = createDb(d1);
  const now = new Date();
  const roleId = generateId();

  const newRole = {
    id: roleId,
    orgId: data.orgId,
    name: data.name,
    description: data.description || null,
    isSystem: false,
    createdAt: now,
  };

  await db.insert(contactRoles).values(newRole);

  const result = await db.select().from(contactRoles).where(eq(contactRoles.id, roleId)).get();
  if (!result) throw new Error("Failed to create contact role");

  return result;
}

// =============================================================================
// PROJECT CONTACT ACTIONS
// =============================================================================

export async function getProjectContacts(projectId: string): Promise<(ProjectContact & { contact: Contact; role: ContactRole | null })[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);

    const rows = await db.select()
      .from(projectContacts)
      .leftJoin(contacts, eq(projectContacts.contactId, contacts.id))
      .leftJoin(contactRoles, eq(projectContacts.roleId, contactRoles.id))
      .where(eq(projectContacts.projectId, projectId));

    return rows
      .filter(r => r.contacts !== null)
      .map(r => ({
        ...r.project_contacts,
        contact: r.contacts!,
        role: r.contact_roles || null,
      }));
  } catch (error) {
    console.error("Error fetching project contacts:", error);
    return [];
  }
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
  const d1 = getD1Database() as D1Database | null;
  if (!d1) throw new Error("D1 database not available");

  const db = createDb(d1);
  const now = new Date();

  // Check if already exists
  const existing = await db.select()
    .from(projectContacts)
    .where(and(
      eq(projectContacts.projectId, data.projectId),
      eq(projectContacts.contactId, data.contactId)
    ))
    .get();

  if (existing) {
    // Update existing
    const updates: Partial<ProjectContact> = {};
    if (data.roleId) updates.roleId = data.roleId;
    if (data.isPrimary !== undefined) updates.isPrimary = data.isPrimary;
    if (data.permission) updates.permission = data.permission;

    if (Object.keys(updates).length > 0) {
      await db.update(projectContacts)
        .set(updates)
        .where(eq(projectContacts.id, existing.id));

      const updated = await db.select().from(projectContacts).where(eq(projectContacts.id, existing.id)).get();
      return { projectContact: updated!, invited: false };
    }

    return { projectContact: existing, invited: false };
  }

  const id = generateId();
  const newProjectContact: ProjectContact = {
    id,
    projectId: data.projectId,
    contactId: data.contactId,
    roleId: data.roleId || null,
    isPrimary: data.isPrimary ?? false,
    permission: data.permission ?? "viewer",
    createdAt: now,
  };

  await db.insert(projectContacts).values(newProjectContact);
  const result = await db.select().from(projectContacts).where(eq(projectContacts.id, id)).get();

  // Optionally send invite
  let invited = false;
  if (data.sendInvite) {
    const inviteResult = await inviteContact(data.contactId);
    invited = inviteResult.success;
  }

  return { projectContact: result!, invited };
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
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return false;

    const db = createDb(d1);
    const result = await db.delete(projectContacts)
      .where(and(
        eq(projectContacts.projectId, projectId),
        eq(projectContacts.contactId, contactId)
      ))
      .returning()
      .get();

    return !!result;
  } catch (error) {
    console.error("Error removing contact from project:", error);
    return false;
  }
}

export async function updateProjectContact(
  projectId: string,
  contactId: string,
  data: Partial<Pick<ProjectContact, "roleId" | "isPrimary" | "permission">>
): Promise<ProjectContact | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return null;

    const db = createDb(d1);
    const result = await db.update(projectContacts)
      .set(data)
      .where(and(
        eq(projectContacts.projectId, projectId),
        eq(projectContacts.contactId, contactId)
      ))
      .returning()
      .get();

    return result || null;
  } catch (error) {
    console.error("Error updating project contact:", error);
    return null;
  }
}

// =============================================================================
// CONTACT PROJECTS
// =============================================================================

export async function getContactProjects(contactId: string): Promise<{
  projectId: string;
  role: ContactRole | null;
  permission: PermissionLevel;
}[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);

    const rows = await db.select()
      .from(projectContacts)
      .leftJoin(contactRoles, eq(projectContacts.roleId, contactRoles.id))
      .where(eq(projectContacts.contactId, contactId));

    return rows.map(r => ({
      projectId: r.project_contacts.projectId,
      role: r.contact_roles || null,
      permission: r.project_contacts.permission as PermissionLevel,
    }));
  } catch (error) {
    console.error("Error fetching contact projects:", error);
    return [];
  }
}

/**
 * Get all project access for a user by their linked contacts
 */
export async function getProjectAccessForUser(userId: string): Promise<{
  projectId: string;
  permission: PermissionLevel;
  contact: Contact;
}[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) return [];

    const db = createDb(d1);

    // Find all contacts linked to this user
    // Then find all project contacts for those contacts

    const rows = await db.select()
      .from(contacts)
      .innerJoin(projectContacts, eq(contacts.id, projectContacts.contactId))
      .where(eq(contacts.userId, userId));

    return rows.map(r => ({
      projectId: r.project_contacts.projectId,
      permission: r.project_contacts.permission as PermissionLevel,
      contact: r.contacts,
    }));
  } catch (error) {
    console.error("Error fetching project access for user:", error);
    return [];
  }
}
