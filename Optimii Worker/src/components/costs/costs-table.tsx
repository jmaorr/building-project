"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  Paperclip, 
  Plus,
  MoreVertical,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateCost, markAsPaid, deleteCost, type CostWithFiles } from "@/lib/actions/costs";
import { CostFilesDialog } from "./cost-files-dialog";
import { cn } from "@/lib/utils";

interface CostsTableProps {
  costs: CostWithFiles[];
  onCostUpdated?: () => void;
  onCostDeleted?: () => void;
  showStageName?: boolean;
  projectId: string;
  compact?: boolean;
  viewMode?: "table" | "card";
  onViewModeChange?: (mode: "table" | "card") => void;
}

export function CostsTable({
  costs,
  onCostUpdated,
  onCostDeleted,
  showStageName = false,
  projectId,
  compact = false,
  viewMode: externalViewMode,
  onViewModeChange,
}: CostsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<"name" | "quotedAmount" | "actualAmount" | null>(null);
  const [editValues, setEditValues] = useState<{
    name?: string;
    quotedAmount?: string;
    actualAmount?: string;
  }>({});
  const [isFilesDialogOpen, setIsFilesDialogOpen] = useState(false);
  const [selectedCostId, setSelectedCostId] = useState<string | null>(null);
  const [internalViewMode, setInternalViewMode] = useState<"table" | "card">("table");
  
  // Use external view mode if provided, otherwise use internal state
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // Auto-detect mobile view
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setViewMode("card");
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setViewMode]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const parseCurrency = (value: string): number | null => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const handleStartEdit = (cost: CostWithFiles, field: "name" | "quotedAmount" | "actualAmount") => {
    setEditingId(cost.id);
    setEditingField(field);
    setEditValues({
      name: cost.name,
      quotedAmount: cost.quotedAmount?.toString() ?? "",
      actualAmount: cost.actualAmount?.toString() ?? "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValues({});
  };

  const handleSaveEdit = async (costId: string) => {
    try {
      const updates: {
        name?: string;
        quotedAmount?: number | null;
        actualAmount?: number | null;
      } = {};

      if (editingField === "name" && editValues.name !== undefined) {
        updates.name = editValues.name.trim();
      } else if (editingField === "quotedAmount") {
        updates.quotedAmount = parseCurrency(editValues.quotedAmount ?? "");
      } else if (editingField === "actualAmount") {
        updates.actualAmount = parseCurrency(editValues.actualAmount ?? "");
      }

      await updateCost(costId, updates);
      handleCancelEdit();
      onCostUpdated?.();
    } catch (error) {
      console.error("Failed to update cost:", error);
      alert("Failed to update cost. Please try again.");
    }
  };

  const handleMarkAsPaid = async (cost: CostWithFiles) => {
    try {
      await markAsPaid(cost.id, "external");
      onCostUpdated?.();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      alert("Failed to mark cost as paid. Please try again.");
    }
  };

  const handleDelete = async (costId: string) => {
    if (!confirm("Are you sure you want to delete this cost?")) return;
    try {
      await deleteCost(costId);
      onCostDeleted?.();
    } catch (error) {
      console.error("Failed to delete cost:", error);
      alert("Failed to delete cost. Please try again.");
    }
  };

  const handleFilesClick = (costId: string) => {
    setSelectedCostId(costId);
    setIsFilesDialogOpen(true);
  };

  if (costs.length === 0) {
    return null;
  }

  // Card view for mobile
  if (viewMode === "card") {
    return (
      <>
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <div className="space-y-3 p-4 sm:p-6">
              {costs.map((cost) => {
            const isEditing = editingId === cost.id;
            const hasFiles = cost.files && cost.files.length > 0;
            
            return (
              <Card key={cost.id} className="hover:border-brand/50 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      {isEditing && editingField === "name" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValues.name ?? ""}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(cost.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <h4 
                            className="font-medium cursor-pointer hover:text-brand"
                            onClick={() => handleStartEdit(cost, "name")}
                          >
                            {cost.name}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStartEdit(cost, "name")}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit Name
                              </DropdownMenuItem>
                              {cost.paymentStatus !== "paid" && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(cost)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleFilesClick(cost.id)}>
                                <Paperclip className="h-4 w-4 mr-2" />
                                {hasFiles ? `Files (${cost.files.length})` : "Add Files"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(cost.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      {cost.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{cost.description}</p>
                      )}
                      {showStageName && cost.stageName && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {cost.stageName}
                        </Badge>
                      )}
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Quoted</div>
                        {isEditing && editingField === "quotedAmount" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValues.quotedAmount ?? ""}
                              onChange={(e) => setEditValues({ ...editValues, quotedAmount: e.target.value })}
                              className="h-8 text-sm"
                              placeholder="$0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(cost.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="text-sm font-medium cursor-pointer hover:text-brand"
                            onClick={() => handleStartEdit(cost, "quotedAmount")}
                          >
                            {formatCurrency(cost.quotedAmount)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Actual</div>
                        {isEditing && editingField === "actualAmount" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editValues.actualAmount ?? ""}
                              onChange={(e) => setEditValues({ ...editValues, actualAmount: e.target.value })}
                              className="h-8 text-sm"
                              placeholder="$0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(cost.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="text-sm font-medium cursor-pointer hover:text-brand"
                            onClick={() => handleStartEdit(cost, "actualAmount")}
                          >
                            {formatCurrency(cost.actualAmount)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Paid</div>
                        <div className={cn(
                          "text-sm font-medium",
                          (cost.paidAmount ?? 0) > 0 && "text-green-600"
                        )}>
                          {formatCurrency(cost.paidAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Files count */}
                    {hasFiles && (
                      <div className="pt-2 border-t">
                        <button
                          onClick={() => handleFilesClick(cost.id)}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-brand transition-colors"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{cost.files.length} file{cost.files.length !== 1 ? "s" : ""}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
            </div>
          </CardContent>
        </Card>

        {selectedCostId && (
          <CostFilesDialog
            open={isFilesDialogOpen}
            onOpenChange={setIsFilesDialogOpen}
            costId={selectedCostId}
            projectId={projectId}
            costName={costs.find(c => c.id === selectedCostId)?.name ?? "Cost"}
            onFilesUpdated={() => {
              onCostUpdated?.();
              setIsFilesDialogOpen(false);
            }}
          />
        )}
      </>
    );
  }

  // Table view for desktop
  return (
    <>
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-medium text-sm">Name & Description</th>
              <th className="text-right p-4 font-medium text-sm">Quoted</th>
              <th className="text-right p-4 font-medium text-sm">Actual</th>
              <th className="text-right p-4 font-medium text-sm">Paid</th>
              <th className="text-center p-4 font-medium text-sm">Files</th>
              <th className="text-right p-4 font-medium text-sm w-[150px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((cost) => {
              const isEditing = editingId === cost.id;
              const hasFiles = cost.files && cost.files.length > 0;
              
              return (
                <tr key={cost.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="space-y-1">
                      {isEditing && editingField === "name" ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValues.name ?? ""}
                            onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                            className="flex-1 h-8"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(cost.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="font-medium cursor-pointer hover:text-brand"
                          onClick={() => handleStartEdit(cost, "name")}
                        >
                          {cost.name}
                        </div>
                      )}
                      {cost.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {cost.description}
                        </div>
                      )}
                      {showStageName && cost.stageName && (
                        <div className="text-xs text-muted-foreground">
                          Stage: {cost.stageName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {isEditing && editingField === "quotedAmount" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          value={editValues.quotedAmount ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, quotedAmount: e.target.value })}
                          className="w-24 h-8 text-right"
                          placeholder="$0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(cost.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:text-brand"
                        onClick={() => handleStartEdit(cost, "quotedAmount")}
                      >
                        {formatCurrency(cost.quotedAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {isEditing && editingField === "actualAmount" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          value={editValues.actualAmount ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, actualAmount: e.target.value })}
                          className="w-24 h-8 text-right"
                          placeholder="$0"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(cost.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                        />
                        <Button size="icon" variant="ghost" onClick={() => handleSaveEdit(cost.id)} className="h-8 w-8">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:text-brand"
                        onClick={() => handleStartEdit(cost, "actualAmount")}
                      >
                        {formatCurrency(cost.actualAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <span className={cn(
                      (cost.paidAmount ?? 0) > 0 && "text-green-600 font-medium"
                    )}>
                      {formatCurrency(cost.paidAmount)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      {hasFiles ? (
                        <button
                          onClick={() => handleFilesClick(cost.id)}
                          className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-brand transition-colors"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{cost.files.length}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFilesClick(cost.id)}
                          className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-brand transition-colors"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="text-xs">Add</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1.5">
                      {cost.paymentStatus !== "paid" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleMarkAsPaid(cost)}
                          className="h-8 px-3"
                          title="Mark as Paid"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Mark as Paid
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEdit(cost, "name")}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Name
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDelete(cost.id)} className="text-destructive">
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

      {selectedCostId && (
        <CostFilesDialog
          open={isFilesDialogOpen}
          onOpenChange={setIsFilesDialogOpen}
          costId={selectedCostId}
          projectId={projectId}
          costName={costs.find(c => c.id === selectedCostId)?.name ?? "Cost"}
          onFilesUpdated={() => {
            onCostUpdated?.();
            setIsFilesDialogOpen(false);
          }}
        />
      )}
    </>
  );
}



