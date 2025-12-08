import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, MoreHorizontal } from "lucide-react";
import { getProject, getStage } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/projects/status-badge";
import { EnhancedFilesStage } from "@/components/stages/enhanced-files-module";
import { TasksStage } from "@/components/stages/tasks-module";
import { CostsStage } from "@/components/stages/costs-module";
import { PaymentsStage } from "@/components/stages/payments-module";
import { NotesStage } from "@/components/stages/notes-module";
import { TimelineStage } from "@/components/stages/timeline-module";
import { ApprovalsStage } from "@/components/stages/approvals-module";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { Stage } from "@/lib/db/schema";

interface StageDetailPageProps {
  params: Promise<{ id: string; phaseSlug: string; stageId: string }>;
}

export default async function StageDetailPage({ params }: StageDetailPageProps) {
  const { id, phaseSlug, stageId } = await params;
  const [project, stage, currentUser] = await Promise.all([
    getProject(id),
    getStage(stageId),
    getCurrentUser(),
  ]);

  if (!project || !stage) {
    notFound();
  }

  if (!currentUser) {
    notFound();
  }

  const renderStageContent = () => {
    const commonProps = {
      stageId: stage.id,
      stageName: stage.name,
      projectId: id,
    };

    switch (stage.moduleType.code) {
      case "files":
        return (
          <EnhancedFilesStage
            stage={stage as Stage & { moduleType: { code: string; defaultName: string } }}
            projectId={id}
            phaseId={stage.phaseId}
            currentUserId={currentUser.id}
          />
        );
      case "tasks":
        return <TasksStage {...commonProps} />;
      case "costs":
        return <CostsStage {...commonProps} />;
      case "payments":
        return <PaymentsStage {...commonProps} />;
      case "notes":
        return <NotesStage {...commonProps} />;
      case "timeline":
        return <TimelineStage {...commonProps} />;
      case "approvals":
        return (
          <ApprovalsStage
            {...commonProps}
            currentRound={stage.currentRound}
            currentUserId={currentUser.id}
          />
        );
      default:
        return (
          <div className="p-8 text-center border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">
              This stage type ({(stage.moduleType as { defaultName: string }).defaultName}) is not yet implemented.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Header */}
      <div className="flex items-start gap-4">
        {/* Back button */}
        <Button variant="ghost" size="icon" asChild className="shrink-0 mt-0.5">
          <Link href={`/projects/${id}/${phaseSlug}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to stages</span>
          </Link>
        </Button>

        {/* Title and meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold truncate">{stage.name}</h1>
            <StatusBadge status={stage.status} type="stage" />
          </div>
          {stage.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {stage.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
            <span>{stage.moduleType.defaultName} module</span>
            {stage.allowsRounds && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>Round {stage.currentRound}</span>
              </>
            )}
            {stage.requiresApproval && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                <span>Approval required</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop actions */}
          <Button variant="outline" size="sm" className="hidden sm:flex" asChild>
            <Link href={`/projects/${id}/${phaseSlug}/stages/${stageId}/configure`}>
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Link>
          </Button>

          {/* Mobile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="sm:hidden h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${id}/${phaseSlug}/stages/${stageId}/configure`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Stage
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stage Module Content */}
      {renderStageContent()}
    </div>
  );
}
