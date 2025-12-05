"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { approvals, stages as stagesTable, phases } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Approval } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canEditProject } from "@/lib/auth/permissions";

// Extended approval type with assignee info
export type ApprovalWithAssignee = Approval & {
  assignedTo: string | null;
  assigneeName: string | null;
  requesterName: string | null;
};

// =============================================================================
// APPROVAL ACTIONS - Using D1 Database
// =============================================================================

/**
 * Get approvals for a stage, optionally filtered by round number
 */
export async function getApprovalsByStage(
  stageId: string,
  roundNumber?: number
): Promise<ApprovalWithAssignee[]> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      console.warn("D1 database not available, returning empty array");
      return [];
    }

    const db = createDb(d1);

    let query = db.select().from(approvals).where(eq(approvals.stageId, stageId));

    if (roundNumber !== undefined) {
      query = db.select().from(approvals).where(
        and(
          eq(approvals.stageId, stageId),
          eq(approvals.roundNumber, roundNumber)
        )
      );
    }

    const results = await query.orderBy(desc(approvals.requestedAt));

    return results.map(r => ({
      ...r,
      assignedTo: r.assignedTo,
      assigneeName: r.assigneeName,
      requesterName: r.requesterName,
    }));
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return [];
  }
}

/**
 * Request a new approval
 */
export async function requestApproval(data: {
  projectId: string;
  stageId: string;
  roundNumber: number;
  message?: string;
  assignedTo: string;
  assigneeName?: string;
}): Promise<ApprovalWithAssignee | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to request approval");

    if (!await canEditProject(data.projectId)) {
      throw new Error("Unauthorized: You do not have permission to request approvals");
    }

    const db = createDb(d1);
    const now = new Date();

    const newApproval = {
      id: crypto.randomUUID(),
      stageId: data.stageId,
      moduleId: data.stageId, // Keep for backward compatibility
      title: "Approval Request",
      description: data.message || null,
      status: "pending" as const,
      roundNumber: data.roundNumber,
      requestedBy: user.id,
      requesterName: `${user.firstName} ${user.lastName}`.trim(),
      requestedAt: now,
      assignedTo: data.assignedTo,
      assigneeName: data.assigneeName || null,
      approvedBy: null,
      approvedAt: null,
      notes: null,
      documentUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.insert(approvals).values(newApproval).returning();

    if (result.length === 0) {
      return null;
    }

    revalidatePath(`/projects/${data.projectId}`);

    return {
      ...result[0],
      assignedTo: result[0].assignedTo,
      assigneeName: result[0].assigneeName,
      requesterName: result[0].requesterName,
    };
  } catch (error) {
    console.error("Error creating approval:", error);
    return null;
  }
}

/**
 * Approve an approval request and auto-complete the stage
 */
export async function approveApproval(
  id: string,
  notes?: string
): Promise<ApprovalWithAssignee | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to approve");

    const db = createDb(d1);

    // Get approval to check permissions
    const approval = await db.select().from(approvals).where(eq(approvals.id, id)).get();
    if (!approval) return null;

    const stage = await db.select().from(stagesTable).where(eq(stagesTable.id, approval.stageId)).get();
    if (!stage) return null;

    const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
    if (!phase) return null;

    // Check if user is assignee or has admin permissions
    const canEdit = await canEditProject(phase.projectId);
    const isAssignee = approval.assignedTo === user.id;

    if (!canEdit && !isAssignee) {
      throw new Error("Unauthorized: You do not have permission to approve this request");
    }

    const now = new Date();
    const approverName = `${user.firstName} ${user.lastName}`.trim();

    const result = await db.update(approvals)
      .set({
        status: "approved",
        approvedBy: approverName,
        approvedAt: now,
        notes: notes || null,
        updatedAt: now,
      })
      .where(eq(approvals.id, id))
      .returning();

    if (result.length === 0) {
      return null;
    }

    const updatedApproval = result[0];

    // Auto-complete the stage when approval is granted
    if (updatedApproval.stageId) {
      await db.update(stagesTable)
        .set({
          status: "completed",
          updatedAt: now,
        })
        .where(eq(stagesTable.id, updatedApproval.stageId));
    }

    revalidatePath(`/projects/${phase.projectId}`);

    return {
      ...updatedApproval,
      assignedTo: updatedApproval.assignedTo,
      assigneeName: updatedApproval.assigneeName,
      requesterName: updatedApproval.requesterName,
    };
  } catch (error) {
    console.error("Error approving:", error);
    return null;
  }
}

/**
 * Reject an approval request
 */
export async function rejectApproval(
  id: string,
  notes?: string
): Promise<ApprovalWithAssignee | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      console.error("D1 database not available");
      return null;
    }

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to reject");

    const db = createDb(d1);

    // Get approval to check permissions
    const approval = await db.select().from(approvals).where(eq(approvals.id, id)).get();
    if (!approval) return null;

    const stage = await db.select().from(stagesTable).where(eq(stagesTable.id, approval.stageId)).get();
    if (!stage) return null;

    const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
    if (!phase) return null;

    // Check if user is assignee or has admin permissions
    const canEdit = await canEditProject(phase.projectId);
    const isAssignee = approval.assignedTo === user.id;

    if (!canEdit && !isAssignee) {
      throw new Error("Unauthorized: You do not have permission to reject this request");
    }

    const now = new Date();
    const rejectorName = `${user.firstName} ${user.lastName}`.trim();

    const result = await db.update(approvals)
      .set({
        status: "rejected",
        approvedBy: rejectorName, // Using approvedBy field for rejector name as well
        approvedAt: now,
        notes: notes || null,
        updatedAt: now,
      })
      .where(eq(approvals.id, id))
      .returning();

    if (result.length === 0) {
      return null;
    }

    revalidatePath(`/projects/${phase.projectId}`);

    return {
      ...result[0],
      assignedTo: result[0].assignedTo,
      assigneeName: result[0].assigneeName,
      requesterName: result[0].requesterName,
    };
  } catch (error) {
    console.error("Error rejecting:", error);
    return null;
  }
}

/**
 * Get a single approval by ID
 */
export async function getApproval(id: string): Promise<ApprovalWithAssignee | null> {
  try {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) {
      return null;
    }

    const db = createDb(d1);
    const result = await db.select().from(approvals).where(eq(approvals.id, id));

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0],
      assignedTo: result[0].assignedTo,
      assigneeName: result[0].assigneeName,
      requesterName: result[0].requesterName,
    };
  } catch (error) {
    console.error("Error fetching approval:", error);
    return null;
  }
}

/**
 * Get approval status for a stage (latest approval for current round)
 */
export async function getStageApprovalStatus(stageId: string, roundNumber: number): Promise<{
  status: "none" | "pending" | "approved" | "rejected";
  approval: ApprovalWithAssignee | null;
}> {
  const approvalsList = await getApprovalsByStage(stageId, roundNumber);

  const pending = approvalsList.find((a) => a.status === "pending");
  if (pending) return { status: "pending", approval: pending };

  const approved = approvalsList.find((a) => a.status === "approved");
  if (approved) return { status: "approved", approval: approved };

  const rejected = approvalsList.find((a) => a.status === "rejected");
  if (rejected) return { status: "rejected", approval: rejected };

  return { status: "none", approval: null };
}

/**
 * Get approval statuses for multiple stages at once
 */
export async function getStagesApprovalStatuses(stages: { id: string; currentRound: number }[]): Promise<
  Record<string, { status: "none" | "pending" | "approved" | "rejected"; approval: ApprovalWithAssignee | null }>
> {
  const result: Record<string, { status: "none" | "pending" | "approved" | "rejected"; approval: ApprovalWithAssignee | null }> = {};

  for (const stage of stages) {
    result[stage.id] = await getStageApprovalStatus(stage.id, stage.currentRound);
  }

  return result;
}
