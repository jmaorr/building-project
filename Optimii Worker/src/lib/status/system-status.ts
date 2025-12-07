"use server";

import { getD1Database } from "@/lib/cloudflare/get-env";

export interface SystemStatus {
  hasDatabase: boolean;
  hasClerk: boolean;
  warnings: string[];
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const dbBinding = await getD1Database();
  const hasDatabase = !!dbBinding;
  const hasClerk = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );

  const warnings: string[] = [];

  if (!hasDatabase) {
    warnings.push(
      "Cloudflare D1 is not configured. Data will not persist or load until the DB binding is set up."
    );
  }

  if (!hasClerk) {
    warnings.push(
      "Clerk environment keys are missing. Authentication is currently bypassed in development."
    );
  }

  return {
    hasDatabase,
    hasClerk,
    warnings,
  };
}
