"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CheckSquare, Square, GripVertical, MoreHorizontal, Calendar, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageHeader, StageEmptyState } from "@/components/projects/stage-tabs";
import { cn } from "@/lib/utils";
import { getStageTasks, createTask, updateTask, deleteTask } from "@/lib/actions/tasks";
import type { Task } from "@/lib/db/schema";
import { useToast } from "@/components/ui/use-toast";

interface TasksStageProps {
  stageId: string;
  stageName: string;
  projectId?: string;
}

const priorityConfig = {
  low: { label: "Low", className: "bg-gray-500/10 text-gray-600" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-600" },
};

export function TasksStage({ stageId, stageName }: TasksStageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");

  const loadTasks = useCallback(async () => {
    try {
      const data = await getStageTasks(stageId);
      setTasks(data);
    } catch (error) {
      console.error("Failed to load tasks:", error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, toast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      await createTask({
        stageId,
        title: newTaskTitle,
        priority: newTaskPriority,
      });

      setNewTaskTitle("");
      setNewTaskPriority("medium");
      setIsDialogOpen(false);
      loadTasks();

      toast({
        title: "Success",
        description: "Task created successfully.",
      });
    } catch (error) {
      console.error("Failed to create task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (task: Task) => {
    // Optimistic update
    const newStatus = task.status === "completed" ? "pending" : "completed";
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error("Failed to update task:", error);
      // Revert on error
      loadTasks();
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    // Optimistic update
    setTasks(tasks.filter(t => t.id !== taskId));

    try {
      await deleteTask(taskId);
      toast({
        title: "Success",
        description: "Task deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Revert on error
      loadTasks();
      toast({
        title: "Error",
        description: "Failed to delete task.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
    }).format(new Date(date));
  };

  const completedCount = tasks.filter(t => t.status === "completed").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description={tasks.length > 0 ? `${completedCount} of ${tasks.length} tasks completed` : "Track to-do items, milestones, and action items"}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a new task for this stage.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTask}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="e.g., Submit application"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTaskPriority}
                      onValueChange={(v: "low" | "medium" | "high" | "urgent") => setNewTaskPriority(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newTaskTitle.trim() || isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Task
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {tasks.length === 0 ? (
        <StageEmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create tasks to track action items and keep your project on schedule."
          action={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const isCompleted = task.status === "completed";

            return (
              <Card key={task.id} className="group">
                <CardContent className="flex items-center gap-3 py-3">
                  <button className="cursor-grab text-muted-foreground hover:text-foreground">
                    <GripVertical className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(task)}
                    className="shrink-0"
                  >
                    {isCompleted ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      isCompleted && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.dueDate && (
                      <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(task.dueDate)}
                      </div>
                    )}
                    <Badge variant="secondary" className={cn("hidden sm:inline-flex", priority.className)}>
                      {priority.label}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          // TODO: Implement edit
                          toast({ description: "Edit functionality coming soon" });
                        }}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
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
    </>
  );
}




