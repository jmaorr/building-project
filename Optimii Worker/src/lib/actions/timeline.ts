"use server";

import { eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { timelineEvents, stages, phases, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { TimelineEvent, NewTimelineEvent } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canEditProject } from "@/lib/auth/permissions";

// =============================================================================
// TIMELINE ACTIONS
// =============================================================================

export async function getStageTimelineEvents(stageId: string): Promise<TimelineEvent[]> {
    try {
        const d1 = getD1Database() as D1Database | null;
        if (!d1) return [];

        const db = createDb(d1);
        const results = await db.select()
            .from(timelineEvents)
            .where(eq(timelineEvents.stageId, stageId))
            .orderBy(asc(timelineEvents.date));

        return results;
    } catch (error) {
        console.error("Error fetching timeline events:", error);
        return [];
    }
}

export async function createTimelineEvent(data: {
    projectId: string;
    stageId: string;
    title: string;
    description?: string;
    date: Date;
    endDate?: Date;
    type: TimelineEvent["type"];
}): Promise<TimelineEvent> {
    const d1 = getD1Database() as D1Database | null;
    if (!d1) throw new Error("D1 database not available");

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to add timeline events");

    if (!await canEditProject(data.projectId)) {
        throw new Error("Unauthorized: You do not have permission to add timeline events");
    }

    const db = createDb(d1);

    // Verify stage exists
    const stage = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
    if (!stage) throw new Error("Stage not found");

    const now = new Date();
    const eventId = generateId();

    const newEvent: NewTimelineEvent = {
        id: eventId,
        stageId: data.stageId,
        moduleId: null, // Deprecated
        title: data.title,
        description: data.description || null,
        date: data.date,
        endDate: data.endDate || null,
        type: data.type,
        isCompleted: false,
        roundNumber: stage.currentRound,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(timelineEvents).values(newEvent);

    const result = await db.select().from(timelineEvents).where(eq(timelineEvents.id, eventId)).get();
    if (!result) throw new Error("Failed to create timeline event");

    revalidatePath(`/projects/${data.projectId}`);
    return result;
}

export async function updateTimelineEvent(id: string, data: Partial<NewTimelineEvent>): Promise<TimelineEvent | null> {
    try {
        const d1 = getD1Database() as D1Database | null;
        if (!d1) return null;

        const db = createDb(d1);

        // Get event to check permissions
        const event = await db.select().from(timelineEvents).where(eq(timelineEvents.id, id)).get();
        if (!event) return null;

        const stage = await db.select().from(stages).where(eq(stages.id, event.stageId)).get();
        if (!stage) return null;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return null;

        if (!await canEditProject(phase.projectId)) {
            throw new Error("Unauthorized: You do not have permission to update timeline events");
        }

        const result = await db.update(timelineEvents)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(timelineEvents.id, id))
            .returning()
            .get();

        revalidatePath(`/projects/${phase.projectId}`);
        return result || null;
    } catch (error) {
        console.error("Error updating timeline event:", error);
        return null;
    }
}

export async function deleteTimelineEvent(id: string): Promise<boolean> {
    try {
        const d1 = getD1Database() as D1Database | null;
        if (!d1) return false;

        const db = createDb(d1);

        // Get event to check permissions
        const event = await db.select().from(timelineEvents).where(eq(timelineEvents.id, id)).get();
        if (!event) return false;

        const stage = await db.select().from(stages).where(eq(stages.id, event.stageId)).get();
        if (!stage) return false;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return false;

        if (!await canEditProject(phase.projectId)) {
            return false;
        }

        const result = await db.delete(timelineEvents).where(eq(timelineEvents.id, id)).returning().get();

        if (result) {
            revalidatePath(`/projects/${phase.projectId}`);
        }

        return !!result;
    } catch (error) {
        console.error("Error deleting timeline event:", error);
        return false;
    }
}

export async function toggleTimelineEventCompletion(id: string, isCompleted: boolean): Promise<TimelineEvent | null> {
    return updateTimelineEvent(id, { isCompleted });
}
