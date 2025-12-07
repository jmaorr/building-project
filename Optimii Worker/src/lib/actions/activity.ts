"use server";

import { eq, and, desc } from "drizzle-orm";
import { activityLog, generateId, type ActivityLog, type NewActivityLog } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import { createDb, type D1Database } from "@/lib/db";

// =============================================================================
// ACTIVITY LOG ACTIONS
// =============================================================================

export async function logActivity(data: {
  projectId: string;
  phaseId?: string;
  stageId?: string;
  roundNumber?: number;
  type: ActivityLog["type"];
  userId: string;
  metadata?: Record<string, unknown>;
}): Promise<ActivityLog> {
  const d1 = await getD1Database() as D1Database | null;
  if (!d1) {
    throw new Error("Database not available");
  }

  const db = createDb(d1);
  
  const newActivity: NewActivityLog = {
    id: generateId(),
    projectId: data.projectId,
    phaseId: data.phaseId || null,
    stageId: data.stageId || null,
    roundNumber: data.roundNumber || null,
    type: data.type,
    userId: data.userId,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    createdAt: new Date(),
  };

  await db.insert(activityLog).values(newActivity).run();
  return newActivity as ActivityLog;
}

export async function getActivityByPhase(
  phaseId: string,
  filters?: {
    type?: ActivityLog["type"];
    stageId?: string;
    roundNumber?: number;
    limit?: number;
  }
): Promise<ActivityLog[]> {
  const d1 = await getD1Database() as D1Database | null;
  if (!d1) {
    return [];
  }

  const db = createDb(d1);
  
  const conditions = [eq(activityLog.phaseId, phaseId)];
  
  if (filters?.type) {
    conditions.push(eq(activityLog.type, filters.type));
  }
  
  if (filters?.stageId) {
    conditions.push(eq(activityLog.stageId, filters.stageId));
  }
  
  if (filters?.roundNumber !== undefined) {
    conditions.push(eq(activityLog.roundNumber, filters.roundNumber));
  }

  const query = db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt));

  const result = await query.all();
  
  if (filters?.limit) {
    return result.slice(0, filters.limit);
  }
  
  return result;
}

export async function getActivityByProject(
  projectId: string,
  filters?: {
    type?: ActivityLog["type"];
    phaseId?: string;
    limit?: number;
  }
): Promise<ActivityLog[]> {
  const d1 = await getD1Database() as D1Database | null;
  if (!d1) {
    return [];
  }

  const db = createDb(d1);
  
  const conditions = [eq(activityLog.projectId, projectId)];
  
  if (filters?.type) {
    conditions.push(eq(activityLog.type, filters.type));
  }
  
  if (filters?.phaseId) {
    conditions.push(eq(activityLog.phaseId, filters.phaseId));
  }

  const query = db
    .select()
    .from(activityLog)
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt));

  const result = await query.all();
  
  if (filters?.limit) {
    return result.slice(0, filters.limit);
  }
  
  return result;
}

