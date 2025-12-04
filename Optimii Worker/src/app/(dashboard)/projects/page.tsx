import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjects, getProjectPhases } from "@/lib/actions/projects";
import { calculateProjectProgress } from "@/lib/utils/project-utils";
import type { Project, Phase } from "@/lib/db/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { CardGridSkeleton } from "@/components/ui/card-grid-skeleton";
import { getActiveOrganization } from "@/lib/organizations/get-active-organization";
import { SystemStatusBanner } from "@/components/status/system-status-banner";
import { getSystemStatus } from "@/lib/status/system-status";

interface SearchParams {
  status?: string;
  search?: string;
}

async function ProjectList({
  searchParams,
  orgId,
}: {
  searchParams: SearchParams;
  orgId: string;
}) {
  const projects = await getProjects({
    status: searchParams.status as Project["status"] | undefined,
    search: searchParams.search,
    orgId,
  });

  // Get phases for each project to calculate progress
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const phases = await getProjectPhases(project.id);
      const progress = calculateProjectProgress(project, phases);
      const currentPhase = phases.find((p) => p.status === "in_progress")?.name;
      return { project, progress, currentPhase };
    })
  );

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title="No projects found"
        description={
          searchParams.search || searchParams.status
            ? "Try adjusting your search or filters"
            : "Create your first project to get started"
        }
        action={
          !searchParams.search && !searchParams.status ? (
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Link>
            </Button>
          ) : null
        }
        className="py-16"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projectsWithProgress.map(({ project, progress, currentPhase }) => (
        <ProjectCard
          key={project.id}
          project={project}
          progress={progress}
          currentPhase={currentPhase}
        />
      ))}
    </div>
  );
}

function ProjectListSkeleton() {
  return <CardGridSkeleton />;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [organization, systemStatus] = await Promise.all([
    getActiveOrganization(),
    getSystemStatus(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your building and renovation projects."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search projects..."
            defaultValue={params.search}
            className="pl-9"
          />
        </form>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              {params.status ? `Status: ${params.status}` : "All Status"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/projects">All</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects?status=active">Active</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects?status=draft">Draft</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects?status=on_hold">On Hold</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects?status=completed">Completed</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/projects?status=archived">Archived</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SystemStatusBanner status={systemStatus} />

      {/* Project Grid */}
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList searchParams={params} orgId={organization.id} />
      </Suspense>
    </div>
  );
}
