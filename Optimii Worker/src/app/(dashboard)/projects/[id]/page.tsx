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
  getProjectStats
} from "@/lib/actions/projects";
import { calculateProjectProgress } from "@/lib/utils/project-utils";
import { getProjectContacts } from "@/lib/actions/contacts";
import { createPhaseSlug } from "@/lib/utils/slug";

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

  const progress = calculateProjectProgress(project, phases);
  const currentPhase = phases.find((p) => p.status === "in_progress");

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
            <div className="text-2xl font-bold">{progress}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold truncate">
              {formatCurrency(project.budget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Contract: {formatCurrency(project.contractValue)}
            </p>
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
