import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, generateR2Path } from "@/lib/storage/r2";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getR2Bucket, getCloudflareEnv } from "@/lib/cloudflare/get-env";
import { createDb, files, users, type D1Database } from "@/lib/db";

// Development mock user ID
const DEV_USER_ID = "dev-user-1";

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const { userId: clerkUserId } = await auth();
    
    // In development, allow bypassing auth
    const userId = clerkUserId || (process.env.NODE_ENV === "development" ? DEV_USER_ID : null);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Cloudflare bindings
    const r2Bucket = await getR2Bucket();
    const env = await getCloudflareEnv();
    const dbBinding = env?.DB as D1Database | undefined;
    
    if (!dbBinding) {
      console.error("Database binding not available");
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const db = createDb(dbBinding);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string;
    const stageId = formData.get("stageId") as string | null;
    const costId = formData.get("costId") as string | null;
    const roundNumber = parseInt(formData.get("roundNumber") as string) || 1;

    if (!file || !projectId || (!stageId && !costId)) {
      return NextResponse.json(
        { error: "Missing required fields: need either stageId or costId" },
        { status: 400 }
      );
    }

    let publicUrl: string;

    if (r2Bucket) {
      // Upload to R2
      let r2Path: string;
      if (costId) {
        // For costs, use a different path structure
        const sanitizedFilename = file.name
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/\s+/g, "_");
        const timestamp = Date.now();
        r2Path = `projects/${projectId}/costs/${costId}/${timestamp}-${sanitizedFilename}`;
      } else if (stageId) {
        // For stages, use the existing path structure
        r2Path = generateR2Path(projectId, stageId, roundNumber, file.name);
      } else {
        throw new Error("Either stageId or costId must be provided");
      }
      publicUrl = await uploadToR2(file, r2Path, r2Bucket);
    } else {
      // Fallback: Use placeholder URL (for development or when R2 is not accessible)
      console.warn("R2 bucket not available, using placeholder URL");
      const identifier = costId || stageId || "";
      publicUrl = `/api/files/${identifier}/${Date.now()}-${file.name}`;
    }

    // Determine the user ID for the database
    let dbUserId = DEV_USER_ID;
    
    // If we have a real Clerk user, try to get/create them in the database
    if (clerkUserId) {
      try {
        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where((await import("drizzle-orm")).eq(users.clerkId, clerkUserId))
          .get();
        
        if (existingUser) {
          dbUserId = existingUser.id;
        } else {
          // Create user from Clerk data
          const clerkUserData = await currentUser();
          if (clerkUserData) {
            const newUserId = crypto.randomUUID();
            await db.insert(users).values({
              id: newUserId,
              clerkId: clerkUserData.id,
              email: clerkUserData.emailAddresses[0]?.emailAddress || "",
              firstName: clerkUserData.firstName || null,
              lastName: clerkUserData.lastName || null,
              avatarUrl: clerkUserData.imageUrl || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).run();
            dbUserId = newUserId;
          }
        }
      } catch (userError) {
        console.error("Error getting/creating user:", userError);
        // Fall back to dev user ID - this is okay, file upload can proceed
        // The user creation error is logged but doesn't block file upload
      }
    }

    // Save file metadata to database
    try {
      const fileId = crypto.randomUUID();
      const newFile = {
        id: fileId,
        stageId: stageId || null,
        moduleId: stageId || null, // Keep for backward compatibility
        costId: costId || null,
        name: file.name,
        url: publicUrl,
        type: file.type || null,
        size: file.size || null,
        category: null,
        roundNumber,
        uploadedBy: dbUserId,
        createdAt: new Date(),
      };

      console.log("Inserting file with data:", {
        id: fileId,
        stageId: newFile.stageId,
        costId: newFile.costId,
        name: newFile.name,
        url: newFile.url,
      });

      await db.insert(files).values(newFile).run();

      console.log("File inserted successfully:", fileId);

      return NextResponse.json({
        success: true,
        file: newFile,
      });
    } catch (dbError) {
      console.error("Database error during file upload:", dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : "Database error";
      
      // Check if this is a NOT NULL constraint error for stage_id
      if (errorMessage.includes("stage_id") || errorMessage.includes("NOT NULL")) {
        console.error("Database schema issue: stage_id is required but file is for a cost. Migration 0006_make_stage_id_nullable.sql needs to be applied.");
        return NextResponse.json(
          { 
            error: "Database schema error: stage_id constraint. Please apply migration 0006_make_stage_id_nullable.sql to make stage_id nullable for cost file attachments.",
            details: errorMessage,
            url: publicUrl
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "File uploaded but failed to save metadata", 
          details: errorMessage,
          url: publicUrl
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload file", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

