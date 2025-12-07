"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pin, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MentionInput } from "@/components/ui/mention-input";
import { addComment } from "@/lib/actions/comments";
import type { Note, User, Contact } from "@/lib/db/schema";

interface CommentsSectionProps {
  stageId: string;
  roundNumber: number;
  comments: (Note & { author: User | Contact })[];
  currentUser: User;
  availableUsers: (User | Contact)[];
  onCommentAdded: () => void;
}

export function CommentsSection({
  stageId,
  roundNumber,
  comments,
  currentUser,
  availableUsers,
  onCommentAdded,
}: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment({
        stageId,
        content: newComment,
        roundNumber,
        authorId: currentUser.id,
      });
      setNewComment("");
      onCommentAdded();
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

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

  // Parse mentions in content
  const parseContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: "mention", username: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "text", content }];
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-3">Comments</h4>
        
        {/* Comment Input */}
        <Card className="mb-4">
          <CardContent className="pt-4">
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              placeholder="Add a comment... @mention users"
              users={availableUsers}
              onSubmit={handleSubmit}
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting}
              >
                {isSubmitting ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Comments List */}
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Start the conversation!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const contentParts = parseContent(comment.content);
              const authorName = "firstName" in comment.author
                ? `${comment.author.firstName} ${comment.author.lastName}`.trim() || comment.author.email
                : comment.author.name;

              return (
                <Card key={comment.id} className={comment.isPinned ? "border-brand/50" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-brand text-brand-foreground text-xs">
                          {getInitials(authorName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{authorName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                          {comment.isPinned && (
                            <Pin className="h-3 w-3 text-brand" />
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          {contentParts.map((part, idx) => {
                            if (part.type === "mention") {
                              return (
                                <span
                                  key={idx}
                                  className="font-medium text-brand bg-brand/10 px-1 rounded"
                                >
                                  @{part.username}
                                </span>
                              );
                            }
                            return <span key={idx}>{part.content}</span>;
                          })}
                        </div>
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
                            {comment.isPinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

