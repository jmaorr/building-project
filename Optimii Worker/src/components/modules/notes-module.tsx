"use client";

import { useState } from "react";
import { Plus, MessageSquare, Pin, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface NotesModuleProps {
  moduleId: string;
  moduleName: string;
}

interface Note {
  id: string;
  content: string;
  isPinned: boolean;
  authorName: string;
  createdAt: Date;
}

const mockNotes: Note[] = [
  { 
    id: "1", 
    content: "Client has requested changes to the master bedroom layout. Need to increase window sizes for better natural light.", 
    isPinned: true, 
    authorName: "Michael Architect", 
    createdAt: new Date("2024-02-15T10:30:00") 
  },
  { 
    id: "2", 
    content: "Council pre-lodgement meeting scheduled for next week. Will discuss setback requirements.", 
    isPinned: false, 
    authorName: "John Smith", 
    createdAt: new Date("2024-02-14T14:22:00") 
  },
  { 
    id: "3", 
    content: "Structural engineer confirmed the beam sizes. Documentation will be ready by Friday.", 
    isPinned: false, 
    authorName: "David Engineer", 
    createdAt: new Date("2024-02-12T09:15:00") 
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NotesModule({ moduleId, moduleName }: NotesModuleProps) {
  const [notes] = useState(mockNotes);
  const [newNote, setNewNote] = useState("");

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return new Intl.DateTimeFormat("en-AU", {
        hour: "numeric",
        minute: "numeric",
      }).format(date);
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
      }).format(date);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  // Sort notes - pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  if (notes.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Discussion threads and comments"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          }
        />
        <ModuleEmptyState
          icon={MessageSquare}
          title="No notes yet"
          description="Add notes to keep track of important discussions and decisions."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <ModuleHeader 
        title={moduleName}
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
            <Button size="sm" disabled={!newNote.trim()}>
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Notes List */}
      <div className="space-y-4">
        {sortedNotes.map((note) => (
          <Card key={note.id} className={cn(note.isPinned && "border-brand/50")}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
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
                      <Pin className="h-3 w-3 text-brand" />
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
                    <DropdownMenuItem>
                      <Pin className="mr-2 h-4 w-4" />
                      {note.isPinned ? "Unpin" : "Pin"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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




