import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@/components/layout";
import { CommandPalette } from "@/components/command-palette";
import { ensureUserHasOrg } from "@/lib/actions/users";

/**
 * Dashboard Layout
 * Ensures user is authenticated and has an organization before rendering
 * This is the single entry point for initializing user/org data
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Check Clerk authentication
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    console.log("DashboardLayout: No authenticated user, redirecting to sign-in");
    redirect("/sign-in");
  }

  // 2. Ensure user exists in D1 with an organization
  // This is idempotent and safe to call on every request
  // It will create user and org if they don't exist
  let result;
  try {
    result = await ensureUserHasOrg(clerkId);
  } catch (error) {
    console.error("DashboardLayout: Critical error in ensureUserHasOrg:", error);
    throw new Error(
      `Failed to initialize user organization: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
  
  if (!result) {
    console.error("DashboardLayout: ensureUserHasOrg returned null for clerkId:", clerkId);
    throw new Error(
      "Failed to initialize your account. This could be a database connectivity issue. Please try refreshing the page."
    );
  }

  console.log(`DashboardLayout: User ${result.user.id} authenticated with org ${result.orgId}`);

  // 3. User is fully set up - render dashboard
  return (
    <AppShell>
      {children}
      <CommandPalette />
    </AppShell>
  );
}
