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
import type { PhaseModule } from "@/lib/db/schema";

// Module icon mapping
const moduleIcons: Record<string, LucideIcon> = {
  files: FileText,
  tasks: CheckSquare,
  costs: DollarSign,
  payments: Receipt,
  notes: MessageSquare,
  timeline: Calendar,
  approvals: ClipboardCheck,
};

interface ModuleTabsProps {
  modules: (PhaseModule & { 
    moduleType: { 
      code: string; 
      defaultName: string; 
      icon?: string;
    } 
  })[];
  defaultModule?: string;
  children: (moduleId: string, moduleTypeCode: string) => React.ReactNode;
  className?: string;
}

export function ModuleTabs({ 
  modules, 
  defaultModule, 
  children,
  className 
}: ModuleTabsProps) {
  const enabledModules = modules.filter(m => m.isEnabled);
  const defaultValue = defaultModule || enabledModules[0]?.id;

  if (enabledModules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No modules enabled for this phase.
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultValue} className={cn("space-y-4", className)}>
      <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap gap-1 bg-transparent p-0">
        {enabledModules.map((module) => {
          const Icon = moduleIcons[module.moduleTypeId] || FileText;
          const displayName = ("name" in module && module.name) || module.customName || module.moduleType.defaultName;
          
          return (
            <TabsTrigger 
              key={module.id} 
              value={module.id}
              className="data-[state=active]:bg-muted data-[state=active]:shadow-none gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{displayName}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      
      {enabledModules.map((module) => (
        <TabsContent key={module.id} value={module.id} className="mt-4">
          {children(module.id, module.moduleTypeId)}
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Individual module header component
interface ModuleHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function ModuleHeader({ title, description, actions }: ModuleHeaderProps) {
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

// Empty state for modules
interface ModuleEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function ModuleEmptyState({ 
  icon: Icon = FileText, 
  title, 
  description, 
  action 
}: ModuleEmptyStateProps) {
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




