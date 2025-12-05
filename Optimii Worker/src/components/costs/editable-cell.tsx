"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | number | null | undefined;
  onSave: (value: string | number | null) => Promise<void>;
  type?: "text" | "number" | "currency";
  placeholder?: string;
  className?: string;
  formatValue?: (value: string | number | null | undefined) => string;
  parseValue?: (value: string) => string | number | null;
}

export function EditableCell({
  value,
  onSave,
  type = "text",
  placeholder = "Click to edit",
  className,
  formatValue,
  parseValue,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format display value
  const displayValue = formatValue
    ? formatValue(value)
    : value === null || value === undefined
      ? "—"
      : String(value);

  // Initialize edit value when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (type === "currency" || type === "number") {
        // For numbers, show the raw number without formatting
        const numValue = typeof value === "number" ? value : value ? parseFloat(String(value)) : null;
        setEditValue(numValue !== null && !isNaN(numValue) ? String(numValue) : "");
      } else {
        setEditValue(value ? String(value) : "");
      }
      // Focus input after a brief delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, value, type]);

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      let valueToSave: string | number | null;

      if (type === "currency" || type === "number") {
        // Parse number value
        const trimmed = editValue.trim();
        if (trimmed === "") {
          valueToSave = null;
        } else {
          const parsed = parseFloat(trimmed);
          if (isNaN(parsed)) {
            // Invalid number, cancel edit
            handleCancel();
            return;
          }
          valueToSave = parsed;
        }
      } else {
        // Text value
        if (parseValue) {
          valueToSave = parseValue(editValue);
        } else {
          valueToSave = editValue.trim() || null;
        }
      }

      await onSave(valueToSave);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      // Keep editing mode on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    // Only save on blur if value changed
    const currentValue = type === "currency" || type === "number"
      ? (value !== null && value !== undefined ? String(value) : "")
      : (value ? String(value) : "");
    
    if (editValue !== currentValue) {
      handleSave();
    } else {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type === "currency" || type === "number" ? "number" : "text"}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-auto py-1 px-2 text-sm",
          // Constrain width to prevent table resizing
          type === "currency" || type === "number" 
            ? "w-24 max-w-24" 
            : "w-full max-w-full",
          // Hide number input steppers
          (type === "currency" || type === "number") && "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]",
          className
        )}
        placeholder={placeholder}
        disabled={isSaving}
        step={type === "currency" ? "0.01" : undefined}
      />
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded py-1 min-h-[28px] flex items-center transition-colors",
        className
      )}
      title="Click to edit"
    >
      {displayValue}
    </div>
  );
}

