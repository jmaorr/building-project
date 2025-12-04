import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, Users, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your building projects and recent activity."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        }
      />

      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Projects"
          value="12"
          icon={FolderKanban}
          trend="+2 this month"
        />
        <StatsCard
          title="Team Members"
          value="24"
          icon={Users}
          trend="+5 invited"
        />
        <StatsCard
          title="Documents"
          value="156"
          icon={FileText}
          trend="+23 this week"
        />
        <StatsCard
          title="Tasks Completed"
          value="89%"
          icon={TrendingUp}
          trend="On track"
        />
      </div>

      {/* Recent projects */}
      <div className="space-y-4">
        <h2 className="text-heading">Recent Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCard
            name="Riverside Renovation"
            phase="Design"
            progress={35}
            status="active"
          />
          <ProjectCard
            name="Oak Street Build"
            phase="Build"
            progress={68}
            status="active"
          />
          <ProjectCard
            name="Harbor View Extension"
            phase="Certification"
            progress={90}
            status="review"
          />
        </div>
      </div>

      {/* Quick actions hint */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            Press{" "}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>{" "}
            to open the command palette for quick navigation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
}

function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectCardProps {
  name: string;
  phase: string;
  progress: number;
  status: "active" | "review" | "completed" | "on-hold";
}

function ProjectCard({ name, phase, progress, status }: ProjectCardProps) {
  const statusColors = {
    active: "bg-green-500/10 text-green-600 dark:text-green-400",
    review: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "on-hold": "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  };

  return (
    <Card className="hover:border-brand/50 transition-colors cursor-pointer">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base font-medium">{name}</CardTitle>
          <Badge variant="secondary" className={statusColors[status]}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Phase</span>
          <span className="font-medium">{phase}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}





