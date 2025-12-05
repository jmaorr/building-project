"use server";

import type { R2Bucket } from "./r2-types";

/**
 * Get R2 bucket instance from Cloudflare runtime
 * In Cloudflare Workers, the R2 binding is available via process.env.R2_BUCKET
 */
export async function getR2Bucket(): Promise<R2Bucket | null> {
  // In Cloudflare Workers, the R2 binding is available in the runtime
  // For now, we'll return null and use a fallback
  // TODO: Access R2 from Cloudflare runtime context
  const r2Binding = (globalThis as { R2_BUCKET?: R2Bucket }).R2_BUCKET;
  
  if (!r2Binding) {
    return null;
  }
  
  return r2Binding;
}

