import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Building2,
  Users,
  ChevronRight,
  Clock,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import {
  getProject,
  getProjectPhases,
  getProjectStats,
  getPhaseStages
} from "@/lib/actions/projects";
import { getProjectContacts } from "@/lib/actions/contacts";
import { createPhaseSlug } from "@/lib/utils/slug";
import { getCostsByProject } from "@/lib/actions/costs";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = await getProject(id);
  
  if (!project) {
    notFound();
  }

  const [phases, contacts, stats] = await Promise.all([
    getProjectPhases(id),
    getProjectContacts(id),
    getProjectStats(id),
  ]);

  // Get all stages across all phases and calculate progress per phase
  const phasesWithStages = await Promise.all(
    phases.map(async (phase) => {
      const phaseStages = await getPhaseStages(phase.id);
      const total = phaseStages.length;
      const completed = phaseStages.filter(s => s.status === "completed").length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        phase,
        stages: phaseStages,
        total,
        completed,
        progress,
      };
    })
  );
  const flattenedStages = phasesWithStages.flatMap(p => p.stages);
  const totalStages = flattenedStages.length;
  const completedStages = flattenedStages.filter(s => s.status === "completed").length;

  // Find current phase and first active stage
  const currentPhase = phases.find((p) => p.status === "in_progress");
  let activeStage: { id: string; phaseSlug: string } | null = null;
  if (currentPhase) {
    const currentPhaseStages = await getPhaseStages(currentPhase.id);
    const firstActiveStage = currentPhaseStages.find(s => s.status === "in_progress" || s.status === "awaiting_approval");
    if (firstActiveStage) {
      activeStage = {
        id: firstActiveStage.id,
        phaseSlug: createPhaseSlug(currentPhase)
      };
    }
  }

  // Get all costs for the project
  const allCosts = await getCostsByProject(id);
  const totalQuoted = allCosts.reduce((sum, c) => sum + (c.quotedAmount ?? 0), 0);
  const totalActual = allCosts.reduce((sum, c) => sum + (c.actualAmount ?? 0), 0);
  const totalPaid = allCosts.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Meta Info Row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {project.address && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{project.address}</span>
          </div>
        )}
        {project.buildingType && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span>{project.buildingType}</span>
          </div>
        )}
        {project.targetCompletion && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Target: {formatDate(project.targetCompletion)}</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {phasesWithStages.length > 0 ? (
                <>
                  <div className="space-y-2">
                    {phasesWithStages.map(({ phase, completed, total }) => (
                      <div key={phase.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{phase.name}:</span>
                        <span className="font-medium">{completed}/{total}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Overall</span>
                      <span className="font-medium">
                        {totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ 
                          width: `${totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No phases yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {activeStage ? (
          <Link href={`/projects/${id}/${activeStage.phaseSlug}/stages/${activeStage.id}`}>
            <Card className="hover:border-brand/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Current Phase
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold truncate">
                  {currentPhase?.name || "Not Started"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completedPhases} of {stats.totalPhases} completed
                </p>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Phase
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold truncate">
                {currentPhase?.name || "Not Started"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedPhases} of {stats.totalPhases} completed
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quoted:</span>
                <span className="font-medium">{formatCurrency(totalQuoted)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Actual:</span>
                <span className="font-medium">{formatCurrency(totalActual)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Size
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Phases Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Phases</h2>
          
          <div className="space-y-2">
            {phases.map((phase, index) => {
              const phaseSlug = createPhaseSlug(phase);
              return (
                <Link
                  key={phase.id}
                  href={`/projects/${id}/${phaseSlug}`}
                  className="block"
                >
                  <Card className="hover:border-brand/50 transition-colors">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{phase.name}</span>
                          <StatusBadge status={phase.status} type="phase" />
                        </div>
                        {phase.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {phase.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${id}/contacts`}>
                Manage
              </Link>
            </Button>
          </div>
          
          {contacts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  No team members added yet
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${id}/contacts`}>
                    Add Team Members
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {contacts.slice(0, 5).map(({ contact, role }) => (
                <Card key={contact.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-brand-foreground text-sm font-medium shrink-0">
                      {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {role?.name || "Team Member"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {contacts.length > 5 && (
                <Button variant="ghost" className="w-full" asChild>
                  <Link href={`/projects/${id}/contacts`}>
                    View all {contacts.length} team members
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
