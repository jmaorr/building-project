"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Receipt, 
  Plus, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Link as LinkIcon,
  Edit2,
  Trash2,
  Paperclip,
  MoreVertical,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CostCard, AddCostDialog } from "@/components/costs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAsPaid, deleteCost } from "@/lib/actions/costs";
import { 
  getCostsByPhase, 
  getPhaseCostSummary,
  type CostWithFiles,
} from "@/lib/actions/costs";
import { getProject, getProjectPhases, getPhaseStages } from "@/lib/actions/projects";
import { getProjectContacts } from "@/lib/actions/contacts";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { Stage, Contact } from "@/lib/db/schema";

const slugToPhaseName: Record<string, string> = {
  design: "Design",
  build: "Build",
  certification: "Certification",
};

type FilterType = "all" | "stage-linked" | "general";

export default function PaymentsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const phaseSlug = params.phaseSlug as string;

  const [isLoading, setIsLoading] = useState(true);
  const [costs, setCosts] = useState<CostWithFiles[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [summary, setSummary] = useState<{
    totalQuoted: number;
    totalActual: number;
    totalPaid: number;
    outstanding: number;
    count: number;
  } | null>(null);
  const [phase, setPhase] = useState<{ id: string; name: string } | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CostWithFiles | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [project, phases, user] = await Promise.all([
        getProject(id),
        getProjectPhases(id),
        getCurrentUser(),
      ]);

      if (!project || !user) {
        return;
      }

      setProjectId(project.id);
      setCurrentUserId(user.id);

      const phaseName = slugToPhaseName[phaseSlug];
      const currentPhase = phases.find((p) => p.name === phaseName);

      if (!currentPhase) {
        return;
      }

      setPhase({ id: currentPhase.id, name: currentPhase.name });

      const [phaseCosts, phaseSummary, phaseStages, projectContacts] = await Promise.all([
        getCostsByPhase(currentPhase.id),
        getPhaseCostSummary(currentPhase.id),
        getPhaseStages(currentPhase.id),
        getProjectContacts(id),
      ]);

      // Add stage names to costs
      const costsWithStageNames = phaseCosts.map(cost => ({
        ...cost,
        stageName: cost.stageId 
          ? phaseStages.find(s => s.id === cost.stageId)?.name 
          : undefined,
      }));

      setCosts(costsWithStageNames);
      setSummary(phaseSummary);
      setStages(phaseStages);
      setContacts(projectContacts.map(pc => pc.contact));
    } catch (error) {
      console.error("Failed to load payments data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, phaseSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCostCreated = () => {
    loadData();
  };

  const handleCostUpdated = () => {
    loadData();
    setEditingCost(null);
  };

  const handleCostDeleted = async () => {
    loadData();
  };

  const handleEdit = (cost: CostWithFiles) => {
    setEditingCost(cost);
    setIsAddDialogOpen(true);
  };

  const handleMarkAsPaid = async (cost: CostWithFiles) => {
    try {
      await markAsPaid(cost.id, "external");
      loadData();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      alert("Failed to mark cost as paid. Please try again.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter costs
  const filteredCosts = costs.filter(cost => {
    if (filter === "stage-linked") return !!cost.stageId;
    if (filter === "general") return !cost.stageId;
    return true;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-4 bg-muted animate-pulse rounded w-24 mb-2" />
                <div className="h-8 bg-muted animate-pulse rounded w-32" />
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
          <h2 className="text-lg font-semibold">Payments & Costs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track costs, quotes, and payments for the {phase?.name?.toLowerCase()} phase
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Cost</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quoted
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(summary?.totalQuoted || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actual Costs
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(summary?.totalActual || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalPaid || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {formatCurrency(summary?.outstanding || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      {costs.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Costs ({costs.length})</SelectItem>
              <SelectItem value="stage-linked">
                Stage-linked ({costs.filter(c => c.stageId).length})
              </SelectItem>
              <SelectItem value="general">
                General ({costs.filter(c => !c.stageId).length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Costs Table */}
      {filteredCosts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-1">
              {costs.length === 0 ? "No costs recorded" : "No costs match filter"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {costs.length === 0 
                ? "Add costs to track spending, quotes, and payments for this phase."
                : "Try changing the filter to see more costs."}
            </p>
            {costs.length === 0 && (
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Cost
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium text-sm">Name & Description</th>
                    <th className="text-right p-4 font-medium text-sm">Quoted</th>
                    <th className="text-right p-4 font-medium text-sm">Actual</th>
                    <th className="text-right p-4 font-medium text-sm">Paid</th>
                    <th className="text-center p-4 font-medium text-sm">Invoices</th>
                    <th className="text-right p-4 font-medium text-sm w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCosts.map((cost) => {
                    const hasFiles = cost.files && cost.files.length > 0;
                    return (
                      <tr key={cost.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium">{cost.name}</div>
                            {cost.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {cost.description}
                              </div>
                            )}
                            {cost.stageName && (
                              <div className="text-xs text-muted-foreground">
                                Stage: {cost.stageName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {cost.quotedAmount ? formatCurrency(cost.quotedAmount) : "—"}
                        </td>
                        <td className="p-4 text-right">
                          {cost.actualAmount ? formatCurrency(cost.actualAmount) : "—"}
                        </td>
                        <td className="p-4 text-right">
                          <span className={(cost.paidAmount ?? 0) > 0 ? "text-green-600 font-medium" : ""}>
                            {cost.paidAmount ? formatCurrency(cost.paidAmount) : "—"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {hasFiles ? (
                            <div className="flex items-center justify-center gap-1">
                              <Paperclip className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {cost.files.length}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(cost)}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {cost.paymentStatus !== "paid" && (
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(cost)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to delete this cost?")) {
                                      try {
                                        await deleteCost(cost.id);
                                        handleCostDeleted();
                                      } catch (error) {
                                        console.error("Failed to delete cost:", error);
                                        alert("Failed to delete cost. Please try again.");
                                      }
                                    }
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Cost Dialog */}
      {phase && (
        <AddCostDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              setEditingCost(null);
            }
          }}
          projectId={projectId}
          phaseId={phase.id}
          stages={stages}
          contacts={contacts}
          currentUserId={currentUserId}
          cost={editingCost}
          onCostCreated={handleCostCreated}
          onCostUpdated={handleCostUpdated}
        />
      )}
    </div>
  );
}
