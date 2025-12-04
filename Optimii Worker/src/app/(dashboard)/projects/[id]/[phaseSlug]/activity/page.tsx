import { notFound } from "next/navigation";
import { getProject, getProjectPhases } from "@/lib/actions/projects";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  FileUp, 
  MessageSquare, 
  CheckCircle2, 
  RefreshCw,
  Clock,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityPageProps {
  params: Promise<{ id: string; phaseSlug: string }>;
}

const slugToPhaseName: Record<string, string> = {
  design: "Design",
  build: "Build",
  certification: "Certification",
};

const activityTypeConfig = {
  file_uploaded: { 
    label: "File uploaded", 
    icon: FileUp, 
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  comment_added: { 
    label: "Comment added", 
    icon: MessageSquare, 
    color: "text-purple-600",
    bgColor: "bg-purple-500/10"
  },
  status_changed: { 
    label: "Status changed", 
    icon: RefreshCw, 
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10"
  },
  stage_completed: { 
    label: "Stage completed", 
    icon: CheckCircle2, 
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  approval_requested: { 
    label: "Approval requested", 
    icon: Clock, 
    color: "text-orange-600",
    bgColor: "bg-orange-500/10"
  },
};

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { id, phaseSlug } = await params;
  const [project, phases] = await Promise.all([
    getProject(id),
    getProjectPhases(id),
  ]);
  
  if (!project) {
    notFound();
  }

  const phaseName = slugToPhaseName[phaseSlug];
  const phase = phases.find((p) => p.name === phaseName);
  
  if (!phase) {
    notFound();
  }

  // TODO: Get actual activity data from database
  const activities: Array<{
    id: string;
    type: keyof typeof activityTypeConfig;
    description: string;
    userName: string;
    userAvatar?: string;
    createdAt: Date;
    stageName?: string;
  }> = [];

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, typeof activities>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all changes and updates in the {phaseName.toLowerCase()} phase
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              All Activity
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>All Activity</DropdownMenuItem>
            <DropdownMenuItem>File Uploads</DropdownMenuItem>
            <DropdownMenuItem>Comments</DropdownMenuItem>
            <DropdownMenuItem>Status Changes</DropdownMenuItem>
            <DropdownMenuItem>Approvals</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">No activity yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Activity will appear here as you make progress on this phase.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities).map(([date, dayActivities]) => (
            <div key={date} className="space-y-3">
              {/* Date header */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {new Date(date).toLocaleDateString("en-AU", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Activity items */}
              <div className="space-y-2">
                {dayActivities.map((activity) => {
                  const config = activityTypeConfig[activity.type];
                  const Icon = config.icon;

                  return (
                    <Card key={activity.id} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="flex items-start gap-3 py-3 px-4">
                        {/* Icon */}
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{activity.userName}</span>{" "}
                            <span className="text-muted-foreground">{activity.description}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {activity.stageName && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.stageName}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
