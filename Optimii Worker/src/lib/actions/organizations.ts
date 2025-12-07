"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import {
    organizations,
    organizationMembers,
    orgInvites,
    users,
    projectTemplates,
    templatePhases,
    templateStages,
    generateId
} from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getSystemTemplates, getTemplate } from "@/lib/actions/templates";
import { getActiveOrganization, getActiveOrganizationSafe } from "@/lib/organizations/get-active-organization";
import { sendOrgInviteEmail } from "@/lib/email/send-invite";

/**
 * Create a new organization and copy system templates
 * Note: userType is optional - users automatically get an org via ensureUserHasOrg
 */
export async function createOrganization(data: {
    name: string;
    userType?: "owner" | "builder" | "architect" | "certifier"; // Optional - can be set later via tags
}) {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) throw new Error("Database not available");

        const user = await getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const db = createDb(d1);
        const now = new Date();

        // 1. Update User Type if provided and not already set
        if (data.userType && !user.userType) {
            await db.update(users)
                .set({ userType: data.userType, updatedAt: now })
                .where(eq(users.id, user.id));
        }

        // 2. Create Organization
        const orgId = generateId();
        await db.insert(organizations).values({
            id: orgId,
            name: data.name,
            createdAt: now,
            updatedAt: now,
        });

        // 3. Add User as Owner
        await db.insert(organizationMembers).values({
            id: generateId(),
            orgId,
            userId: user.id,
            role: "owner",
            createdAt: now,
        });

        // 4. Copy System Templates
        const systemTemplates = await getSystemTemplates();

        for (const sysTemplate of systemTemplates) {
            // Get full template details including phases and modules
            const fullTemplate = await getTemplate(sysTemplate.id);
            if (!fullTemplate) continue;

            const newTemplateId = generateId();

            // Create Template Copy
            await db.insert(projectTemplates).values({
                id: newTemplateId,
                orgId,
                name: sysTemplate.name,
                description: sysTemplate.description,
                isDefault: sysTemplate.isDefault,
                isSystem: false,
                createdAt: now,
            });

            // Copy Phases
            for (const phase of fullTemplate.phases) {
                const newPhaseId = generateId();
                await db.insert(templatePhases).values({
                    id: newPhaseId,
                    templateId: newTemplateId,
                    name: phase.name,
                    description: phase.description,
                    order: phase.order,
                    createdAt: now,
                });

                // Copy Modules (Stages)
                for (const templateModule of phase.modules) {
                    await db.insert(templateStages).values({
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
        }

        revalidatePath("/settings");
        return { success: true, orgId };
    } catch (error) {
        console.error("Failed to create organization:", error);
        return { success: false, error: "Failed to create organization" };
    }
}

// =============================================================================
// ORG INVITE ACTIONS
// =============================================================================

/**
 * Invite a user to join the current organization
 */
export async function inviteUserToOrg(data: {
    email: string;
    role?: "admin" | "member";
}): Promise<{ success: boolean; error?: string }> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return { success: false, error: "Database not available" };

        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Not authenticated" };

        const activeOrg = await getActiveOrganizationSafe();
        if (!activeOrg) return { success: false, error: "No active organization" };

        const db = createDb(d1);

        // Check if user is admin/owner of the org
        const membership = await db.select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.orgId, activeOrg.id),
                eq(organizationMembers.userId, user.id)
            ))
            .get();

        if (!membership || membership.role === "member") {
            return { success: false, error: "Only admins can invite users" };
        }

        // Check if invite already exists
        const existingInvite = await db.select()
            .from(orgInvites)
            .where(and(
                eq(orgInvites.orgId, activeOrg.id),
                eq(orgInvites.email, data.email.toLowerCase())
            ))
            .get();

        if (existingInvite && !existingInvite.acceptedAt) {
            return { success: false, error: "An invite has already been sent to this email" };
        }

        // Check if user is already a member
        const existingUser = await db.select()
            .from(users)
            .where(eq(users.email, data.email.toLowerCase()))
            .get();

        if (existingUser) {
            const existingMembership = await db.select()
                .from(organizationMembers)
                .where(and(
                    eq(organizationMembers.orgId, activeOrg.id),
                    eq(organizationMembers.userId, existingUser.id)
                ))
                .get();

            if (existingMembership) {
                return { success: false, error: "This user is already a member" };
            }
        }

        // Create invite (expires in 7 days)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const inviteId = generateId();
        await db.insert(orgInvites).values({
            id: inviteId,
            orgId: activeOrg.id,
            email: data.email.toLowerCase(),
            role: data.role || "member",
            invitedBy: user.id,
            invitedAt: new Date(),
            expiresAt,
        });

        // Send invite email
        const inviterName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.email;
        
        try {
            await sendOrgInviteEmail({
                to: data.email.toLowerCase(),
                inviterName,
                orgName: activeOrg.name,
                role: data.role || "member",
                inviteId,
            });
        } catch (emailError) {
            console.error("Failed to send invite email:", emailError);
            // Don't fail the invite if email fails - invite is still in DB
        }

        revalidatePath("/settings/team");
        return { success: true };
    } catch (error) {
        console.error("Error inviting user:", error);
        return { success: false, error: "Failed to send invite" };
    }
}

/**
 * Accept an org invite (called when user signs up or logs in)
 */
export async function acceptOrgInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return { success: false, error: "Database not available" };

        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Not authenticated" };

        const db = createDb(d1);
        const now = new Date();

        // Get the invite
        const invite = await db.select()
            .from(orgInvites)
            .where(eq(orgInvites.id, inviteId))
            .get();

        if (!invite) {
            return { success: false, error: "Invite not found" };
        }

        if (invite.acceptedAt) {
            return { success: false, error: "Invite already accepted" };
        }

        if (invite.expiresAt && new Date(invite.expiresAt) < now) {
            return { success: false, error: "Invite has expired" };
        }

        // Verify email matches
        if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
            return { success: false, error: "This invite is for a different email address" };
        }

        // Add user to org
        await db.insert(organizationMembers).values({
            id: generateId(),
            orgId: invite.orgId,
            userId: user.id,
            role: invite.role,
            createdAt: now,
        });

        // Mark invite as accepted
        await db.update(orgInvites)
            .set({ acceptedAt: now })
            .where(eq(orgInvites.id, inviteId));

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Error accepting invite:", error);
        return { success: false, error: "Failed to accept invite" };
    }
}

/**
 * Get pending invites for the current user's email
 */
export async function getPendingOrgInvites(): Promise<{ id: string; orgName: string; role: string; invitedAt: Date }[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const user = await getCurrentUser();
        if (!user) return [];

        const db = createDb(d1);

        const invites = await db.select({
            id: orgInvites.id,
            orgId: orgInvites.orgId,
            role: orgInvites.role,
            invitedAt: orgInvites.invitedAt,
        })
            .from(orgInvites)
            .where(and(
                eq(orgInvites.email, user.email.toLowerCase()),
                eq(orgInvites.acceptedAt, null as unknown as Date)
            ));

        // Get org names
        const results = [];
        for (const invite of invites) {
            const org = await db.select({ name: organizations.name })
                .from(organizations)
                .where(eq(organizations.id, invite.orgId))
                .get();

            results.push({
                id: invite.id,
                orgName: org?.name || "Unknown",
                role: invite.role,
                invitedAt: invite.invitedAt,
            });
        }

        return results;
    } catch (error) {
        console.error("Error getting pending invites:", error);
        return [];
    }
}

/**
 * Get org members
 */
export async function getOrgMembers(): Promise<{ id: string; userId: string; name: string; email: string; role: string }[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const activeOrg = await getActiveOrganizationSafe();
        if (!activeOrg) return [];

        const db = createDb(d1);

        const members = await db.select({
            id: organizationMembers.id,
            userId: organizationMembers.userId,
            role: organizationMembers.role,
        })
            .from(organizationMembers)
            .where(eq(organizationMembers.orgId, activeOrg.id));

        // Get user details
        const results = [];
        for (const member of members) {
            const userData = await db.select({
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
            })
                .from(users)
                .where(eq(users.id, member.userId))
                .get();

            results.push({
                id: member.id,
                userId: member.userId,
                name: userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email : 'Unknown',
                email: userData?.email || '',
                role: member.role,
            });
        }

        return results;
    } catch (error) {
        console.error("Error getting org members:", error);
        return [];
    }
}

/**
 * Get pending org invites (for team page)
 */
export async function getOrgPendingInvites(): Promise<{ id: string; email: string; role: string; invitedAt: Date }[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const activeOrg = await getActiveOrganizationSafe();
        if (!activeOrg) return [];

        const db = createDb(d1);

        const invites = await db.select({
            id: orgInvites.id,
            email: orgInvites.email,
            role: orgInvites.role,
            invitedAt: orgInvites.invitedAt,
        })
            .from(orgInvites)
            .where(and(
                eq(orgInvites.orgId, activeOrg.id),
                eq(orgInvites.acceptedAt, null as unknown as Date)
            ));

        return invites;
    } catch (error) {
        console.error("Error getting pending invites:", error);
        return [];
    }
}

/**
 * Remove a member from the organization
 */
export async function removeOrgMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return { success: false, error: "Database not available" };

        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Not authenticated" };

        const activeOrg = await getActiveOrganizationSafe();
        if (!activeOrg) return { success: false, error: "No active organization" };

        const db = createDb(d1);

        // Check if current user is admin/owner
        const currentMembership = await db.select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.orgId, activeOrg.id),
                eq(organizationMembers.userId, user.id)
            ))
            .get();

        if (!currentMembership || currentMembership.role === "member") {
            return { success: false, error: "Only admins can remove members" };
        }

        // Get the member to remove
        const memberToRemove = await db.select()
            .from(organizationMembers)
            .where(eq(organizationMembers.id, memberId))
            .get();

        if (!memberToRemove) {
            return { success: false, error: "Member not found" };
        }

        // Prevent removing the last owner
        if (memberToRemove.role === "owner") {
            const owners = await db.select()
                .from(organizationMembers)
                .where(and(
                    eq(organizationMembers.orgId, activeOrg.id),
                    eq(organizationMembers.role, "owner")
                ));

            if (owners.length <= 1) {
                return { success: false, error: "Cannot remove the last owner" };
            }
        }

        await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));

        revalidatePath("/settings/team");
        return { success: true };
    } catch (error) {
        console.error("Error removing member:", error);
        return { success: false, error: "Failed to remove member" };
    }
}

/**
 * Cancel a pending invite
 */
export async function cancelOrgInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return { success: false, error: "Database not available" };

        const user = await getCurrentUser();
        if (!user) return { success: false, error: "Not authenticated" };

        const activeOrg = await getActiveOrganizationSafe();
        if (!activeOrg) return { success: false, error: "No active organization" };

        const db = createDb(d1);

        // Check if user is admin
        const membership = await db.select()
            .from(organizationMembers)
            .where(and(
                eq(organizationMembers.orgId, activeOrg.id),
                eq(organizationMembers.userId, user.id)
            ))
            .get();

        if (!membership || membership.role === "member") {
            return { success: false, error: "Only admins can cancel invites" };
        }

        // Verify invite belongs to this org
        const invite = await db.select()
            .from(orgInvites)
            .where(eq(orgInvites.id, inviteId))
            .get();

        if (!invite || invite.orgId !== activeOrg.id) {
            return { success: false, error: "Invite not found" };
        }

        await db.delete(orgInvites).where(eq(orgInvites.id, inviteId));

        revalidatePath("/settings/team");
        return { success: true };
    } catch (error) {
        console.error("Error canceling invite:", error);
        return { success: false, error: "Failed to cancel invite" };
    }
}
