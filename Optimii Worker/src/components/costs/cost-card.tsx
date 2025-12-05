"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  deleteCost, 
  markAsQuoted, 
  markAsApproved, 
  markAsPaid,
  type CostWithFiles 
} from "@/lib/actions/costs";
import type { Cost } from "@/lib/db/schema";

const statusConfig: Record<Cost["paymentStatus"], { label: string; icon: typeof Clock; className: string }> = {
  not_started: { label: "Not Started", icon: Clock, className: "bg-gray-500/10 text-gray-600" },
  quoted: { label: "Quoted", icon: FileText, className: "bg-blue-500/10 text-blue-600" },
  approved: { label: "Approved", icon: CheckCircle2, className: "bg-amber-500/10 text-amber-600" },
  partially_paid: { label: "Partially Paid", icon: CreditCard, className: "bg-purple-500/10 text-purple-600" },
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-green-500/10 text-green-600" },
};

interface CostCardProps {
  cost: CostWithFiles;
  onEdit?: (cost: CostWithFiles) => void;
  onDelete?: () => void;
  showStageName?: boolean;
  compact?: boolean;
}

export function CostCard({ 
  cost, 
  onEdit, 
  onDelete,
  showStageName = false,
  compact = false,
}: CostCardProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      await deleteCost(cost.id);
      setShowDeleteConfirm(false);
      onDelete?.();
      router.refresh();
    } catch (error) {
      console.error("Failed to delete cost:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (action: "quoted" | "approved" | "paid") => {
    setIsProcessing(true);
    try {
      if (action === "quoted") {
        await markAsQuoted(cost.id);
      } else if (action === "approved") {
        await markAsApproved(cost.id);
      } else if (action === "paid") {
        await markAsPaid(cost.id, "external");
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const status = statusConfig[cost.paymentStatus];
  const StatusIcon = status.icon;
  const displayAmount = cost.actualAmount ?? cost.quotedAmount;
  const hasFiles = cost.files && cost.files.length > 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Badge variant="secondary" className={`${status.className} shrink-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          <span className="font-medium truncate">{cost.name}</span>
          {cost.category && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {cost.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{formatCurrency(displayAmount)}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(cost)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Main content */}
          <div className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{cost.name}</h3>
                  {cost.category && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {cost.category}
                    </Badge>
                  )}
                </div>
                {cost.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {cost.description}
                  </p>
                )}
                {(cost.vendorName || showStageName) && (
                  <p className="text-xs text-muted-foreground">
                    {cost.vendorName && (
                      <span>Vendor: {cost.vendorName}</span>
                    )}
                    {cost.vendorName && showStageName && cost.stageName && " • "}
                    {showStageName && cost.stageName && (
                      <span>Stage: {cost.stageName}</span>
                    )}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(cost)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Cost
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {cost.paymentStatus === "not_started" && (
                    <DropdownMenuItem onClick={() => handleStatusChange("quoted")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Mark as Quoted
                    </DropdownMenuItem>
                  )}
                  {(cost.paymentStatus === "quoted" || cost.paymentStatus === "not_started") && (
                    <DropdownMenuItem onClick={() => handleStatusChange("approved")}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Approved
                    </DropdownMenuItem>
                  )}
                  {cost.paymentStatus !== "paid" && (
                    <DropdownMenuItem onClick={() => handleStatusChange("paid")}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Cost
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Amounts grid */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quoted</p>
                <p className="font-semibold">{formatCurrency(cost.quotedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Actual</p>
                <p className="font-semibold">{formatCurrency(cost.actualAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                <p className={`font-semibold ${cost.paymentStatus === "paid" ? "text-green-600" : ""}`}>
                  {formatCurrency(cost.paidAmount)}
                </p>
              </div>
            </div>

            {/* Status and expand */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Badge variant="secondary" className={status.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              
              {hasFiles && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {cost.files.length} file{cost.files.length !== 1 ? "s" : ""}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Expandable files section */}
          {isExpanded && hasFiles && (
            <div className="px-4 pb-4 pt-0">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Attached Files
                </p>
                <div className="flex flex-wrap gap-2">
                  {cost.files.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center gap-2 bg-background rounded-md p-2 text-sm"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => window.open(file.url, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{cost.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

