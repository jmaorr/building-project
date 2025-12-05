"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ClipboardCheck, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { getApprovalsByStage, requestApproval, approveApproval, rejectApproval } from "@/lib/actions/approvals";
import { getProjectContacts } from "@/lib/actions/contacts";
import type { ApprovalWithAssignee } from "@/lib/actions/approvals";
import type { Contact } from "@/lib/db/schema";

interface ApprovalsStageProps {
  stageId: string;
  stageName: string;
  projectId: string;
  currentRound: number;
  currentUserId: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-600",
    iconColor: "text-yellow-600"
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-green-500/10 text-green-600",
    iconColor: "text-green-600"
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/10 text-red-600",
    iconColor: "text-red-600"
  },
  revision_required: {
    label: "Revision Required",
    icon: AlertTriangle,
    className: "bg-orange-500/10 text-orange-600",
    iconColor: "text-orange-600"
  },
};

export function ApprovalsStage({ stageId, stageName, projectId, currentRound }: ApprovalsStageProps) {
  const [approvals, setApprovals] = useState<ApprovalWithAssignee[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New approval form state
  const [message, setMessage] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [approvalsData, contactsData] = await Promise.all([
        getApprovalsByStage(stageId),
        getProjectContacts(projectId),
      ]);
      setApprovals(approvalsData);
      setContacts(contactsData.map(c => c.contact));
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Error",
        description: "Failed to load approvals data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, projectId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequestApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo) return;

    setIsCreating(true);
    try {
      const assignee = contacts.find(c => c.id === assignedTo);

      await requestApproval({
        projectId,
        stageId,
        roundNumber: currentRound,
        message,
        assignedTo,
        assigneeName: assignee ? assignee.name : undefined,
      });

      setMessage("");
      setAssignedTo("");
      setIsDialogOpen(false);
      loadData();

      toast({
        title: "Success",
        description: "Approval requested successfully.",
      });
    } catch (error) {
      console.error("Failed to request approval:", error);
      toast({
        title: "Error",
        description: "Failed to request approval. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this request?")) return;

    try {
      await approveApproval(id);
      loadData();
      toast({
        title: "Success",
        description: "Request approved.",
      });
    } catch (error) {
      console.error("Failed to approve:", error);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    const notes = prompt("Please provide a reason for rejection (optional):");
    if (notes === null) return; // Cancelled

    try {
      await rejectApproval(id, notes);
      loadData();
      toast({
        title: "Success",
        description: "Request rejected.",
      });
    } catch (error) {
      console.error("Failed to reject:", error);
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const pendingCount = approvals.filter(a => a.status === "pending" || a.status === "revision_required").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const RequestApprovalDialog = () => (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Request Approval
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Approval</DialogTitle>
          <DialogDescription>
            Send an approval request to a team member or stakeholder.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRequestApproval}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="assignee">Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `(${contact.company})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please review and approve..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  if (approvals.length === 0) {
    return (
      <>
        <StageHeader
          title={stageName}
          description="Sign-offs, certifications, and approvals"
          actions={<RequestApprovalDialog />}
        />
        <StageEmptyState
          icon={ClipboardCheck}
          title="No approvals requested"
          description="Request approvals and sign-offs to track important project decisions."
          action={<Button onClick={() => setIsDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Request Approval</Button>}
        />
        <RequestApprovalDialog />
      </>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description={`${approvedCount} of ${approvals.length} approvals completed • ${pendingCount} pending`}
        actions={<RequestApprovalDialog />}
      />

      <div className="space-y-4">
        {approvals.map((approval) => {
          const status = statusConfig[approval.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = status.icon;
          // const isAssignee = approval.assignedTo === currentUserId; // This might need adjustment based on how contacts map to users

          return (
            <Card key={approval.id} className={cn(
              approval.status === "revision_required" && "border-orange-500/50"
            )}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                    approval.status === "approved" ? "bg-green-500/10" :
                      approval.status === "rejected" ? "bg-red-500/10" :
                        approval.status === "revision_required" ? "bg-orange-500/10" : "bg-muted"
                  )}>
                    <StatusIcon className={cn("h-5 w-5", status.iconColor)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{approval.title}</span>
                          <Badge variant="secondary" className={status.className}>
                            {status.label}
                          </Badge>
                        </div>
                        {approval.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {approval.description}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Assigned to: {approval.assigneeName || "Unknown"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {approval.documentUrl && (
                          <Button variant="ghost" size="sm">
                            <FileText className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        )}

                        {approval.status === "pending" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleApprove(approval.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(approval.id)} className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {/* Notes for revision required or rejection */}
                    {(approval.status === "revision_required" || approval.status === "rejected") && approval.notes && (
                      <div className={cn(
                        "mt-3 p-3 rounded-md text-sm",
                        approval.status === "rejected" ? "bg-red-500/10" : "bg-orange-500/10"
                      )}>
                        <p className={cn(
                          "font-medium",
                          approval.status === "rejected" ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"
                        )}>
                          {approval.status === "rejected" ? "Rejection Reason:" : "Revision Notes:"}
                        </p>
                        <p className={cn(
                          "mt-1",
                          approval.status === "rejected" ? "text-red-600 dark:text-red-300" : "text-orange-600 dark:text-orange-300"
                        )}>
                          {approval.notes}
                        </p>
                      </div>
                    )}

                    {/* Approval info */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>Requested {formatDate(approval.requestedAt)} by {approval.requesterName || "Unknown"}</span>

                      {approval.approvedBy && approval.approvedAt && (
                        <div className="flex items-center gap-2">
                          <span>•</span>
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-green-500/20 text-green-700">
                              {getInitials(approval.approvedBy)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{approval.status === "rejected" ? "Rejected" : "Approved"} by {approval.approvedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}




