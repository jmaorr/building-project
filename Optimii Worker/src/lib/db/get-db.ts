"use server";

import { createDb, type D1Database } from "./index";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Get D1 database instance from Cloudflare runtime
 * Uses the official OpenNext getCloudflareContext method
 */
export async function getDb() {
  try {
    // Use the official OpenNext method to get Cloudflare context
    const { env } = await getCloudflareContext({ async: true });
    
    // Cast env to access our custom bindings
    const dbBinding = (env as Record<string, unknown>)?.DB as D1Database | undefined;
    if (dbBinding) {
      return createDb(dbBinding);
    }
    
    console.error("Database binding not found in Cloudflare environment");
    return null;
  } catch (error) {
    console.error("Error accessing database:", error);
    return null;
  }
}
