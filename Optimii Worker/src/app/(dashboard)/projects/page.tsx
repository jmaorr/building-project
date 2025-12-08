import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Share2 } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectGrid } from "@/components/projects/project-grid";
import { getProjects, getProjectPhases, type ProjectWithAccess } from "@/lib/actions/projects";
import { calculateProjectProgress } from "@/lib/utils/project-utils";
import type { Project } from "@/lib/db/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeletons";
import { SuspenseFallback } from "@/components/ui/suspense-fallback";
import { SystemStatusBanner } from "@/components/status/system-status-banner";
import { getSystemStatus } from "@/lib/status/system-status";

interface SearchParams {
  status?: string;
  search?: string;
  view?: string; // "all" | "owned" | "shared"
}

async function ProjectList({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Get all projects (owned + shared)
  const allProjects = await getProjects({
    status: searchParams.status as Project["status"] | undefined,
    search: searchParams.search,
    includeShared: searchParams.view !== "owned",
  });

  // Filter by view if specified
  let projects = allProjects;
  if (searchParams.view === "owned") {
    projects = allProjects.filter(p => p.accessType === "owned");
  } else if (searchParams.view === "shared") {
    projects = allProjects.filter(p => p.accessType === "shared");
  }

  // Get phases for each project to calculate progress
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const phases = await getProjectPhases(project.id);
      const progress = calculateProjectProgress(project, phases);
      const currentPhase = phases.find((p) => p.status === "in_progress")?.name;
      return { 
        project, 
        progress, 
        currentPhase,
        accessType: project.accessType,
        permission: project.permission,
      };
    })
  );

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title="No projects found"
        description={
          searchParams.search || searchParams.status || searchParams.view
            ? "Try adjusting your search or filters"
            : "Create your first project to get started"
        }
        action={
          !searchParams.search && !searchParams.status && !searchParams.view ? (
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

  return <ProjectGrid items={projectsWithProgress} />;
}

function ProjectListSkeleton() {
  return <SuspenseFallback type="card" count={6} />;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const systemStatus = await getSystemStatus();

  // Count projects for filter badges
  const allProjects = await getProjects({});
  const ownedCount = allProjects.filter(p => p.accessType === "owned").length;
  const sharedCount = allProjects.filter(p => p.accessType === "shared").length;

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
        
        {/* View filter (owned/shared) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <Share2 className="mr-2 h-4 w-4" />
              {params.view === "owned" ? "My Projects" : params.view === "shared" ? "Shared with Me" : "All Projects"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/projects${params.status ? `?status=${params.status}` : ""}`}>
                All Projects
                <Badge variant="secondary" className="ml-auto">{allProjects.length}</Badge>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?view=owned${params.status ? `&status=${params.status}` : ""}`}>
                My Projects
                <Badge variant="secondary" className="ml-auto">{ownedCount}</Badge>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?view=shared${params.status ? `&status=${params.status}` : ""}`}>
                Shared with Me
                <Badge variant="secondary" className="ml-auto">{sharedCount}</Badge>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status filter */}
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
              <Link href={`/projects${params.view ? `?view=${params.view}` : ""}`}>All</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?status=active${params.view ? `&view=${params.view}` : ""}`}>Active</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?status=draft${params.view ? `&view=${params.view}` : ""}`}>Draft</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?status=on_hold${params.view ? `&view=${params.view}` : ""}`}>On Hold</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?status=completed${params.view ? `&view=${params.view}` : ""}`}>Completed</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects?status=archived${params.view ? `&view=${params.view}` : ""}`}>Archived</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SystemStatusBanner status={systemStatus} />

      {/* Project Grid */}
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList searchParams={params} />
      </Suspense>
    </div>
  );
}
