"use server";

import type { ActivityLog, NewActivityLog } from "@/lib/db/schema";

// =============================================================================
// MOCK DATA STORE (Replace with D1 database operations in production)
// =============================================================================

let mockActivityLog: ActivityLog[] = [];

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
  const activity: ActivityLog = {
    id: `activity-${Date.now()}`,
    projectId: data.projectId,
    phaseId: data.phaseId || null,
    stageId: data.stageId || null,
    roundNumber: data.roundNumber || null,
    type: data.type,
    userId: data.userId,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    createdAt: new Date(),
  };
  
  mockActivityLog.push(activity);
  return activity;
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
  let filtered = mockActivityLog.filter((a) => a.phaseId === phaseId);
  
  if (filters?.type) {
    filtered = filtered.filter((a) => a.type === filters.type);
  }
  
  if (filters?.stageId) {
    filtered = filtered.filter((a) => a.stageId === filters.stageId);
  }
  
  if (filters?.roundNumber !== undefined) {
    filtered = filtered.filter((a) => a.roundNumber === filters.roundNumber);
  }
  
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

export async function getActivityByProject(
  projectId: string,
  filters?: {
    type?: ActivityLog["type"];
    phaseId?: string;
    limit?: number;
  }
): Promise<ActivityLog[]> {
  let filtered = mockActivityLog.filter((a) => a.projectId === projectId);
  
  if (filters?.type) {
    filtered = filtered.filter((a) => a.type === filters.type);
  }
  
  if (filters?.phaseId) {
    filtered = filtered.filter((a) => a.phaseId === filters.phaseId);
  }
  
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

