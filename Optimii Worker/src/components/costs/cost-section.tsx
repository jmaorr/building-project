"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CostCard } from "./cost-card";
import { AddCostDialog } from "./add-cost-dialog";
import { getCostsByStage, type CostWithFiles } from "@/lib/actions/costs";
import type { Stage, Contact } from "@/lib/db/schema";

interface CostSectionProps {
  stage: Stage;
  projectId: string;
  phaseId: string;
  contacts?: Contact[];
  currentUserId?: string;
}

export function CostSection({
  stage,
  projectId,
  phaseId,
  contacts = [],
  currentUserId,
}: CostSectionProps) {
  const router = useRouter();
  const [costs, setCosts] = useState<CostWithFiles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const loadCosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCostsByStage(stage.id);
      // Ensure we always have an array
      setCosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load costs:", error);
      setCosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [stage.id]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  const handleCostCreated = () => {
    loadCosts();
    router.refresh();
  };

  const handleCostDeleted = () => {
    loadCosts();
    router.refresh();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate totals
  const totalQuoted = costs.reduce((sum, c) => sum + (c.quotedAmount ?? 0), 0);
  const totalActual = costs.reduce((sum, c) => sum + (c.actualAmount ?? 0), 0);
  const totalPaid = costs.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);

  if (costs.length === 0 && !isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Costs</h3>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Receipt className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium mb-1">No costs added</p>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Track quotes, actuals, and payments for this stage
            </p>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Cost
            </Button>
          </CardContent>
        </Card>

        <AddCostDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          projectId={projectId}
          phaseId={phaseId}
          defaultStageId={stage.id}
          stageName={stage.name}
          contacts={contacts}
          currentUserId={currentUserId}
          onCostCreated={handleCostCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with totals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Costs</h3>
          <span className="text-xs text-muted-foreground">
            ({costs.length} item{costs.length !== 1 ? "s" : ""})
          </span>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cost
        </Button>
      </div>

      {/* Summary row */}
      {costs.length > 0 && (
        <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-muted/30 border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Quoted:</span>
            <span className="font-medium">{formatCurrency(totalQuoted)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Actual:</span>
            <span className="font-medium">{formatCurrency(totalActual)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
        </div>
      )}

      {/* Costs list */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading costs...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {costs.map((cost) => (
            <CostCard
              key={cost.id}
              cost={cost}
              onDelete={handleCostDeleted}
              compact
            />
          ))}
        </div>
      )}

      <AddCostDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        projectId={projectId}
        phaseId={phaseId}
        defaultStageId={stage.id}
        stageName={stage.name}
        contacts={contacts}
        currentUserId={currentUserId}
        onCostCreated={handleCostCreated}
      />
    </div>
  );
}

