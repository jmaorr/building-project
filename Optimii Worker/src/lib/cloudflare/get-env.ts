/**
 * Utility to access Cloudflare environment bindings in Next.js API routes
 * 
 * In OpenNext Cloudflare, bindings are available through the Cloudflare context
 * which is stored in AsyncLocalStorage and accessed via a Symbol.
 */

import type { R2Bucket } from "@/lib/storage/r2-types";

export function getCloudflareEnv(): { R2_BUCKET?: R2Bucket; DB?: unknown; [key: string]: unknown } | null {
  try {
    // Access Cloudflare context via Symbol (OpenNext pattern)
    const cloudflareContextSymbol = Symbol.for("__cloudflare-context__");
    const contextGetter = (globalThis as Record<symbol, unknown>)[cloudflareContextSymbol];
    
    // The context getter might be a function or a direct value
    const cloudflareContext = typeof contextGetter === "function" 
      ? contextGetter() 
      : contextGetter;
    
    return cloudflareContext?.env || null;
  } catch (error) {
    console.warn("Could not access Cloudflare context:", error);
    return null;
  }
}

export function getR2Bucket(): R2Bucket | null {
  const env = getCloudflareEnv();
  return env?.R2_BUCKET || null;
}

export function getD1Database(): unknown | null {
  const env = getCloudflareEnv();
  return env?.DB || null;
}

