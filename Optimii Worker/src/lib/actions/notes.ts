"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createDb, type D1Database } from "@/lib/db";
import { notes, stages, phases, users, generateId } from "@/lib/db/schema";
import { getD1Database } from "@/lib/cloudflare/get-env";
import type { Note, NewNote } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canEditProject } from "@/lib/auth/permissions";

// =============================================================================
// NOTE ACTIONS
// =============================================================================

export async function getStageNotes(stageId: string): Promise<(Note & { authorName: string; authorAvatarUrl: string | null })[]> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return [];

        const db = createDb(d1);
        const results = await db.select({
            note: notes,
            authorName: users.firstName,
            authorLastName: users.lastName,
            authorAvatarUrl: users.avatarUrl,
        })
            .from(notes)
            .leftJoin(users, eq(notes.authorId, users.id))
            .where(eq(notes.stageId, stageId))
            .orderBy(desc(notes.isPinned), desc(notes.createdAt));

        return results.map(({ note, authorName, authorLastName, authorAvatarUrl }) => ({
            ...note,
            authorName: `${authorName || ""} ${authorLastName || ""}`.trim() || "Unknown User",
            authorAvatarUrl,
        }));
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
}

export async function createNote(data: {
    projectId: string;
    stageId: string;
    content: string;
    isPinned?: boolean;
}): Promise<Note> {
    const d1 = await getD1Database() as D1Database | null;
    if (!d1) throw new Error("D1 database not available");

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be signed in to add notes");

    if (!await canEditProject(data.projectId)) {
        throw new Error("Unauthorized: You do not have permission to add notes");
    }

    const db = createDb(d1);

    // Verify stage exists
    const stage = await db.select().from(stages).where(eq(stages.id, data.stageId)).get();
    if (!stage) throw new Error("Stage not found");

    const now = new Date();
    const noteId = generateId();

    const newNote: NewNote = {
        id: noteId,
        stageId: data.stageId,
        moduleId: null, // Deprecated
        content: data.content,
        isPinned: data.isPinned || false,
        roundNumber: stage.currentRound,
        mentions: null,
        authorId: user.id,
        createdAt: now,
        updatedAt: now,
    };

    await db.insert(notes).values(newNote);

    const result = await db.select().from(notes).where(eq(notes.id, noteId)).get();
    if (!result) throw new Error("Failed to create note");

    revalidatePath(`/projects/${data.projectId}`);
    return result;
}

export async function updateNote(id: string, data: Partial<NewNote>): Promise<Note | null> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return null;

        const db = createDb(d1);

        // Get note to check permissions
        const note = await db.select().from(notes).where(eq(notes.id, id)).get();
        if (!note) return null;

        const stage = await db.select().from(stages).where(eq(stages.id, note.stageId)).get();
        if (!stage) return null;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return null;

        if (!await canEditProject(phase.projectId)) {
            throw new Error("Unauthorized: You do not have permission to update notes");
        }

        const result = await db.update(notes)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(notes.id, id))
            .returning()
            .get();

        revalidatePath(`/projects/${phase.projectId}`);
        return result || null;
    } catch (error) {
        console.error("Error updating note:", error);
        return null;
    }
}

export async function deleteNote(id: string): Promise<boolean> {
    try {
        const d1 = await getD1Database() as D1Database | null;
        if (!d1) return false;

        const db = createDb(d1);

        // Get note to check permissions
        const note = await db.select().from(notes).where(eq(notes.id, id)).get();
        if (!note) return false;

        const stage = await db.select().from(stages).where(eq(stages.id, note.stageId)).get();
        if (!stage) return false;

        const phase = await db.select().from(phases).where(eq(phases.id, stage.phaseId)).get();
        if (!phase) return false;

        // Check if user is author or has admin permissions
        const user = await getCurrentUser();
        if (!user) return false;

        const canEdit = await canEditProject(phase.projectId);
        const isAuthor = note.authorId === user.id;

        if (!canEdit && !isAuthor) {
            return false;
        }

        const result = await db.delete(notes).where(eq(notes.id, id)).returning().get();

        if (result) {
            revalidatePath(`/projects/${phase.projectId}`);
        }

        return !!result;
    } catch (error) {
        console.error("Error deleting note:", error);
        return false;
    }
}

export async function togglePinNote(id: string, isPinned: boolean): Promise<Note | null> {
    return updateNote(id, { isPinned });
}
