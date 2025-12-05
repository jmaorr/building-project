"use server";

import { eq, and, desc, or } from "drizzle-orm";
import { files, stages, generateId, type File, type NewFile } from "@/lib/db/schema";
import { getDb } from "@/lib/db/get-db";
import type { R2Bucket } from "@/lib/storage/r2-types";

// =============================================================================
// FILE ACTIONS
// =============================================================================

export async function getFilesByStage(
  stageId: string,
  roundNumber?: number
): Promise<File[]> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return [];
  }

  const conditions = [eq(files.stageId, stageId)];
  
  if (roundNumber !== undefined) {
    conditions.push(eq(files.roundNumber, roundNumber));
  }

  const result = await db
    .select()
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.createdAt))
    .all();
  
  return result;
}

/**
 * Get all files from all stages in a phase
 */
export async function getFilesByPhase(phaseId: string): Promise<File[]> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return [];
  }

  // Get all stages in the phase first
  const phaseStages = await db
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.phaseId, phaseId))
    .all();

  if (phaseStages.length === 0) {
    return [];
  }

  const stageIds = phaseStages.map(s => s.id);
  
  // Get all files from these stages (using OR conditions)
  const stageConditions = stageIds.map(id => eq(files.stageId, id));
  const result = await db
    .select()
    .from(files)
    .where(or(...stageConditions))
    .orderBy(desc(files.createdAt))
    .all();
  
  return result;
}

export async function getFile(id: string): Promise<File | null> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return null;
  }
  const result = await db.select().from(files).where(eq(files.id, id)).get();
  return result || null;
}

export async function uploadFile(
  stageId: string,
  file: {
    name: string;
    url: string;
    type?: string;
    size?: number;
    category?: string;
  },
  roundNumber: number = 1,
  uploadedBy: string
): Promise<File> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available.");
  }

  const newFile: NewFile = {
    id: generateId(),
    stageId,
    moduleId: stageId, // Keep for backward compatibility
    name: file.name,
    url: file.url,
    type: file.type || null,
    size: file.size || null,
    category: file.category || null,
    roundNumber,
    uploadedBy,
    createdAt: new Date(),
  };

  await db.insert(files).values(newFile).run();
  return newFile as File;
}

/**
 * Upload file from FormData to R2
 * @param projectId - The project ID (needed for R2 path generation)
 * @param stageId - The stage ID
 * @param formData - FormData containing the file
 * @param roundNumber - The round number (default: 1)
 * @param uploadedBy - User ID who uploaded the file
 */
export async function uploadFileFromFormData(
  projectId: string,
  stageId: string,
  formData: FormData,
  roundNumber: number = 1,
  uploadedBy: string
): Promise<File> {
  const browserFile = formData.get("file") as globalThis.File | null;
  
  if (!browserFile) {
    throw new Error("No file provided");
  }

  // Get R2 bucket from runtime
  const r2Bucket = await getR2Bucket();
  
  let url: string;
  
  if (r2Bucket) {
    // Upload to R2
    // Import R2 utilities dynamically to avoid issues in non-Cloudflare environments
    const { uploadToR2, generateR2Path } = await import("@/lib/storage/r2");
    const r2Path = generateR2Path(projectId, stageId, roundNumber, browserFile.name);
    url = await uploadToR2(browserFile, r2Path, r2Bucket);
  } else {
    // Fallback: Use placeholder URL (for development or when R2 is not available)
    console.warn("R2 bucket not available, using placeholder URL");
    url = `/api/files/${stageId}/${Date.now()}-${browserFile.name}`;
  }

  return uploadFile(
    stageId,
    {
      name: browserFile.name,
      url: url,
      type: browserFile.type || undefined,
      size: browserFile.size || undefined,
    },
    roundNumber,
    uploadedBy
  );
}

/**
 * Get R2 bucket from Cloudflare runtime
 * This is a helper function to access R2 in server actions
 */
async function getR2Bucket(): Promise<R2Bucket | null> {
  // In Cloudflare Workers, R2 is available via env.R2_BUCKET
  // For Next.js server actions, we need to access it differently
  // This will be available in the Cloudflare runtime context
  const r2Binding = (globalThis as { R2_BUCKET?: R2Bucket }).R2_BUCKET;
  return r2Binding || null;
}

export async function deleteFile(id: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return false;
  }

  const fileToDelete = await getFile(id);
  if (!fileToDelete) return false;

  // Delete from R2 if URL indicates it's stored in R2
  if (fileToDelete.url && (fileToDelete.url.includes("r2.dev") || fileToDelete.url.includes("r2.cloudflarestorage.com") || fileToDelete.url.includes("pub-40b44376630a47f8b61281d3f09c8cbd"))) {
    try {
      const r2Bucket = await getR2Bucket();
      if (r2Bucket) {
        // Import R2 utilities dynamically
        const { deleteFromR2 } = await import("@/lib/storage/r2");
        // Extract path from URL (e.g., https://pub-xxx.r2.dev/path/to/file.jpg)
        const urlPath = fileToDelete.url.split(".r2.dev/")[1];
        if (urlPath) {
          await deleteFromR2(urlPath, r2Bucket);
        }
      }
    } catch (error) {
      console.error("Failed to delete file from R2:", error);
      // Continue with database deletion even if R2 deletion fails
    }
  }

  const result = await db.delete(files).where(eq(files.id, id)).run();
  return result.changes > 0;
}

export async function updateFile(
  id: string,
  data: Partial<NewFile>
): Promise<File | null> {
  const db = await getDb();
  if (!db) {
    console.error("Database not available.");
    return null;
  }
  await db.update(files).set(data).where(eq(files.id, id)).run();
  return getFile(id);
}

