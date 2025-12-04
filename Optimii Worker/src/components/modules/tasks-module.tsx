"use client";

import { useState } from "react";
import { Plus, CheckSquare, Square, GripVertical, MoreHorizontal, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface TasksModuleProps {
  moduleId: string;
  moduleName: string;
}

interface Task {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  assignee?: string;
}

const mockTasks: Task[] = [
  { id: "1", title: "Submit DA application", status: "completed", priority: "high", dueDate: new Date("2024-02-01") },
  { id: "2", title: "Review structural drawings", status: "in_progress", priority: "high", dueDate: new Date("2024-02-20") },
  { id: "3", title: "Finalize material selections", status: "pending", priority: "medium", dueDate: new Date("2024-02-28") },
  { id: "4", title: "Coordinate with council", status: "pending", priority: "medium" },
  { id: "5", title: "Order long-lead items", status: "pending", priority: "low" },
];

const priorityConfig = {
  low: { label: "Low", className: "bg-gray-500/10 text-gray-600" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-600" },
  high: { label: "High", className: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-600" },
};

export function TasksModule({ moduleId, moduleName }: TasksModuleProps) {
  const [tasks, setTasks] = useState(mockTasks);

  const toggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          status: task.status === "completed" ? "pending" : "completed"
        };
      }
      return task;
    }));
  };

  const formatDate = (date?: Date) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  const completedCount = tasks.filter(t => t.status === "completed").length;

  if (tasks.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Track to-do items, milestones, and action items"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          }
        />
        <ModuleEmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Create tasks to track action items and keep your project on schedule."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
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
        description={`${completedCount} of ${tasks.length} tasks completed`}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        }
      />
      
      <div className="space-y-2">
        {tasks.map((task) => {
          const priority = priorityConfig[task.priority];
          const isCompleted = task.status === "completed";
          
          return (
            <Card key={task.id} className="group">
              <CardContent className="flex items-center gap-3 py-3">
                <button className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-4 w-4" />
                </button>
                
                <button 
                  onClick={() => toggleTaskStatus(task.id)}
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Assign</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}




