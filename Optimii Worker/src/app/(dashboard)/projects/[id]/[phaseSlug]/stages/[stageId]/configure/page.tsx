"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save } from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { updateStage, deleteStage, getStage } from "@/lib/actions/projects";
import { getProjectContacts } from "@/lib/actions/contacts";
import type { Stage, Contact } from "@/lib/db/schema";

type StageWithModuleType = Stage & { moduleType?: { code: string; defaultName: string } };

export default function StageConfigurePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const id = params?.id as string | undefined;
  const phaseSlug = params?.phaseSlug as string | undefined;
  const stageId = params?.stageId as string | undefined;
  
  if (!id || !phaseSlug || !stageId) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Invalid route parameters</p>
        </div>
      </div>
    );
  }

  const [stage, setStage] = useState<StageWithModuleType | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allowsRounds, setAllowsRounds] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approvalContactId, setApprovalContactId] = useState<string>("");

  useEffect(() => {
    if (!stageId || !id || !phaseSlug) return;
    
    let cancelled = false;
    
    async function loadData() {
      setIsLoading(true);
      try {
        const stageData = await getStage(stageId!);
        
        if (cancelled) return;
        
        if (!stageData) {
          toast({
            title: "Error",
            description: "Stage not found",
            variant: "destructive",
          });
          router.push(`/projects/${id}/${phaseSlug}`);
          return;
        }

        // Extract only the serializable Stage properties
        const stageForState: StageWithModuleType = {
          ...stageData,
          // Only include serializable moduleType properties
          moduleType: stageData.moduleType ? {
            code: String(stageData.moduleType.code || ""),
            defaultName: String(stageData.moduleType.defaultName || ""),
          } : undefined,
        };
        
        setStage(stageForState);
        setName(String(stageData.name || ""));
        setDescription(String(stageData.description || ""));
        setAllowsRounds(Boolean(stageData.allowsRounds));
        setRequiresApproval(Boolean(stageData.requiresApproval));
        setApprovalContactId(String(stageData.approvalContactId || ""));

        // Load contacts separately to avoid blocking
        try {
          const contactsData = await getProjectContacts(id!);
          if (!cancelled) {
            const validContacts = contactsData
              .map((pc) => pc.contact)
              .filter((c): c is Contact => c !== null && c !== undefined);
            setContacts(validContacts);
          }
        } catch (contactError) {
          console.error("Failed to load contacts:", contactError);
          // Don't show error for contacts, just log it
        }
      } catch (error) {
        if (cancelled) return;
        
        console.error("Failed to load stage:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load stage configuration";
        console.error("Error details:", error);
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    
    return () => {
      cancelled = true;
    };
  }, [stageId, id, phaseSlug, router, toast]);

  const handleSave = async () => {
    if (!stage) return;

    setIsSaving(true);
    try {
      const result = await updateStage(stage.id, {
        name,
        description: description || null,
        allowsRounds,
        requiresApproval,
        approvalContactId: requiresApproval && approvalContactId ? approvalContactId : null,
      });

      if (result) {
        toast({
          title: "Success",
          description: "Stage configuration updated successfully",
        });
        router.refresh();
        router.push(`/projects/${id}/${phaseSlug}/stages/${stageId}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to update stage configuration",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save stage:", error);
      toast({
        title: "Error",
        description: "Failed to update stage configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;

    setIsDeleting(true);
    try {
      const result = await deleteStage(stage.id);
      if (result.success) {
        toast({
          title: "Success",
          description: "Stage deleted successfully",
        });
        router.push(`/projects/${id}/${phaseSlug}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete stage",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete stage:", error);
      toast({
        title: "Error",
        description: "Failed to delete stage",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto px-4 sm:px-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" disabled className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 w-32 sm:w-48 bg-muted animate-pulse rounded flex-1" />
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Stage not found</p>
        </div>
      </div>
    );
  }

  const stageName = String(stage.name || "Unnamed Stage");

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
          <Link href={`/projects/${id}/${phaseSlug}/stages/${stageId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <PageHeader
            title="Configure Stage"
            description={`Manage settings for ${stageName}`}
            breadcrumbs={[
              { title: "Projects", href: "/projects" },
              { title: "Project", href: `/projects/${id}` },
              { title: "Stages", href: `/projects/${id}/${phaseSlug}/stages` },
              { title: stageName, href: `/projects/${id}/${phaseSlug}/stages/${stageId}` },
              { title: "Configure" },
            ]}
          />
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-lg sm:text-xl">General Settings</CardTitle>
          <CardDescription className="text-sm">
            Basic stage information and configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Stage Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter stage name"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this stage..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="allowsRounds" className="text-sm font-medium">Allow Multiple Rounds</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Enable rounds to track multiple iterations of files and comments
                </p>
              </div>
              <Switch
                id="allowsRounds"
                checked={allowsRounds}
                onCheckedChange={setAllowsRounds}
                className="shrink-0"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label htmlFor="requiresApproval" className="text-sm font-medium">Require Approval</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Require approval before marking this stage as completed
                </p>
              </div>
              <Switch
                id="requiresApproval"
                checked={requiresApproval}
                onCheckedChange={setRequiresApproval}
                className="shrink-0"
              />
            </div>

            {requiresApproval && (
              <div className="space-y-2">
                <Label htmlFor="approvalContact">Approval Contact</Label>
                <Select 
                  value={approvalContactId && contacts.some(c => c.id === approvalContactId) ? approvalContactId : undefined} 
                  onValueChange={(value) => setApprovalContactId(value || "")}
                >
                  <SelectTrigger id="approvalContact">
                    <SelectValue placeholder="Select a contact for approvals" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No contacts available
                      </SelectItem>
                    ) : (
                      contacts.map((contact) => (
                        <SelectItem key={contact.id} value={String(contact.id)}>
                          {String(contact.name || "Unnamed")}
                          {contact.email && ` (${contact.email})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select who should approve this stage before it can be marked as completed
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-destructive text-lg sm:text-xl">Danger Zone</CardTitle>
          <CardDescription className="text-sm">
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-sm font-medium">Delete Stage</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Permanently delete this stage and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
              className="w-full sm:w-auto shrink-0"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Stage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to delete &quot;{stageName}&quot;? This will permanently
              delete the stage and all associated files, comments, approvals, and other data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto m-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Stage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

