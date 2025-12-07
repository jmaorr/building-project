import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  children: (moduleId: string, moduleTypeCode: string) => React.ReactNode;
  className?: string;
}

export function ModuleTabs({
  modules,
  children,
  className
}: ModuleTabsProps) {
  const enabledModules = modules.filter(m => m.isEnabled);
  const defaultValue = enabledModules[0]?.id;

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
          const displayName = module.customName || module.moduleType.defaultName;

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

interface ModuleHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    className?: string;
}

export function ModuleHeader({ title, description, actions, className }: ModuleHeaderProps) {
    return (
        <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}

interface ModuleEmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export function ModuleEmptyState({
    icon: Icon,
    title,
    description,
    action,
    className
}: ModuleEmptyStateProps) {
    return (
        <Card className={cn("border-dashed", className)}>
            <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">{title}</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-sm">
                    {description}
                </p>
                {action}
            </CardContent>
        </Card>
    );
}
