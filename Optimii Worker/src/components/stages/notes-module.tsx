"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Pin, MoreHorizontal, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StageHeader, StageEmptyState } from "@/components/projects/stage-tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getStageNotes, createNote, deleteNote, togglePinNote } from "@/lib/actions/notes";
import type { Note } from "@/lib/db/schema";

interface NotesStageProps {
  stageId: string;
  stageName: string;
  projectId: string;
}

type NoteWithAuthor = Note & { authorName: string; authorAvatarUrl: string | null };

export function NotesStage({ stageId, stageName, projectId }: NotesStageProps) {
  const [notes, setNotes] = useState<NoteWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const loadNotes = useCallback(async () => {
    try {
      const data = await getStageNotes(stageId);
      setNotes(data);
    } catch (error) {
      console.error("Failed to load notes:", error);
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;

    setIsCreating(true);
    try {
      await createNote({
        projectId,
        stageId,
        content: newNote,
      });

      setNewNote("");
      loadNotes();

      toast({
        title: "Success",
        description: "Note added successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to create note:", error);
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    // Optimistic update
    setNotes(notes.filter(n => n.id !== id));

    try {
      await deleteNote(id);
      toast({
        title: "Success",
        description: "Note deleted successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
      loadNotes(); // Revert
      toast({
        title: "Error",
        description: "Failed to delete note.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePin = async (note: NoteWithAuthor) => {
    // Optimistic update
    const newIsPinned = !note.isPinned;
    setNotes(notes.map(n => n.id === note.id ? { ...n, isPinned: newIsPinned } : n)
      .sort((a, b) => {
        // Re-sort: pinned first, then by date
        if (a.id === note.id) a.isPinned = newIsPinned;
        if (b.id === note.id) b.isPinned = newIsPinned;

        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));

    try {
      await togglePinNote(note.id, newIsPinned);
    } catch (error) {
      console.error("Failed to update note:", error);
      loadNotes(); // Revert
      toast({
        title: "Error",
        description: "Failed to update note.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return new Intl.DateTimeFormat("en-AU", {
        hour: "numeric",
        minute: "numeric",
      }).format(d);
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
      }).format(d);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <>
        <StageHeader
          title={stageName}
          description="Discussion threads and comments"
        />

        {/* New Note Input */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <textarea
              placeholder="Add a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full min-h-[80px] resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handleCreateNote} disabled={!newNote.trim() || isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>

        <StageEmptyState
          icon={MessageSquare}
          title="No notes yet"
          description="Add notes to keep track of important discussions and decisions."
        />
      </>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description="Discussion threads and comments"
      />

      {/* New Note Input */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full min-h-[80px] resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleCreateNote} disabled={!newNote.trim() || isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <Card key={note.id} className={cn(note.isPinned && "border-brand/50 bg-brand/5")}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  {note.authorAvatarUrl && (
                    <AvatarImage src={note.authorAvatarUrl} alt={note.authorName} />
                  )}
                  <AvatarFallback className="bg-brand text-brand-foreground text-xs">
                    {getInitials(note.authorName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{note.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.createdAt)}
                    </span>
                    {note.isPinned && (
                      <Pin className="h-3 w-3 text-brand fill-brand" />
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{note.content}</p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleTogglePin(note)}>
                      <Pin className="mr-2 h-4 w-4" />
                      {note.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteNote(note.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}




