"use server";

import type { Note, User, Contact } from "@/lib/db/schema";

// =============================================================================
// MOCK DATA STORE (Replace with D1 database operations in production)
// =============================================================================

const mockNotes: Note[] = [];

// =============================================================================
// COMMENT ACTIONS
// =============================================================================

export async function getCommentsByStage(
  stageId: string,
  roundNumber?: number
): Promise<(Note & { author: User | Contact })[]> {
  let filtered = mockNotes.filter((n) => n.stageId === stageId);
  
  if (roundNumber !== undefined) {
    filtered = filtered.filter((n) => n.roundNumber === roundNumber);
  }
  
  // Sort: pinned first, then by date
  filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // TODO: Join with users/contacts to get author info
  return filtered.map((note) => ({
    ...note,
    author: {
      id: note.authorId,
      name: "Unknown User",
      email: "",
    } as Contact,
  }));
}

export async function addComment(data: {
  stageId: string;
  content: string;
  roundNumber: number;
  authorId: string;
  mentions?: string[];
}): Promise<Note> {
  const mentions = await parseMentions(data.content);
  
  const note: Note = {
    id: `note-${Date.now()}`,
    stageId: data.stageId,
    moduleId: data.stageId, // Keep for backward compatibility
    content: data.content,
    isPinned: false,
    roundNumber: data.roundNumber,
    mentions: mentions.length > 0 ? JSON.stringify(mentions) : null,
    authorId: data.authorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  mockNotes.push(note);
  return note;
}

export async function deleteComment(id: string): Promise<boolean> {
  const index = mockNotes.findIndex((n) => n.id === id);
  if (index === -1) return false;
  
  mockNotes.splice(index, 1);
  return true;
}

export async function updateComment(
  id: string,
  data: Partial<Pick<Note, "content" | "isPinned">>
): Promise<Note | null> {
  const index = mockNotes.findIndex((n) => n.id === id);
  if (index === -1) return null;
  
    const mentions = data.content ? await parseMentions(data.content) : undefined;
  
  mockNotes[index] = {
    ...mockNotes[index],
    ...data,
    mentions: mentions ? JSON.stringify(mentions) : mockNotes[index].mentions,
    updatedAt: new Date(),
  };
  
  return mockNotes[index];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export async function parseMentions(content: string): Promise<string[]> {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

