"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Activity, FileUp, MessageSquare, CheckCircle2, RefreshCw, Clock, Filter, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getActivityByPhase } from "@/lib/actions/activity";
import { getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { resolvePhaseFromSlug } from "@/lib/utils/slug";
import type { ActivityLog } from "@/lib/db/schema";

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
  approval_approved: {
    label: "Approval approved",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  approval_rejected: {
    label: "Approval rejected",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-500/10"
  },
  round_started: {
    label: "Round started",
    icon: Play,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  stage_created: {
    label: "Stage created",
    icon: Activity,
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10"
  },
};

export default function ActivityPage() {
  const params = useParams();
  const id = params.id as string;
  const phaseSlug = params.phaseSlug as string;

  const [activities, setActivities] = useState<(ActivityLog & { userName?: string; stageName?: string })[]>([]);
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ActivityLog["type"] | "all">("all");
  const [filterStage, setFilterStage] = useState<string | "all">("all");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const phases = await getProjectPhases(id);
        const phase = resolvePhaseFromSlug(phases, phaseSlug);
        
        if (!phase) return;

        const [phaseActivities, phaseStages] = await Promise.all([
          getActivityByPhase(phase.id),
          getPhaseStages(phase.id),
        ]);

        // Add stage names to activities
        const activitiesWithNames = phaseActivities.map(activity => ({
          ...activity,
          stageName: activity.stageId 
            ? phaseStages.find(s => s.id === activity.stageId)?.name 
            : undefined,
        }));

        setActivities(activitiesWithNames);
        setStages(phaseStages.map(s => ({ id: s.id, name: s.name })));
      } catch (error) {
        console.error("Failed to load activity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, phaseSlug]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (filterType !== "all") {
      filtered = filtered.filter(a => a.type === filterType);
    }

    if (filterStage !== "all") {
      filtered = filtered.filter(a => a.stageId === filterStage);
    }

    return filtered;
  }, [activities, filterType, filterStage]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, typeof filteredActivities> = {};
    
    filteredActivities.forEach(activity => {
      const date = new Date(activity.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  }, [filteredActivities]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
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
    }).format(new Date(date));
  };

  const getActivityDescription = (activity: ActivityLog & { stageName?: string }) => {
    const config = activityTypeConfig[activity.type];
    let description = config.label;

    // Parse metadata if available
    let metadata: Record<string, unknown> | null = null;
    if (activity.metadata) {
      try {
        metadata = JSON.parse(activity.metadata);
      } catch {
        // Ignore parse errors
      }
    }

    // Add context from metadata
    if (metadata) {
      if (metadata.fileName) {
        description += `: ${metadata.fileName}`;
      }
      if (metadata.oldStatus && metadata.newStatus) {
        description += `: ${metadata.oldStatus} → ${metadata.newStatus}`;
      }
      if (metadata.stageName) {
        description += `: ${metadata.stageName}`;
      }
    }

    return description;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Activity Log</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all changes and updates in this phase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                {filterType === "all" ? "All Activity" : activityTypeConfig[filterType]?.label || "Filter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                All Activity
              </DropdownMenuItem>
              {Object.entries(activityTypeConfig).map(([type, config]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setFilterType(type as ActivityLog["type"])}
                >
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {stages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  {filterStage === "all" ? "All Stages" : stages.find(s => s.id === filterStage)?.name || "Filter"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Stage</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterStage("all")}>
                  All Stages
                </DropdownMenuItem>
                {stages.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => setFilterStage(stage.id)}
                  >
                    {stage.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {activities.length === 0 ? "No activity yet" : "No activity matches your filters"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {activities.length === 0
                ? "Activity will appear here as you make progress on this phase."
                : "Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedActivities)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, dayActivities]) => (
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
                              <span className="font-medium">User</span>{" "}
                              <span className="text-muted-foreground">
                                {getActivityDescription(activity)}
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {activity.stageName && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.stageName}
                                </Badge>
                              )}
                              {activity.roundNumber && activity.roundNumber > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  Round {activity.roundNumber}
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
