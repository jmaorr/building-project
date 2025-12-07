"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/get-db";
import { users } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";

/**
 * Get the current authenticated user from the database
 * Queries by Clerk ID and returns the actual database user record
 * Returns null if not authenticated or user not found
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // 1. Check Clerk authentication
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      console.log("getCurrentUser: No authenticated Clerk user");
      return null;
    }

    // 2. Get database connection
    const db = await getDb();
    if (!db) {
      console.error("getCurrentUser: Database not available");
      return null;
    }

    // 3. Query for user by Clerk ID
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .get();

    if (!dbUser) {
      console.log("getCurrentUser: User not found in database for clerkId:", clerkId);
      console.log("  This is normal on first login - user will be created by ensureUserHasOrg");
      return null;
    }

    console.log("getCurrentUser: Found user:", dbUser.id);
    return dbUser;
  } catch (error) {
    console.error("getCurrentUser: Error fetching user:", error);
    return null;
  }
}

/**
 * Get the current user's Clerk ID without database lookup
 * Useful for cases where you just need the auth identity
 */
export async function getCurrentClerkId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    console.error("getCurrentClerkId: Error getting Clerk ID:", error);
    return null;
  }
}

/**
 * Get the current Clerk user data (from Clerk, not our DB)
 * Useful for getting fresh profile data from Clerk
 */
export async function getCurrentClerkUser() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return null;
    }
    return await currentUser();
  } catch (error) {
    console.error("getCurrentClerkUser: Error fetching Clerk user:", error);
    return null;
  }
}
