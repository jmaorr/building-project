"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "archived";
type PhaseStatus = "not_started" | "in_progress" | "completed";
type StageStatus = "not_started" | "in_progress" | "awaiting_approval" | "completed" | "on_hold";
type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

const projectStatusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  active: { label: "Active", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  on_hold: { label: "On Hold", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  archived: { label: "Archived", className: "bg-gray-500/10 text-gray-500 dark:text-gray-500" },
};

const phaseStatusConfig: Record<PhaseStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
};

const stageStatusConfig: Record<StageStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  awaiting_approval: { label: "Awaiting Approval", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  on_hold: { label: "On Hold", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

const taskStatusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-500/10 text-gray-600 dark:text-gray-400" },
  in_progress: { label: "In Progress", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

interface StatusBadgeProps {
  status: string;
  type?: "project" | "phase" | "stage" | "task";
  className?: string;
}

export function StatusBadge({ status, type = "project", className }: StatusBadgeProps) {
  let config;
  
  switch (type) {
    case "phase":
      config = phaseStatusConfig[status as PhaseStatus];
      break;
    case "stage":
      config = stageStatusConfig[status as StageStatus];
      break;
    case "task":
      config = taskStatusConfig[status as TaskStatus];
      break;
    default:
      config = projectStatusConfig[status as ProjectStatus];
  }

  if (!config) {
    config = { label: status, className: "bg-gray-500/10 text-gray-600" };
  }

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}




