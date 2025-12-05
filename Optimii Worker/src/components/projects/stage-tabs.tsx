"use client";

import * as React from "react";
import {
  FileText,
  CheckSquare,
  DollarSign,
  Receipt,
  MessageSquare,
  Calendar,
  ClipboardCheck,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Stage } from "@/lib/db/schema";

// Stage icon mapping
const stageIcons: Record<string, LucideIcon> = {
  files: FileText,
  tasks: CheckSquare,
  costs: DollarSign,
  payments: Receipt,
  notes: MessageSquare,
  timeline: Calendar,
  approvals: ClipboardCheck,
};

interface StageTabsProps {
  stages: (Stage & {
    moduleType: {
      code: string;
      defaultName: string;
      icon?: string;
    }
  })[];
  defaultStage?: string;
  children: (stageId: string, moduleTypeCode: string) => React.ReactNode;
  className?: string;
}

export function StageTabs({
  stages,
  defaultStage,
  children,
  className
}: StageTabsProps) {
  const enabledStages = stages.filter(s => s.isEnabled);
  const defaultValue = defaultStage || enabledStages[0]?.id;

  if (enabledStages.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No stages enabled for this phase.
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultValue} className={cn("space-y-4", className)}>
      <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-transparent p-0">
        {enabledStages.map((stage) => {
          const Icon = stageIcons[stage.moduleTypeId] || FileText;
          const displayName = ("name" in stage && stage.name) || stage.customName || stage.moduleType.defaultName;

          return (
            <TabsTrigger
              key={stage.id}
              value={stage.id}
              className="data-[state=active]:bg-muted data-[state=active]:shadow-none gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{displayName}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {enabledStages.map((stage) => (
        <TabsContent key={stage.id} value={stage.id} className="mt-4">
          {children(stage.id, stage.moduleTypeId)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Individual stage header component
interface StageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function StageHeader({ title, description, actions }: StageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-title">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

// Empty state for stages
interface StageEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function StageEmptyState({
  icon: Icon = FileText,
  title,
  description,
  action
}: StageEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
        {description}
      </p>
      {action}
    </div>
  );
}




