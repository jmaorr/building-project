"use client";

import * as React from "react";
import { ModuleTabs } from "./module-tabs";
import { FilesModule } from "@/components/modules/files-module";
import { TasksModule } from "@/components/modules/tasks-module";
import { CostsModule } from "@/components/modules/costs-module";
import { PaymentsModule } from "@/components/modules/payments-module";
import { NotesModule } from "@/components/modules/notes-module";
import { TimelineModule } from "@/components/modules/timeline-module";
import { ApprovalsModule } from "@/components/modules/approvals-module";
import type { PhaseModule } from "@/lib/db/schema";

interface PhaseModulesContainerProps {
  modules: (PhaseModule & { 
    moduleType: { 
      code: string; 
      defaultName: string; 
      icon?: string;
    } 
  })[];
}

export function PhaseModulesContainer({ modules }: PhaseModulesContainerProps) {
  const renderModuleContent = (moduleId: string, moduleTypeCode: string) => {
    const moduleData = modules.find(m => m.id === moduleId);
    if (!moduleData) return null;

    const moduleName = moduleData.customName || moduleData.moduleType.defaultName;

    switch (moduleTypeCode) {
      case "files":
        return <FilesModule moduleId={moduleId} moduleName={moduleName} />;
      case "tasks":
        return <TasksModule moduleId={moduleId} moduleName={moduleName} />;
      case "costs":
        return <CostsModule moduleId={moduleId} moduleName={moduleName} />;
      case "payments":
        return <PaymentsModule moduleId={moduleId} moduleName={moduleName} />;
      case "notes":
        return <NotesModule moduleId={moduleId} moduleName={moduleName} />;
      case "timeline":
        return <TimelineModule moduleId={moduleId} moduleName={moduleName} />;
      case "approvals":
        return <ApprovalsModule moduleId={moduleId} moduleName={moduleName} />;
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Unknown module type: {moduleTypeCode}
          </div>
        );
    }
  };

  return (
    <ModuleTabs modules={modules}>
      {renderModuleContent}
    </ModuleTabs>
  );
}




