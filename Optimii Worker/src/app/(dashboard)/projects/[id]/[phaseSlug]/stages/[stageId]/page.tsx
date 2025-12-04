import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings, MoreHorizontal } from "lucide-react";
import { getProject, getProjectPhases, getStage } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/projects/status-badge";
import { EnhancedFilesModule } from "@/components/modules/enhanced-files-module";
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
  const [project, phases, stage, currentUser] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
    getStage(stageId),
    getCurrentUser(),
  ]);
  
  if (!project || !stage) {
    notFound();
  }

  if (!currentUser) {
    notFound();
  }

  const phase = phases.find(p => p.id === stage.phaseId);
  const phaseName = phase?.name || "Phase";

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
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Settings className="mr-2 h-4 w-4" />
            Configure
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
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Configure Stage
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete Stage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stage Module Content */}
      <EnhancedFilesModule 
        stage={stage as Stage & { moduleType: { code: string; defaultName: string } }} 
        projectId={id}
        phaseId={stage.phaseId}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
