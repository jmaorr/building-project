/**
 * Utility to access Cloudflare environment bindings in Next.js API routes
 * Uses the official OpenNext getCloudflareContext method
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket } from "@/lib/storage/r2-types";
import type { D1Database } from "@/lib/db";

// Our custom bindings that extend the base CloudflareEnv
interface CustomCloudflareEnv {
  DB?: D1Database;
  R2_BUCKET?: R2Bucket;
  [key: string]: unknown;
}

export async function getCloudflareEnv(): Promise<CustomCloudflareEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as CustomCloudflareEnv) || null;
  } catch (error) {
    console.warn("Could not access Cloudflare context:", error);
    return null;
  }
}

export async function getR2Bucket(): Promise<R2Bucket | null> {
  const env = await getCloudflareEnv();
  return env?.R2_BUCKET || null;
}

export async function getD1Database(): Promise<D1Database | null> {
  const env = await getCloudflareEnv();
  return env?.DB || null;
}
