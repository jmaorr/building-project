"use server";

import { eq } from "drizzle-orm";
import { users, organizations, organizationMembers, contacts, projectContacts, generateId, type User, type NewUser, type UserType } from "@/lib/db/schema";
import { getDb } from "@/lib/db/get-db";
import { currentUser, auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// =============================================================================
// CORE USER/ORG CREATION - Single source of truth
// =============================================================================

// In-memory mutex to prevent concurrent ensureUserHasOrg calls for the same user
const userOrgCreationLocks = new Map<string, Promise<{ user: User; orgId: string } | null>>();

/**
 * Ensure the current authenticated user exists in D1 with an organization.
 * This is THE single function that creates users and orgs.
 * It's idempotent - safe to call multiple times.
 * Uses an in-memory mutex to prevent race conditions from concurrent calls.
 * 
 * @param providedClerkId - Optional clerkId passed from caller (avoids auth context issues)
 * Returns: { user, orgId } or null if not authenticated or DB unavailable
 */
export async function ensureUserHasOrg(providedClerkId?: string): Promise<{ user: User; orgId: string } | null> {
  // 1. Check Clerk authentication first
  let clerkId = providedClerkId;
  if (!clerkId) {
    const authResult = await auth();
    clerkId = authResult.userId ?? undefined;
  }
  
  if (!clerkId) {
    console.log("ensureUserHasOrg: No Clerk user ID");
    return null;
  }

  // 2. Check if there's already a pending operation for this user
  const existingLock = userOrgCreationLocks.get(clerkId);
  if (existingLock) {
    console.log(`ensureUserHasOrg: Waiting for existing operation for user ${clerkId}`);
    return existingLock;
  }

  // 3. Create a new promise for this operation and store it in the map
  const operationPromise = ensureUserHasOrgInternal(clerkId);
  userOrgCreationLocks.set(clerkId, operationPromise);

  try {
    const result = await operationPromise;
    return result;
  } finally {
    // 4. Remove the lock after the operation completes (success or failure)
    userOrgCreationLocks.delete(clerkId);
  }
}

/**
 * Internal implementation of ensureUserHasOrg
 * This is the actual logic that runs protected by the mutex
 */
async function ensureUserHasOrgInternal(clerkId: string): Promise<{ user: User; orgId: string } | null> {
  try {
    // 1. Get Clerk user data (we'll need this for creating records)
    const clerkUser = await currentUser();
    if (!clerkUser) {
      console.error("ensureUserHasOrgInternal: Could not get Clerk user data for clerkId:", clerkId);
      return null;
    }

    // 2. Get database connection
    const db = await getDb();
    if (!db) {
      console.error("ensureUserHasOrgInternal: Database not available");
      return null;
    }

    // 3. Check if user already exists in D1
    let user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    // 4. Create user if doesn't exist
    if (!user) {
      const email = clerkUser.emailAddresses[0]?.emailAddress || "";
      const now = new Date();
      const userId = generateId();
      
      const newUser: NewUser = {
        id: userId,
        clerkId: clerkUser.id,
        email,
        firstName: clerkUser.firstName || null,
        lastName: clerkUser.lastName || null,
        avatarUrl: clerkUser.imageUrl || null,
        userType: null, // Will be set during onboarding
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(users).values(newUser).run();
      console.log(`ensureUserHasOrgInternal: Created user ${userId}`);
      
      // Fetch the created user to get the full record
      user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .get();
      
      if (!user) {
        console.error("ensureUserHasOrgInternal: Failed to fetch newly created user");
        return null;
      }

      // Link any existing contacts with this email
      await linkContactsToUser(db, user.id, email);
    }

    // 5. Check if user has an organization membership
    const membership = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id))
      .get();

    if (membership) {
      // User already has an org
      console.log(`ensureUserHasOrgInternal: User ${user.id} already has org ${membership.orgId}`);
      return { user, orgId: membership.orgId };
    }

    // 6. Create a personal organization for the user
    const now = new Date();
    const orgId = generateId();
    
    const orgName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}'s Organization`
      : user.firstName
      ? `${user.firstName}'s Organization`
      : `${user.email.split("@")[0]}'s Organization`;

    await db.insert(organizations).values({
      id: orgId,
      name: orgName,
      createdAt: now,
      updatedAt: now,
    }).run();

    await db.insert(organizationMembers).values({
      id: generateId(),
      orgId,
      userId: user.id,
      role: "owner",
      createdAt: now,
    }).run();

    console.log(`ensureUserHasOrgInternal: Created org ${orgId} for user ${user.id}`);
    return { user, orgId };

  } catch (error) {
    console.error("ensureUserHasOrgInternal error:", error);
    return null;
  }
}

/**
 * Link existing contacts with matching email to a user
 */
async function linkContactsToUser(db: Awaited<ReturnType<typeof getDb>>, userId: string, email: string): Promise<void> {
  if (!db || !email) return;
  
  try {
    const matchingContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email.toLowerCase()))
      .all();

    for (const contact of matchingContacts) {
      if (!contact.userId) {
        await db
          .update(contacts)
          .set({ userId, updatedAt: new Date() })
          .where(eq(contacts.id, contact.id))
          .run();
        console.log(`Linked contact ${contact.id} to user ${userId}`);
      }
    }
  } catch (error) {
    console.error("Error linking contacts to user:", error);
  }
}

// =============================================================================
// ONBOARDING - Only updates userType
// =============================================================================

/**
 * Complete onboarding by setting the user's type.
 * User and org must already exist (created by ensureUserHasOrg).
 */
export async function completeOnboarding(userType: UserType): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Not authenticated" };
    }

    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    // Find the user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    if (!user) {
      return { success: false, error: "User not found. Please refresh and try again." };
    }

    // Update userType
    await db
      .update(users)
      .set({
        userType,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();

    console.log(`completeOnboarding: Set userType to ${userType} for user ${user.id}`);
    
    revalidatePath("/");
    return { success: true };

  } catch (error) {
    console.error("completeOnboarding error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// =============================================================================
// USER QUERIES
// =============================================================================

/**
 * Get user by Clerk ID (read-only, doesn't create)
 */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;

  return await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .get() || null;
}

/**
 * Get current user with their org role
 */
export async function getCurrentUserWithOrg(): Promise<{
  user: User;
  orgId: string;
  orgRole: "owner" | "admin" | "member";
} | null> {
  const result = await ensureUserHasOrg();
  if (!result) return null;

  const db = await getDb();
  if (!db) return null;

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, result.user.id))
    .get();

  return {
    user: result.user,
    orgId: result.orgId,
    orgRole: (membership?.role as "owner" | "admin" | "member") || "member",
  };
}

/**
 * Get current user with their project access (via contacts)
 */
export async function getCurrentUserWithAccess(): Promise<{
  user: User;
  projectAccess: { projectId: string; permission: string }[];
} | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    const db = await getDb();
    if (!db) return null;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    if (!user) return null;

    // Get contacts linked to this user
    const userContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, user.id))
      .all();

    // Get project access through contacts
    const projectAccess: { projectId: string; permission: string }[] = [];

    for (const contact of userContacts) {
      const access = await db
        .select({
          projectId: projectContacts.projectId,
          permission: projectContacts.permission,
        })
        .from(projectContacts)
        .where(eq(projectContacts.contactId, contact.id))
        .all();

      projectAccess.push(...access);
    }

    return { user, projectAccess };
  } catch (error) {
    console.error("getCurrentUserWithAccess error:", error);
    return null;
  }
}

// =============================================================================
// USER PROFILE UPDATES
// =============================================================================

/**
 * Update user profile
 */
export async function updateUserProfile(data: Partial<{
  firstName: string;
  lastName: string;
  userType: UserType;
}>): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return { success: false, error: "Not authenticated" };
    }

    const db = await getDb();
    if (!db) {
      return { success: false, error: "Database not available" };
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

export async function getOrCreateUserFromClerk(clerkId: string): Promise<User | null> {
  // Just use ensureUserHasOrg and return the user
  const result = await ensureUserHasOrg();
  return result?.user || null;
}
