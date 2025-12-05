"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Loader2,
  FileText,
  CheckSquare,
  DollarSign,
  Receipt,
  MessageSquare,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import { createStage } from "@/lib/actions/projects";
import { defaultStageTypes } from "@/lib/db/seed";

const iconMap: Record<string, React.ElementType> = {
  FileText,
  CheckSquare,
  DollarSign,
  Receipt,
  MessageSquare,
  Calendar,
  ClipboardCheck,
};

// Which module types are implemented
const implementationStatus: Record<string, "implemented" | "partial" | "coming_soon"> = {
  files: "implemented",
  approvals: "partial",
  tasks: "coming_soon",
  costs: "coming_soon",
  payments: "coming_soon",
  notes: "coming_soon",
  timeline: "coming_soon",
};

interface AddStageDialogProps {
  phaseId: string;
  projectId: string;
  phaseSlug: string;
  trigger?: React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AddStageDialog({ phaseId, projectId, phaseSlug, trigger }: AddStageDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedType, setSelectedType] = useState<string>("files");
  const [name, setName] = useState("");
  const [allowsRounds, setAllowsRounds] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const selectedModuleType = defaultStageTypes.find(mt => mt.code === selectedType);

  function resetForm() {
    setSelectedType("files");
    setName("");
    setAllowsRounds(false);
    setRequiresApproval(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createStage(phaseId, {
        name: name.trim(),
        moduleTypeId: selectedType,
        allowsRounds,
        requiresApproval,
      });

      setOpen(false);
      resetForm();
      router.refresh();

      // Optionally navigate to the new stage
      // router.push(`/projects/${projectId}/${phaseSlug}/stages/${stage.id}`);
    } catch (error) {
      console.error("Error creating stage:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Plus className="mr-1.5 h-3 w-3" />
            Add Stage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Stage</DialogTitle>
          <DialogDescription>
            Create a new stage to organize documents, tasks, or approvals.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 py-4">
            {/* Stage Type Selection */}
            <div className="space-y-2">
              <Label>Stage Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {defaultStageTypes.map(type => {
                  const Icon = iconMap[type.icon] || FileText;
                  const status = implementationStatus[type.code];
                  const isSelected = selectedType === type.code;

                  return (
                    <button
                      key={type.code}
                      type="button"
                      onClick={() => setSelectedType(type.code)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        isSelected
                          ? "border-brand bg-brand/5 ring-1 ring-brand"
                          : "border-border hover:bg-accent/50",
                        status === "coming_soon" && "opacity-60"
                      )}
                    >
                      <Icon className={cn(
                        "h-5 w-5 mt-0.5 shrink-0",
                        isSelected ? "text-brand" : "text-muted-foreground"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected && "text-brand"
                          )}>
                            {type.defaultName}
                          </span>
                          {status === "implemented" && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Ready
                            </Badge>
                          )}
                          {status === "partial" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              Basic
                            </Badge>
                          )}
                          {status === "coming_soon" && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                              Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Name */}
            <div className="space-y-2">
              <Label htmlFor="stage-name">Stage Name</Label>
              <Input
                id="stage-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`e.g., ${selectedModuleType?.defaultName || "New Stage"}`}
                required
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allows-rounds">Enable Rounds</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow multiple revision rounds (v1, v2, etc.)
                  </p>
                </div>
                <Switch
                  id="allows-rounds"
                  checked={allowsRounds}
                  onCheckedChange={setAllowsRounds}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requires-approval">Requires Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Stage needs sign-off before completion
                  </p>
                </div>
                <Switch
                  id="requires-approval"
                  checked={requiresApproval}
                  onCheckedChange={setRequiresApproval}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stage
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

