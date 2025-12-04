"use client";

import { useState } from "react";
import { Plus, ClipboardCheck, FileText, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ModuleHeader, ModuleEmptyState } from "@/components/projects/module-tabs";
import { cn } from "@/lib/utils";

interface ApprovalsModuleProps {
  moduleId: string;
  moduleName: string;
}

interface Approval {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "approved" | "rejected" | "revision_required";
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  documentUrl?: string;
  notes?: string;
}

const mockApprovals: Approval[] = [
  { 
    id: "1", 
    title: "Design Concept Sign-off", 
    description: "Client approval of initial design concept and floor plans",
    status: "approved", 
    requestedAt: new Date("2024-01-10"),
    approvedBy: "John Smith",
    approvedAt: new Date("2024-01-15"),
  },
  { 
    id: "2", 
    title: "Material Selection Approval", 
    description: "Approval of selected finishes, fixtures, and materials",
    status: "approved", 
    requestedAt: new Date("2024-02-01"),
    approvedBy: "John Smith",
    approvedAt: new Date("2024-02-05"),
  },
  { 
    id: "3", 
    title: "Engineering Drawings Review", 
    description: "Structural engineer review and certification",
    status: "pending", 
    requestedAt: new Date("2024-02-15"),
  },
  { 
    id: "4", 
    title: "Energy Efficiency Report", 
    description: "NatHERS assessment approval",
    status: "revision_required", 
    requestedAt: new Date("2024-02-10"),
    notes: "Need to improve window glazing specifications to meet 7-star rating",
  },
];

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

export function ApprovalsModule({ moduleId, moduleName }: ApprovalsModuleProps) {
  const [approvals] = useState(mockApprovals);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const pendingCount = approvals.filter(a => a.status === "pending" || a.status === "revision_required").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;

  if (approvals.length === 0) {
    return (
      <>
        <ModuleHeader 
          title={moduleName}
          description="Sign-offs, certifications, and approvals"
          actions={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Approval
            </Button>
          }
        />
        <ModuleEmptyState
          icon={ClipboardCheck}
          title="No approvals requested"
          description="Request approvals and sign-offs to track important project decisions."
          action={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Request Approval
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
        description={`${approvedCount} of ${approvals.length} approvals completed • ${pendingCount} pending`}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Request Approval
          </Button>
        }
      />
      
      <div className="space-y-4">
        {approvals.map((approval) => {
          const status = statusConfig[approval.status];
          const StatusIcon = status.icon;
          
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
                      </div>
                      
                      {approval.documentUrl && (
                        <Button variant="ghost" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      )}
                    </div>
                    
                    {/* Notes for revision required */}
                    {approval.status === "revision_required" && approval.notes && (
                      <div className="mt-3 p-3 rounded-md bg-orange-500/10 text-sm">
                        <p className="font-medium text-orange-700 dark:text-orange-400">
                          Revision Notes:
                        </p>
                        <p className="text-orange-600 dark:text-orange-300 mt-1">
                          {approval.notes}
                        </p>
                      </div>
                    )}
                    
                    {/* Approval info */}
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span>Requested {formatDate(approval.requestedAt)}</span>
                      
                      {approval.approvedBy && approval.approvedAt && (
                        <div className="flex items-center gap-2">
                          <span>•</span>
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-green-500/20 text-green-700">
                              {getInitials(approval.approvedBy)}
                            </AvatarFallback>
                          </Avatar>
                          <span>Approved by {approval.approvedBy}</span>
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




