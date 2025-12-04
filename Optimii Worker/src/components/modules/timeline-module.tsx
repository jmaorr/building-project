"use client";

import { useState } from "react";
import { Plus, Calendar, Flag, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface TimelineModuleProps {
  moduleId: string;
  moduleName: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  type: "milestone" | "deadline" | "event" | "meeting" | "inspection";
  isCompleted: boolean;
}

const mockEvents: TimelineEvent[] = [
  { id: "1", title: "Design Concept Approval", date: new Date("2024-01-20"), type: "milestone", isCompleted: true },
  { id: "2", title: "DA Submission", date: new Date("2024-02-01"), type: "deadline", isCompleted: true, description: "Submit development application to council" },
  { id: "3", title: "Council Meeting", date: new Date("2024-02-15"), type: "meeting", isCompleted: true, description: "Pre-lodgement meeting with council planners" },
  { id: "4", title: "Design Documentation Complete", date: new Date("2024-03-01"), type: "milestone", isCompleted: false },
  { id: "5", title: "DA Approval Expected", date: new Date("2024-03-15"), type: "deadline", isCompleted: false },
  { id: "6", title: "Construction Start", date: new Date("2024-04-01"), type: "milestone", isCompleted: false },
];

const typeConfig = {
  milestone: { label: "Milestone", icon: Flag, color: "text-brand" },
  deadline: { label: "Deadline", icon: AlertCircle, color: "text-red-600" },
  event: { label: "Event", icon: Calendar, color: "text-blue-600" },
  meeting: { label: "Meeting", icon: Clock, color: "text-purple-600" },
  inspection: { label: "Inspection", icon: CheckCircle2, color: "text-green-600" },
};

export function TimelineModule({ moduleId, moduleName }: TimelineModuleProps) {
  const [events] = useState(mockEvents);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Group by past/upcoming
  const now = new Date();
  const pastEvents = sortedEvents.filter(e => e.date < now || e.isCompleted);
  const upcomingEvents = sortedEvents.filter(e => e.date >= now && !e.isCompleted);

  if (events.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Key dates, deadlines, and milestones"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          }
        />
        <ModuleEmptyState
          icon={Calendar}
          title="No events scheduled"
          description="Add key dates, milestones, and deadlines to track your project timeline."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <ModuleHeader 
        title={moduleName}
        description="Key dates, deadlines, and milestones"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Button>
        }
      />
      
      <div className="space-y-6">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Upcoming</h4>
            <div className="relative space-y-4 pl-6 border-l-2 border-brand">
              {upcomingEvents.map((event) => {
                const config = typeConfig[event.type];
                const Icon = config.icon;
                
                return (
                  <div key={event.id} className="relative">
                    <div className={cn(
                      "absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-brand"
                    )}>
                      <div className="h-2 w-2 rounded-full bg-brand" />
                    </div>
                    
                    <Card>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{event.title}</span>
                              <Badge variant="secondary" className="text-xs">
                                {config.label}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDate(event.date)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Completed</h4>
            <div className="relative space-y-4 pl-6 border-l-2 border-muted">
              {pastEvents.reverse().map((event) => {
                const config = typeConfig[event.type];
                const Icon = config.icon;
                
                return (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-muted">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </div>
                    
                    <Card className="opacity-75">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium line-through text-muted-foreground">
                                {event.title}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatDate(event.date)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}




