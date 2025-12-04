"use server";

import { createDb, type D1Database } from "./index";
import { getCloudflareEnv } from "@/lib/cloudflare/get-env";

/**
 * Get D1 database instance from Cloudflare runtime
 * In Cloudflare Workers, the DB binding is available via the Cloudflare context
 */
export async function getDb() {
  try {
    // Try using the centralized getCloudflareEnv utility first
    const env = getCloudflareEnv();
    const dbBinding = env?.DB as D1Database | undefined;
    
    if (dbBinding) {
      return createDb(dbBinding);
    }
    
    // Fallback: try direct access via Symbol
    const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
    const contextGetter = (globalThis as any)[cloudflareContextSymbol];
    const cloudflareContext = typeof contextGetter === "function" 
      ? contextGetter() 
      : contextGetter;
    
    const fallbackBinding = cloudflareContext?.env?.DB as D1Database | undefined;
    
    if (fallbackBinding) {
      return createDb(fallbackBinding);
    }
    
    // Last resort: try direct global access
    const directBinding = (globalThis as any).DB as D1Database | undefined;
    if (directBinding) {
      return createDb(directBinding);
    }
    
    console.error("Database not available - no bindings found");
    return null;
  } catch (error) {
    console.error("Error accessing database:", error);
    return null;
  }
}

