"use server";

import { eq } from "drizzle-orm";
import { users, contacts, projectContacts, generateId, type User, type NewUser, type UserType } from "@/lib/db/schema";
import { getDb } from "@/lib/db/get-db";
import { currentUser, auth } from "@clerk/nextjs/server";

/**
 * Get or create a user from Clerk ID
 * This ensures the user exists in our database before we reference them
 */
export async function getOrCreateUserFromClerk(clerkId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return null;
  }

  // Try to find existing user by clerkId
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .get();

  if (existingUser) {
    return existingUser;
  }

  // User doesn't exist, create one from Clerk data
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkId) {
    console.error("Clerk user not found or ID mismatch");
    return null;
  }

  const userType = (clerkUser.unsafeMetadata?.userType as UserType) || null;

  const newUser: NewUser = {
    id: generateId(),
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    avatarUrl: clerkUser.imageUrl || null,
    userType,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(newUser).run();

  // Merge contacts with matching email
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (email) {
    await mergeContactsForUser(newUser.id!, email);
  }

  return newUser as User;
}

/**
 * Get user by Clerk ID
 */
export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .get();

  return user || null;
}

/**
 * Complete onboarding by setting user type
 * This is called from the onboarding page after signup
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

    // Get the user from our database
    let user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    // If user doesn't exist, create them
    if (!user) {
      const newUser = await getOrCreateUserFromClerk(clerkId);
      if (!newUser) {
        return { success: false, error: "Failed to create user" };
      }
      user = newUser;
    }

    // Update user type
    await db
      .update(users)
      .set({
        userType,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .run();

    // Get user's email and merge contacts
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress;
    if (email) {
      await mergeContactsForUser(user.id, email);
    }

    return { success: true };
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Merge contacts with matching email to a user
 * This links existing contacts to the user so they inherit project access
 */
async function mergeContactsForUser(userId: string, email: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available for contact merge");
    return;
  }

  try {
    // Find all contacts with this email that aren't already linked to a user
    const matchingContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email))
      .all();

    for (const contact of matchingContacts) {
      if (!contact.userId) {
        // Link the contact to the user
        await db
          .update(contacts)
          .set({
            userId,
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contact.id))
          .run();

        console.log(`Linked contact ${contact.id} to user ${userId}`);
      }
    }
  } catch (error) {
    console.error("Error merging contacts:", error);
  }
}

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

    return { success: true };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get the current user with their project access
 */
export async function getCurrentUserWithAccess(): Promise<{
  user: User;
  projectAccess: { projectId: string; permission: string }[];
} | null> {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return null;
    }

    const db = await getDb();
    if (!db) {
      return null;
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    if (!user) {
      return null;
    }

    // Get all contacts linked to this user
    const userContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, user.id))
      .all();

    // Get project access through those contacts
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
    console.error("Error getting current user with access:", error);
    return null;
  }
}

