"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { User, Contact } from "@/lib/db/schema";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  users: (User | Contact)[];
  onSubmit?: () => void;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  placeholder = "Type @ to mention someone...",
  users,
  onSubmit,
  className,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [suggestionIndex, setSuggestionIndex] = React.useState(0);
  const [mentionStart, setMentionStart] = React.useState<number | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Check if user is typing @
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after @ (meaning mention is complete)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        setMentionStart(lastAtIndex);
        setShowSuggestions(true);
        setSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
        setMentionStart(null);
      }
    } else {
      setShowSuggestions(false);
      setMentionStart(null);
    }

    onChange(newValue);
  };

  const getFilteredUsers = () => {
    if (mentionStart === null) return [];

    const textBeforeCursor = value.slice(0, textareaRef.current?.selectionStart || 0);
    const textAfterAt = textBeforeCursor.slice(mentionStart + 1);
    const searchTerm = textAfterAt.toLowerCase();

    return users.filter((user) => {
      const name = "firstName" in user
        ? `${user.firstName} ${user.lastName}`.trim() || user.email
        : user.name;
      return name.toLowerCase().includes(searchTerm);
    });
  };

  const insertMention = (user: User | Contact) => {
    if (mentionStart === null || !textareaRef.current) return;

    const name = "firstName" in user
      ? `${user.firstName} ${user.lastName}`.trim() || user.email
      : user.name;

    const textBefore = value.slice(0, mentionStart);
    const textAfter = value.slice(textareaRef.current.selectionStart);
    const newValue = `${textBefore}@${name} ${textAfter}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionStart(null);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = mentionStart + name.length + 2; // +2 for @ and space
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      const filtered = getFilteredUsers();
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        insertMention(filtered[suggestionIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setMentionStart(null);
      }
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("min-h-[80px] resize-none", className)}
      />
      
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
          {filteredUsers.map((user, idx) => {
            const name = "firstName" in user
              ? `${user.firstName} ${user.lastName}`.trim() || (user.email || "")
              : user.name;
            const email = "email" in user ? (user.email || "") : "";

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                  idx === suggestionIndex && "bg-accent"
                )}
              >
                <div className="font-medium text-sm">{name}</div>
                {email && (
                  <div className="text-xs text-muted-foreground">{email}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

