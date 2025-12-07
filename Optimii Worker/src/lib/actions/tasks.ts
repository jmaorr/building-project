"use server";

import { eq, and, asc, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { tasks, stages, phases, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Task, NewTask } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canEditProject } from "@/lib/auth/permissions";

// =============================================================================
// TASK ACTIONS
// =============================================================================

export async function getStageTasks(stageId: string): Promise<Task[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const db = createDb(d1);
        const results = await db.select()
            .from(tasks)
            .where(eq(tasks.stageId, stageId))
            .orderBy(asc(tasks.order), desc(tasks.createdAt));

        return results;
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return [];
    }
}

export async function createTask(data: {
    stageId: string;
    title: string;
    description?: string;
    priority?: Task["priority"];
    dueDate?: Date;
    assignedTo?: string;
}): Promise<Task> {
    const d1 = await getD1Database() as D1Database | null;
    if (!d1) throw new Error("D1 database not available");

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to create tasks");

    const db = createDb(d1);

    // Check permissions
    const stage = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
    if (!stage) throw new Error("Stage not found");

    const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
    if (!phase) throw new Error("Phase not found");

    if (!await canEditProject(phase.projectId)) {
        throw new Error("Unauthorized: You do not have permission to add tasks");
    }

    const now = new Date();

    // Get max order
    const existingTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.stageId, data.stageId));
    const maxOrder = existingTasks.length > 0
        ? Math.max(...existingTasks.map(t => t.order))
        : -1;

    const newId = generateId();

    const newTask: NewTask = {
        id: newId,
        stageId: data.stageId,
        moduleId: null, // Deprecated
        title: data.title,
        description: data.description || null,
        status: "pending",
        priority: data.priority || "medium",
        dueDate: data.dueDate || null,
        completedAt: null,
        order: maxOrder + 1,
        roundNumber: stage.currentRound,
        assignedTo: data.assignedTo || null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(tasks).values(newTask);

    const result = await db.select().from(tasks).where(eq(tasks.id, newId)).get();
    if (!result) throw new Error("Failed to create task");

    revalidatePath(`/projects/${phase.projectId}`);
    return result;
}

export async function updateTask(id: string, data: Partial<NewTask>): Promise<Task | null> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return null;

        const db = createDb(d1);

        // Get task to check permissions
        const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
        if (!task) return null;

        const stage = await db.select().from(stages).where(eq(stages.id, task.stageId)).get();
        if (!stage) return null;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return null;

        if (!await canEditProject(phase.projectId)) {
            throw new Error("Unauthorized: You do not have permission to update tasks");
        }

        // Handle completion status change
        let completedAt = task.completedAt;
        if (data.status === "completed" && task.status !== "completed") {
            completedAt = new Date();
        } else if (data.status && data.status !== "completed") {
            completedAt = null;
        }

        const result = await db.update(tasks)
            .set({
                ...data,
                completedAt,
                updatedAt: new Date(),
            })
            .where(eq(tasks.id, id))
            .returning()
            .get();

        revalidatePath(`/projects/${phase.projectId}`);
        return result || null;
    } catch (error) {
        console.error("Error updating task:", error);
        return null;
    }
}

export async function deleteTask(id: string): Promise<boolean> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return false;

        const db = createDb(d1);

        // Get task to check permissions
        const task = await db.select().from(tasks).where(eq(tasks.id, id)).get();
        if (!task) return false;

        const stage = await db.select().from(stages).where(eq(stages.id, task.stageId)).get();
        if (!stage) return false;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return false;

        if (!await canEditProject(phase.projectId)) {
            return false;
        }

        const result = await db.delete(tasks).where(eq(tasks.id, id)).returning().get();

        if (result) {
            revalidatePath(`/projects/${phase.projectId}`);
        }

        return !!result;
    } catch (error) {
        console.error("Error deleting task:", error);
        return false;
    }
}

export async function reorderTasks(stageId: string, taskIds: string[]): Promise<void> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return;

        const db = createDb(d1);

        // Check permissions
        const stage = await db.select().from(stages).where(eq(stages.id, stageId)).get();
        if (!stage) return;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return;

        if (!await canEditProject(phase.projectId)) {
            return;
        }

        const now = new Date();

        await db.transaction(async (tx) => {
            for (let i = 0; i < taskIds.length; i++) {
                await tx.update(tasks)
                    .set({ order: i, updatedAt: now })
                    .where(and(
                        eq(tasks.id, taskIds[i]),
                        eq(tasks.stageId, stageId)
                    ));
            }
        });

        revalidatePath(`/projects/${phase.projectId}`);
    } catch (error) {
        console.error("Error reordering tasks:", error);
    }
}
