import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { getStagesApprovalStatuses } from "@/lib/actions/approvals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/projects/status-badge";
import { AddStageDialog } from "@/components/stages";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";
import { 
  ChevronRight, 
  Layers, 
  Plus, 
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";

interface PhaseDashboardPageProps {
  params: Promise<{ id: string; phaseSlug: string }>;
}

export default async function PhaseDashboardPage({ params }: PhaseDashboardPageProps) {
  const { id, phaseSlug } = await params;
  const [project, phases] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
  ]);
  
  if (!project) {
    notFound();
  }

  const phase = resolvePhaseFromSlug(phases, phaseSlug);
  
  if (!phase) {
    notFound();
  }

  const stages = await getPhaseStages(phase.id);
  
  // Get approval statuses for stages that require approval
  const stagesRequiringApproval = stages
    .filter(s => s.requiresApproval)
    .map(s => ({ id: s.id, currentRound: s.currentRound }));
  
  const approvalStatuses = stagesRequiringApproval.length > 0 
    ? await getStagesApprovalStatuses(stagesRequiringApproval)
    : {};

  // Calculate stats
  const totalStages = stages.length;
  const completedStages = stages.filter(s => s.status === "completed").length;
  const inProgressStages = stages.filter(s => s.status === "in_progress").length;
  
  // Count approval statuses
  const approvedCount = Object.values(approvalStatuses).filter(s => s.status === "approved").length;
  const pendingCount = Object.values(approvalStatuses).filter(s => s.status === "pending").length;
  // const rejectedCount = Object.values(approvalStatuses).filter(s => s.status === "rejected").length;
  // const needsApprovalCount = stages.filter(s => s.requiresApproval).length - approvedCount;
  
  const progressPercent = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Progress
            </CardTitle>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Stages
            </CardTitle>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold">{totalStages}</div>
            <p className="text-xs text-muted-foreground">
              {completedStages} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold">{inProgressStages}</div>
            <p className="text-xs text-muted-foreground">
              Active now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Approvals
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-2xl font-bold">{approvedCount}/{stages.filter(s => s.requiresApproval).length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingCount > 0 ? `${pendingCount} pending` : "Complete"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stages Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Stages</h2>
          <AddStageDialog 
            phaseId={phase.id} 
            projectId={id} 
            phaseSlug={phaseSlug} 
          />
        </div>

        {stages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium text-sm mb-1">No stages created yet</h3>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Add stages to track documents, approvals, and tasks.
              </p>
              <AddStageDialog 
                phaseId={phase.id} 
                projectId={id} 
                phaseSlug={phaseSlug}
                trigger={
                  <Button size="sm" className="mt-3">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create First Stage
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {stages.map((stage, index) => {
              return (
                <Link 
                  key={stage.id} 
                  href={`/projects/${id}/${phaseSlug}/stages/${stage.id}`}
                  className="block group"
                >
                  <Card className="hover:border-brand/50 hover:bg-muted/30 transition-colors py-0">
                    <CardContent className="flex items-center gap-3 py-3 px-4">
                      {/* Order number */}
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                        {index + 1}
                      </div>
                      
                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium truncate">{stage.name}</h3>
                          <StatusBadge status={stage.status} type="stage" />
                        </div>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{stage.moduleType.defaultName}</span>
                          {stage.allowsRounds && (
                            <>
                              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
                              <span>Round {stage.currentRound}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

