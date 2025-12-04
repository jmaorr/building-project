"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import type { User, UserType } from "@/lib/db/schema";

// Development mock user for when auth is bypassed
const DEV_MOCK_USER: User = {
  id: "dev-user-1",
  clerkId: "dev-user-1",
  email: "dev@example.com",
  firstName: "Dev",
  lastName: "User",
  avatarUrl: null,
  userType: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Get the current authenticated user
 * Returns a mock user in development if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      // In development, return a mock user when auth is bypassed
      if (process.env.NODE_ENV === "development") {
        return DEV_MOCK_USER;
      }
      return null;
    }

    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      // In development, return a mock user
      if (process.env.NODE_ENV === "development") {
        return DEV_MOCK_USER;
      }
      return null;
    }

    // Get userType from Clerk metadata if available
    const userType = (clerkUser.unsafeMetadata?.userType as UserType) || null;

    // TODO: Look up user in database by clerkId
    // For now, return a mock user based on Clerk data
    return {
      id: userId,
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      firstName: clerkUser.firstName || null,
      lastName: clerkUser.lastName || null,
      avatarUrl: clerkUser.imageUrl || null,
      userType,
      createdAt: new Date(clerkUser.createdAt),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    // In development, return a mock user even on error
    if (process.env.NODE_ENV === "development") {
      return DEV_MOCK_USER;
    }
    return null;
  }
}
