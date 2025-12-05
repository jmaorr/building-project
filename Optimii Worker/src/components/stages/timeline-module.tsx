"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, Flag, Clock, CheckCircle2, AlertCircle, Loader2, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StageHeader, StageEmptyState } from "@/components/projects/stage-tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getStageTimelineEvents, createTimelineEvent, deleteTimelineEvent, toggleTimelineEventCompletion } from "@/lib/actions/timeline";
import type { TimelineEvent } from "@/lib/db/schema";

interface TimelineStageProps {
  stageId: string;
  stageName: string;
  projectId: string;
}

const typeConfig = {
  milestone: { label: "Milestone", icon: Flag, color: "text-brand" },
  deadline: { label: "Deadline", icon: AlertCircle, color: "text-red-600" },
  event: { label: "Event", icon: Calendar, color: "text-blue-600" },
  meeting: { label: "Meeting", icon: Clock, color: "text-purple-600" },
  inspection: { label: "Inspection", icon: CheckCircle2, color: "text-green-600" },
};

export function TimelineStage({ stageId, stageName, projectId }: TimelineStageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New event form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<TimelineEvent["type"]>("event");

  const loadEvents = useCallback(async () => {
    try {
      const data = await getStageTimelineEvents(stageId);
      setEvents(data);
    } catch (error) {
      console.error("Failed to load timeline events:", error);
      toast({
        title: "Error",
        description: "Failed to load timeline events. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setIsCreating(true);
    try {
      await createTimelineEvent({
        projectId,
        stageId,
        title,
        description,
        date: new Date(date),
        type,
      });

      setTitle("");
      setDescription("");
      setDate("");
      setType("event");
      setIsDialogOpen(false);
      loadEvents();

      toast({
        title: "Success",
        description: "Event created successfully.",
      });
    } catch (error) {
      console.error("Failed to create event:", error);
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    // Optimistic update
    setEvents(events.filter(e => e.id !== id));

    try {
      await deleteTimelineEvent(id);
      toast({
        title: "Success",
        description: "Event deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete event:", error);
      loadEvents(); // Revert
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
  };

  const handleToggleCompletion = async (event: TimelineEvent) => {
    // Optimistic update
    const newIsCompleted = !event.isCompleted;
    setEvents(events.map(e => e.id === event.id ? { ...e, isCompleted: newIsCompleted } : e));

    try {
      await toggleTimelineEventCompletion(event.id, newIsCompleted);
    } catch (error) {
      console.error("Failed to update event:", error);
      loadEvents(); // Revert
      toast({
        title: "Error",
        description: "Failed to update event status.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Group by past/upcoming
  const now = new Date();
  const pastEvents = sortedEvents.filter(e => new Date(e.date) < now || e.isCompleted);
  const upcomingEvents = sortedEvents.filter(e => new Date(e.date) >= now && !e.isCompleted);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const AddEventDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Timeline Event</DialogTitle>
          <DialogDescription>
            Add a key date, deadline, or milestone to the timeline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateEvent}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Site Inspection"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(v: TimelineEvent["type"]) => setType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="milestone">Milestone</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (events.length === 0) {
    return (
      <>
        <StageHeader
          title={stageName}
          description="Key dates, deadlines, and milestones"
          actions={<AddEventDialog />}
        />
        <StageEmptyState
          icon={Calendar}
          title="No events scheduled"
          description="Add key dates, milestones, and deadlines to track your project timeline."
          action={<Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Event</Button>}
        />
        <AddEventDialog />
      </>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description="Key dates, deadlines, and milestones"
        actions={<AddEventDialog />}
      />

      <div className="space-y-6">
        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Upcoming</h4>
            <div className="relative space-y-4 pl-6 border-l-2 border-brand">
              {upcomingEvents.map((event) => {
                const config = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.event;
                const Icon = config.icon;

                return (
                  <div key={event.id} className="relative group">
                    <div className={cn(
                      "absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-brand"
                    )}>
                      <div className="h-2 w-2 rounded-full bg-brand" />
                    </div>

                    <Card>
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="cursor-pointer"
                            onClick={() => handleToggleCompletion(event)}
                          >
                            <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                          </div>
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

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleCompletion(event)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark as Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Completed / Past</h4>
            <div className="relative space-y-4 pl-6 border-l-2 border-muted">
              {pastEvents.reverse().map((event) => {
                const config = typeConfig[event.type as keyof typeof typeConfig] || typeConfig.event;
                const Icon = config.icon;

                return (
                  <div key={event.id} className="relative group">
                    <div className="absolute -left-[25px] flex h-4 w-4 items-center justify-center rounded-full bg-background border-2 border-muted">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    </div>

                    <Card className="opacity-75">
                      <CardContent className="py-3">
                        <div className="flex items-start gap-3">
                          <div
                            className="cursor-pointer"
                            onClick={() => handleToggleCompletion(event)}
                          >
                            <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                          </div>
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

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleToggleCompletion(event)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Mark as Incomplete
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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




