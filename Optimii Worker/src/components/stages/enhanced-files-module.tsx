"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, XCircle, Clock, X, User, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RoundsSelector } from "@/components/stages/rounds-selector";
import { CommentsSection } from "@/components/stages/comments-section";
import { FilePreview, FilesDisplay } from "@/components/files";
import { CostSection } from "@/components/costs";
import type { Stage, User as UserType, Contact, File as FileType, Note } from "@/lib/db/schema";
import { getFilesByStage, deleteFile } from "@/lib/actions/files";
import { getCommentsByStage } from "@/lib/actions/comments";
import { getApprovalsByStage, requestApproval, approveApproval, rejectApproval, type ApprovalWithAssignee } from "@/lib/actions/approvals";
import { updateStageStatus, startNewRound } from "@/lib/actions/projects";
import { getProjectContacts } from "@/lib/actions/contacts";
import { useUser } from "@clerk/nextjs";

interface EnhancedFilesStageProps {
  stage: Stage;
  projectId: string;
  phaseId: string;
  currentUserId: string;
}

export function EnhancedFilesStage({ stage, projectId, phaseId, currentUserId }: EnhancedFilesStageProps) {
  const router = useRouter();
  const [currentRound, setCurrentRound] = useState(stage.currentRound);
  const [stageStatus, setStageStatus] = useState(stage.status);
  const [files, setFiles] = useState<FileType[]>([]);
  const [comments, setComments] = useState<(Note & { author: UserType | Contact })[]>([]);
  const [approvals, setApprovals] = useState<ApprovalWithAssignee[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Contact[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isRequestApprovalDialogOpen, setIsRequestApprovalDialogOpen] = useState(false);
  const [isApprovalResponseDialogOpen, setIsApprovalResponseDialogOpen] = useState(false);
  const [approvalResponseType, setApprovalResponseType] = useState<"approve" | "reject">("approve");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalWithAssignee | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<FileType | null>(null);
  const [statusChangeMessage, setStatusChangeMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: clerkUser } = useUser();

  // Get current user from Clerk
  const currentUser: UserType = clerkUser ? {
    id: currentUserId,
    clerkId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    firstName: clerkUser.firstName || null,
    lastName: clerkUser.lastName || null,
    avatarUrl: clerkUser.imageUrl || null,
    userType: null,
    createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt) : new Date(),
    updatedAt: new Date(),
  } : {
    id: currentUserId,
    clerkId: null,
    email: "",
    firstName: null,
    lastName: null,
    avatarUrl: null,
    userType: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const currentUserName = currentUser.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ""}`.trim()
    : currentUser.email || "You";

  const loadContacts = useCallback(async () => {
    try {
      const projectContacts = await getProjectContacts(projectId);
      // Ensure we always have an array
      const contactsArray = Array.isArray(projectContacts) ? projectContacts : [];
      setAvailableUsers(contactsArray.map(pc => pc.contact).filter(Boolean));
    } catch (error) {
      console.error("Failed to load contacts:", error);
      setAvailableUsers([]);
    }
  }, [projectId]);

  const loadData = useCallback(async () => {
    try {
      const [filesData, commentsData, approvalsData] = await Promise.all([
        getFilesByStage(stage.id, currentRound),
        getCommentsByStage(stage.id, currentRound),
        getApprovalsByStage(stage.id, currentRound),
      ]);
      // Ensure we always have arrays
      setFiles(Array.isArray(filesData) ? filesData : []);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setApprovals(Array.isArray(approvalsData) ? approvalsData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      setFiles([]);
      setComments([]);
      setApprovals([]);
    } finally {
    }
  }, [stage.id, currentRound]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleStatusChange = async (newStatus: Stage["status"]) => {
    try {
      setStatusChangeMessage(null);
      const result = await updateStageStatus(stage.id, newStatus);

      if (result.stage) {
        setStageStatus(result.stage.status);

        // If approval was triggered, show message and open approval dialog
        if (result.requiresApproval && result.approvalTriggered) {
          setStatusChangeMessage("This stage requires approval before it can be completed.");
          setIsRequestApprovalDialogOpen(true);
        } else if (result.requiresApproval && result.stage.status === "awaiting_approval") {
          setStatusChangeMessage("Status changed to 'Awaiting Approval'. Please request approval to complete this stage.");
        }

        // Refresh data to show updated state
        loadData();
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleNewRound = async () => {
    const updatedStage = await startNewRound(stage.id);
    if (updatedStage) {
      setCurrentRound(updatedStage.currentRound);
      loadData();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("stageId", stage.id);
        formData.append("roundNumber", currentRound.toString());

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload file");
        }
      }
      setSelectedFiles([]);
      setIsUploadDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Failed to upload files:", error);
      alert(`Failed to upload files: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      await deleteFile(fileId);
      loadData();
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Failed to delete file. Please try again.");
    }
  };

  const handleRequestApproval = async (assignedTo: string, assigneeName: string, message?: string) => {
    try {
      await requestApproval({
        projectId,
        stageId: stage.id,
        roundNumber: currentRound,
        message,
        assignedTo,
        assigneeName,
      });
      setIsRequestApprovalDialogOpen(false);
      setStatusChangeMessage(null);
      loadData();
      router.refresh();
    } catch (error) {
      console.error("Failed to request approval:", error);
      alert("Failed to request approval. Please try again.");
    }
  };

  const handleApprovalResponse = async (notes?: string) => {
    if (!selectedApproval) return;

    try {
      if (approvalResponseType === "approve") {
        const result = await approveApproval(selectedApproval.id, notes);
        if (result) {
          // Approval also auto-completes the stage, update local state
          setStageStatus("completed");
          setStatusChangeMessage(null);
        }
      } else {
        await rejectApproval(selectedApproval.id, notes);
      }
      setIsApprovalResponseDialogOpen(false);
      setSelectedApproval(null);
      loadData();
      router.refresh();
    } catch (error) {
      console.error("Failed to respond to approval:", error);
      alert("Failed to respond. Please try again.");
    }
  };

  const openApprovalResponse = (approval: ApprovalWithAssignee, type: "approve" | "reject") => {
    setSelectedApproval(approval);
    setApprovalResponseType(type);
    setIsApprovalResponseDialogOpen(true);
  };


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getApprovalStatus = (): { status: "pending" | "approved" | "rejected" | "none"; approval: ApprovalWithAssignee | null } => {
    if (!stage.requiresApproval) return { status: "none", approval: null };
    const pending = approvals.find((a) => a.status === "pending");
    if (pending) return { status: "pending", approval: pending };
    const approved = approvals.find((a) => a.status === "approved");
    if (approved) return { status: "approved", approval: approved };
    const rejected = approvals.find((a) => a.status === "rejected");
    if (rejected) return { status: "rejected", approval: rejected };
    return { status: "none", approval: null };
  };

  const approvalStatus = getApprovalStatus();

  // Check if current user can respond to approval
  const canRespondToApproval = approvalStatus.approval &&
    (approvalStatus.approval.assignedTo === currentUser.id ||
      approvalStatus.approval.assignedTo === currentUser.clerkId);

  return (
    <div className="space-y-6">
      {/* Status Change Message */}
      {statusChangeMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-sm">{statusChangeMessage}</p>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => setStatusChangeMessage(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Status & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select
            value={stageStatus}
            onValueChange={(value) => handleStatusChange(value as Stage["status"])}
          >
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Rounds Selector */}
      <RoundsSelector
        stage={stage}
        currentRound={currentRound}
        onRoundChange={setCurrentRound}
        onNewRound={handleNewRound}
      />

      {/* Approval Section */}
      {stage.requiresApproval && (
        <ApprovalCard
          status={approvalStatus}
          canRespond={canRespondToApproval || true}
          onRequestApproval={() => setIsRequestApprovalDialogOpen(true)}
          onApprove={(approval) => openApprovalResponse(approval, "approve")}
          onReject={(approval) => openApprovalResponse(approval, "reject")}
          formatDate={formatDate}
        />
      )}

      {/* Files Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            Files {stage.allowsRounds && currentRound > 1 ? `(Round ${currentRound})` : ""}
          </h3>
          <span className="text-xs text-muted-foreground">{files.length} files</span>
        </div>

        <FilesDisplay
          files={files}
          loading={false}
          showSearch={false}
          showFilters={false}
          showSort={false}
          showViewToggle={true}
          showUploadButton={false}
          showDeleteButton={true}
          defaultViewMode="list"
          defaultSort="date"
          onFilePreview={(file) => setPreviewFile(file)}
          onFileDelete={handleDeleteFile}
          emptyStateTitle="No files uploaded"
          emptyStateDescription="Upload files to this stage to get started"
          emptyStateAction={
            <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          }
        />
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
        />
      )}

      {/* Comments Section */}
      <CommentsSection
        stageId={stage.id}
        roundNumber={currentRound}
        comments={comments}
        currentUser={currentUser}
        availableUsers={availableUsers}
        onCommentAdded={loadData}
      />

      {/* Costs Section */}
      <CostSection
        stage={stage}
        projectId={projectId}
        phaseId={phaseId}
        contacts={availableUsers}
        currentUserId={currentUserId}
      />

      {/* File Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload to this stage (Round {currentRound})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Files
            </Button>
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected files:</p>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const newFiles = [...selectedFiles];
                        newFiles.splice(index, 1);
                        setSelectedFiles(newFiles);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={selectedFiles.length === 0 || uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Approval Dialog */}
      <Dialog open={isRequestApprovalDialogOpen} onOpenChange={setIsRequestApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Approval</DialogTitle>
            <DialogDescription>
              Assign someone to review and approve this stage.
            </DialogDescription>
          </DialogHeader>
          <RequestApprovalForm
            contacts={availableUsers}
            currentUser={currentUser}
            currentUserName={currentUserName}
            onSubmit={handleRequestApproval}
            onCancel={() => setIsRequestApprovalDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Approval Response Dialog */}
      <Dialog open={isApprovalResponseDialogOpen} onOpenChange={setIsApprovalResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalResponseType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {approvalResponseType === "approve"
                ? "Confirm your approval for this stage."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <ApprovalResponseForm
            type={approvalResponseType}
            onSubmit={handleApprovalResponse}
            onCancel={() => {
              setIsApprovalResponseDialogOpen(false);
              setSelectedApproval(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Request Approval Form
// =============================================================================

function RequestApprovalForm({
  contacts,
  currentUser,
  currentUserName,
  onSubmit,
  onCancel,
}: {
  contacts: Contact[];
  currentUser: UserType;
  currentUserName: string;
  onSubmit: (assignedTo: string, assigneeName: string, message?: string) => void;
  onCancel: () => void;
}) {
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [message, setMessage] = useState("");

  // Find owner contact or default to first contact
  useEffect(() => {
    const ownerContact = contacts.find(c =>
      c.name?.toLowerCase().includes("owner") ||
      c.role === "owner"
    );
    if (ownerContact) {
      setAssignedTo(ownerContact.id);
    } else if (contacts.length > 0) {
      setAssignedTo(contacts[0].id);
    }
  }, [contacts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Handle self-assignment
    if (assignedTo === "self") {
      onSubmit(currentUser.id, currentUserName, message.trim() || undefined);
      return;
    }

    const selectedContact = contacts.find(c => c.id === assignedTo);
    if (selectedContact) {
      const contactName = selectedContact.name || selectedContact.email || "Unknown";
      onSubmit(selectedContact.id, contactName, message.trim() || undefined);
    }
  };

  const getContactName = (contact: Contact) => {
    return contact.name || contact.email || "Unknown";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Assign To</Label>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger>
            <SelectValue placeholder="Select who should approve" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Myself (for testing)</span>
              </div>
            </SelectItem>
            {contacts.map(contact => (
              <SelectItem key={contact.id} value={contact.id}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{getContactName(contact)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Message (optional)</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add any notes or context for the reviewer..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!assignedTo}>
          Send Request
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Approval Response Form
// =============================================================================

function ApprovalResponseForm({
  type,
  onSubmit,
  onCancel,
}: {
  type: "approve" | "reject";
  onSubmit: (notes?: string) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(notes.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{type === "approve" ? "Notes (optional)" : "Reason for Rejection"}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={type === "approve"
            ? "Add any notes or comments..."
            : "Please explain why this is being rejected..."}
          rows={4}
          required={type === "reject"}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          className={type === "approve"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"}
        >
          {type === "approve" ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Approval
            </>
          ) : (
            <>
              <XCircle className="mr-2 h-4 w-4" />
              Confirm Rejection
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// Approval Card Component
// =============================================================================

function ApprovalCard({
  status,
  canRespond,
  onRequestApproval,
  onApprove,
  onReject,
  formatDate,
}: {
  status: { status: "pending" | "approved" | "rejected" | "none"; approval: ApprovalWithAssignee | null };
  canRespond: boolean;
  onRequestApproval: () => void;
  onApprove: (approval: ApprovalWithAssignee) => void;
  onReject: (approval: ApprovalWithAssignee) => void;
  formatDate: (date: Date) => string;
}) {
  if (status.status === "approved") {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 shrink-0">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-600">Approved</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {status.approval?.approvedAt
                  ? `Approved on ${formatDate(status.approval.approvedAt)}`
                  : "This stage has been approved"}
                {status.approval?.assigneeName && (
                  <> by <span className="font-medium">{status.approval.assigneeName}</span></>
                )}
              </p>
              {status.approval?.notes && (
                <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
                    <span>{status.approval.notes}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.status === "rejected") {
    return (
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 shrink-0">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-600">Changes Requested</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {status.approval?.approvedAt
                  ? `Rejected on ${formatDate(status.approval.approvedAt)}`
                  : "This stage needs revisions"}
              </p>
              {status.approval?.notes && (
                <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-sm flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                    <span className="text-foreground">{status.approval.notes}</span>
                  </p>
                </div>
              )}
              <Button
                size="sm"
                className="mt-4"
                onClick={onRequestApproval}
              >
                Request New Approval
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.status === "pending") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 shrink-0">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-600">Awaiting Approval</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Assigned to <span className="font-medium">{status.approval?.assigneeName || "reviewer"}</span>
                {status.approval?.requesterName && (
                  <> • Requested by {status.approval.requesterName}</>
                )}
              </p>
              {status.approval?.description && (
                <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                    <span>{status.approval.description}</span>
                  </p>
                </div>
              )}

              {canRespond && status.approval && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onApprove(status.approval!)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-500/50 hover:bg-red-500/10"
                    onClick={() => onReject(status.approval!)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No approval requested yet
  return (
    <Card className="border-muted bg-muted/30">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Approval Required</p>
              <p className="text-xs text-muted-foreground">
                This stage needs approval before completion
              </p>
            </div>
          </div>
          <Button size="sm" onClick={onRequestApproval}>
            Request Approval
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
