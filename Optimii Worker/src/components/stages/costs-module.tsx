"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, Loader2, MoreHorizontal, Trash2, Pencil } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageHeader, StageEmptyState } from "@/components/projects/stage-tabs";
import { cn } from "@/lib/utils";
import { getCostsByStage, createCost, deleteCost } from "@/lib/actions/costs";
import type { Cost } from "@/lib/db/schema";
import { useToast } from "@/components/ui/use-toast";

interface CostsStageProps {
  stageId: string;
  stageName: string;
  projectId: string;
}

const statusConfig = {
  not_started: { label: "Not Started", className: "bg-gray-500/10 text-gray-600" },
  quoted: { label: "Quoted", className: "bg-blue-500/10 text-blue-600" },
  approved: { label: "Approved", className: "bg-yellow-500/10 text-yellow-600" },
  partially_paid: { label: "Part Paid", className: "bg-orange-500/10 text-orange-600" },
  paid: { label: "Paid", className: "bg-green-500/10 text-green-600" },
};

export function CostsStage({ stageId, stageName, projectId }: CostsStageProps) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // New cost form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuotedAmount, setNewQuotedAmount] = useState("");
  const [newActualAmount, setNewActualAmount] = useState("");

  const loadCosts = useCallback(async () => {
    try {
      const data = await getCostsByStage(stageId);
      setCosts(data);
    } catch (error) {
      console.error("Failed to load costs:", error);
      toast({
        title: "Error",
        description: "Failed to load costs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [stageId, toast]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  const handleCreateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    try {
      await createCost({
        projectId,
        stageId,
        name: newName,
        description: newDescription,
        category: newCategory,
        quotedAmount: newQuotedAmount ? parseFloat(newQuotedAmount) : undefined,
        actualAmount: newActualAmount ? parseFloat(newActualAmount) : undefined,
      });

      setNewName("");
      setNewDescription("");
      setNewCategory("");
      setNewQuotedAmount("");
      setNewActualAmount("");
      setIsDialogOpen(false);
      loadCosts();

      toast({
        title: "Success",
        description: "Cost item created successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to create cost:", error);
      toast({
        title: "Error",
        description: "Failed to create cost item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (!confirm("Are you sure you want to delete this cost item?")) return;

    // Optimistic update
    setCosts(costs.filter(c => c.id !== costId));

    try {
      await deleteCost(costId);
      toast({
        title: "Success",
        description: "Cost item deleted successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to delete cost:", error);
      // Revert on error
      loadCosts();
      toast({
        title: "Error",
        description: "Failed to delete cost item.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalEstimated = costs.reduce((sum, c) => sum + (c.quotedAmount || 0), 0);
  const totalActual = costs.reduce((sum, c) => sum + (c.actualAmount || 0), 0);
  const variance = totalActual - totalEstimated;
  // Only calculate variance percent if we have both estimated and actual values for items
  // This is a simplification; a more robust calc would be per-item or only for completed items
  const variancePercent = totalEstimated > 0 ? ((variance / totalEstimated) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <StageHeader
        title={stageName}
        description="Track budget items, quotes, and expenses"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Cost Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Cost Item</DialogTitle>
                <DialogDescription>
                  Add a new budget item or expense to this stage.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCost}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Structural Engineering"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newCategory}
                      onValueChange={setNewCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Labor">Labor</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Consultants">Consultants</SelectItem>
                        <SelectItem value="Fees">Fees</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="quoted">Quoted Amount ($)</Label>
                      <Input
                        id="quoted"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newQuotedAmount}
                        onChange={(e) => setNewQuotedAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="actual">Actual Amount ($)</Label>
                      <Input
                        id="actual"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newActualAmount}
                        onChange={(e) => setNewActualAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Additional details..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newName.trim() || isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create Cost
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {costs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Estimated (Quoted)</p>
              <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Actual</p>
              <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Variance</p>
              <div className="flex items-center gap-2">
                <p className={cn(
                  "text-2xl font-bold",
                  variance > 0 ? "text-red-600" : variance < 0 ? "text-green-600" : ""
                )}>
                  {variance > 0 ? "+" : ""}{formatCurrency(variance)}
                </p>
                {variance !== 0 && (
                  variance > 0 ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  )
                )}
              </div>
              <p className="text-xs text-muted-foreground">{variancePercent}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {costs.length === 0 ? (
        <StageEmptyState
          icon={DollarSign}
          title="No costs tracked"
          description="Add budget items to track estimated and actual costs for this phase."
          action={
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost Item
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-medium">Name/Category</th>
                  <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Quoted</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actual</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {costs.map((cost) => {
                  const status = statusConfig[cost.paymentStatus as keyof typeof statusConfig] || statusConfig.not_started;
                  const itemVariance = (cost.actualAmount && cost.quotedAmount)
                    ? cost.actualAmount - cost.quotedAmount
                    : null;

                  return (
                    <tr key={cost.id} className="border-b last:border-0 hover:bg-muted/30 group">
                      <td className="px-4 py-3">
                        <div className="font-medium">{cost.name}</div>
                        {cost.category && (
                          <div className="text-xs text-muted-foreground sm:hidden">{cost.category}</div>
                        )}
                        <div className="hidden sm:block text-xs text-muted-foreground">{cost.category}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm hidden sm:table-cell">{cost.description || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(cost.quotedAmount)}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {cost.actualAmount ? (
                          <span className={cn(
                            itemVariance && itemVariance > 0 ? "text-red-600" :
                              itemVariance && itemVariance < 0 ? "text-green-600" : ""
                          )}>
                            {formatCurrency(cost.actualAmount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={status.className}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              toast({ description: "Edit functionality coming soon" });
                            }}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCost(cost.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="px-4 py-3" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalEstimated)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(totalActual)}</td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </>
  );
}




