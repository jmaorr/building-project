/**
 * Cloudflare R2 Storage Utilities
 * 
 * R2 is accessed via the R2 binding in Cloudflare Workers.
 * The binding is available as env.R2_BUCKET in the runtime.
 */

import type { R2Bucket, R2ObjectBody } from "./r2-types";

export interface R2File {
  key: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

/**
 * Upload a file to R2
 * @param file - The file to upload (Browser File object)
 * @param path - The path/key in R2 (e.g., "projects/proj-1/stages/stage-1/round-1/filename.pdf")
 * @param r2Bucket - The R2 bucket binding from Cloudflare Workers
 * @returns The public URL of the uploaded file
 */
export async function uploadToR2(
  file: globalThis.File,
  path: string,
  r2Bucket: R2Bucket
): Promise<string> {
  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  
  // Upload to R2
  await r2Bucket.put(path, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate public URL using the configured R2 public domain
  // Public URL: https://pub-40b44376630a47f8b61281d3f09c8cbd.r2.dev
  const publicUrl = `https://pub-40b44376630a47f8b61281d3f09c8cbd.r2.dev/${path}`;
  
  return publicUrl;
}

/**
 * Delete a file from R2
 * @param path - The path/key in R2
 * @param r2Bucket - The R2 bucket binding from Cloudflare Workers
 */
export async function deleteFromR2(
  path: string,
  r2Bucket: R2Bucket
): Promise<void> {
  await r2Bucket.delete(path);
}

/**
 * Get a file from R2
 * @param path - The path/key in R2
 * @param r2Bucket - The R2 bucket binding from Cloudflare Workers
 * @returns The R2Object or null if not found
 */
export async function getFromR2(
  path: string,
  r2Bucket: R2Bucket
): Promise<R2ObjectBody | null> {
  const object = await r2Bucket.get(path);
  return object;
}

/**
 * Generate a unique file path for R2 storage
 * Format: projects/{projectId}/stages/{stageId}/rounds/{roundNumber}/{timestamp}-{filename}
 */
export function generateR2Path(
  projectId: string,
  stageId: string,
  roundNumber: number,
  filename: string
): string {
  // Sanitize filename to remove special characters
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/\s+/g, "_");
  
  const timestamp = Date.now();
  return `projects/${projectId}/stages/${stageId}/rounds/${roundNumber}/${timestamp}-${sanitizedFilename}`;
}

