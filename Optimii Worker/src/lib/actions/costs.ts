"use server";

import { eq, and, desc, isNull, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { costs, files, phases, stages, projects, users, contacts, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Cost, NewCost, File as FileType } from "@/lib/db/schema";

// Extended type with files
export type CostWithFiles = Cost & {
  files: FileType[];
  stageName?: string;
};

// =============================================================================
// COST CRUD ACTIONS
// =============================================================================

/**
 * Get all costs for a project
 */
export async function getCostsByProject(projectId: string): Promise<CostWithFiles[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return [];
    }
    
    const db = createDb(d1);
    const costsList = await db.select()
      .from(costs)
      .where(eq(costs.projectId, projectId))
      .orderBy(desc(costs.createdAt));
    
    // Get files for each cost
    const costsWithFiles = await Promise.all(
      costsList.map(async (cost) => {
        const costFiles = await db.select()
          .from(files)
          .where(eq(files.costId, cost.id));
        return { ...cost, files: costFiles };
      })
    );
    
    return costsWithFiles;
  } catch (error) {
    console.error("Error fetching costs by project:", error);
    return [];
  }
}

/**
 * Get all costs for a phase (including stage-linked costs)
 */
export async function getCostsByPhase(phaseId: string): Promise<CostWithFiles[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return [];
    }
    
    const db = createDb(d1);
    const costsList = await db.select()
      .from(costs)
      .where(eq(costs.phaseId, phaseId))
      .orderBy(desc(costs.createdAt));
    
    // Get files for each cost
    const costsWithFiles = await Promise.all(
      costsList.map(async (cost) => {
        const costFiles = await db.select()
          .from(files)
          .where(eq(files.costId, cost.id));
        return { ...cost, files: costFiles };
      })
    );
    
    return costsWithFiles;
  } catch (error) {
    console.error("Error fetching costs by phase:", error);
    return [];
  }
}

/**
 * Get costs for a specific stage
 */
export async function getCostsByStage(stageId: string): Promise<CostWithFiles[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      return [];
    }
    
    const db = createDb(d1);
    const costsList = await db.select()
      .from(costs)
      .where(eq(costs.stageId, stageId))
      .orderBy(desc(costs.createdAt));
    
    // Get files for each cost
    const costsWithFiles = await Promise.all(
      costsList.map(async (cost) => {
        const costFiles = await db.select()
          .from(files)
          .where(eq(files.costId, cost.id));
        return { ...cost, files: costFiles };
      })
    );
    
    return costsWithFiles;
  } catch (error) {
    console.error("Error fetching costs by stage:", error);
    return [];
  }
}

/**
 * Get a single cost by ID with files
 */
export async function getCost(id: string): Promise<CostWithFiles | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) return null;
    
    const db = createDb(d1);
    const results = await db.select()
      .from(costs)
      .where(eq(costs.id, id));
    
    if (results.length === 0) return null;
    
    const cost = results[0];
    const costFiles = await db.select()
      .from(files)
      .where(eq(files.costId, cost.id));
    
    return { ...cost, files: costFiles };
  } catch (error) {
    console.error("Error fetching cost:", error);
    return null;
  }
}

/**
 * Create a new cost
 */
/**
 * Create a new cost entry
 * 
 * REQUIRED FIELDS:
 * - projectId: The project this cost belongs to
 * - name: The name/description of the cost (e.g., "Electrical Work", "Permit Fees")
 * 
 * OPTIONAL FIELDS:
 * - phaseId: Link to a specific phase (if provided, must exist in database)
 * - stageId: Link to a specific stage (if provided, must exist in database)
 * - description: Additional details about the cost
 * - category: Category of the cost (e.g., "Labor", "Materials", "Permits")
 * - quotedAmount: Initial quote/estimate amount
 * - actualAmount: Actual cost when known
 * - vendorContactId: Link to a contact as the vendor
 * - vendorName: Vendor name (if not using a contact)
 * - notes: Internal notes about this cost
 * - createdBy: User ID who created this cost
 */
export async function createCost(data: {
  projectId: string;
  phaseId?: string;
  stageId?: string;
  name: string;
  description?: string;
  category?: string;
  quotedAmount?: number;
  actualAmount?: number;
  vendorContactId?: string;
  vendorName?: string;
  notes?: string;
  createdBy?: string;
}): Promise<Cost> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      const error = "D1 database not available";
      console.error(error);
      throw new Error(error);
    }
    
    const db = createDb(d1);
    const now = new Date();
    
    // Validate required fields
    if (!data.projectId) {
      const error = "Missing required field: projectId";
      console.error(error);
      throw new Error(error);
    }
    
    if (!data.name || !data.name.trim()) {
      const error = "Missing required field: name";
      console.error(error);
      throw new Error(error);
    }
    
    // Validate that project, phase, and stage exist before attempting insert
    // This provides better error messages than database constraints
    console.log("Validating references before insert...");
    const projectCheck = await db.select().from(projects).where(eq(projects.id, data.projectId)).get();
    console.log("Project check result:", projectCheck ? `Found: ${projectCheck.name}` : "NOT FOUND");
    if (!projectCheck) {
      const error = `Cannot create cost: Project ${data.projectId} does not exist in the database.`;
      console.error(error);
      throw new Error(error);
    }
    
    if (data.phaseId) {
      const phaseCheck = await db.select().from(phases).where(eq(phases.id, data.phaseId)).get();
      console.log("Phase check result:", phaseCheck ? `Found: ${phaseCheck.name}` : "NOT FOUND");
      if (!phaseCheck) {
        const error = `Cannot create cost: Phase ${data.phaseId} does not exist in the database.`;
        console.error(error);
        throw new Error(error);
      }
    }
    
    if (data.stageId) {
      const stageCheck = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
      console.log("Stage check result:", stageCheck ? `Found: ${stageCheck.name}` : "NOT FOUND");
      if (!stageCheck) {
        const error = `Cannot create cost: Stage ${data.stageId} does not exist in the database.`;
        console.error(error);
        throw new Error(error);
      }
    }
    // Validate createdBy user exists if provided
    let createdByUserId: string | null = null;
    if (data.createdBy) {
      const userCheck = await db.select().from(users).where(eq(users.id, data.createdBy)).get();
      if (userCheck) {
        createdByUserId = data.createdBy;
        console.log("User check result: Found:", userCheck.email);
      } else {
        console.warn(`User ${data.createdBy} does not exist in database, setting createdBy to null`);
        createdByUserId = null;
      }
    }
    
    // Validate vendorContactId if provided
    let vendorContactIdValue: string | null = null;
    if (data.vendorContactId) {
      const contactCheck = await db.select().from(contacts).where(eq(contacts.id, data.vendorContactId)).get();
      if (contactCheck) {
        vendorContactIdValue = data.vendorContactId;
        console.log("Contact check result: Found:", contactCheck.name || contactCheck.email);
      } else {
        console.warn(`Contact ${data.vendorContactId} does not exist in database, setting vendorContactId to null`);
        vendorContactIdValue = null;
      }
    }
    
    console.log("All references validated successfully");
    
    const costId = generateId();
    
    const newCost: NewCost = {
      id: costId,
      projectId: data.projectId,
      phaseId: data.phaseId || null,
      stageId: data.stageId || null,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      category: data.category || null,
      quotedAmount: data.quotedAmount ?? null,
      actualAmount: data.actualAmount ?? null,
      paidAmount: 0,
      paymentStatus: "not_started",
      vendorContactId: vendorContactIdValue,
      vendorName: data.vendorName?.trim() || null,
      paymentMethod: null,
      paidAt: null,
      notes: data.notes?.trim() || null,
      createdBy: createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    
    // Insert the cost
    try {
      console.log("Attempting to insert cost with data:", {
        id: costId,
        projectId: newCost.projectId,
        phaseId: newCost.phaseId,
        stageId: newCost.stageId,
        name: newCost.name,
        quotedAmount: newCost.quotedAmount,
        actualAmount: newCost.actualAmount,
        createdAt: newCost.createdAt,
        updatedAt: newCost.updatedAt,
      });
      
      const insertResult = await db.insert(costs).values(newCost);
      console.log("Insert result:", insertResult);
      console.log("Cost inserted successfully, ID:", costId);
    } catch (insertError) {
      console.error("=== COST INSERT ERROR ===");
      console.error("Failed to insert cost:", insertError);
      console.error("Error type:", typeof insertError);
      console.error("Error constructor:", insertError?.constructor?.name);
      
      // Try to extract all error information
      let errorDetails: any = {};
      if (insertError instanceof Error) {
        errorDetails = {
          name: insertError.name,
          message: insertError.message,
          stack: insertError.stack,
          cause: (insertError as any).cause,
        };
        // Try to get additional properties
        Object.keys(insertError).forEach(key => {
          errorDetails[key] = (insertError as any)[key];
        });
      } else {
        errorDetails = { raw: String(insertError) };
      }
      
      console.error("Full error details:", JSON.stringify(errorDetails, null, 2));
      
      // Try to get the actual SQLite error code/message
      // Drizzle errors might wrap the actual D1 error
      let actualError = insertError;
      if ((insertError as any).cause) {
        console.error("Error has cause property:", (insertError as any).cause);
        actualError = (insertError as any).cause;
      }
      if ((insertError as any).error) {
        console.error("Error has error property:", (insertError as any).error);
        actualError = (insertError as any).error;
      }
      
      // Log the actual error message we'll use
      const actualErrorMessage = actualError instanceof Error ? actualError.message : String(actualError);
      console.error("Actual error message to check:", actualErrorMessage);
      
      let errorMessage = "Failed to create cost";
      
      if (insertError instanceof Error) {
        // Check for common constraint violations
        const errorMsg = actualErrorMessage.toLowerCase();
        const fullErrorText = JSON.stringify(errorDetails).toLowerCase();
        const combinedErrorText = errorMsg + " " + fullErrorText;
        
        if (combinedErrorText.includes("foreign key") || combinedErrorText.includes("constraint failed") || combinedErrorText.includes("sqlite_error")) {
          console.error("Foreign key constraint failed. This usually means:");
          console.error("- The project, phase, or stage doesn't exist in the database");
          console.error("- Project ID:", data.projectId);
          console.error("- Phase ID:", data.phaseId || "none");
          console.error("- Stage ID:", data.stageId || "none");
          
          // Try to check what exists
          let projectExists = false;
          let phaseExists = false;
          let stageExists = false;
          
          try {
            const projectCheck = await db.select().from(projects).where(eq(projects.id, data.projectId)).get();
            projectExists = !!projectCheck;
            console.error("- Project exists in DB:", projectExists);
            
            if (data.phaseId) {
              const phaseCheck = await db.select().from(phases).where(eq(phases.id, data.phaseId)).get();
              phaseExists = !!phaseCheck;
              console.error("- Phase exists in DB:", phaseExists);
            }
            
            if (data.stageId) {
              const stageCheck = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
              stageExists = !!stageCheck;
              console.error("- Stage exists in DB:", stageExists);
            }
          } catch (checkError) {
            console.error("Could not verify references:", checkError);
          }
          
          // Build descriptive error message
          const missingRefs: string[] = [];
          if (!projectExists) missingRefs.push(`Project ${data.projectId}`);
          if (data.phaseId && !phaseExists) missingRefs.push(`Phase ${data.phaseId}`);
          if (data.stageId && !stageExists) missingRefs.push(`Stage ${data.stageId}`);
          
          if (missingRefs.length > 0) {
            errorMessage = `Cannot create cost: ${missingRefs.join(", ")} does not exist in the database.`;
          } else {
            errorMessage = `Cannot create cost: Foreign key constraint failed. Please verify the project, phase, and stage exist.`;
          }
        } else if (errorMsg.includes("not null")) {
          console.error("NOT NULL constraint failed.");
          console.error("Cost data being inserted:", JSON.stringify(newCost, null, 2));
          errorMessage = "Cannot create cost: A required field is missing. Please check all required fields are provided.";
        } else if (errorMsg.includes("unique")) {
          console.error("UNIQUE constraint failed. Cost ID may already exist:", costId);
          errorMessage = "Cannot create cost: A cost with this ID already exists.";
        } else {
          // Include the original error message for debugging
          errorMessage = `Cannot create cost: ${actualErrorMessage}`;
        }
      } else {
        errorMessage = `Cannot create cost: ${String(insertError)}`;
      }
      
      // Log the full error details before throwing
      console.error("Throwing error with message:", errorMessage);
      console.error("Original error was:", insertError);
      
      throw new Error(errorMessage);
    }
    
    // Fetch the created cost
    try {
      const result = await db.select().from(costs).where(eq(costs.id, costId)).get();
      
      if (!result) {
        console.error("Cost inserted but could not be retrieved. Cost ID:", costId);
        // Try to find it with a different query
        const allCosts = await db.select().from(costs).limit(5);
        console.error("Recent costs in DB:", allCosts);
        throw new Error("Cost was created but could not be retrieved. Please refresh the page to see the new cost.");
      }
      
      console.log("Cost created and retrieved successfully:", result.id);
      return result;
    } catch (fetchError) {
      console.error("Error fetching created cost:", fetchError);
      if (fetchError instanceof Error) {
        throw fetchError;
      }
      throw new Error("Cost was created but could not be retrieved. Please refresh the page to see the new cost.");
    }
  } catch (error) {
    console.error("Unexpected error creating cost:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      // Re-throw the error so the client can see it
      throw error;
    }
    throw new Error(`Failed to create cost: ${String(error)}`);
  }
}

/**
 * Update a cost
 */
export async function updateCost(
  id: string,
  data: Partial<Pick<Cost, "name" | "description" | "category" | "quotedAmount" | "actualAmount" | "vendorContactId" | "vendorName" | "notes">>
): Promise<Cost> {
  try {
    const d1 = await getD1Database();
    if (!d1) {
      throw new Error("D1 database not available");
    }
    
    const db = createDb(d1);
    const now = new Date();
    
    // Check if cost exists
    const existingCost = await db.select().from(costs).where(eq(costs.id, id)).get();
    if (!existingCost) {
      throw new Error(`Cost with ID ${id} does not exist`);
    }
    
    // Validate vendorContactId if provided
    if (data.vendorContactId) {
      const contactCheck = await db.select().from(contacts).where(eq(contacts.id, data.vendorContactId)).get();
      if (!contactCheck) {
        console.warn(`Contact ${data.vendorContactId} does not exist, setting vendorContactId to null`);
        data.vendorContactId = undefined;
      }
    }
    
    const result = await db.update(costs)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(costs.id, id))
      .returning()
      .get();
    
    if (!result) {
      throw new Error("Cost was updated but could not be retrieved");
    }
    
    return result;
  } catch (error) {
    console.error("Error updating cost:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to update cost: ${String(error)}`);
  }
}

/**
 * Delete a cost
 */
export async function deleteCost(id: string): Promise<boolean> {
  try {
    const d1 = await getD1Database();
    if (!d1) return false;
    
    const db = createDb(d1);
    
    // Files with this cost_id will be unlinked due to ON DELETE CASCADE
    await db.delete(costs).where(eq(costs.id, id));
    
    return true;
  } catch (error) {
    console.error("Error deleting cost:", error);
    return false;
  }
}

// =============================================================================
// PAYMENT STATUS ACTIONS
// =============================================================================

/**
 * Update payment status for a cost
 */
export async function updatePaymentStatus(
  id: string,
  status: Cost["paymentStatus"],
  paidAmount?: number
): Promise<Cost | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) return null;
    
    const db = createDb(d1);
    const now = new Date();
    
    const updateData: Partial<Cost> = {
      paymentStatus: status,
      updatedAt: now,
    };
    
    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount;
    }
    
    // Set paidAt timestamp if marking as paid
    if (status === "paid") {
      updateData.paidAt = now;
    }
    
    const result = await db.update(costs)
      .set(updateData)
      .where(eq(costs.id, id))
      .returning();
    
    if (result.length === 0) return null;
    
    return result[0];
  } catch (error) {
    console.error("Error updating payment status:", error);
    return null;
  }
}

/**
 * Mark cost as quoted
 */
export async function markAsQuoted(id: string): Promise<Cost | null> {
  return updatePaymentStatus(id, "quoted");
}

/**
 * Mark cost as approved
 */
export async function markAsApproved(id: string): Promise<Cost | null> {
  return updatePaymentStatus(id, "approved");
}

/**
 * Mark cost as paid (full payment)
 */
export async function markAsPaid(
  id: string,
  paymentMethod: "external" | "platform" = "external"
): Promise<Cost | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) return null;
    
    const db = createDb(d1);
    const now = new Date();
    
    // Get the current cost to set paidAmount
    const existing = await getCost(id);
    if (!existing) return null;
    
    // Use actualAmount if set, otherwise quotedAmount
    const totalAmount = existing.actualAmount ?? existing.quotedAmount ?? 0;
    
    const result = await db.update(costs)
      .set({
        paymentStatus: "paid",
        paidAmount: totalAmount,
        paymentMethod,
        paidAt: now,
        updatedAt: now,
      })
      .where(eq(costs.id, id))
      .returning();
    
    if (result.length === 0) return null;
    
    return result[0];
  } catch (error) {
    console.error("Error marking as paid:", error);
    return null;
  }
}

/**
 * Record a partial payment
 */
export async function recordPartialPayment(
  id: string,
  amountPaid: number,
  paymentMethod: "external" | "platform" = "external"
): Promise<Cost | null> {
  try {
    const d1 = await getD1Database();
    if (!d1) return null;
    
    const db = createDb(d1);
    const now = new Date();
    
    // Get current cost
    const existing = await getCost(id);
    if (!existing) return null;
    
    const newPaidAmount = (existing.paidAmount ?? 0) + amountPaid;
    const totalAmount = existing.actualAmount ?? existing.quotedAmount ?? 0;
    
    // Determine status based on payment amount
    let newStatus: Cost["paymentStatus"] = "partially_paid";
    if (newPaidAmount >= totalAmount) {
      newStatus = "paid";
    }
    
    const result = await db.update(costs)
      .set({
        paymentStatus: newStatus,
        paidAmount: newPaidAmount,
        paymentMethod,
        paidAt: newStatus === "paid" ? now : existing.paidAt,
        updatedAt: now,
      })
      .where(eq(costs.id, id))
      .returning();
    
    if (result.length === 0) return null;
    
    return result[0];
  } catch (error) {
    console.error("Error recording partial payment:", error);
    return null;
  }
}

// =============================================================================
// FILE ATTACHMENT ACTIONS
// =============================================================================

/**
 * Get files attached to a cost
 */
export async function getCostFiles(costId: string): Promise<FileType[]> {
  try {
    const d1 = await getD1Database();
    if (!d1) return [];
    
    const db = createDb(d1);
    return await db.select()
      .from(files)
      .where(eq(files.costId, costId));
  } catch (error) {
    console.error("Error fetching cost files:", error);
    return [];
  }
}

/**
 * Attach an existing file to a cost
 */
export async function attachFileToCost(
  fileId: string,
  costId: string
): Promise<boolean> {
  try {
    const d1 = await getD1Database();
    if (!d1) return false;
    
    const db = createDb(d1);
    
    await db.update(files)
      .set({ costId })
      .where(eq(files.id, fileId));
    
    return true;
  } catch (error) {
    console.error("Error attaching file to cost:", error);
    return false;
  }
}

/**
 * Detach a file from a cost (doesn't delete the file)
 */
export async function detachFileFromCost(fileId: string): Promise<boolean> {
  try {
    const d1 = await getD1Database();
    if (!d1) return false;
    
    const db = createDb(d1);
    
    await db.update(files)
      .set({ costId: null })
      .where(eq(files.id, fileId));
    
    return true;
  } catch (error) {
    console.error("Error detaching file from cost:", error);
    return false;
  }
}

// =============================================================================
// SUMMARY/AGGREGATION ACTIONS
// =============================================================================

/**
 * Get cost summary for a phase
 */
export async function getPhaseCostSummary(phaseId: string): Promise<{
  totalQuoted: number;
  totalActual: number;
  totalPaid: number;
  outstanding: number;
  count: number;
}> {
  const phaseCosts = await getCostsByPhase(phaseId);
  
  const totalQuoted = phaseCosts.reduce((sum, c) => sum + (c.quotedAmount ?? 0), 0);
  const totalActual = phaseCosts.reduce((sum, c) => sum + (c.actualAmount ?? 0), 0);
  const totalPaid = phaseCosts.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
  
  // Outstanding is based on actual if available, otherwise quoted
  const totalDue = phaseCosts.reduce((sum, c) => sum + (c.actualAmount ?? c.quotedAmount ?? 0), 0);
  const outstanding = totalDue - totalPaid;
  
  return {
    totalQuoted,
    totalActual,
    totalPaid,
    outstanding,
    count: phaseCosts.length,
  };
}

/**
 * Get cost summary for a project
 */
export async function getProjectCostSummary(projectId: string): Promise<{
  totalQuoted: number;
  totalActual: number;
  totalPaid: number;
  outstanding: number;
  count: number;
}> {
  const projectCosts = await getCostsByProject(projectId);
  
  const totalQuoted = projectCosts.reduce((sum, c) => sum + (c.quotedAmount ?? 0), 0);
  const totalActual = projectCosts.reduce((sum, c) => sum + (c.actualAmount ?? 0), 0);
  const totalPaid = projectCosts.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
  
  const totalDue = projectCosts.reduce((sum, c) => sum + (c.actualAmount ?? c.quotedAmount ?? 0), 0);
  const outstanding = totalDue - totalPaid;
  
  return {
    totalQuoted,
    totalActual,
    totalPaid,
    outstanding,
    count: projectCosts.length,
  };
}

// Note: COST_CATEGORIES moved to @/lib/constants/costs.ts
// Constants cannot be exported from "use server" files

